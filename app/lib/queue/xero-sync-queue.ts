
/**
 * Xero Sync Queue System
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Manages async background jobs for syncing approved timesheets to Xero
 */

import Bull from 'bull';
import Redis from 'ioredis';
import { XeroSyncService } from '../xero-sync-service';
import { prisma } from '@/lib/db';
import { redisConnectionManager } from './redis-config';

// Create Redis connection using our graceful degradation manager
let redis: Redis | null = null;
let queueInstance: Bull.Queue | null = null;

async function getRedisConnection(): Promise<Redis | null> {
  try {
    if (!redis) {
      redis = await redisConnectionManager.connect();
    }
    return redis;
  } catch (error) {
    console.error('[XeroQueue] Failed to get Redis connection:', error);
    return null;
  }
}

async function getQueue(): Promise<Bull.Queue | null> {
  try {
    if (queueInstance) {
      return queueInstance;
    }

    // Check if Redis is available
    const redisConnection = await getRedisConnection();
    if (!redisConnection) {
      console.log('[XeroQueue] Redis unavailable, queue operations disabled');
      return null;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    queueInstance = new Bull('xero-sync', {
      redis: {
        port: 6379,
        host: redisUrl.includes('://') ? new URL(redisUrl).hostname : 'localhost',
      },
      defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100,    // Keep last 100 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    return queueInstance;
  } catch (error) {
    console.error('[XeroQueue] Failed to initialize queue:', error);
    return null;
  }
}

// Export a lazy-evaluated queue wrapper
class XeroSyncQueueWrapper {
  private queuePromise: Promise<Bull.Queue | null> | null = null;
  
  private async getQueueInstance(): Promise<Bull.Queue | null> {
    if (!this.queuePromise) {
      this.queuePromise = getQueue();
    }
    return this.queuePromise;
  }
  
  async add(name: string, data?: any, options?: any): Promise<any> {
    const queue = await this.getQueueInstance();
    if (!queue) {
      console.log('[XeroQueue] Queue unavailable, job skipped');
      return null;
    }
    return queue.add(name, data, options);
  }
  
  async getWaiting(): Promise<any[]> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.getWaiting();
  }
  
  async getActive(): Promise<any[]> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.getActive();
  }
  
  async getCompleted(): Promise<any[]> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.getCompleted();
  }
  
  async getFailed(): Promise<any[]> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.getFailed();
  }
  
  async getDelayed(): Promise<any[]> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.getDelayed();
  }
  
  async pause(): Promise<void> {
    const queue = await this.getQueueInstance();
    if (!queue) return;
    return queue.pause();
  }
  
  async resume(): Promise<void> {
    const queue = await this.getQueueInstance();
    if (!queue) return;
    return queue.resume();
  }
  
  async clean(grace: number, type?: 'completed' | 'active' | 'delayed' | 'failed', limit?: number): Promise<any> {
    const queue = await this.getQueueInstance();
    if (!queue) return [];
    return queue.clean(grace, type, limit);
  }
  
  async close(): Promise<void> {
    const queue = await this.getQueueInstance();
    if (!queue) return;
    return queue.close();
  }
  
  async process(name: string, concurrency: number, processor: any): Promise<void> {
    const queue = await this.getQueueInstance();
    if (!queue) {
      console.log('[XeroQueue] Queue unavailable, processor skipped');
      return;
    }
    return queue.process(name, concurrency, processor);
  }
  
  on(event: string, listener: any): void {
    this.getQueueInstance().then(queue => {
      if (queue) {
        queue.on(event, listener);
      }
    });
  }
}

export { redis, getRedisConnection, getQueue };
export const xeroSyncQueue = new XeroSyncQueueWrapper();

// Job data interfaces
export interface SyncTimesheetJobData {
  submissionId: string;
  userId: string;
  weekStartDate: string;
  priority: 'high' | 'medium' | 'low';
  trigger: 'approval' | 'manual' | 'scheduled';
  metadata?: {
    approvedBy?: string;
    approvedAt?: string;
    triggeredBy?: string;
    triggeredAt?: string;
  };
}

export interface BatchSyncJobData {
  fromDate: string;
  toDate: string;
  userIds?: string[];
  force?: boolean;
  trigger: 'manual' | 'scheduled';
}

export interface HealthCheckJobData {
  type: 'connection' | 'sync_status';
}

