
/**
 * Xero Error Handling & Escalation Service
 * Phase 2B-6: Comprehensive error handling, escalation, and recovery system
 */

import { prisma } from '@/lib/db';
import { 
  xeroValidationEngine, 
  ValidationError, 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorType 
} from './validation-engine';
import { 
  xeroQuarantineSystem, 
  QuarantineReason, 
  QuarantineStatus 
} from './quarantine-system';

export interface ErrorHandlingOptions {
  autoQuarantine?: boolean;
  escalateOnCritical?: boolean;
  retryOnTransient?: boolean;
  maxRetries?: number;
  notifyOnError?: boolean;
  logValidation?: boolean;
}

export interface ErrorRecoveryResult {
  success: boolean;
  recovered: number;
  failed: number;
  quarantined: number;
  errors: string[];
}

export interface EscalationRule {
  severity: ErrorSeverity[];
  category: ErrorCategory[];
  threshold: number; // Number of errors before escalation
  timeWindow: number; // Time window in minutes
  escalateTo: string[]; // User IDs to escalate to
  notificationTemplate: string;
}

export class XeroErrorHandlingService {
  private static instance: XeroErrorHandlingService;
  private escalationRules: EscalationRule[] = [];

  constructor() {
    this.initializeDefaultEscalationRules();
  }

  public static getInstance(): XeroErrorHandlingService {
    if (!XeroErrorHandlingService.instance) {
      XeroErrorHandlingService.instance = new XeroErrorHandlingService();
    }
    return XeroErrorHandlingService.instance;
  }

  /**
   * Comprehensive error handling for sync operations
   */
  async handleSyncErrors(
    entityType: 'timeEntry' | 'project' | 'contact' | 'submission',
    entityId: string,
    originalData: any,
    transformedData: any,
    syncError: Error,
    options: ErrorHandlingOptions = {}
  ): Promise<{
    handled: boolean;
    quarantined: boolean;
    escalated: boolean;
    canRetry: boolean;
    nextAction: 'retry' | 'quarantine' | 'escalate' | 'ignore';
  }> {
    try {
      // Map entity type for validation engine (submission maps to timeEntry for validation purposes)
      const validationEntityType = entityType === 'submission' ? 'timeEntry' : entityType;
      
      // First, validate the data to understand the errors
      const validationResult = await xeroValidationEngine.validateForXeroSync(
        transformedData, 
        validationEntityType
      );

      // Classify the sync error
      const classifiedError = this.classifySyncError(syncError);
      const allErrors = [...validationResult.errors, classifiedError];

      // Log validation result if enabled
      if (options.logValidation !== false) {
        await this.logValidationResult(entityType, entityId, validationResult);
      }

      // Determine handling strategy
      const strategy = this.determineErrorStrategy(allErrors, options);

      let quarantined = false;
      let escalated = false;

      // Handle based on strategy
      switch (strategy.nextAction) {
        case 'quarantine':
          if (options.autoQuarantine !== false) {
            await xeroQuarantineSystem.quarantineRecord(
              entityType,
              entityId,
              originalData,
              allErrors,
              'system',
              transformedData
            );
            quarantined = true;
          }
          break;

        case 'escalate':
          if (options.escalateOnCritical !== false) {
            await this.escalateErrors(entityType, entityId, allErrors);
            escalated = true;
          }
          break;

        case 'retry':
          // Log retry attempt
          await this.logRetryAttempt(entityType, entityId, syncError.message);
          break;
      }

      return {
        handled: true,
        quarantined,
        escalated,
        canRetry: strategy.canRetry,
        nextAction: strategy.nextAction
      };

    } catch (error) {
      console.error(`Error handling failed for ${entityType}:${entityId}:`, error);
      return {
        handled: false,
        quarantined: false,
        escalated: false,
        canRetry: false,
        nextAction: 'escalate'
      };
    }
  }

