
/**
 * Phase 2B-8b: Demo Metrics Generator
 * Generates sample performance metrics for testing the dashboard
 */

import { prisma } from '@/lib/db';
import { metricsService } from './metrics-service';
import { MetricType, HealthCheckType, PipelineType, TriggerType, HealthStatus, PipelineStatus } from '@prisma/client';

export class DemoMetricsGenerator {
  private static instance: DemoMetricsGenerator;
  
  public static getInstance(): DemoMetricsGenerator {
    if (!DemoMetricsGenerator.instance) {
      DemoMetricsGenerator.instance = new DemoMetricsGenerator();
    }
    return DemoMetricsGenerator.instance;
  }

  /**
   * Generate sample performance metrics for the last 24 hours
   */
  async generateSampleMetrics(): Promise<void> {
    console.log('🎯 Generating demo performance metrics...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Clear existing demo data (optional - only metrics from last 24h)
      await this.clearRecentMetrics();

      // Generate performance metrics
      await this.generatePerformanceMetrics(oneDayAgo, now);

      // Generate health checks
      await this.generateHealthChecks(oneDayAgo, now);

      // Generate pipeline metrics
      await this.generatePipelineMetrics(oneDayAgo, now);

      console.log('✅ Demo metrics generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate demo metrics:', error);
      throw error;
    }
  }

  /**
   * Clear recent metrics to avoid duplicates
   */
  private async clearRecentMetrics(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await Promise.all([
      prisma.performanceMetric.deleteMany({
        where: { timestamp: { gte: oneDayAgo } }
      }),
      prisma.systemHealthCheck.deleteMany({
        where: { timestamp: { gte: oneDayAgo } }
      }),
      prisma.pipelineMetrics.deleteMany({
        where: { startedAt: { gte: oneDayAgo } }
      })
    ]);
  }

  /**
   * Generate performance metrics
   */
  private async generatePerformanceMetrics(startTime: Date, endTime: Date): Promise<void> {
    const metrics = [];
    const timeSpan = endTime.getTime() - startTime.getTime();
    const intervalMs = 5 * 60 * 1000; // 5 minute intervals
    const totalIntervals = Math.floor(timeSpan / intervalMs);

    for (let i = 0; i < totalIntervals; i++) {
      const timestamp = new Date(startTime.getTime() + (i * intervalMs));
      
      // API Response times
      metrics.push({
        metricType: MetricType.TIMER,
        entityType: 'api',
        name: 'api_response_time',
        value: this.randomBetween(50, 500),
        unit: 'ms',
        timestamp,
        source: 'api_gateway',
        tags: { endpoint: '/api/timesheets' }
      });

      metrics.push({
        metricType: MetricType.TIMER,
        entityType: 'api',
        name: 'xero_api_response_time',
        value: this.randomBetween(100, 2000),
        unit: 'ms',
        timestamp,
        source: 'xero_integration',
        tags: { endpoint: 'invoices' }
      });

      // Database query times
      metrics.push({
        metricType: MetricType.TIMER,
        entityType: 'database',
        name: 'db_query_time',
        value: this.randomBetween(10, 200),
        unit: 'ms',
        timestamp,
        source: 'database',
        tags: { query_type: 'SELECT' }
      });

      // Request counts
      metrics.push({
        metricType: MetricType.COUNTER,
        entityType: 'api',
        name: 'api_requests',
        value: this.randomBetween(5, 50),
        unit: 'count',
        timestamp,
        source: 'api_gateway',
        tags: { status: '200' }
      });

      // Error counts
      if (Math.random() < 0.1) { // 10% chance of errors
        metrics.push({
          metricType: MetricType.COUNTER,
          entityType: 'api',
          name: 'api_errors',
          value: this.randomBetween(1, 5),
          unit: 'count',
          timestamp,
          source: 'api_gateway',
          tags: { status: '500' }
        });
      }

      // Memory usage
      metrics.push({
        metricType: MetricType.GAUGE,
        entityType: 'system',
        name: 'memory_usage',
        value: this.randomBetween(40, 85),
        unit: 'percentage',
        timestamp,
        source: 'system_monitor'
      });

      // CPU usage
      metrics.push({
        metricType: MetricType.GAUGE,
        entityType: 'system',
        name: 'cpu_usage',
        value: this.randomBetween(15, 75),
        unit: 'percentage',
        timestamp,
        source: 'system_monitor'
      });
    }

    // Batch create metrics
    const batchSize = 100;
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      await metricsService.recordMetrics(batch);
    }

