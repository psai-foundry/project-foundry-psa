
/**
 * Metrics Collection Service
 * Phase 2B-8a: Performance Metrics Collection Infrastructure
 */

import { prisma } from '@/lib/db';
import { MetricType, HealthCheckType, HealthStatus, PipelineType, TriggerType, PipelineStatus } from '@prisma/client';

export interface MetricData {
  metricType: MetricType;
  entityType?: string;
  entityId?: string;
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, any>;
  executionId?: string;
  userId?: string;
  sessionId?: string;
  source?: string;
}

export interface HealthCheckData {
  checkType: HealthCheckType;
  component: string;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
  expectedMax?: number;
}

export interface PipelineMetricsData {
  pipelineType: PipelineType;
  executionId: string;
  triggeredBy?: string;
  triggerType: TriggerType;
  batchSize?: number;
  metadata?: Record<string, any>;
}

export interface PipelineMetricsUpdate {
  itemsProcessed?: number;
  itemsSuccessful?: number;
  itemsFailed?: number;
  itemsSkipped?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  dbQueries?: number;
  apiCalls?: number;
  status?: PipelineStatus;
  metadata?: Record<string, any>;
}

class MetricsService {
  private static instance: MetricsService;
  
  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Record a performance metric
   */
  async recordMetric(data: MetricData): Promise<void> {
    try {
      await prisma.performanceMetric.create({
        data: {
          metricType: data.metricType,
          entityType: data.entityType,
          entityId: data.entityId,
          name: data.name,
          value: data.value,
          unit: data.unit,
          tags: data.tags || {},
          executionId: data.executionId,
          userId: data.userId,
          sessionId: data.sessionId,
          source: data.source || 'system',
        },
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
      // Don't throw - metrics collection shouldn't break main functionality
    }
  }

  /**
   * Record multiple metrics in a batch
   */
  async recordMetrics(metrics: MetricData[]): Promise<void> {
    try {
      const metricsData = metrics.map(data => ({
        metricType: data.metricType,
        entityType: data.entityType,
        entityId: data.entityId,
        name: data.name,
        value: data.value,
        unit: data.unit,
        tags: data.tags || {},
        executionId: data.executionId,
        userId: data.userId,
        sessionId: data.sessionId,
        source: data.source || 'system',
      }));

      await prisma.performanceMetric.createMany({
        data: metricsData,
      });
    } catch (error) {
      console.error('Failed to record metrics batch:', error);
    }
  }

  /**
   * Record a timer metric (measures duration)
   */
  async recordTimer(
    name: string,
    durationMs: number,
    options: Partial<MetricData> = {}
  ): Promise<void> {
    await this.recordMetric({
      ...options,
      metricType: MetricType.TIMER,
      name,
      value: durationMs,
      unit: 'ms',
    });
  }

  /**
   * Record a counter metric (measures events)
   */
  async recordCounter(
    name: string,
    count: number = 1,
    options: Partial<MetricData> = {}
  ): Promise<void> {
    await this.recordMetric({
      ...options,
      metricType: MetricType.COUNTER,
      name,
      value: count,
      unit: 'count',
    });
  }

  /**
   * Record a gauge metric (measures current value)
   */
  async recordGauge(
    name: string,
    value: number,
    unit: string,
    options: Partial<MetricData> = {}
  ): Promise<void> {
    await this.recordMetric({
      ...options,
      metricType: MetricType.GAUGE,
      name,
      value,
      unit,
    });
  }

  /**
   * Record a health check result
   */
  async recordHealthCheck(data: HealthCheckData): Promise<void> {
    try {
      const status = this.determineHealthStatus(data);
      const slaBreached = data.expectedMax && data.responseTime 
        ? data.responseTime > data.expectedMax 
        : false;

      await prisma.systemHealthCheck.create({
        data: {
          checkType: data.checkType,
          component: data.component,
          status,
          responseTime: data.responseTime,
          details: data.details || {},
          error: data.error,
          expectedMax: data.expectedMax,
          slaBreached: slaBreached || false,
        },
      });
    } catch (error) {
      console.error('Failed to record health check:', error);
    }
  }

  /**
   * Start pipeline metrics tracking
   */
  async startPipelineMetrics(data: PipelineMetricsData): Promise<string> {
    try {
      const pipelineMetrics = await prisma.pipelineMetrics.create({
        data: {
          pipelineType: data.pipelineType,
          executionId: data.executionId,
          triggeredBy: data.triggeredBy,
          triggerType: data.triggerType,
          batchSize: data.batchSize,
          status: PipelineStatus.RUNNING,
          metadata: data.metadata || {},
        },
      });
      return pipelineMetrics.id;
    } catch (error) {
      console.error('Failed to start pipeline metrics:', error);
      return '';
    }
  }

  /**
   * Update pipeline metrics
   */
  async updatePipelineMetrics(
    executionId: string,
    updates: PipelineMetricsUpdate
  ): Promise<void> {
    try {
      const updateData: any = { ...updates };

      // Calculate rates if we have the data
      if (updates.itemsProcessed && updates.itemsSuccessful !== undefined) {
        updateData.successRate = (updates.itemsSuccessful / updates.itemsProcessed) * 100;
        updateData.errorRate = 100 - updateData.successRate;
      }

      await prisma.pipelineMetrics.updateMany({
        where: { executionId },
        data: updateData,
      });
    } catch (error) {
      console.error('Failed to update pipeline metrics:', error);
    }
  }

  /**
   * Complete pipeline metrics tracking
   */
  async completePipelineMetrics(
    executionId: string,
    status: PipelineStatus,
    finalCounts?: Partial<PipelineMetricsUpdate>
  ): Promise<void> {
    try {
      const pipeline = await prisma.pipelineMetrics.findFirst({
        where: { executionId },
        select: { startedAt: true }
      });

      if (!pipeline) return;

      const completedAt = new Date();
      const totalDuration = completedAt.getTime() - pipeline.startedAt.getTime();

      const updateData: any = {
        completedAt,
        totalDuration,
        status,
        ...finalCounts,
      };

      // Calculate final rates
      if (finalCounts?.itemsProcessed) {
        const successful = finalCounts.itemsSuccessful || 0;
        updateData.successRate = (successful / finalCounts.itemsProcessed) * 100;
        updateData.errorRate = 100 - updateData.successRate;
      }

      await prisma.pipelineMetrics.updateMany({
        where: { executionId },
        data: updateData,
      });
    } catch (error) {
      console.error('Failed to complete pipeline metrics:', error);
    }
  }

  /**
   * Get metrics for a time range
   */
  async getMetrics(
    name: string,
    from: Date,
    to: Date,
    tags?: Record<string, any>
  ): Promise<any[]> {
    try {
      const where: any = {
        name,
        timestamp: {
          gte: from,
          lte: to,
        },
      };

      if (tags) {
        where.tags = {
          path: Object.keys(tags),
          array_contains: Object.values(tags),
        };
      }

      return await prisma.performanceMetric.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Get system health overview
   */
  async getSystemHealth(): Promise<{
    overall: HealthStatus;
    components: Record<string, { status: HealthStatus; lastCheck: Date }>;
  }> {
    try {
      // Get latest health check for each component
      const latestChecks = await prisma.systemHealthCheck.groupBy({
        by: ['component'],
        _max: {
          timestamp: true,
        },
      });

      const componentStatuses: Record<string, { status: HealthStatus; lastCheck: Date }> = {};
      
      for (const check of latestChecks) {
        const latest = await prisma.systemHealthCheck.findFirst({
          where: {
            component: check.component,
            timestamp: check._max.timestamp!,
          },
          select: {
            status: true,
            timestamp: true,
          },
        });

        if (latest) {
          componentStatuses[check.component] = {
            status: latest.status,
            lastCheck: latest.timestamp,
          };
        }
      }

      // Determine overall health
      const statuses = Object.values(componentStatuses).map(c => c.status);
      let overall: HealthStatus = HealthStatus.HEALTHY;
      
      if (statuses.includes(HealthStatus.UNHEALTHY)) {
        overall = HealthStatus.UNHEALTHY;
      } else if (statuses.includes(HealthStatus.DEGRADED)) {
        overall = HealthStatus.DEGRADED;
      } else if (statuses.includes(HealthStatus.UNKNOWN) || statuses.length === 0) {
        overall = HealthStatus.UNKNOWN;
      }

      return {
        overall,
        components: componentStatuses,
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        overall: HealthStatus.UNKNOWN,
        components: {},
      };
    }
  }

  private determineHealthStatus(data: HealthCheckData): HealthStatus {
    if (data.error) {
      return HealthStatus.UNHEALTHY;
    }

    if (data.responseTime && data.expectedMax) {
      if (data.responseTime > data.expectedMax * 1.5) {
        return HealthStatus.UNHEALTHY;
      } else if (data.responseTime > data.expectedMax) {
        return HealthStatus.DEGRADED;
      }
    }

    return HealthStatus.HEALTHY;
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance();
export default MetricsService;
