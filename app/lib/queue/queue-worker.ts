
/**
 * Queue Worker Initialization
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Initializes and starts the queue worker processes
 */

import { getQueue } from './xero-sync-queue';

export class QueueWorkerManager {
  private static instance: QueueWorkerManager;
  private isStarted = false;

  private constructor() {}

  static getInstance(): QueueWorkerManager {
    if (!QueueWorkerManager.instance) {
      QueueWorkerManager.instance = new QueueWorkerManager();
    }
    return QueueWorkerManager.instance;
  }

  async start() {
    if (this.isStarted) {
      console.log('[QueueWorker] Queue worker already started');
      return;
    }

    try {
      console.log('[QueueWorker] Starting queue worker...');
      
      // Check if queue is available
      const queue = await getQueue();
      if (!queue) {
        console.log('[QueueWorker] Queue unavailable (Redis disabled), starting in degraded mode');
        this.isStarted = true;
        return;
      }
      
      // Perform health check
      await this.healthCheck();
      
      this.isStarted = true;
      console.log('[QueueWorker] Queue worker started successfully');
      
    } catch (error) {
      console.error('[QueueWorker] Failed to start queue worker:', error);
      // Don't throw error in development mode - allow graceful degradation
      if (process.env.NODE_ENV === 'development' || process.env.REDIS_OPTIONAL === 'true') {
        console.log('[QueueWorker] Starting in degraded mode due to Redis unavailability');
        this.isStarted = true;
        return;
      }
      throw error;
    }
  }

  async stop() {
    if (!this.isStarted) {
      return;
    }

    try {
      console.log('[QueueWorker] Stopping queue worker...');
      
      // Gracefully close the queue if it exists
      const queue = await getQueue();
      if (queue) {
        await queue.close();
      }
      
      this.isStarted = false;
      console.log('[QueueWorker] Queue worker stopped');
      
    } catch (error) {
      console.error('[QueueWorker] Error stopping queue worker:', error);
    }
  }

  private async healthCheck() {
    try {
      const queue = await getQueue();
      if (!queue) {
        console.log('[QueueWorker] Health check: Queue unavailable, running in degraded mode');
        return;
      }
      
      // Simple health check to ensure Redis connection is working
      const waiting = await queue.getWaiting();
      console.log(`[QueueWorker] Health check passed. ${waiting.length} jobs waiting`);
    } catch (error) {
      console.error('[QueueWorker] Health check failed:', error);
      throw new Error('Queue health check failed - Redis may not be available');
    }
  }

  isRunning(): boolean {
    return this.isStarted;
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  QueueWorkerManager.getInstance().start().catch(error => {
    console.error('[QueueWorker] Failed to auto-start queue worker:', error);
  });
}

export default QueueWorkerManager;
