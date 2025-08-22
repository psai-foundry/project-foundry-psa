

/**
 * Queue Worker Startup Script
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Starts the queue worker system in standalone mode
 * Usage: yarn queue:worker
 */

import { enhancedQueueWorker } from '../lib/queue/enhanced-queue-worker';
import { redisConnectionManager } from '../lib/queue/redis-config';

async function startQueueWorker() {
  console.log('🔧 Starting Queue Worker...');
  console.log('==========================');

  try {
    // Initialize and start the worker
    console.log('Initializing enhanced queue worker...');
    await enhancedQueueWorker.initialize();
    
    const status = enhancedQueueWorker.getStatus();
    console.log('✅ Queue worker started successfully!');
    console.log(`Running: ${status.running}`);
    console.log(`Healthy: ${status.healthy}`);
    console.log(`Queues: ${status.queues.join(', ')}`);

    // Keep the worker running
    console.log('\n🚀 Queue worker is now processing jobs...');
    console.log('Press Ctrl+C to stop gracefully');
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      try {
        const currentStatus = enhancedQueueWorker.getStatus();
        const redisHealthy = await redisConnectionManager.ping();
        
        console.log(`[${new Date().toISOString()}] Health Check:`, {
          worker: currentStatus.healthy ? '✅' : '⚠️',
          redis: redisHealthy ? '✅' : '❌',
        });
        
        if (!currentStatus.healthy || !redisHealthy) {
          console.warn('⚠️  System health degraded, monitoring...');
        }
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000); // Every 30 seconds

    // Keep the process alive
    return new Promise<never>((resolve, reject) => {
      // The process will be kept alive by the queue worker
      // until a shutdown signal is received
    });

  } catch (error) {
    console.error('❌ Failed to start queue worker:');
    console.error(error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
  
  try {
    console.log('Stopping queue worker...');
    // The enhanced queue worker has built-in graceful shutdown
    // It will be triggered by the process signals
    
    console.log('Disconnecting from Redis...');
    await redisConnectionManager.disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the worker
if (require.main === module) {
  startQueueWorker().catch((error) => {
    console.error('❌ Queue worker startup failed:', error);
    process.exit(1);
  });
}

export default startQueueWorker;
