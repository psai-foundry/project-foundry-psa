
/**
 * Instrumented Xero Sync Operations
 * Phase 2B-8a: Adds performance monitoring to existing sync operations
 */

import { metricsService } from '@/lib/services/metrics-service';
import { instrumentAsync, instrumentAPICall, Timer, BatchTracker } from '@/lib/monitoring/instrumentation';
import { PipelineType, TriggerType, PipelineStatus, MetricType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Original sync functions (these would be imported from existing Xero modules)
// For now, we'll create interfaces that can wrap existing functionality

export interface TimesheetSyncOptions {
  dryRun?: boolean;
  userId?: string;
  submissionIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ id: string; error: string }>;
  details?: any;
}

/**
 * Instrumented manual sync operation
 */
export const instrumentedManualSync = async (
  options: TimesheetSyncOptions,
  originalSyncFn: (options: TimesheetSyncOptions) => Promise<SyncResult>
): Promise<SyncResult> => {
  const executionId = uuidv4();
  const batchTracker = new BatchTracker({
    metricName: 'xero_manual_sync',
    entityType: 'sync',
    executionId,
    userId: options.userId,
    tags: {
      trigger: 'manual',
      dry_run: options.dryRun || false,
      date_range: options.dateFrom && options.dateTo ? 
        `${options.dateFrom.toISOString().split('T')[0]}_to_${options.dateTo.toISOString().split('T')[0]}` : 
        'all',
    },
  });

  // Start pipeline metrics
  const pipelineId = await metricsService.startPipelineMetrics({
    pipelineType: PipelineType.SYNC,
    executionId,
    triggeredBy: options.userId,
    triggerType: TriggerType.MANUAL,
    batchSize: options.submissionIds?.length,
    metadata: {
      dryRun: options.dryRun || false,
      dateRange: {
        from: options.dateFrom?.toISOString(),
        to: options.dateTo?.toISOString(),
      },
      filters: {
        submissionIds: options.submissionIds?.length || 0,
      },
    },
  });

  let result: SyncResult = {
    success: false,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };
  let status: PipelineStatus = PipelineStatus.SUCCESS;

  try {
    // Execute the original sync function with instrumentation
    result = await originalSyncFn(options);

    // Update batch tracker
    for (let i = 0; i < result.processedCount; i++) {
      batchTracker.incrementProcessed();
    }
    for (let i = 0; i < result.successCount; i++) {
      batchTracker.incrementSuccess();
    }
    for (let i = 0; i < result.failureCount; i++) {
      batchTracker.incrementFailure();
    }

    // Record additional metrics
    await metricsService.recordMetrics([
      {
        metricType: MetricType.COUNTER,
        name: 'xero_sync_operations_total',
        value: 1,
        unit: 'count',
        entityType: 'sync',
        executionId,
        userId: options.userId,
        tags: {
          type: 'manual',
          dry_run: options.dryRun || false,
        },
      },
      {
        metricType: MetricType.GAUGE,
        name: 'xero_sync_success_rate',
        value: result.processedCount > 0 ? (result.successCount / result.processedCount) * 100 : 0,
        unit: 'percentage',
        entityType: 'sync',
        executionId,
        userId: options.userId,
      },
    ]);

    if (!result.success) {
      status = PipelineStatus.FAILED;
    }

  } catch (error) {
    status = PipelineStatus.FAILED;
    result = {
      success: false,
      processedCount: 0,
      successCount: 0,
      failureCount: 1,
      errors: [{ id: 'sync_error', error: error instanceof Error ? error.message : 'Unknown error' }],
    };

    // Record error metrics
    await metricsService.recordCounter('xero_sync_failures_total', 1, {
      entityType: 'sync',
      executionId,
      userId: options.userId,
      tags: {
        error_type: error instanceof Error ? error.name : 'unknown',
        trigger: 'manual',
      },
    });
  } finally {
    // Complete batch tracking
    await batchTracker.complete();

    // Complete pipeline metrics
    await metricsService.completePipelineMetrics(
      executionId,
      status,
      {
        itemsProcessed: result.processedCount,
        itemsSuccessful: result.successCount,
        itemsFailed: result.failureCount,
      }
    );
  }

  return result;
};

/**
 * Instrument Xero API calls
 */
export const instrumentedXeroAPICall = async <T>(
  endpoint: string,
  method: string,
  callFn: () => Promise<T>,
  options: {
    userId?: string;
    executionId?: string;
    entityType?: string;
    entityId?: string;
  } = {}
): Promise<T> => {
  return await instrumentAPICall(
    `xero_api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_${method.toLowerCase()}`,
    callFn,
    {
      entityType: 'xero_api',
      entityId: endpoint,
      userId: options.userId,
      executionId: options.executionId,
      tags: {
        endpoint,
        method: method.toUpperCase(),
        api_provider: 'xero',
      },
    }
  );
};

/**
 * Instrument validation operations
 */