  /**
   * Batch error recovery process
   */
  async runErrorRecovery(
    options: {
      dryRun?: boolean;
      maxRecords?: number;
      priorityOnly?: boolean;
      entityTypes?: string[];
    } = {}
  ): Promise<ErrorRecoveryResult> {
    const result: ErrorRecoveryResult = {
      success: true,
      recovered: 0,
      failed: 0,
      quarantined: 0,
      errors: []
    };

    try {
      // Get quarantined records for recovery
      const filter: any = {
        status: [QuarantineStatus.QUARANTINED]
      };

      if (options.priorityOnly) {
        filter.priority = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH];
      }

      if (options.entityTypes) {
        filter.entityType = options.entityTypes[0]; // API limitation
      }

      const quarantinedRecords = await xeroQuarantineSystem.getQuarantinedRecords(
        filter,
        1,
        options.maxRecords || 100
      );

      console.log(`Found ${quarantinedRecords.total} records for recovery${options.dryRun ? ' (dry run)' : ''}`);

      for (const record of quarantinedRecords.records) {
        try {
          // Attempt to resolve the record
          const recoverySuccess = await this.attemptRecordRecovery(record, options.dryRun);
          
          if (recoverySuccess) {
            result.recovered++;
            if (!options.dryRun) {
              await xeroQuarantineSystem.reviewQuarantinedRecord(
                record.id,
                'system',
                QuarantineStatus.RESOLVED,
                'Automatically recovered during batch recovery process'
              );
            }
          } else {
            result.failed++;
          }

        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to recover record ${record.id}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`Batch recovery failed: ${error}`);
      return result;
    }
  }

  /**
   * Get error analytics and insights
   */
  async getErrorAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{
    summary: {
      totalErrors: number;
      errorsByCategory: Record<ErrorCategory, number>;
      errorsBySeverity: Record<ErrorSeverity, number>;
      resolutionRate: number;
      avgResolutionTime: number;
    };
    trends: {
      dailyErrorCounts: Array<{ date: string; count: number }>;
      topErrorMessages: Array<{ message: string; count: number }>;
      problematicEntities: Array<{ entityType: string; entityId: string; errorCount: number }>;
    };
    recommendations: string[];
  }> {
    try {
      const where: any = {};
      if (dateFrom || dateTo) {
        where.quarantinedAt = {};
        if (dateFrom) where.quarantinedAt.gte = dateFrom;
        if (dateTo) where.quarantinedAt.lte = dateTo;
      }

      const [
        quarantineStats,
        validationLogs,
        dailyTrends
      ] = await Promise.all([
        xeroQuarantineSystem.getQuarantineStats(dateFrom, dateTo),
        this.getValidationLogAnalytics(dateFrom, dateTo),
        this.getDailyErrorTrends(dateFrom, dateTo)
      ]);

      // Calculate resolution rate
      const resolved = quarantineStats.byStatus[QuarantineStatus.RESOLVED] || 0;
      const total = quarantineStats.total;
      const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;

      // Generate recommendations
      const recommendations = this.generateErrorRecommendations(quarantineStats, validationLogs);

      return {
        summary: {
          totalErrors: total,
          errorsByCategory: quarantineStats.byReason as any, // Convert for compatibility
          errorsBySeverity: quarantineStats.byPriority,
          resolutionRate,
          avgResolutionTime: quarantineStats.avgResolutionTime
        },
        trends: {
          dailyErrorCounts: dailyTrends,
          topErrorMessages: [], // TODO: Implement from quarantine data
          problematicEntities: [] // TODO: Implement from quarantine data
        },
        recommendations
      };

    } catch (error) {
      throw new Error(`Failed to get error analytics: ${error}`);
    }
  }

  /**
   * Configure custom escalation rules
   */
  async configureEscalationRules(rules: EscalationRule[]): Promise<void> {
    this.escalationRules = rules;
    
    // Store in database for persistence
    try {
      await prisma.systemSetting.upsert({
        where: { key: 'xero_escalation_rules' },
        update: { value: JSON.stringify(rules) },
        create: {
          key: 'xero_escalation_rules',
          value: JSON.stringify(rules),
          description: 'Xero error escalation rules configuration',
          category: 'xero_integration'
        }
      });
    } catch (error) {
      console.error('Failed to persist escalation rules:', error);
    }
  }

