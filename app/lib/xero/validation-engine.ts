
/**
 * Xero Data Validation & Error Handling Engine
 * Phase 2B-6: Comprehensive validation, error classification, and quarantine system
 */

import { prisma } from '@/lib/db';
import { 
  TimeEntry, 
  TimesheetSubmission, 
  Project, 
  Client, 
  User,
  XeroSyncLog 
} from '@prisma/client';

// Enhanced error classification types
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  API_ERROR = 'API_ERROR',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  PERMISSION = 'PERMISSION',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  BUSINESS_RULE = 'BUSINESS_RULE'
}

export enum ErrorType {
  TRANSIENT = 'TRANSIENT', // Can be retried
  PERMANENT = 'PERMANENT'  // Requires manual intervention
}

export interface ValidationError {
  id: string;
  field: string;
  message: string;
  actionableMessage: string; // Clear resolution steps
  value?: any;
  severity: ErrorSeverity;
  category: ErrorCategory;
  type: ErrorType;
  resolutionSteps: string[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  checksum?: string;
  validatedAt: Date;
}

export interface DataIntegrityCheck {
  sourceChecksum: string;
  transformedChecksum: string;
  recordCount: number;
  fieldMappings: Record<string, any>;
  timestamp: Date;
}

// Xero API Schema Definitions
export interface XeroSchemaValidation {
  timeEntry: {
    required: string[];
    maxLengths: Record<string, number>;
    formats: Record<string, RegExp>;
    businessRules: Array<(data: any) => ValidationError | null>;
  };
  project: {
    required: string[];
    maxLengths: Record<string, number>;
    formats: Record<string, RegExp>;
    businessRules: Array<(data: any) => ValidationError | null>;
  };
  contact: {
    required: string[];
    maxLengths: Record<string, number>;
    formats: Record<string, RegExp>;
    businessRules: Array<(data: any) => ValidationError | null>;
  };
}

export class XeroValidationEngine {
  private static instance: XeroValidationEngine;
  private schemaRules!: XeroSchemaValidation;

  constructor() {
    this.initializeSchemaRules();
  }

  public static getInstance(): XeroValidationEngine {
    if (!XeroValidationEngine.instance) {
      XeroValidationEngine.instance = new XeroValidationEngine();
    }
    return XeroValidationEngine.instance;
  }

  private initializeSchemaRules(): void {
    this.schemaRules = {
      timeEntry: {
        required: ['userID', 'duration', 'dateUTC', 'description'],
        maxLengths: {
          description: 500,
          userID: 100,
          projectID: 100,
          taskID: 100
        },
        formats: {
          userID: /^[a-zA-Z0-9\-@.]+$/,
          dateUTC: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
          duration: /^\d+$/
        },
        businessRules: [
          (data) => {
            if (data.duration && data.duration > 1440) { // More than 24 hours
              return {
                id: `duration_${Date.now()}`,
                field: 'duration',
                message: 'Time entry duration exceeds 24 hours',
                actionableMessage: 'Please verify the time entry duration is correct. Maximum allowed is 24 hours (1440 minutes).',
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.BUSINESS_RULE,
                type: ErrorType.PERMANENT,
                resolutionSteps: [
                  'Review the original time entry',
                  'Confirm the duration is accurate',
                  'If correct, split into multiple entries',
                  'If incorrect, update the source data'
                ],
                value: data.duration
              };
            }
            return null;
          },
          (data) => {
            if (data.billableStatus === 'billable' && !data.unitAmount) {
              return {
                id: `billing_${Date.now()}`,
                field: 'unitAmount',
                message: 'Billable entries must have a unit amount',
                actionableMessage: 'This time entry is marked as billable but has no hourly rate. Please set a billing rate.',
                severity: ErrorSeverity.CRITICAL,
                category: ErrorCategory.BUSINESS_RULE,
                type: ErrorType.PERMANENT,
                resolutionSteps: [
                  'Set user default billing rate',
                  'Set project-specific billing rate',
                  'Or mark entry as non-billable'
                ]
              };
            }
            return null;
          }
        ]
      },
      project: {
        required: ['name', 'code', 'status'],
        maxLengths: {
          name: 255,
          code: 50,
          description: 1000
        },
        formats: {
          code: /^[A-Z0-9\-_]+$/,
          status: /^(inProgress|completed|quote|invoiced)$/
        },
        businessRules: [
          (data) => {
            if (data.budgetAmount && data.budgetAmount < 0) {
              return {
                id: `budget_${Date.now()}`,
                field: 'budgetAmount',
                message: 'Project budget cannot be negative',
                actionableMessage: 'The project budget amount is negative. Please verify and correct the budget value.',
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.BUSINESS_RULE,
                type: ErrorType.PERMANENT,
                resolutionSteps: [
                  'Check source project data',
                  'Update budget amount to positive value',
                  'Or remove budget if not applicable'
                ],
                value: data.budgetAmount
              };
            }
            return null;
          }
        ]
      },
      contact: {
        required: ['name'],
        maxLengths: {
          name: 255,
          emailAddress: 255,
          phone: 50
        },
        formats: {
          emailAddress: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          phone: /^[\d\s\-\+\(\)]+$/
        },
        businessRules: []
      }
    };
  }

