

/**
 * Enhanced Queue Management API
 * Phase 2B-4: Queue Infrastructure Setup
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enhancedQueueWorker } from '@/lib/queue/enhanced-queue-worker';
import { redisConnectionManager } from '@/lib/queue/redis-config';
import { prisma } from '@/lib/db';

// POST /api/xero/sync/queue/manage - Enhanced queue management actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, queueName, options } = body;

    let result: any = {};

    console.log(`[QueueManageAPI] Executing action: ${action}`, {
      queueName,
      options,
      executedBy: session.user.id,
    });

    switch (action) {
      case 'pauseQueue':
        if (!queueName) {
          return NextResponse.json({ error: 'queueName is required for pauseQueue action' }, { status: 400 });
        }
        await enhancedQueueWorker.pauseQueue(queueName);
        result = { message: `Queue '${queueName}' paused successfully` };
        break;

      case 'resumeQueue':
        if (!queueName) {
          return NextResponse.json({ error: 'queueName is required for resumeQueue action' }, { status: 400 });
        }
        await enhancedQueueWorker.resumeQueue(queueName);
        result = { message: `Queue '${queueName}' resumed successfully` };
        break;

      case 'clearFailedJobs':
        if (!queueName) {
          return NextResponse.json({ error: 'queueName is required for clearFailedJobs action' }, { status: 400 });
        }
        await enhancedQueueWorker.clearFailedJobs(queueName);
        result = { message: `Failed jobs cleared from queue '${queueName}'` };
        break;

      case 'addTimesheetSyncJob':
        const { submissionId, userId, priority = 'medium', trigger = 'manual' } = options || {};
        if (!submissionId || !userId) {
          return NextResponse.json({ 
            error: 'submissionId and userId are required for addTimesheetSyncJob action' 
          }, { status: 400 });
        }

        const queueToUse = priority === 'high' ? 'xero-sync-high-priority' : 'xero-sync-normal';
        const job = await enhancedQueueWorker.addJob(queueToUse, 'sync-timesheet', {
          submissionId,
          userId,
          priority,
          trigger,
          metadata: {
            triggeredBy: session.user.id,
            triggeredAt: new Date().toISOString(),
          },
        });

        result = { 
          message: 'Timesheet sync job added successfully',
          jobId: job.id,
          queue: queueToUse,
        };
        break;

      case 'addBatchSyncJob':
        const { fromDate, toDate, userIds, force = false } = options || {};
        if (!fromDate || !toDate) {
          return NextResponse.json({ 
            error: 'fromDate and toDate are required for addBatchSyncJob action' 
          }, { status: 400 });
        }

        const batchJob = await enhancedQueueWorker.addJob('xero-sync-batch', 'batch-sync', {
          fromDate,
          toDate,
          userIds,
          force,
          trigger: 'manual',
          metadata: {
            triggeredBy: session.user.id,
            triggeredAt: new Date().toISOString(),
          },
        });

        result = { 
          message: 'Batch sync job added successfully',
          jobId: batchJob.id,
          queue: 'xero-sync-batch',
        };
        break;

      case 'addHealthCheckJob':
        const { type = 'connection' } = options || {};
        const healthJob = await enhancedQueueWorker.addJob('xero-sync-high-priority', 'health-check', {
          type,
        });

        result = { 
          message: 'Health check job added successfully',
          jobId: healthJob.id,
          type,
        };
        break;

      case 'testRedisConnection':
        const pingResult = await redisConnectionManager.ping();
        result = { 
          message: 'Redis connection test completed',
          connected: pingResult,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'reconnectRedis':
        try {
          await redisConnectionManager.disconnect();
          await redisConnectionManager.connect();
          result = { message: 'Redis reconnected successfully' };
        } catch (error) {
          result = { 
            message: 'Redis reconnection failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        break;

      case 'initializeWorker':
        try {
          await enhancedQueueWorker.initialize();
          result = { message: 'Queue worker initialized successfully' };
        } catch (error) {
          result = { 
            message: 'Queue worker initialization failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        break;

      case 'getWorkerStatus':
        const status = enhancedQueueWorker.getStatus();
        result = {
          message: 'Worker status retrieved successfully',
          status,
        };
        break;

      case 'cleanupOldLogs':
        const { daysOld = 30 } = options || {};
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const deletedCount = await prisma.xeroSyncLog.deleteMany({
          where: {
            createdAt: {
              lt: cutoffDate,
            },
          },
        });

        result = { 
          message: `Cleaned up ${deletedCount.count} old sync logs (older than ${daysOld} days)`,
          deletedCount: deletedCount.count,
        };
        break;

      default:
        return NextResponse.json({ 
          error: `Invalid action: ${action}. Valid actions: pauseQueue, resumeQueue, clearFailedJobs, addTimesheetSyncJob, addBatchSyncJob, addHealthCheckJob, testRedisConnection, reconnectRedis, initializeWorker, getWorkerStatus, cleanupOldLogs` 
        }, { status: 400 });
    }

    // Log the action for audit purposes
    console.log(`[QueueManageAPI] Action completed successfully: ${action}`, {
      queueName,
      result,
      executedBy: session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[QueueManageAPI] Error executing queue action:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
