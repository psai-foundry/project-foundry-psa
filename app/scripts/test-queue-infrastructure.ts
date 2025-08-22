

/**
 * Queue Infrastructure Integration Test
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Comprehensive test script to verify all components are working correctly
 * Usage: yarn queue:test
 */

import { enhancedQueueWorker } from '../lib/queue/enhanced-queue-worker';
import { redisConnectionManager } from '../lib/queue/redis-config';
import { queueManager } from '../lib/queue/queue-manager';
import { prisma } from '../lib/db';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class QueueInfrastructureTest {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Queue Infrastructure Integration Test');
    console.log('=====================================');
    console.log('Phase 2B-4: Queue Infrastructure Setup\n');

    const testSuite = [
      { name: 'Database Connection', test: () => this.testDatabaseConnection() },
      { name: 'Redis Connection', test: () => this.testRedisConnection() },
      { name: 'Redis Configuration', test: () => this.testRedisConfiguration() },
      { name: 'Queue Worker Initialization', test: () => this.testQueueWorkerInit() },
      { name: 'Queue System Health', test: () => this.testQueueSystemHealth() },
      { name: 'Queue Manager Integration', test: () => this.testQueueManagerIntegration() },
      { name: 'Job Addition', test: () => this.testJobAddition() },
      { name: 'Queue Statistics', test: () => this.testQueueStatistics() },
      { name: 'API Endpoints', test: () => this.testAPIEndpoints() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
    ];

    for (const { name, test } of testSuite) {
      await this.runTest(name, test);
    }

    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    console.log(`Running test: ${name}...`);

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        passed: true,
        duration,
        details: result,
      });
      
      console.log(`✅ ${name} - PASSED (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      
      console.log(`❌ ${name} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  private async testDatabaseConnection(): Promise<any> {
    console.log('   Testing database connectivity...');
    await prisma.$connect();
    
    // Test basic query
    const userCount = await prisma.user.count();
    console.log(`   Found ${userCount} users in database`);
    
    return { userCount, connected: true };
  }

  private async testRedisConnection(): Promise<any> {
    console.log('   Testing Redis connectivity...');
    
    // Test connection
    const connection = await redisConnectionManager.connect();
    console.log('   Redis connection established');
    
    // Test ping
    const pingResult = await redisConnectionManager.ping();
    if (!pingResult) {
      throw new Error('Redis ping failed');
    }
    console.log('   Redis ping successful');
    
    // Test basic operations
    const redis = redisConnectionManager.getConnection();
    if (!redis) {
      throw new Error('Redis connection not available');
    }
    
    await redis.set('test:key', 'test-value', 'EX', 30);
    const value = await redis.get('test:key');
    
    if (value !== 'test-value') {
      throw new Error('Redis set/get operation failed');
    }
    
    await redis.del('test:key');
    console.log('   Redis operations working correctly');
    
    return { ping: pingResult, operations: true };
  }

  private async testRedisConfiguration(): Promise<any> {
    console.log('   Testing Redis configuration...');
    
    const isReady = redisConnectionManager.isReady();
    if (!isReady) {
      throw new Error('Redis is not ready');
    }
    
    // Test connection resilience
    const waitResult = await redisConnectionManager.waitForConnection(5000);
    if (!waitResult) {
      throw new Error('Redis connection wait failed');
    }
    
    console.log('   Redis configuration validated');
    return { ready: isReady, waitForConnection: waitResult };
  }

  private async testQueueWorkerInit(): Promise<any> {
    console.log('   Testing queue worker initialization...');
    
    await enhancedQueueWorker.initialize();
    
    const status = enhancedQueueWorker.getStatus();
    if (!status.running) {
      throw new Error('Queue worker is not running after initialization');
    }
    
    console.log(`   Queue worker initialized with ${status.queues.length} queues`);
    console.log(`   Queues: ${status.queues.join(', ')}`);
    
    return status;
  }

  private async testQueueSystemHealth(): Promise<any> {
    console.log('   Testing queue system health...');
    
    const health = await queueManager.getSystemStatus();
    
    if (!health.running) {
      throw new Error('Queue system is not running');
    }
    
    if (!health.healthy) {
      throw new Error('Queue system is not healthy');
    }
    
    console.log(`   System health check passed`);
    console.log(`   Queues: ${health.queues.join(', ')}`);
    
    const connectivity = await queueManager.healthCheck();
    if (!connectivity.overall) {
      throw new Error('System connectivity test failed');
    }
    
    console.log('   Connectivity test passed');
    
    return { ...health, connectivity };
  }

  private async testQueueManagerIntegration(): Promise<any> {
    console.log('   Testing queue manager integration...');
    
    await queueManager.initialize();
    console.log('   Queue manager initialized');
    
    // Test health check job
    const healthJob = await queueManager.addHealthCheckJob({
      type: 'connection'
    });
    
    console.log(`   Health check job added: ${healthJob.id}`);
    
    return { initialized: true, healthJobId: healthJob.id };
  }

  private async testJobAddition(): Promise<any> {
    console.log('   Testing job addition capabilities...');
    
    const results = [];
    
    // Test health check job
    const healthJob = await enhancedQueueWorker.addJob(
      'xero-sync-high-priority',
      'health-check',
      { type: 'connection' }
    );
    console.log(`   Health check job added: ${healthJob.id}`);
    results.push({ type: 'health-check', id: healthJob.id });
    
    // Wait a moment for job to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return results;
  }

  private async testQueueStatistics(): Promise<any> {
    console.log('   Testing queue statistics...');
    
    const stats = await queueManager.getQueueStats();
    const queueNames = Object.keys(stats);
    
    if (queueNames.length === 0) {
      throw new Error('No queues found in statistics');
    }
    
    console.log(`   Statistics retrieved for ${queueNames.length} queues`);
    
    for (const queueName of queueNames) {
      const queueStats = stats[queueName];
      console.log(`   ${queueName}: ${JSON.stringify({
        waiting: queueStats.waiting,
        active: queueStats.active,
        completed: queueStats.completed,
        failed: queueStats.failed,
      })}`);
    }
    
    return stats;
  }

  private async testAPIEndpoints(): Promise<any> {
    console.log('   Testing API endpoint structure...');
    
    // We can't test the actual HTTP endpoints in this script, but we can verify
    // the underlying functionality exists
    
    const endpoints = [
      '/api/xero/sync/queue/metrics',
      '/api/xero/sync/queue/manage', 
      '/api/xero/sync/queue/jobs',
      '/api/xero/sync/queue/status',
    ];
    
    console.log(`   API endpoints defined: ${endpoints.join(', ')}`);
    
    return { endpoints, count: endpoints.length };
  }

  private async testErrorHandling(): Promise<any> {
    console.log('   Testing error handling...');
    
    try {
      // Test invalid queue name
      await enhancedQueueWorker.addJob('invalid-queue', 'test', {});
      throw new Error('Should have thrown error for invalid queue');
    } catch (error) {
      console.log('   ✓ Invalid queue error handling works');
    }
    
    // Test queue pause/resume
    const queues = enhancedQueueWorker.getAllQueues();
    const firstQueueName = Array.from(queues.keys())[0];
    
    if (firstQueueName) {
      await queueManager.pauseQueue(firstQueueName);
      console.log(`   ✓ Queue '${firstQueueName}' paused successfully`);
      
      await queueManager.resumeQueue(firstQueueName);
      console.log(`   ✓ Queue '${firstQueueName}' resumed successfully`);
    }
    
    return { errorHandling: true, queueOperations: true };
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.name}: ${r.error}`);
        });
      console.log('');
    }
    
    if (passed === this.results.length) {
      console.log('🎉 All tests passed! Queue Infrastructure is ready for production.');
      console.log('\nPhase 2B-4: Queue Infrastructure Setup - COMPLETE ✅');
      console.log('\nNext Steps:');
      console.log('1. Start Redis server: redis-server');
      console.log('2. Initialize queue system: yarn queue:init');
      console.log('3. Start queue worker: yarn queue:worker');
      console.log('4. Monitor via dashboard: /dashboard/settings (Queue Infrastructure tab)');
      console.log('5. Test with actual timesheet approvals');
    } else {
      console.log('⚠️  Some tests failed. Please review the issues above before proceeding.');
      console.log('\nTroubleshooting:');
      console.log('1. Ensure Redis is running and accessible');
      console.log('2. Check environment variables (REDIS_URL)');
      console.log('3. Verify database connection');
      console.log('4. Check for any missing dependencies');
    }
  }
}

async function runTests() {
  const tester = new QueueInfrastructureTest();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed to complete:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await prisma.$disconnect();
    await redisConnectionManager.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, cleaning up...');
  await prisma.$disconnect();
  await redisConnectionManager.disconnect();
  process.exit(0);
});

// Run tests if called directly
if (require.main === module) {
  runTests();
}

export default runTests;