    console.log(`Generated ${metrics.length} performance metrics`);
  }

  /**
   * Generate health checks
   */
  private async generateHealthChecks(startTime: Date, endTime: Date): Promise<void> {
    const components = ['database', 'xero_api', 'redis', 'filesystem'];
    const timeSpan = endTime.getTime() - startTime.getTime();
    const intervalMs = 2 * 60 * 1000; // 2 minute intervals
    const totalIntervals = Math.floor(timeSpan / intervalMs);

    for (let i = 0; i < totalIntervals; i++) {
      const timestamp = new Date(startTime.getTime() + (i * intervalMs));

      for (const component of components) {
        const responseTime = this.randomBetween(20, 1000);
        const isHealthy = Math.random() > 0.05; // 95% healthy
        const isDegraded = !isHealthy && Math.random() > 0.5;

        let status: HealthStatus;
        let error: string | undefined;

        if (isHealthy) {
          status = HealthStatus.HEALTHY;
        } else if (isDegraded) {
          status = HealthStatus.DEGRADED;
          error = `${component} responding slowly`;
        } else {
          status = HealthStatus.UNHEALTHY;
          error = `${component} connection failed`;
        }

        await metricsService.recordHealthCheck({
          checkType: HealthCheckType.AVAILABILITY,
          component,
          responseTime: status === HealthStatus.UNHEALTHY ? undefined : responseTime,
          error,
          expectedMax: component === 'xero_api' ? 1500 : 500,
          details: {
            timestamp,
            version: '1.0.0',
            endpoint: `${component}/health`
          }
        });
      }
    }

    console.log(`Generated health checks for ${components.length} components`);
  }

  /**
   * Generate pipeline metrics
   */
  private async generatePipelineMetrics(startTime: Date, endTime: Date): Promise<void> {
    const pipelineTypes = [PipelineType.SYNC, PipelineType.VALIDATION, PipelineType.PROCESSING];
    const triggerTypes = [TriggerType.MANUAL, TriggerType.SCHEDULED, TriggerType.AUTOMATIC];
    const timeSpan = endTime.getTime() - startTime.getTime();
    const avgPipelineInterval = 30 * 60 * 1000; // Average 30 minutes between pipelines

    const totalPipelines = Math.floor(timeSpan / avgPipelineInterval) * 2; // More frequent for demo

    for (let i = 0; i < totalPipelines; i++) {
      const pipelineType = pipelineTypes[Math.floor(Math.random() * pipelineTypes.length)];
      const triggerType = triggerTypes[Math.floor(Math.random() * triggerTypes.length)];
      const executionId = `exec_${Date.now()}_${i}`;
      
      const startedAt = new Date(startTime.getTime() + (Math.random() * timeSpan));
      const duration = this.randomBetween(30000, 600000); // 30s to 10min
      const completedAt = new Date(startedAt.getTime() + duration);

      const itemsProcessed = this.randomBetween(50, 1000);
      const successRate = Math.random() > 0.1 ? this.randomBetween(85, 100) : this.randomBetween(40, 84);
      const itemsSuccessful = Math.floor((itemsProcessed * successRate) / 100);
      const itemsFailed = itemsProcessed - itemsSuccessful;

      const status = successRate >= 95 ? PipelineStatus.SUCCESS :
                    successRate >= 70 ? PipelineStatus.SUCCESS :
                    PipelineStatus.FAILED;

      // Start pipeline metrics
      const pipelineId = await metricsService.startPipelineMetrics({
        pipelineType,
        executionId,
        triggeredBy: triggerType === TriggerType.MANUAL ? 'user_admin' : 'system',
        triggerType,
        batchSize: itemsProcessed,
        metadata: {
          source: 'demo_generator',
          environment: 'development'
        }
      });

      // Update with progress
      await metricsService.updatePipelineMetrics(executionId, {
        itemsProcessed,
        itemsSuccessful,
        itemsFailed,
        memoryUsage: this.randomBetween(100, 500),
        cpuUsage: this.randomBetween(20, 80),
        dbQueries: this.randomBetween(itemsProcessed * 2, itemsProcessed * 5),
        apiCalls: this.randomBetween(10, 100),
      });

      // Complete pipeline
      await metricsService.completePipelineMetrics(executionId, status, {
        itemsProcessed,
        itemsSuccessful,
        itemsFailed
      });

      // Update the timestamps manually since our demo data needs custom timing
      if (pipelineId) {
        await prisma.pipelineMetrics.updateMany({
          where: { executionId },
          data: {
            startedAt,
            completedAt,
            totalDuration: duration
          }
        });
      }
    }

    console.log(`Generated ${totalPipelines} pipeline executions`);
  }

  /**
   * Generate real-time demo data (for immediate dashboard testing)
   */
  async generateRealtimeDemo(): Promise<void> {
    console.log('🚀 Generating real-time demo data...');

    const now = new Date();
    
    // Generate some immediate metrics
    await metricsService.recordMetrics([
      {
        metricType: MetricType.COUNTER,
        name: 'current_active_users',
        value: this.randomBetween(15, 45),
        unit: 'count',
        entityType: 'system',
        source: 'session_manager'
      },
      {
        metricType: MetricType.TIMER,
        name: 'recent_api_response',
        value: this.randomBetween(80, 300),
        unit: 'ms',
        entityType: 'api',
        source: 'load_balancer'
      }
    ]);

    // Generate recent health checks
    const components = ['database', 'xero_api', 'redis', 'filesystem'];
    for (const component of components) {
      await metricsService.recordHealthCheck({
        checkType: HealthCheckType.AVAILABILITY,
        component,
        responseTime: this.randomBetween(50, 200),
        expectedMax: 500,
        details: { realtime_demo: true }
      });
    }

    // Start an active pipeline for demo
    const executionId = `realtime_demo_${Date.now()}`;
    await metricsService.startPipelineMetrics({
      pipelineType: PipelineType.SYNC,
      executionId,
      triggeredBy: 'demo_user',
      triggerType: TriggerType.MANUAL,
      batchSize: 150,
      metadata: { demo: true, realtime: true }
    });

    console.log('✅ Real-time demo data generated');
  }

  /**
   * Utility function to generate random numbers
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Export singleton instance
export const demoMetricsGenerator = DemoMetricsGenerator.getInstance();
