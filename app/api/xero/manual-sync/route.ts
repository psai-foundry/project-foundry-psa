
/**
 * Manual Xero Sync API
 * Phase 2B-7a: API endpoints for manual synchronization control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { xeroValidationEngine } from '@/lib/xero/validation-engine';
import { ValidationError } from '@/lib/xero/validation-engine';
import AuditService from '@/lib/services/audit-service';
import { metricsService } from '@/lib/services/metrics-service';
import { instrumentAsync, Timer, MemoryTracker } from '@/lib/monitoring/instrumentation';
import { PipelineType, TriggerType, PipelineStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface TimesheetData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  totalBillable: number;
  status: string;
  submittedAt: string;
  approvedAt: string | null;
  entriesCount: number;
  projects: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userId = searchParams.get('userId');

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'dateFrom and dateTo are required' },
        { status: 400 }
      );
    }

    // Fetch timesheets from database
    const timesheets = await prisma.timesheetSubmission.findMany({
      where: {
        weekStartDate: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        },
        ...(userId && { userId })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entries: {
          include: {
            timeEntry: {
              include: {
                project: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { weekStartDate: 'desc' },
        { user: { name: 'asc' } }
      ]
    });

    const formattedData: TimesheetData[] = timesheets.map((ts: any) => ({
      id: ts.id,
      userId: ts.userId,
      user: ts.user,
      weekStartDate: ts.weekStartDate.toISOString(),
      weekEndDate: ts.weekEndDate.toISOString(),
      totalHours: ts.totalHours || 0,
      totalBillable: ts.totalBillableAmount || 0,
      status: ts.status,
      submittedAt: ts.submittedAt?.toISOString() || '',
      approvedAt: ts.approvedAt?.toISOString() || null,
      entriesCount: ts.entries?.length || 0,
      projects: [...new Set(ts.entries?.map((te: any) => te.timeEntry?.project?.name || 'Unknown').filter(Boolean) || [])].filter((name): name is string => typeof name === 'string')
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      total: formattedData.length
    });

  } catch (error) {
    console.error('GET /api/xero/manual-sync error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timesheets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Initialize metrics collection
  const executionId = uuidv4();
  const timer = new Timer({
    metricName: 'xero_manual_sync_duration',
    entityType: 'sync',
    executionId,
    tags: { trigger: 'manual' },
  });
  const memoryTracker = new MemoryTracker({
    metricName: 'xero_manual_sync_memory',
    entityType: 'sync',
    executionId,
  });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      await timer.stop(false, new Error('Unauthorized'));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { dateFrom, dateTo, syncType, dryRun = false, userId, submissionIds = [] } = body;

    // Start pipeline metrics
    const pipelineId = await metricsService.startPipelineMetrics({
      pipelineType: PipelineType.SYNC,
      executionId,
      triggeredBy: session.user.id,
      triggerType: TriggerType.MANUAL,
      batchSize: submissionIds.length || undefined,
      metadata: {
        dateFrom,
        dateTo,
        syncType,
        dryRun,
        userId,
        submissionIds: submissionIds.length,
      },
    });

    // Update timer with user context
    timer.options.userId = session.user.id;
    memoryTracker.options.userId = session.user.id;

    // Audit log the manual sync request
    await prisma.xeroSyncLog.create({
      data: {
        userId: session.user.id,
        operation: dryRun ? 'MANUAL_SYNC_DRY_RUN' : 'MANUAL_SYNC',
        entityType: 'TimesheetSubmission',
        entityId: submissionIds.join(',') || 'batch',
        status: 'PENDING',
        details: JSON.stringify({
          dateFrom,
          dateTo,
          syncType,
          userId,
          submissionIds: submissionIds.length
        }),
        timestamp: new Date()
      }
    });

    let whereClause: any = {
      weekStartDate: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    };

    // Apply filters based on sync type
    if (syncType === 'approved-only') {
      whereClause.status = 'APPROVED';
    } else if (syncType === 'specific' && submissionIds.length > 0) {
      whereClause.id = {
        in: submissionIds
      };
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const timesheets = await prisma.timesheetSubmission.findMany({
      where: whereClause,
      include: {
        user: true,
        entries: {
          include: {
            timeEntry: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (dryRun) {
      // Perform validation checks without actual sync
      const validationResults = [];
      let validCount = 0;
      let errorCount = 0;
      
      for (const timesheet of timesheets) {
        const validationTimer = new Timer({
          metricName: 'xero_dryrun_validation_duration',
          entityType: 'validation',
          entityId: timesheet.id,
          executionId,
          userId: session.user.id,
        });
        
        const transformedData = await transformTimesheetForXero(timesheet);
        const validation = await xeroValidationEngine.validateForXeroSync(transformedData, 'timeEntry');
        
        await validationTimer.stop(true);
        
        validationResults.push({
          timesheetId: timesheet.id,
          user: timesheet.user.name,
          weekStart: timesheet.weekStartDate.toISOString(),
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        });

        if (validation.isValid) {
          validCount++;
        } else {
          errorCount++;
        }
      }

      // Record dry run metrics
      await metricsService.recordMetrics([
        {
          metricType: 'COUNTER',
          name: 'xero_dry_run_operations',
          value: 1,
          unit: 'count',
          entityType: 'sync',
          executionId,
          userId: session.user.id,
          tags: { sync_type: syncType },
        },
        {
          metricType: 'GAUGE',
          name: 'xero_dry_run_validation_rate',
          value: validationResults.length > 0 ? (validCount / validationResults.length) * 100 : 0,
          unit: 'percentage',
          entityType: 'validation',
          executionId,
          userId: session.user.id,
        }
      ]);

      // Complete pipeline metrics for dry run
      await metricsService.completePipelineMetrics(
        executionId,
        PipelineStatus.SUCCESS,
        {
          itemsProcessed: validationResults.length,
          itemsSuccessful: validCount,
          itemsFailed: errorCount,
          metadata: { dryRun: true },
        }
      );

      await timer.stop(true);

      return NextResponse.json({
        success: true,
        message: `Dry run completed. ${validCount} valid, ${errorCount} with errors.`,
        data: {
          timesheets: validationResults,
          summary: {
            total: validationResults.length,
            valid: validCount,
            errors: errorCount
          },
          metrics: {
            executionId,
            validationCount: validationResults.length,
          }
        }
      });
    }

    // Actual sync process
    const syncResults = [];
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    let validationCount = 0;
    let overrideCount = 0;
    
    for (const timesheet of timesheets) {
      processedCount++;
      
      try {
        // Record per-timesheet metrics
        const itemTimer = new Timer({
          metricName: 'xero_timesheet_sync_duration',
          entityType: 'timesheet',
          entityId: timesheet.id,
          executionId,
          userId: session.user.id,
        });

        const transformedData = await transformTimesheetForXero(timesheet);
        
        // Instrumented validation
        const validationTimer = new Timer({
          metricName: 'xero_validation_duration',
          entityType: 'validation',
          entityId: timesheet.id,
          executionId,
          userId: session.user.id,
        });
        
        const validation = await xeroValidationEngine.validateForXeroSync(transformedData, 'timeEntry');
        validationCount++;
        await validationTimer.stop(true);
        
        await metricsService.recordCounter('xero_validations_performed', 1, {
          entityType: 'validation',
          entityId: timesheet.id,
          executionId,
          userId: session.user.id,
          tags: {
            passed: validation.isValid.toString(),
            error_count: validation.errors?.length || 0,
          },
        });
        
        if (!validation.isValid) {
          // Check for validation overrides
          const hasOverrides = await checkValidationOverrides(timesheet.id, validation.errors);
          
          if (hasOverrides) {
            overrideCount++;
            await metricsService.recordCounter('xero_validation_overrides_used', 1, {
              entityType: 'override',
              entityId: timesheet.id,
              executionId,
              userId: session.user.id,
            });
          } else {
            failureCount++;
            syncResults.push({
              timesheetId: timesheet.id,
              user: timesheet.user.name,
              weekStart: timesheet.weekStartDate.toISOString(),
              status: 'error',
              error: 'Validation failed: ' + validation.errors.map(e => e.message).join(', ')
            });
            await itemTimer.stop(false, new Error('Validation failed'));
            continue;
          }
        }

        // Instrumented Xero API call
        const xeroTimer = new Timer({
          metricName: 'xero_api_sync_duration',
          entityType: 'xero_api',
          entityId: 'sync_timesheet',
          executionId,
          userId: session.user.id,
        });
        
        const xeroResult = await syncToXero(transformedData);
        await xeroTimer.stop(true);
        
        successCount++;
        syncResults.push({
          timesheetId: timesheet.id,
          user: timesheet.user.name,
          weekStart: timesheet.weekStartDate.toISOString(),
          status: 'success',
          xeroInvoiceId: xeroResult.invoiceId,
          message: 'Successfully synced to Xero'
        });

        // Update timesheet sync status
        await prisma.timesheetSubmission.update({
          where: { id: timesheet.id },
          data: {
            lastSyncedToXero: new Date(),
            xeroInvoiceId: xeroResult.invoiceId
          }
        });

        await itemTimer.stop(true);

      } catch (error) {
        failureCount++;
        syncResults.push({
          timesheetId: timesheet.id,
          user: timesheet.user.name,
          weekStart: timesheet.weekStartDate.toISOString(),
          status: 'error',
          error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        await metricsService.recordCounter('xero_sync_errors', 1, {
          entityType: 'error',
          entityId: timesheet.id,
          executionId,
          userId: session.user.id,
          tags: {
            error_type: error instanceof Error ? error.name : 'unknown',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Record memory usage
    await memoryTracker.record();
    
    // Record comprehensive metrics
    await metricsService.recordMetrics([
      {
        metricType: 'COUNTER',
        name: 'xero_manual_sync_operations',
        value: 1,
        unit: 'count',
        entityType: 'sync',
        executionId,
        userId: session.user.id,
        tags: { sync_type: syncType, dry_run: dryRun.toString() },
      },
      {
        metricType: 'GAUGE',
        name: 'xero_sync_success_rate',
        value: processedCount > 0 ? (successCount / processedCount) * 100 : 0,
        unit: 'percentage',
        entityType: 'sync',
        executionId,
        userId: session.user.id,
      },
      {
        metricType: 'GAUGE',
        name: 'xero_sync_throughput',
        value: processedCount,
        unit: 'items_per_operation',
        entityType: 'sync',
        executionId,
        userId: session.user.id,
      },
    ]);

    // Comprehensive audit logging
    await AuditService.logManualSync({
      timesheetIds: timesheets.map(t => t.id),
      syncType,
      dryRun,
      result: {
        success: failureCount === 0,
        processed: syncResults,
        failed: syncResults.filter(r => r.status === 'error'),
        errors: syncResults.filter(r => r.status === 'error').map(r => r.error)
      },
      userId: session.user.id
    }, request);

    // Complete pipeline metrics
    const pipelineStatus = failureCount === 0 ? PipelineStatus.SUCCESS : 
                          successCount > 0 ? PipelineStatus.SUCCESS : 
                          PipelineStatus.FAILED;
    
    await metricsService.completePipelineMetrics(
      executionId,
      pipelineStatus,
      {
        itemsProcessed: processedCount,
        itemsSuccessful: successCount,
        itemsFailed: failureCount,
        metadata: {
          validationCount,
          overrideCount,
        },
      }
    );

    // Legacy log completion (keeping for compatibility)
    await prisma.xeroSyncLog.create({
      data: {
        userId: session.user.id,
        operation: 'MANUAL_SYNC',
        entityType: 'TimesheetSubmission',
        entityId: `batch_${successCount}_${failureCount}`,
        status: failureCount === 0 ? 'SUCCESS' : 'FAILED',
        details: JSON.stringify({
          totalProcessed: syncResults.length,
          successful: successCount,
          errors: failureCount,
          results: syncResults,
          executionId,
          validations: validationCount,
          overrides: overrideCount,
        }),
        timestamp: new Date()
      }
    });

    // Complete timing metrics
    await timer.stop(true);

    return NextResponse.json({
      success: true,
      message: `Manual sync completed. ${successCount} successful, ${failureCount} errors.`,
      data: {
        results: syncResults,
        summary: {
          total: syncResults.length,
          successful: successCount,
          errors: failureCount,
          validations: validationCount,
          overrides: overrideCount,
        },
        metrics: {
          executionId,
          processedCount,
          successCount,
          failureCount,
        }
      }
    });

  } catch (error) {
    console.error('POST /api/xero/manual-sync error:', error);
    
    // Complete metrics on error
    await timer.stop(false, error as Error);
    await metricsService.completePipelineMetrics(
      executionId,
      PipelineStatus.FAILED,
      {
        itemsProcessed: 0,
        itemsSuccessful: 0,
        itemsFailed: 1,
      }
    );
    
    // Record error metrics
    await metricsService.recordCounter('xero_manual_sync_failures', 1, {
      entityType: 'sync',
      executionId,
      tags: {
        error_type: error instanceof Error ? error.name : 'unknown',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    return NextResponse.json(
      { error: 'Manual sync failed' },
      { status: 500 }
    );
  }
}

// Helper functions
async function transformTimesheetForXero(timesheet: any) {
  // Transform timesheet data to Xero format
  return {
    userID: timesheet.user.email,
    duration: timesheet.totalHours * 60, // Convert to minutes
    dateUTC: timesheet.weekStartDate.toISOString(),
    description: `Timesheet for week ${timesheet.weekStartDate.toISOString().split('T')[0]}`,
    billableStatus: timesheet.totalBillableAmount > 0 ? 'billable' : 'non-billable',
    unitAmount: timesheet.totalBillableAmount / (timesheet.totalHours || 1)
  };
}

async function checkValidationOverrides(timesheetId: string, errors: ValidationError[]) {
  // Check if there are any active validation overrides for this timesheet
  const overrides = await prisma.xeroValidationOverride.findMany({
    where: {
      entityId: timesheetId,
      entityType: 'TimesheetSubmission',
      status: 'ACTIVE',
      OR: [
        { expiresAt: null }, // Permanent overrides
        { expiresAt: { gt: new Date() } } // Non-expired temporary overrides
      ]
    }
  });

  // Check if overrides cover all validation errors
  const errorIds = errors.map(e => e.id);
  const overrideRules = overrides.flatMap(o => o.overriddenRules);
  
  return errorIds.every(errorId => 
    overrideRules.some(rule => rule.includes(errorId.split('_')[0]))
  );
}

async function syncToXero(data: any) {
  // Simulate Xero API sync (replace with actual implementation)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    invoiceId: `INV-${Date.now()}`,
    status: 'success'
  };
}
