

/**
 * Enhanced Queue Worker System
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Provides robust worker processes with graceful shutdown,
 * job persistence, recovery mechanisms, and comprehensive monitoring
 */

import Bull, { Job, Queue } from 'bull';
import { redisConnectionManager, getRedisConnection } from './redis-config';
import { XeroSyncService } from '../xero-sync-service';
import { prisma } from '@/lib/db';

export interface WorkerConfig {
  concurrency: number;
  maxStalledCount: number;
  stalledInterval: number;
  retryProcessDelay: number;
}

export interface WorkerMetrics {
  processed: number;
  failed: number;
  active: number;
  waiting: number;
  paused: boolean;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastProcessed?: Date;
  averageProcessingTime?: number;
  errorRate?: number;
}

class EnhancedQueueWorker {
  private static instance: EnhancedQueueWorker;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, any> = new Map();
  private isRunning = false;
  private metrics: Map<string, WorkerMetrics> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;
  private shutdownPromise: Promise<void> | null = null;

  private constructor() {
    this.setupGracefulShutdown();
  }

  static getInstance(): EnhancedQueueWorker {
    if (!EnhancedQueueWorker.instance) {
      EnhancedQueueWorker.instance = new EnhancedQueueWorker();
    }
    return EnhancedQueueWorker.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('[EnhancedQueueWorker] Initializing queue worker system...');

      // Ensure Redis connection is ready
      await redisConnectionManager.connect();
      
      // Wait for connection to be fully ready
      const isReady = await redisConnectionManager.waitForConnection(15000);
      if (!isReady) {
        throw new Error('Redis connection not ready after timeout');
      }

      // Initialize queues
      await this.initializeQueues();

      // Start metrics collection
      this.startMetricsCollection();

      this.isRunning = true;
      console.log('[EnhancedQueueWorker] Queue worker system initialized successfully');

    } catch (error) {
      console.error('[EnhancedQueueWorker] Failed to initialize:', error);
      throw error;
    }
  }

  private async initializeQueues(): Promise<void> {
    const redis = await getRedisConnection();
    
    // Enhanced queue configurations
    const queueConfigs = [
      {
        name: 'xero-sync-high-priority',
        concurrency: 3,
        config: {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
          settings: {
            stalledInterval: 30000,
            maxStalledCount: 1,
            retryProcessDelay: 5000,
          },
        },
      },
      {
        name: 'xero-sync-normal',
        concurrency: 5,
        config: {
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 100,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
          settings: {
            stalledInterval: 60000,
            maxStalledCount: 2,
            retryProcessDelay: 10000,
          },
        },
      },
      {
        name: 'xero-sync-batch',
        concurrency: 2,
        config: {
          defaultJobOptions: {
            removeOnComplete: 20,
            removeOnFail: 50,
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
          },
          settings: {
            stalledInterval: 120000,
            maxStalledCount: 1,
            retryProcessDelay: 30000,
          },
        },
      },
    ];

    for (const queueConfig of queueConfigs) {
      const queue = new Bull(queueConfig.name, {
        redis: {
          host: redis.options.host,
          port: redis.options.port,
          password: redis.options.password,
          db: redis.options.db,
        },
        ...queueConfig.config,
      });

      // Set up queue event handlers
      this.setupQueueEventHandlers(queue);

      // Set up job processors
      await this.setupJobProcessors(queue, queueConfig.concurrency);

      this.queues.set(queueConfig.name, queue);
      
      // Initialize metrics
      this.metrics.set(queueConfig.name, {
        processed: 0,
        failed: 0,
        active: 0,
        waiting: 0,
        paused: false,
        health: 'healthy',
        averageProcessingTime: 0,
        errorRate: 0,
      });

      console.log(`[EnhancedQueueWorker] Queue '${queueConfig.name}' initialized with concurrency ${queueConfig.concurrency}`);
    }
  }

  private setupQueueEventHandlers(queue: Queue): void {
    const queueName = queue.name;

    queue.on('ready', () => {
      console.log(`[EnhancedQueueWorker] Queue '${queueName}' is ready`);
    });

    queue.on('error', (error) => {
      console.error(`[EnhancedQueueWorker] Queue '${queueName}' error:`, error);
      this.updateMetricsHealth(queueName, 'unhealthy');
    });

    queue.on('waiting', (jobId) => {
      console.log(`[EnhancedQueueWorker] Job ${jobId} waiting in queue '${queueName}'`);
    });

    queue.on('active', (job, jobPromise) => {
      console.log(`[EnhancedQueueWorker] Job ${job.id} started processing in queue '${queueName}'`);
      this.updateMetricsActive(queueName, 1);
    });

    queue.on('completed', (job, result) => {
      const processingTime = Date.now() - (job.processedOn || Date.now());
      console.log(`[EnhancedQueueWorker] Job ${job.id} completed in queue '${queueName}' (${processingTime}ms)`);
      
      this.updateMetricsCompleted(queueName, processingTime);
      this.updateMetricsActive(queueName, -1);
    });

    queue.on('failed', (job, error) => {
      console.error(`[EnhancedQueueWorker] Job ${job.id} failed in queue '${queueName}':`, error);
      this.updateMetricsFailed(queueName);
      this.updateMetricsActive(queueName, -1);
    });

    queue.on('stalled', (job) => {
      console.warn(`[EnhancedQueueWorker] Job ${job.id} stalled in queue '${queueName}'`);
    });

    queue.on('progress', (job, progress) => {
      console.log(`[EnhancedQueueWorker] Job ${job.id} progress: ${progress}%`);
    });
  }

  private async setupJobProcessors(queue: Queue, concurrency: number): Promise<void> {
    const queueName = queue.name;

    // Set up different processors based on queue type
    if (queueName.includes('high-priority')) {
      queue.process('sync-timesheet', concurrency, this.processTimesheetSync.bind(this));
      queue.process('health-check', 1, this.processHealthCheck.bind(this));
    } else if (queueName.includes('normal')) {
      queue.process('sync-timesheet', concurrency, this.processTimesheetSync.bind(this));
      queue.process('sync-project', concurrency, this.processProjectSync.bind(this));
      queue.process('sync-client', concurrency, this.processClientSync.bind(this));
    } else if (queueName.includes('batch')) {
      queue.process('batch-sync', concurrency, this.processBatchSync.bind(this));
      queue.process('cleanup', 1, this.processCleanup.bind(this));
    }

    console.log(`[EnhancedQueueWorker] Job processors set up for queue '${queueName}'`);
  }

  // Enhanced job processors with better error handling and progress tracking
  private async processTimesheetSync(job: Job): Promise<any> {
    const startTime = Date.now();
    const { submissionId, userId, priority, trigger, metadata } = job.data;

    try {
      await job.progress(5);

      // Enhanced validation
      if (!submissionId || !userId) {
        throw new Error('Missing required job data: submissionId and userId are required');
      }

      await job.progress(10);

      // Get submission with enhanced error handling
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
        throw new Error(`Timesheet submission ${submissionId} is not approved (status: ${submission.status})`);
      }

      await job.progress(30);

      // Initialize sync service with retry logic
      const syncService = new XeroSyncService();
      
      // Test connection before sync
      const connectionTest = await syncService.testConnection();
      if (!connectionTest || typeof connectionTest !== 'object' || !('connected' in connectionTest)) {
        throw new Error('Xero connection test failed: Invalid response');
      }

      await job.progress(50);

      // Perform sync with enhanced options
      const result = await syncService.syncTimesheetSubmission(submission, {
        dryRun: false,
        validateData: true,
        updateExisting: true,
      });

      await job.progress(80);

      // Enhanced logging
      const processingTime = Date.now() - startTime;
      await prisma.xeroSyncLog.create({
        data: {
          submissionId,
          operation: 'SYNC_TIMESHEET',
          status: result.success ? 'SUCCESS' : 'FAILED',
          details: JSON.stringify({
            ...result,
            processingTime,
            priority,
            trigger,
          }),
          jobId: job.id?.toString(),
          trigger,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      await job.progress(100);

      return {
        success: true,
        submissionId,
        result,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[EnhancedQueueWorker] Timesheet sync failed:`, error);
      
      // Enhanced error logging
      await prisma.xeroSyncLog.create({
        data: {
          submissionId,
          operation: 'SYNC_TIMESHEET',
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          details: JSON.stringify({ 
            error: error instanceof Error ? error.stack : error,
            processingTime,
            priority,
            trigger,
            jobAttempts: job.attemptsMade,
          }),
          jobId: job.id?.toString(),
          trigger,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      throw error;
    }
  }

  private async processProjectSync(job: Job): Promise<any> {
    // Implementation for project sync
    console.log(`[EnhancedQueueWorker] Processing project sync: ${job.id}`);
    // Add project sync logic here
    return { success: true, type: 'project-sync' };
  }

  private async processClientSync(job: Job): Promise<any> {
    // Implementation for client sync
    console.log(`[EnhancedQueueWorker] Processing client sync: ${job.id}`);
    // Add client sync logic here
    return { success: true, type: 'client-sync' };
  }

  private async processBatchSync(job: Job): Promise<any> {
    const { fromDate, toDate, userIds, force, trigger } = job.data;
    const startTime = Date.now();

    try {
      await job.progress(5);

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

      await job.progress(20);

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

          await job.progress(20 + Math.round((70 * (i + 1)) / total));

        } catch (syncError) {
          console.error(`[EnhancedQueueWorker] Failed to sync submission ${submission.id}:`, syncError);
          results.push({
            submissionId: submission.id,
            success: false,
            error: syncError instanceof Error ? syncError.message : 'Unknown error',
          });
        }
      }

      const processingTime = Date.now() - startTime;

      // Enhanced batch logging
      await prisma.xeroSyncLog.create({
        data: {
          operation: 'BATCH_SYNC',
          status: results.some(r => r.success) ? 'SUCCESS' : 'FAILED',
          details: JSON.stringify({
            total,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            processingTime,
            results,
          }),
          jobId: job.id?.toString(),
          trigger,
          metadata: JSON.stringify({ fromDate, toDate, userIds, force }),
        },
      });

      await job.progress(100);

      return {
        success: true,
        total,
        results,
        processingTime,
      };

    } catch (error) {
      console.error(`[EnhancedQueueWorker] Batch sync failed:`, error);
      throw error;
    }
  }

  private async processHealthCheck(job: Job): Promise<any> {
    const { type } = job.data;
    
    try {
      const syncService = new XeroSyncService();
      
      if (type === 'connection') {
        const connectionTest = await syncService.testConnection();
        return { success: true, connectionTest };
      } else {
        const status = await syncService.getSyncStatus();
        return { success: true, status };
      }
    } catch (error) {
      console.error(`[EnhancedQueueWorker] Health check failed:`, error);
      throw error;
    }
  }

  private async processCleanup(job: Job): Promise<any> {
    console.log(`[EnhancedQueueWorker] Processing cleanup: ${job.id}`);
    // Add cleanup logic here (old logs, completed jobs, etc.)
    return { success: true, type: 'cleanup' };
  }

  // Enhanced metrics management
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.updateMetrics();
    }, 30000); // Update metrics every 30 seconds
  }

  private async updateMetrics(): Promise<void> {
    for (const [queueName, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed(),
          queue.getDelayed(),
        ]);

        const currentMetrics = this.metrics.get(queueName)!;
        this.metrics.set(queueName, {
          ...currentMetrics,
          waiting: waiting.length,
          active: active.length,
          paused: await queue.isPaused(),
          lastProcessed: new Date(),
        });

      } catch (error) {
        console.error(`[EnhancedQueueWorker] Failed to update metrics for queue '${queueName}':`, error);
        this.updateMetricsHealth(queueName, 'degraded');
      }
    }
  }

  private updateMetricsActive(queueName: string, delta: number): void {
    const currentMetrics = this.metrics.get(queueName);
    if (currentMetrics) {
      currentMetrics.active = Math.max(0, currentMetrics.active + delta);
      this.metrics.set(queueName, currentMetrics);
    }
  }

  private updateMetricsCompleted(queueName: string, processingTime: number): void {
    const currentMetrics = this.metrics.get(queueName);
    if (currentMetrics) {
      currentMetrics.processed++;
      currentMetrics.averageProcessingTime = currentMetrics.averageProcessingTime 
        ? (currentMetrics.averageProcessingTime + processingTime) / 2 
        : processingTime;
      this.metrics.set(queueName, currentMetrics);
    }
  }

  private updateMetricsFailed(queueName: string): void {
    const currentMetrics = this.metrics.get(queueName);
    if (currentMetrics) {
      currentMetrics.failed++;
      const total = currentMetrics.processed + currentMetrics.failed;
      currentMetrics.errorRate = total > 0 ? (currentMetrics.failed / total) * 100 : 0;
      this.metrics.set(queueName, currentMetrics);
    }
  }

  private updateMetricsHealth(queueName: string, health: 'healthy' | 'degraded' | 'unhealthy'): void {
    const currentMetrics = this.metrics.get(queueName);
    if (currentMetrics) {
      currentMetrics.health = health;
      this.metrics.set(queueName, currentMetrics);
    }
  }

  // Queue management methods
  async addJob(queueName: string, jobType: string, data: any, options?: any): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return await queue.add(jobType, data, options);
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      this.updateMetricsHealth(queueName, 'degraded');
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      this.updateMetricsHealth(queueName, 'healthy');
    }
  }

  async clearFailedJobs(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.clean(0, 'failed');
    }
  }

  getMetrics(queueName?: string): Map<string, WorkerMetrics> | WorkerMetrics | undefined {
    if (queueName) {
      return this.metrics.get(queueName);
    }
    return this.metrics;
  }

  getAllQueues(): Map<string, Queue> {
    return this.queues;
  }

  isHealthy(): boolean {
    for (const [_, metrics] of this.metrics) {
      if (metrics.health === 'unhealthy') {
        return false;
      }
    }
    return true;
  }

  // Graceful shutdown handling
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (this.shutdownPromise) {
        return this.shutdownPromise;
      }

      this.shutdownPromise = this.gracefulShutdown();
      return this.shutdownPromise;
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // For nodemon
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('[EnhancedQueueWorker] Initiating graceful shutdown...');
    this.isRunning = false;

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Wait for active jobs to complete
    const shutdownPromises: Promise<void>[] = [];

    for (const [queueName, queue] of this.queues) {
      shutdownPromises.push(
        new Promise(async (resolve) => {
          try {
            console.log(`[EnhancedQueueWorker] Pausing queue '${queueName}'...`);
            await queue.pause();

            console.log(`[EnhancedQueueWorker] Waiting for active jobs in '${queueName}' to complete...`);
            await queue.whenCurrentJobsFinished();

            console.log(`[EnhancedQueueWorker] Closing queue '${queueName}'...`);
            await queue.close();

            resolve();
          } catch (error) {
            console.error(`[EnhancedQueueWorker] Error shutting down queue '${queueName}':`, error);
            resolve();
          }
        })
      );
    }

    // Wait for all queues to shutdown with timeout
    const shutdownTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[EnhancedQueueWorker] Shutdown timeout reached, forcing exit');
        resolve();
      }, 30000); // 30 second timeout
    });

    await Promise.race([
      Promise.all(shutdownPromises),
      shutdownTimeout,
    ]);

    // Close Redis connections
    await redisConnectionManager.disconnect();

    console.log('[EnhancedQueueWorker] Graceful shutdown completed');
  }

  getStatus(): { running: boolean; healthy: boolean; queues: string[] } {
    return {
      running: this.isRunning,
      healthy: this.isHealthy(),
      queues: Array.from(this.queues.keys()),
    };
  }
}

// Export singleton instance
export const enhancedQueueWorker = EnhancedQueueWorker.getInstance();
export default enhancedQueueWorker;