  /**
   * Comprehensive pre-sync validation
   */
  async validateForXeroSync(data: any, entityType: 'timeEntry' | 'project' | 'contact'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const validatedAt = new Date();

    try {
      // Schema validation
      const schemaErrors = await this.validateSchema(data, entityType);
      errors.push(...schemaErrors.filter(e => e.severity === ErrorSeverity.CRITICAL || e.severity === ErrorSeverity.HIGH));
      warnings.push(...schemaErrors.filter(e => e.severity === ErrorSeverity.MEDIUM || e.severity === ErrorSeverity.LOW));

      // Data integrity validation
      const integrityErrors = await this.validateDataIntegrity(data, entityType);
      errors.push(...integrityErrors);

      // Business rules validation
      const businessRuleErrors = await this.validateBusinessRules(data, entityType);
      errors.push(...businessRuleErrors);

      // Generate data checksum
      const checksum = this.generateChecksum(data);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        checksum,
        validatedAt
      };
    } catch (error) {
      errors.push({
        id: `validation_error_${Date.now()}`,
        field: 'system',
        message: `Validation engine error: ${error}`,
        actionableMessage: 'Internal validation error occurred. Please contact system administrator.',
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.VALIDATION,
        type: ErrorType.TRANSIENT,
        resolutionSteps: [
          'Retry validation',
          'Check system logs',
          'Contact technical support if issue persists'
        ]
      });

      return {
        isValid: false,
        errors,
        warnings,
        validatedAt
      };
    }
  }

  /**
   * Schema validation against Xero API requirements
   */
  private async validateSchema(data: any, entityType: 'timeEntry' | 'project' | 'contact'): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const schema = this.schemaRules[entityType];

    // Required fields validation
    for (const requiredField of schema.required) {
      if (!data[requiredField] && data[requiredField] !== 0) {
        errors.push({
          id: `required_${requiredField}_${Date.now()}`,
          field: requiredField,
          message: `Required field '${requiredField}' is missing`,
          actionableMessage: `The field '${requiredField}' is required by Xero API. Please ensure this field has a valid value.`,
          severity: ErrorSeverity.CRITICAL,
          category: ErrorCategory.VALIDATION,
          type: ErrorType.PERMANENT,
          resolutionSteps: [
            `Set a valid value for '${requiredField}'`,
            'Check source data completeness',
            'Update data transformation logic if needed'
          ]
        });
      }
    }

    // Length validation
    for (const [field, maxLength] of Object.entries(schema.maxLengths)) {
      if (data[field] && typeof data[field] === 'string' && data[field].length > maxLength) {
        errors.push({
          id: `length_${field}_${Date.now()}`,
          field,
          message: `Field '${field}' exceeds maximum length of ${maxLength}`,
          actionableMessage: `The '${field}' field is too long. Please truncate to ${maxLength} characters or less.`,
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.VALIDATION,
          type: ErrorType.PERMANENT,
          resolutionSteps: [
            `Truncate '${field}' to ${maxLength} characters`,
            'Use abbreviations if appropriate',
            'Consider splitting long descriptions'
          ],
          value: data[field]?.length
        });
      }
    }