  /**
   * Private helper methods
   */
  private initializeDefaultEscalationRules(): void {
    this.escalationRules = [
      {
        severity: [ErrorSeverity.CRITICAL],
        category: [ErrorCategory.API_ERROR, ErrorCategory.DATA_INTEGRITY],
        threshold: 1,
        timeWindow: 5,
        escalateTo: ['admin'], // TODO: Get from system settings
        notificationTemplate: 'Critical Xero integration error detected'
      },
      {
        severity: [ErrorSeverity.HIGH],
        category: [ErrorCategory.BUSINESS_RULE, ErrorCategory.VALIDATION],
        threshold: 5,
        timeWindow: 60,
        escalateTo: ['admin'],
        notificationTemplate: 'Multiple high-severity Xero errors detected'
      }
    ];
  }

  private classifySyncError(error: Error): ValidationError {
    let category = ErrorCategory.API_ERROR;
    let severity = ErrorSeverity.MEDIUM;
    let type = ErrorType.TRANSIENT;

    const errorMessage = error.message.toLowerCase();

    // Classify based on error message patterns
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      category = ErrorCategory.RATE_LIMIT;
      type = ErrorType.TRANSIENT;
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
      type = ErrorType.PERMANENT;
    } else if (errorMessage.includes('validation') || errorMessage.includes('400')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.HIGH;
      type = ErrorType.PERMANENT;
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      category = ErrorCategory.NETWORK;
      type = ErrorType.TRANSIENT;
    }

