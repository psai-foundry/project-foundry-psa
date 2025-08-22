
/**
 * Phase 2B-7a: Manual Sync API Endpoint
 * Handles manual synchronization of specific timesheet ranges to Xero
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { XeroSyncService } from '@/lib/xero-sync';
import { z } from 'zod';

const manualSyncSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  submissionIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
  syncType: z.enum(['approved-only', 'all', 'specific']).default('approved-only'),
  dryRun: z.boolean().default(false)
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = manualSyncSchema.parse(body);

    const { dateFrom, dateTo, submissionIds, userId, syncType, dryRun } = validatedData;

    // Build query conditions
    const whereConditions: any = {
      weekStartDate: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    };

    if (syncType === 'approved-only') {
      whereConditions.status = 'APPROVED';
    } else if (syncType === 'specific' && submissionIds?.length) {
      whereConditions.id = { in: submissionIds };
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    // Fetch timesheets to sync
    const timesheets = await prisma.timesheetSubmission.findMany({
      where: whereConditions,
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: {
          include: {
            timeEntry: {
              include: {
                project: { include: { client: true } },
                task: true
              }
            }
          }
        }
      },
      orderBy: { weekStartDate: 'desc' }
    });

    if (timesheets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No timesheets found for the specified criteria',
        data: {
          processedCount: 0,
          successCount: 0,
          failureCount: 0,
          results: []
        }
      });
    }

    // Initialize Xero sync service
    const syncService = new XeroSyncService();

    if (dryRun) {
      // Return what would be synced without actually syncing
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Dry run: Found ${timesheets.length} timesheets that would be synced`,
        data: {
          processedCount: timesheets.length,
          timesheets: timesheets.map((ts: any) => ({
            id: ts.id,
            user: ts.user.name,
            weekStart: ts.weekStartDate,
            weekEnd: ts.weekEndDate,
            totalHours: ts.totalHours,
            status: ts.status,
            entriesCount: ts.entries.length
          }))
        }
      });
    }

    // Perform manual sync
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // For each timesheet, perform sync using incremental sync
    for (const timesheet of timesheets) {
      try {
        // Create a targeted sync for this specific submission
        const syncResult = await syncService.performIncrementalSync({
          dryRun: false,
          submissionIds: [timesheet.id]
        } as any);
        
        if (syncResult.success) {
          results.push({
            timesheetId: timesheet.id,
            user: timesheet.user.name,
            weekStart: timesheet.weekStartDate,
            status: 'success',
            xeroInvoiceId: `synced-${timesheet.id}`,
            message: 'Successfully synced to Xero'
          });
          successCount++;
        } else {
          results.push({
            timesheetId: timesheet.id,
            user: timesheet.user.name,
            weekStart: timesheet.weekStartDate,
            status: 'error',
            error: syncResult.error || 'Sync failed'
          });
          failureCount++;
        }
      } catch (error) {
        results.push({
          timesheetId: timesheet.id,
          user: timesheet.user.name,
          weekStart: timesheet.weekStartDate,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    // Log the manual sync operation
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MANUAL_XERO_SYNC',
        entityType: 'TimesheetSubmission',
        entityId: null,
        newValues: {
          dateRange: { from: dateFrom, to: dateTo },
          syncType,
          processedCount: timesheets.length,
          successCount,
          failureCount,
          dryRun
        },
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Manual sync completed. ${successCount} succeeded, ${failureCount} failed`,
      data: {
        processedCount: timesheets.length,
        successCount,
        failureCount,
        results
      }
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 });
    }

    // Get available timesheets for the date range
    const timesheets = await prisma.timesheetSubmission.findMany({
      where: {
        weekStartDate: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo)
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: {
          include: {
            timeEntry: {
              include: {
                project: { select: { id: true, name: true, client: { select: { name: true } } } }
              }
            }
          }
        }
      },
      orderBy: { weekStartDate: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: timesheets.map((ts: any) => ({
        id: ts.id,
        userId: ts.userId,
        user: ts.user,
        weekStartDate: ts.weekStartDate,
        weekEndDate: ts.weekEndDate,
        totalHours: ts.totalHours,
        totalBillable: ts.totalBillable,
        status: ts.status,
        submittedAt: ts.submittedAt,
        approvedAt: ts.approvedAt,
        entriesCount: ts.entries.length,
        projects: Array.from(new Set(ts.entries.map((e: any) => e.timeEntry.project?.name).filter(Boolean)))
      }))
    });

  } catch (error) {
    console.error('Get timesheets error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