    // Format validation
    for (const [field, pattern] of Object.entries(schema.formats)) {
      if (data[field] && !pattern.test(data[field])) {
        errors.push({
          id: `format_${field}_${Date.now()}`,
          field,
          message: `Field '${field}' has invalid format`,
          actionableMessage: `The '${field}' field format is invalid. Please ensure it matches the required pattern.`,
          severity: ErrorSeverity.HIGH,
          category: ErrorCategory.VALIDATION,
          type: ErrorType.PERMANENT,
          resolutionSteps: [
            `Verify '${field}' format`,
            'Check source data formatting',
            'Update transformation logic if needed'
          ],
          value: data[field]
        });
      }
    }

    return errors;
  }

  /**
   * Data integrity validation
   */
  private async validateDataIntegrity(data: any, entityType: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for data corruption
    if (typeof data !== 'object' || data === null) {
      errors.push({
        id: `integrity_corrupt_${Date.now()}`,
        field: 'data',
        message: 'Data corruption detected',
        actionableMessage: 'The data appears to be corrupted. Please check the source data and retry.',
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DATA_INTEGRITY,
        type: ErrorType.PERMANENT,
        resolutionSteps: [
          'Check source data integrity',
          'Verify data transformation process',
          'Re-fetch source data if needed'
        ]
      });
    }

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      errors.push({
        id: `integrity_circular_${Date.now()}`,
        field: 'data',
        message: 'Circular reference detected in data',
        actionableMessage: 'The data contains circular references that prevent serialization.',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.DATA_INTEGRITY,
        type: ErrorType.PERMANENT,
        resolutionSteps: [
          'Remove circular references',
          'Flatten data structure',
          'Update transformation logic'
        ]
      });
    }

    return errors;
  }

  /**
   * Business rules validation
   */
  private async validateBusinessRules(data: any, entityType: 'timeEntry' | 'project' | 'contact'): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const businessRules = this.schemaRules[entityType].businessRules;

    for (const rule of businessRules) {
      const ruleError = rule(data);
      if (ruleError) {
        errors.push(ruleError);
      }
    }

    return errors;
  }

  /**
   * Generate data checksum for integrity verification
   */
  private generateChecksum(data: any): string {
    const crypto = require('crypto');
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(serialized).digest('hex');
  }

  /**
   * Classify error for routing and escalation
   */
  classifyError(error: ValidationError): {
    requiresEscalation: boolean;
    canRetry: boolean;
    quarantineRequired: boolean;
    notificationLevel: 'info' | 'warning' | 'error' | 'critical';
  } {
    return {
      requiresEscalation: error.severity === ErrorSeverity.CRITICAL,
      canRetry: error.type === ErrorType.TRANSIENT,
      quarantineRequired: error.type === ErrorType.PERMANENT,
      notificationLevel: error.severity === ErrorSeverity.CRITICAL ? 'critical' :
                        error.severity === ErrorSeverity.HIGH ? 'error' :
                        error.severity === ErrorSeverity.MEDIUM ? 'warning' : 'info'
    };
  }

  /**
   * Post-sync integrity verification
   */
  async verifyPostSyncIntegrity(
    originalData: any,
    syncedData: any,
    originalChecksum: string
  ): Promise<{
    isValid: boolean;
    checksumMatch: boolean;
    fieldMismatches: Array<{field: string, original: any, synced: any}>;
  }> {
    const currentChecksum = this.generateChecksum(originalData);
    const checksumMatch = currentChecksum === originalChecksum;
    const fieldMismatches: Array<{field: string, original: any, synced: any}> = [];

    // Compare critical fields
    const criticalFields = ['id', 'amount', 'date', 'duration', 'status'];
    
    for (const field of criticalFields) {
      if (originalData[field] !== undefined && syncedData[field] !== undefined) {
        if (JSON.stringify(originalData[field]) !== JSON.stringify(syncedData[field])) {
          fieldMismatches.push({
            field,
            original: originalData[field],
            synced: syncedData[field]
          });
        }
      }
    }

    return {
      isValid: checksumMatch && fieldMismatches.length === 0,
      checksumMatch,
      fieldMismatches
    };
  }
}

// Singleton instance
export const xeroValidationEngine = XeroValidationEngine.getInstance();
