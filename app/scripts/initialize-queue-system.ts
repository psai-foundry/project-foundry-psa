

/**
 * Queue System Initialization Script
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Initializes the enhanced Redis-based queue system
 * Usage: yarn queue:init
 */

import { enhancedQueueWorker } from '../lib/queue/enhanced-queue-worker';
import { redisConnectionManager } from '../lib/queue/redis-config';
import { prisma } from '../lib/db';

async function initializeQueueSystem() {
  console.log('🚀 Initializing Queue System...');
  console.log('================================');

  try {
    // Step 1: Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connected successfully');

    // Step 2: Test Redis connection
    console.log('2. Testing Redis connection...');
    const redisHealthy = await redisConnectionManager.ping();
    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }
    console.log('   ✅ Redis connected successfully');

    // Step 3: Initialize enhanced queue worker
    console.log('3. Initializing enhanced queue worker...');
    await enhancedQueueWorker.initialize();
    console.log('   ✅ Queue worker initialized successfully');

    // Step 4: Verify system health
    console.log('4. Verifying system health...');
    const status = enhancedQueueWorker.getStatus();
    
    if (!status.running) {
      throw new Error('Queue worker is not running');
    }
    
    if (!status.healthy) {
      console.warn('   ⚠️  Queue worker is running but has health issues');
    } else {
      console.log('   ✅ Queue worker is healthy');
    }

    console.log('5. Queue system status:');
    console.log(`   - Running: ${status.running ? '✅' : '❌'}`);
    console.log(`   - Healthy: ${status.healthy ? '✅' : '⚠️'}`);
    console.log(`   - Queues: ${status.queues.join(', ')}`);

    // Step 6: Add a test health check job
    console.log('6. Adding test health check job...');
    try {
      const job = await enhancedQueueWorker.addJob(
        'xero-sync-high-priority',
        'health-check',
        { type: 'connection' }
      );
      console.log(`   ✅ Test job added successfully (ID: ${job.id})`);
    } catch (error) {
      console.warn(`   ⚠️  Could not add test job: ${error instanceof Error ? error.message : error}`);
    }

    console.log('\n🎉 Queue System Initialization Complete!');
    console.log('=====================================');
    console.log('The queue system is ready for production use.');
    console.log('\nNext steps:');
    console.log('1. Monitor the queue dashboard at /admin/settings');
    console.log('2. Test timesheet sync by approving a timesheet');
    console.log('3. Check Redis connection is stable');
    console.log('4. Monitor system health metrics');

  } catch (error) {
    console.error('\n❌ Queue System Initialization Failed!');
    console.error('====================================');
    console.error(error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Redis is running and accessible');
    console.error('2. Check environment variables (REDIS_URL)');
    console.error('3. Verify database connection');
    console.error('4. Check network connectivity');
    
    process.exit(1);
  } finally {
    // Clean up connections
    await prisma.$disconnect();
    console.log('\nCleaning up connections...');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await redisConnectionManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await redisConnectionManager.disconnect();
  process.exit(0);
});

// Run initialization
if (require.main === module) {
  initializeQueueSystem();
}

export default initializeQueueSystem;