export const instrumentedValidation = async (
  validationType: string,
  entityType: string,
  entityId: string,
  validationFn: () => Promise<any>,
  options: {
    userId?: string;
    executionId?: string;
  } = {}
): Promise<any> => {
  const timer = new Timer({
    metricName: `xero_validation_${validationType}`,
    entityType: 'validation',
    entityId,
    userId: options.userId,
    executionId: options.executionId,
    tags: {
      validation_type: validationType,
      target_entity_type: entityType,
    },
  });

  let success = false;
  let error: Error | null = null;

  try {
    const result = await validationFn();
    success = !result.errors || result.errors.length === 0;
    
    // Record validation result metrics
    await metricsService.recordMetrics([
      {
        metricType: MetricType.COUNTER,
        name: `xero_validations_${success ? 'passed' : 'failed'}`,
        value: 1,
        unit: 'count',
        entityType: 'validation',
        entityId,
        userId: options.userId,
        executionId: options.executionId,
        tags: {
          validation_type: validationType,
          entity_type: entityType,
        },
      },
      {
        metricType: MetricType.GAUGE,
        name: 'xero_validation_error_count',
        value: result.errors?.length || 0,
        unit: 'count',
        entityType: 'validation',
        entityId,
        userId: options.userId,
        executionId: options.executionId,
      },
    ]);

    return result;
  } catch (err) {
    error = err as Error;
    success = false;
    throw err;
  } finally {
    await timer.stop(success, error || undefined);
  }
};

/**
 * Instrument bulk operations
 */
export const instrumentedBulkOperation = async <T>(
  operationType: string,
  items: T[],
  processingFn: (items: T[]) => Promise<{ processed: T[]; failed: T[]; errors: any[] }>,
  options: {
    userId?: string;
    batchSize?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<{ processed: T[]; failed: T[]; errors: any[] }> => {
  const executionId = uuidv4();
  const batchTracker = new BatchTracker({
    metricName: `xero_bulk_${operationType}`,
    entityType: 'bulk_operation',
    executionId,
    userId: options.userId,
    tags: {
      operation_type: operationType,
      batch_size: options.batchSize || items.length,
      ...options.metadata,
    },
  });

  // Start pipeline metrics
  const pipelineId = await metricsService.startPipelineMetrics({
    pipelineType: PipelineType.BULK_OPERATION,
    executionId,
    triggeredBy: options.userId,
    triggerType: TriggerType.MANUAL,
    batchSize: items.length,
    metadata: {
      operationType,
      ...options.metadata,
    },
  });

  let result: { processed: T[]; failed: T[]; errors: any[] } = {
    processed: [],
    failed: [],
    errors: [],
  };
  let status: PipelineStatus = PipelineStatus.SUCCESS;

  try {
    result = await processingFn(items);

    // Update trackers
    result.processed.forEach(() => {
      batchTracker.incrementProcessed();
      batchTracker.incrementSuccess();
    });

    result.failed.forEach(() => {
      batchTracker.incrementProcessed();
      batchTracker.incrementFailure();
    });

    if (result.failed.length > 0 && result.processed.length === 0) {
      status = PipelineStatus.FAILED;
    }

  } catch (error) {
    status = PipelineStatus.FAILED;
    result = {
      processed: [],
      failed: items,
      errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
    };

    items.forEach(() => {
      batchTracker.incrementProcessed();
      batchTracker.incrementFailure();
    });
  } finally {
    // Complete tracking
    await batchTracker.complete();
    
    await metricsService.completePipelineMetrics(
      executionId,
      status,
      {
        itemsProcessed: items.length,
        itemsSuccessful: result.processed.length,
        itemsFailed: result.failed.length,
      }
    );
  }

  return result;
};

/**
 * Queue processing instrumentation
 */
export const instrumentedQueueProcessing = async (
  queueName: string,
  jobData: any,
  processingFn: (data: any) => Promise<any>,
  options: {
    jobId?: string;
    userId?: string;
    priority?: string;
  } = {}
): Promise<any> => {
  const executionId = options.jobId || uuidv4();
  
  // Record queue metrics
  await metricsService.recordMetrics([
    {
      metricType: MetricType.COUNTER,
      name: 'queue_jobs_started',
      value: 1,
      unit: 'count',
      entityType: 'queue',
      entityId: queueName,
      executionId,
      userId: options.userId,
      tags: {
        queue_name: queueName,
        priority: options.priority || 'normal',
      },
    },
  ]);

  const timer = new Timer({
    metricName: 'queue_job_processing_time',
    entityType: 'queue',
    entityId: queueName,
    executionId,
    userId: options.userId,
    tags: {
      queue_name: queueName,
      job_id: executionId,
    },
  });

  let success = false;

  try {
    const result = await processingFn(jobData);
    success = true;

    await metricsService.recordCounter('queue_jobs_completed', 1, {
      entityType: 'queue',
      entityId: queueName,
      executionId,
      userId: options.userId,
      tags: { queue_name: queueName },
    });

    return result;
  } catch (error) {
    await metricsService.recordCounter('queue_jobs_failed', 1, {
      entityType: 'queue',
      entityId: queueName,
      executionId,
      userId: options.userId,
      tags: { 
        queue_name: queueName,
        error_type: error instanceof Error ? error.name : 'unknown',
      },
    });
    throw error;
  } finally {
    await timer.stop(success);
  }
};