// Job processors
xeroSyncQueue.process('sync-timesheet', 5, async (job: any) => {
  const { submissionId, userId, priority, trigger, metadata } = job.data as SyncTimesheetJobData;
  
  console.log(`[XeroSyncQueue] Processing timesheet sync job: ${job.id}`, {
    submissionId,
    userId,
    priority,
    trigger,
  });

  try {
    // Update job progress
    await job.progress(10);

    // Get submission with all related data
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        entries: {
          include: {
            timeEntry: {
              include: {
                project: {
                  include: {
                    client: true,
                  },
                },
                task: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error(`Timesheet submission ${submissionId} not found`);
    }

    if (submission.status !== 'APPROVED') {
      throw new Error(`Timesheet submission ${submissionId} is not approved`);
    }

    await job.progress(30);

    // Initialize Xero sync service
    const syncService = new XeroSyncService();
    
    // Sync the timesheet submission to Xero
    const result = await syncService.syncTimesheetSubmission(submission, {
      dryRun: false,
      validateData: true,
      updateExisting: true,
    });

    await job.progress(80);

    // Log sync result
    await prisma.xeroSyncLog.create({
      data: {
        submissionId,
        operation: 'SYNC_TIMESHEET',
        status: result.success ? 'SUCCESS' : 'FAILED',
        details: JSON.stringify(result),
        jobId: job.id?.toString(),
        trigger,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    await job.progress(100);

    console.log(`[XeroSyncQueue] Timesheet sync completed successfully: ${job.id}`, {
      submissionId,
      success: result.success,
      timeEntries: result.summary?.timeEntries,
    });

    return {
      success: true,
      submissionId,
      result,
    };

  } catch (error) {
    console.error(`[XeroSyncQueue] Timesheet sync failed: ${job.id}`, error);
    
    // Log failure
    await prisma.xeroSyncLog.create({
      data: {
        submissionId,
        operation: 'SYNC_TIMESHEET',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: JSON.stringify({ error: error instanceof Error ? error.stack : error }),
        jobId: job.id?.toString(),
        trigger,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    throw error;
  }
});

xeroSyncQueue.process('batch-sync', 1, async (job: any) => {
  const { fromDate, toDate, userIds, force, trigger } = job.data as BatchSyncJobData;
  
  console.log(`[XeroSyncQueue] Processing batch sync job: ${job.id}`, {
    fromDate,
    toDate,
    userIds: userIds?.length,
    force,
    trigger,
  });

  try {
    await job.progress(10);

    const syncService = new XeroSyncService();
    
    // Get approved submissions in date range
    const submissions = await prisma.timesheetSubmission.findMany({
      where: {
        status: 'APPROVED',
        weekStartDate: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
        ...(userIds && userIds.length > 0 && {
          userId: { in: userIds },
        }),
      },
      include: {
        user: true,
        entries: {
          include: {
            timeEntry: {
              include: {
                project: {
                  include: {
                    client: true,
                  },
                },
                task: true,
              },
            },
          },
        },
      },
    });

    await job.progress(30);

    const results: any[] = [];
    const total = submissions.length;
    
    for (let i = 0; i < total; i++) {
      const submission = submissions[i];
      
      try {
        const result = await syncService.syncTimesheetSubmission(submission, {
          dryRun: false,
          validateData: true,
          updateExisting: force || false,
        });

        results.push({
          submissionId: submission.id,
          success: result.success,
          result,
        });

        await job.progress(30 + Math.round((70 * (i + 1)) / total));

      } catch (syncError) {
        console.error(`[XeroSyncQueue] Failed to sync submission ${submission.id}:`, syncError);
        results.push({
          submissionId: submission.id,
          success: false,
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        });
      }
    }

    // Log batch sync result
    await prisma.xeroSyncLog.create({
      data: {
        operation: 'BATCH_SYNC',
        status: results.some(r => r.success) ? 'SUCCESS' : 'FAILED',
        details: JSON.stringify({
          total,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        }),
        jobId: job.id?.toString(),
        trigger,
        metadata: JSON.stringify({ fromDate, toDate, userIds, force }),
      },
    });

    await job.progress(100);

    console.log(`[XeroSyncQueue] Batch sync completed: ${job.id}`, {
      total,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return {
      success: true,
      total,
      results,
    };

  } catch (error) {
    console.error(`[XeroSyncQueue] Batch sync failed: ${job.id}`, error);
    throw error;
  }
});

xeroSyncQueue.process('health-check', 1, async (job: any) => {
  const { type } = job.data as HealthCheckJobData;
  
  try {
    const syncService = new XeroSyncService();
    
    if (type === 'connection') {
      // Test Xero connection
      const connectionTest = await syncService.testConnection();
      return { success: true, connectionTest };
    } else {
      // Check sync status
      const status = await syncService.getSyncStatus();
      return { success: true, status };
    }
  } catch (error) {
    console.error(`[XeroSyncQueue] Health check failed: ${job.id}`, error);
    throw error;
  }
});

// Job event handlers
xeroSyncQueue.on('completed', (job: any, result: any) => {
  console.log(`[XeroSyncQueue] Job completed: ${job.id}`, {
    type: job.name,
    result: result?.success ? 'SUCCESS' : 'FAILED',
  });
});

xeroSyncQueue.on('failed', (job: any, error: any) => {
  console.error(`[XeroSyncQueue] Job failed: ${job.id}`, {
    type: job.name,
    error: error.message,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
  });
});

xeroSyncQueue.on('stalled', (job: any) => {
  console.warn(`[XeroSyncQueue] Job stalled: ${job.id}`, {
    type: job.name,
    processedOn: job.processedOn,
  });
});

// Queue utility functions
export class XeroSyncQueueManager {
  static async addTimesheetSyncJob(data: SyncTimesheetJobData) {
    const priority = data.priority === 'high' ? 1 : data.priority === 'medium' ? 5 : 10;
    
    return await xeroSyncQueue.add('sync-timesheet', data, {
      priority,
      delay: data.trigger === 'approval' ? 0 : 5000, // Immediate for approvals
      attempts: data.trigger === 'approval' ? 5 : 3, // More attempts for approvals
    });
  }

  static async addBatchSyncJob(data: BatchSyncJobData) {
    return await xeroSyncQueue.add('batch-sync', data, {
      priority: 8,
      attempts: 2,
    });
  }

  static async addHealthCheckJob(data: HealthCheckJobData) {
    return await xeroSyncQueue.add('health-check', data, {
      priority: 10,
      attempts: 1,
    });
  }

  static async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      xeroSyncQueue.getWaiting(),
      xeroSyncQueue.getActive(),
      xeroSyncQueue.getCompleted(),
      xeroSyncQueue.getFailed(),
      xeroSyncQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  static async pauseQueue() {
    await xeroSyncQueue.pause();
  }

  static async resumeQueue() {
    await xeroSyncQueue.resume();
  }

  static async clearFailedJobs() {
    await xeroSyncQueue.clean(0, 'failed');
  }

  static async retryFailedJobs() {
    const failedJobs = await xeroSyncQueue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }
    
    return failedJobs.length;
  }
}

export default xeroSyncQueue;
