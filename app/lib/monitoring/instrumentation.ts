
/**
 * Performance Instrumentation Utilities
 * Phase 2B-8a: Adds performance tracking to existing operations
 */

import { metricsService } from '@/lib/services/metrics-service';
import { MetricType } from '@prisma/client';

export interface InstrumentationOptions {
  metricName: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  executionId?: string;
  tags?: Record<string, any>;
}

/**
 * Decorator to instrument async functions with timing metrics
 */
export function instrumentAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: InstrumentationOptions
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let error: Error | null = null;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Record timing metric
      await metricsService.recordTimer(
        options.metricName,
        duration,
        {
          entityType: options.entityType,
          entityId: options.entityId,
          userId: options.userId,
          executionId: options.executionId,
          tags: {
            ...options.tags,
            success: success.toString(),
            error: error?.name || null,
          },
        }
      );

      // Record success/failure counter
      await metricsService.recordCounter(
        `${options.metricName}_${success ? 'success' : 'failure'}`,
        1,
        {
          entityType: options.entityType,
          entityId: options.entityId,
          userId: options.userId,
          executionId: options.executionId,
          tags: options.tags,
        }
      );
    }
  };
}

/**
 * Manual timer class for flexible timing
 */
export class Timer {
  private startTime: number;
  public options: InstrumentationOptions;

  constructor(options: InstrumentationOptions) {
    this.options = options;
    this.startTime = Date.now();
  }

  async stop(success: boolean = true, error?: Error): Promise<void> {
    const duration = Date.now() - this.startTime;
    
    await metricsService.recordTimer(
      this.options.metricName,
      duration,
      {
        entityType: this.options.entityType,
        entityId: this.options.entityId,
        userId: this.options.userId,
        executionId: this.options.executionId,
        tags: {
          ...this.options.tags,
          success: success.toString(),
          error: error?.name || null,
        },
      }
    );
  }
}

/**
 * Database query instrumentation wrapper
 */
export async function instrumentDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options: Partial<InstrumentationOptions> = {}
): Promise<T> {
  const timer = new Timer({
    metricName: `db_query_${queryName}`,
    entityType: 'database',
    ...options,
  });

  try {
    const result = await queryFn();
    await timer.stop(true);
    await metricsService.recordCounter('db_queries_total');
    return result;
  } catch (error) {
    await timer.stop(false, error as Error);
    await metricsService.recordCounter('db_queries_failed');
    throw error;
  }
}

/**
 * API call instrumentation wrapper
 */
export async function instrumentAPICall<T>(
  apiName: string,
  callFn: () => Promise<T>,
  options: Partial<InstrumentationOptions> = {}
): Promise<T> {
  const timer = new Timer({
    metricName: `api_call_${apiName}`,
    entityType: 'api',
    ...options,
  });

  try {
    const result = await callFn();
    await timer.stop(true);
    await metricsService.recordCounter('api_calls_total');
    return result;
  } catch (error) {
    await timer.stop(false, error as Error);
    await metricsService.recordCounter('api_calls_failed');
    throw error;
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private initialMemory: number;
  public options: InstrumentationOptions;

  constructor(options: InstrumentationOptions) {
    this.options = options;
    this.initialMemory = this.getCurrentMemoryUsage();
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  async record(): Promise<void> {
    const currentMemory = this.getCurrentMemoryUsage();
    const memoryDelta = currentMemory - this.initialMemory;

    await metricsService.recordGauge(
      this.options.metricName || 'memory_usage',
      currentMemory,
      'MB',
      {
        entityType: this.options.entityType,
        entityId: this.options.entityId,
        userId: this.options.userId,
        executionId: this.options.executionId,
        tags: {
          ...this.options.tags,
          initial_memory: this.initialMemory,
          memory_delta: memoryDelta,
        },
      }
    );
  }
}

/**
 * Queue performance tracking
 */
export async function instrumentQueueOperation<T>(
  operation: string,
  operationFn: () => Promise<T>,
  queueName: string,
  options: Partial<InstrumentationOptions> = {}
): Promise<T> {
  const timer = new Timer({
    metricName: `queue_${operation}`,
    entityType: 'queue',
    entityId: queueName,
    ...options,
  });

  try {
    const result = await operationFn();
    await timer.stop(true);
    await metricsService.recordCounter(`queue_${operation}_success`);
    return result;
  } catch (error) {
    await timer.stop(false, error as Error);
    await metricsService.recordCounter(`queue_${operation}_failure`);
    throw error;
  }
}

/**
 * Batch operation tracking
 */
export class BatchTracker {
  private options: InstrumentationOptions;
  private startTime: number;
  private processedCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(options: InstrumentationOptions) {
    this.options = options;
    this.startTime = Date.now();
  }

  incrementProcessed(): void {
    this.processedCount++;
  }

  incrementSuccess(): void {
    this.successCount++;
  }

  incrementFailure(): void {
    this.failureCount++;
  }

  async complete(): Promise<void> {
    const duration = Date.now() - this.startTime;
    const throughput = this.processedCount / (duration / 1000); // items per second
    const successRate = this.processedCount > 0 ? (this.successCount / this.processedCount) * 100 : 0;

    // Record batch metrics
    await metricsService.recordMetrics([
      {
        metricType: MetricType.TIMER,
        name: `${this.options.metricName}_duration`,
        value: duration,
        unit: 'ms',
        ...this.options,
      },
      {
        metricType: MetricType.COUNTER,
        name: `${this.options.metricName}_processed`,
        value: this.processedCount,
        unit: 'count',
        ...this.options,
      },
      {
        metricType: MetricType.COUNTER,
        name: `${this.options.metricName}_successful`,
        value: this.successCount,
        unit: 'count',
        ...this.options,
      },
      {
        metricType: MetricType.COUNTER,
        name: `${this.options.metricName}_failed`,
        value: this.failureCount,
        unit: 'count',
        ...this.options,
      },
      {
        metricType: MetricType.GAUGE,
        name: `${this.options.metricName}_throughput`,
        value: throughput,
        unit: 'items_per_second',
        ...this.options,
      },
      {
        metricType: MetricType.GAUGE,
        name: `${this.options.metricName}_success_rate`,
        value: successRate,
        unit: 'percentage',
        ...this.options,
      },
    ]);
  }
}
