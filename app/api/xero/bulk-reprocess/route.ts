
/**
 * Bulk Reprocessing API
 * Phase 2B-7c: Bulk Reprocessing Tools
 * 
 * Handles bulk reprocessing of failed syncs, batch operations, and queue management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EnhancedQueueManager } from '@/lib/queue/queue-manager';
import AuditService from '@/lib/services/audit-service';

interface BulkReprocessRequest {
  operationType: 'reprocess_failed' | 'reprocess_specific' | 'reprocess_date_range' | 'clear_queue';
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    userIds?: string[];
    submissionIds?: string[];
    operations?: string[];
    status?: string[];
    trigger?: string[];
  };
  options?: {
    priority?: 'high' | 'medium' | 'low';
    retryLimit?: number;
    batchSize?: number;
    delayBetweenBatches?: number;
    dryRun?: boolean;
  };
}

interface BulkReprocessJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  startedAt: Date;
  completedAt?: Date;
  errors: Array<{
    entityId: string;
    error: string;
    timestamp: Date;
  }>;
}

// In-memory storage for bulk job tracking
const bulkJobs = new Map<string, BulkReprocessJob>();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job status
      const job = bulkJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: job
      });
    }

    // Get all active jobs
    const allJobs = Array.from(bulkJobs.values());
    return NextResponse.json({
      success: true,
      data: allJobs
    });

  } catch (error) {
    console.error('GET /api/xero/bulk-reprocess error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk reprocessing status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body: BulkReprocessRequest = await request.json();
    const { operationType, filters = {}, options = {} } = body;

    // Create job ID
    const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize job tracking
    const bulkJob: BulkReprocessJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      successCount: 0,
      errorCount: 0,
      startedAt: new Date(),
      errors: []
    };

    bulkJobs.set(jobId, bulkJob);

    // Start bulk processing asynchronously
    processBulkOperation(jobId, operationType, filters, options, session.user.id);

    // Log job initiation
    await AuditService.logBulkReprocess({
      jobId,
      jobType: operationType,
      entityIds: [], // Will be populated during processing
      filters,
      result: { status: 'INITIATED' },
      userId: session.user.id
    }, request);

    return NextResponse.json({
      success: true,
      message: 'Bulk reprocessing job started',
      data: {
        jobId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('POST /api/xero/bulk-reprocess error:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk reprocessing' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const job = bulkJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      bulkJobs.set(jobId, job);
    }

    // Log the cancellation
    await prisma.xeroSyncLog.create({
      data: {
        userId: session.user.id,
        operation: 'BATCH_SYNC',
        status: 'FAILED',
        entityType: 'BulkReprocessJob',
        entityId: jobId,
        details: JSON.stringify({ action: 'cancelled', reason: 'User requested cancellation' }),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Bulk reprocessing job cancelled'
    });

  } catch (error) {
    console.error('DELETE /api/xero/bulk-reprocess error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel bulk reprocessing job' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processBulkOperation(
  jobId: string,
  operationType: string,
  filters: any,
  options: any,
  userId: string
) {
  const job = bulkJobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    bulkJobs.set(jobId, job);

    // Log the start of bulk processing
    await prisma.xeroSyncLog.create({
      data: {
        userId,
        operation: 'BATCH_SYNC',
        status: 'RUNNING',
        entityType: 'BulkReprocessJob',
        entityId: jobId,
        details: JSON.stringify({ operationType, filters, options }),
        timestamp: new Date()
      }
    });

    let items: any[] = [];

    // Fetch items based on operation type
    switch (operationType) {
      case 'reprocess_failed':
        items = await fetchFailedSyncItems(filters);
        break;
      case 'reprocess_specific':
        items = await fetchSpecificItems(filters);
        break;
      case 'reprocess_date_range':
        items = await fetchDateRangeItems(filters);
        break;
      case 'clear_queue':
        await clearQueueItems(filters);
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        bulkJobs.set(jobId, job);
        return;
    }

    job.totalItems = items.length;
    bulkJobs.set(jobId, job);

    if (options.dryRun) {
      // Dry run - just validate items
      await processDryRun(job, items, options);
    } else {
      // Actual processing
      await processItems(job, items, options, userId);
    }

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    bulkJobs.set(jobId, job);

    // Comprehensive audit logging
    await AuditService.logBulkReprocess({
      jobId,
      jobType: operationType,
      entityIds: items.map(item => item.id || item.submissionId || 'unknown'),
      filters,
      result: {
        status: 'COMPLETED',
        processed: job.processedItems,
        succeeded: job.successCount,
        failed: job.errorCount,
        errors: job.errors || [],
        estimatedDuration: job.completedAt && job.startedAt 
          ? job.completedAt.getTime() - job.startedAt.getTime()
          : 0
      },
      userId
    });

    // Legacy log completion (keeping for compatibility)
    await prisma.xeroSyncLog.create({
      data: {
        userId,
        operation: 'BATCH_SYNC',
        status: 'SUCCESS',
        entityType: 'BulkReprocessJob',
        entityId: jobId,
        details: JSON.stringify({
          totalItems: job.totalItems,
          processedItems: job.processedItems,
          successCount: job.successCount,
          errorCount: job.errorCount
        }),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error(`Bulk processing job ${jobId} failed:`, error);
    
    if (job) {
      job.status = 'failed';
      job.errors.push({
        entityId: jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      bulkJobs.set(jobId, job);
    }

    // Log failure
    await prisma.xeroSyncLog.create({
      data: {
        userId,
        operation: 'BATCH_SYNC',
        status: 'FAILED',
        entityType: 'BulkReprocessJob',
        entityId: jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    });
  }
}

async function fetchFailedSyncItems(filters: any) {
  const whereClause: any = {
    status: 'FAILED',
    operation: { in: ['SYNC_TIMESHEET', 'BATCH_SYNC'] }
  };

  if (filters.dateFrom) {
    whereClause.createdAt = { gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(filters.dateTo) };
  }
  if (filters.userIds?.length) {
    whereClause.userId = { in: filters.userIds };
  }
  if (filters.operations?.length) {
    whereClause.operation = { in: filters.operations };
  }

  return prisma.xeroSyncLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });
}

async function fetchSpecificItems(filters: any) {
  if (filters.submissionIds?.length) {
    return prisma.timesheetSubmission.findMany({
      where: {
        id: { in: filters.submissionIds }
      },
      include: {
        user: true
      }
    });
  }
  return [];
}

async function fetchDateRangeItems(filters: any) {
  const whereClause: any = {};

  if (filters.dateFrom) {
    whereClause.weekStartDate = { gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    whereClause.weekStartDate = { ...whereClause.weekStartDate, lte: new Date(filters.dateTo) };
  }
  if (filters.userIds?.length) {
    whereClause.userId = { in: filters.userIds };
  }

  return prisma.timesheetSubmission.findMany({
    where: whereClause,
    include: {
      user: true
    },
    orderBy: { weekStartDate: 'desc' }
  });
}

async function clearQueueItems(filters: any) {
  // Initialize queue manager and clear specified queues
  const queueManager = EnhancedQueueManager.getInstance();
  await queueManager.initialize();

  // Clear queues based on filters
  // This would integrate with the actual queue clearing logic
  console.log('Clearing queue items with filters:', filters);
}

async function processDryRun(job: BulkReprocessJob, items: any[], options: any) {
  for (let i = 0; i < items.length; i++) {
    if (job.status === 'cancelled') break;

    const item = items[i];
    
    // Simulate validation checks
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update progress
    job.processedItems = i + 1;
    job.progress = Math.round((job.processedItems / job.totalItems) * 100);
    bulkJobs.set(job.id, job);
  }
}

async function processItems(job: BulkReprocessJob, items: any[], options: any, userId: string) {
  const batchSize = options.batchSize || 10;
  const delayBetweenBatches = options.delayBetweenBatches || 1000;

  for (let i = 0; i < items.length; i += batchSize) {
    if (job.status === 'cancelled') break;

    const batch = items.slice(i, i + batchSize);
    
    // Process batch
    for (const item of batch) {
      try {
        // Add to queue for reprocessing
        const queueManager = EnhancedQueueManager.getInstance();
        
        if (item.submissionId || item.id) {
          await queueManager.addTimesheetSyncJob({
            submissionId: item.submissionId || item.id,
            userId: item.userId || userId,
            priority: options.priority || 'medium',
            trigger: 'manual'
          });
        }

        job.successCount++;
      } catch (error) {
        job.errorCount++;
        job.errors.push({
          entityId: item.id || item.submissionId || 'unknown',
          error: error instanceof Error ? error.message : 'Processing failed',
          timestamp: new Date()
        });
      }

      job.processedItems++;
    }
    
    // Update progress
    job.progress = Math.round((job.processedItems / job.totalItems) * 100);
    bulkJobs.set(job.id, job);

    // Delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
}