    return {
      id: `sync_error_${Date.now()}`,
      field: 'api_call',
      message: error.message,
      actionableMessage: this.generateActionableMessage(category, error.message),
      severity,
      category,
      type,
      resolutionSteps: this.generateResolutionSteps(category, error.message)
    };
  }

  private generateActionableMessage(category: ErrorCategory, message: string): string {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return 'Xero API rate limit exceeded. The system will automatically retry after the rate limit window.';
      case ErrorCategory.PERMISSION:
        return 'Authorization error with Xero API. Please check and refresh the Xero connection.';
      case ErrorCategory.VALIDATION:
        return 'Data validation failed at Xero API level. Please review the data format and try again.';
      case ErrorCategory.NETWORK:
        return 'Network connectivity issue with Xero API. Please check internet connection and retry.';
      default:
        return `API error occurred: ${message}. Please review the error details and contact support if needed.`;
    }
  }

  private generateResolutionSteps(category: ErrorCategory, message: string): string[] {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        return [
          'Wait for rate limit window to reset',
          'Reduce sync frequency if recurring',
          'Contact Xero support for rate limit increase'
        ];
      case ErrorCategory.PERMISSION:
        return [
          'Go to Xero connection settings',
          'Disconnect and reconnect Xero integration',
          'Verify required permissions are granted'
        ];
      case ErrorCategory.VALIDATION:
        return [
          'Review the source data for completeness',
          'Check data format requirements',
          'Update transformation logic if needed'
        ];
      case ErrorCategory.NETWORK:
        return [
          'Check internet connectivity',
          'Retry the sync operation',
          'Contact IT support if issue persists'
        ];
      default:
        return [
          'Review error details',
          'Check Xero API documentation',
          'Contact technical support'
        ];
    }
  }

  private determineErrorStrategy(
    errors: ValidationError[], 
    options: ErrorHandlingOptions
  ): {
    nextAction: 'retry' | 'quarantine' | 'escalate' | 'ignore';
    canRetry: boolean;
  } {
    const hasCritical = errors.some(e => e.severity === ErrorSeverity.CRITICAL);
    const hasTransient = errors.some(e => e.type === ErrorType.TRANSIENT);
    const hasPermanent = errors.some(e => e.type === ErrorType.PERMANENT);

    if (hasCritical) {
      return { nextAction: 'escalate', canRetry: false };
    }

    if (hasPermanent) {
      return { nextAction: 'quarantine', canRetry: false };
    }

    if (hasTransient && options.retryOnTransient !== false) {
      return { nextAction: 'retry', canRetry: true };
    }

    return { nextAction: 'quarantine', canRetry: false };
  }

  private async escalateErrors(
    entityType: string,
    entityId: string,
    errors: ValidationError[]
  ): Promise<void> {
    try {
      // Find applicable escalation rules
      const applicableRules = this.escalationRules.filter(rule =>
        errors.some(error =>
          rule.severity.includes(error.severity) &&
          rule.category.includes(error.category)
        )
      );

      if (applicableRules.length === 0) return;

      // Create escalation records
      for (const rule of applicableRules) {
        for (const escalateTo of rule.escalateTo) {
          await prisma.xeroErrorEscalation.create({
            data: {
              errorSeverity: errors[0].severity,
              errorCategory: errors[0].category,
              escalatedTo: escalateTo,
              escalationNotes: `${errors.length} errors detected for ${entityType}:${entityId}`,
              status: 'PENDING'
            }
          });

          // Create notification
          await prisma.notifications.create({
            data: {
              id: `escalation_${entityType}_${entityId}_${Date.now()}`,
              userId: escalateTo,
              type: 'SYSTEM_ALERT',
              title: rule.notificationTemplate,
              message: `${errors.length} errors detected for ${entityType} ${entityId}. Immediate attention required.`,
              entityType: 'xero_error',
              entityId: `${entityType}:${entityId}`,
              priority: 'HIGH',
              updatedAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to escalate errors for ${entityType}:${entityId}:`, error);
    }
  }

  private async logValidationResult(
    entityType: string,
    entityId: string,
    validationResult: any
  ): Promise<void> {
    try {
      await prisma.xeroValidationLog.create({
        data: {
          entityType,
          entityId,
          validationResult: JSON.stringify(validationResult),
          checksum: validationResult.checksum,
          passed: validationResult.isValid,
          errorCount: validationResult.errors?.length || 0,
          warningCount: validationResult.warnings?.length || 0
        }
      });
    } catch (error) {
      console.error(`Failed to log validation result for ${entityType}:${entityId}:`, error);
    }
  }

  private async logRetryAttempt(
    entityType: string,
    entityId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'XERO_SYNC_RETRY',
          entityType,
          entityId,
          newValues: { errorMessage, timestamp: new Date() },
          ipAddress: '127.0.0.1',
          userAgent: 'Xero Error Handler'
        }
      });
    } catch (error) {
      console.error(`Failed to log retry attempt for ${entityType}:${entityId}:`, error);
    }
  }

  private async attemptRecordRecovery(record: any, dryRun = false): Promise<boolean> {
    try {
      // Re-validate the data
      const validationResult = await xeroValidationEngine.validateForXeroSync(
        JSON.parse(record.originalData),
        record.entityType
      );

      // If validation now passes, it can be recovered
      if (validationResult.isValid) {
        console.log(`Record ${record.id} can be recovered - validation now passes`);
        return true;
      }

      // Check if errors are now resolvable
      const resolvableErrors = validationResult.errors.filter(e => e.type === ErrorType.TRANSIENT);
      if (resolvableErrors.length === validationResult.errors.length) {
        console.log(`Record ${record.id} has only transient errors - marking for recovery`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to attempt recovery for record ${record.id}:`, error);
      return false;
    }
  }

  private async getValidationLogAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    // TODO: Implement validation log analytics
    return {};
  }

  private async getDailyErrorTrends(dateFrom?: Date, dateTo?: Date): Promise<Array<{ date: string; count: number }>> {
    // TODO: Implement daily error trends
    return [];
  }

  private generateErrorRecommendations(quarantineStats: any, validationLogs: any): string[] {
    const recommendations: string[] = [];

    // Analyze quarantine stats for recommendations
    if (quarantineStats.byPriority[ErrorSeverity.CRITICAL] > 0) {
      recommendations.push('Critical errors detected - immediate attention required for Xero integration');
    }

    if (quarantineStats.avgResolutionTime > 24) {
      recommendations.push('Average resolution time exceeds 24 hours - consider improving error handling processes');
    }

    if (quarantineStats.total > 100) {
      recommendations.push('High volume of quarantined records - review data quality and transformation logic');
    }

    return recommendations;
  }
}

// Singleton instance
export const xeroErrorHandlingService = XeroErrorHandlingService.getInstance();
