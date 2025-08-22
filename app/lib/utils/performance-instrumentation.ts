

/**
 * Performance Instrumentation Utilities
 * Phase 2B-8c: Automated Alerting System - Performance Monitoring Integration
 */

import { metricsService } from '@/lib/services/metrics-service';
import { MetricType } from '@prisma/client';

export class PerformanceInstrumentation {
  private static instance: PerformanceInstrumentation;
  
  public static getInstance(): PerformanceInstrumentation {
    if (!PerformanceInstrumentation.instance) {
      PerformanceInstrumentation.instance = new PerformanceInstrumentation();
    }
    return PerformanceInstrumentation.instance;
  }

  /**
   * Measure and record execution time of an async function
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      const endMemory = this.getMemoryUsage();
      
      // Record timing metric
      await metricsService.recordTimer(name, duration, {
        entityType: context?.entityType || 'function',
        entityId: context?.entityId,
        tags: {
          ...context,
          memory_delta: endMemory - startMemory,
          status: 'success'
        }
      });
      
      // Record memory usage if significant change
      if (Math.abs(endMemory - startMemory) > 10) {
        await metricsService.recordGauge(
          `${name}_memory_delta`,
          endMemory - startMemory,
          'mb',
          { entityType: context?.entityType || 'function', ...context }
        );
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Record failed operation
      await metricsService.recordTimer(name, duration, {
        entityType: context?.entityType || 'function',
        entityId: context?.entityId,
        tags: {
          ...context,
          status: 'error',
          error: error instanceof Error ? error.message : 'unknown_error'
        }
      });
      
      // Record error count
      await metricsService.recordCounter(`${name}_errors`, 1, {
        entityType: context?.entityType || 'function',
        tags: context
      });
      
      throw error;
    }
  }

  /**
   * Create a timer decorator for class methods
   */
  timer(metricName?: string, context?: Record<string, any>) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      const name = metricName || `${target.constructor.name}.${propertyKey}`;
      
      if (originalMethod.constructor.name === 'AsyncFunction') {
        descriptor.value = async function (...args: any[]) {
          return await PerformanceInstrumentation.getInstance().measureAsync(
            name,
            () => originalMethod.apply(this, args),
            context
          );
        };
      } else {
        descriptor.value = function (...args: any[]) {
          const startTime = performance.now();
          try {
            const result = originalMethod.apply(this, args);
            const duration = performance.now() - startTime;
            
            // Record synchronous operation
            metricsService.recordTimer(name, duration, {
              entityType: context?.entityType || 'method',
              tags: { ...context, status: 'success' }
            });
            
            return result;
          } catch (error) {
            const duration = performance.now() - startTime;
            
            metricsService.recordTimer(name, duration, {
              entityType: context?.entityType || 'method',
              tags: {
                ...context,
                status: 'error',
                error: error instanceof Error ? error.message : 'unknown_error'
              }
            });
            
            throw error;
          }
        };
      }
      
      return descriptor;
    };
  }

  /**
   * Record API endpoint performance
   */
  async recordAPIMetrics(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): Promise<void> {
    const isError = statusCode >= 400;
    
    // Record response time
    await metricsService.recordTimer('api_response_time', duration, {
      entityType: 'api_endpoint',
      entityId: `${method}_${endpoint}`,
      userId,
      tags: {
        endpoint,
        method,
        status_code: statusCode,
        status: isError ? 'error' : 'success'
      }
    });
    
    // Record request count
    await metricsService.recordCounter('api_requests', 1, {
      entityType: 'api_endpoint',
      tags: { endpoint, method, status_code: statusCode }
    });
    
    // Record error count if applicable
    if (isError) {
      await metricsService.recordCounter('api_errors', 1, {
        entityType: 'api_endpoint',
        tags: { endpoint, method, status_code: statusCode }
      });
    }
  }

  /**
   * Record database operation metrics
   */
  async recordDatabaseMetrics(
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    error?: Error
  ): Promise<void> {
    // Record query time
    await metricsService.recordTimer('db_query_time', duration, {
      entityType: 'database',
      entityId: table,
      tags: {
        operation,
        table,
        status: error ? 'error' : 'success',
        ...(error && { error: error.message })
      }
    });
    
    // Record affected rows if provided
    if (recordCount !== undefined) {
      await metricsService.recordGauge(
        'db_affected_records',
        recordCount,
        'count',
        {
          entityType: 'database',
          tags: { operation, table }
        }
      );
    }
    
    // Record database operation count
    await metricsService.recordCounter('db_operations', 1, {
      entityType: 'database',
      tags: { operation, table, status: error ? 'error' : 'success' }
    });
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    }
    return 0;
  }

  /**
   * Record custom business metrics
   */
  async recordBusinessMetric(
    name: string,
    value: number,
    unit: string,
    context?: Record<string, any>
  ): Promise<void> {
    await metricsService.recordGauge(name, value, unit, {
      entityType: 'business',
      tags: context
    });
  }

  /**
   * Record user action metrics
   */
  async recordUserAction(
    action: string,
    userId: string,
    duration?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (duration) {
      await metricsService.recordTimer(`user_action_${action}`, duration, {
        entityType: 'user_action',
        userId,
        tags: metadata
      });
    }
    
    await metricsService.recordCounter('user_actions', 1, {
      entityType: 'user_action',
      userId,
      tags: { action, ...metadata }
    });
  }
}

// Export singleton instance
export const performanceInstrumentation = PerformanceInstrumentation.getInstance();

// Export decorator for easy use
export const TimerMetric = (metricName?: string, context?: Record<string, any>) => 
  performanceInstrumentation.timer(metricName, context);

