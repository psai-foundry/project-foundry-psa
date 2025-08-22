
/**
 * Xero Batch Migration Service
 * Phase 2B-5: Batch Processing & Historical Data Migration
 * 
 * Handles large-scale migration of historical approved timesheets to Xero
 * with progress tracking, error handling, and recovery mechanisms.
 * 
 * NOTE: This service only provides the infrastructure - no data is automatically migrated.
 */

import { prisma } from '@/lib/db';
import { XeroSyncService } from './xero-sync-service';
import { xeroTransformer } from './xero-transform';
import { XeroApiWrapper } from './xero';

export interface BatchMigrationConfig {
  batchSize: number;
  delayBetweenBatches: number; // milliseconds
  maxRetries: number;
  dryRun: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeRejected?: boolean;
}

export interface BatchMigrationProgress {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatch: number;
  totalBatches: number;
  startedAt: Date;
  estimatedCompletionAt?: Date;
  lastBatchAt?: Date;
  errors: Array<{
    recordId: string;
    error: string;
    timestamp: Date;
    retryCount: number;
  }>;
}

export interface MigrationSummary {
  totalApprovedTimesheets: number;
  alreadySyncedTimesheets: number;
  pendingMigrationTimesheets: number;
  oldestPendingTimesheet?: Date;
  newestPendingTimesheet?: Date;
  estimatedDuration: string;
}

export class XeroBatchMigrationService {
  private xeroSync: XeroSyncService;
  private xeroApi: XeroApiWrapper;
  private activeMigrations = new Map<string, BatchMigrationProgress>();

  constructor() {
    this.xeroSync = new XeroSyncService();
    this.xeroApi = new XeroApiWrapper();
  }

  /**
   * Analyzes historical data to provide migration summary
   * This is safe to run - only analyzes, doesn't migrate
   */
  async analyzeMigrationRequirements(): Promise<MigrationSummary> {
    try {
      // Get all approved timesheets
      const totalApprovedQuery = await prisma.timesheetSubmission.count({
        where: {
          status: 'APPROVED'
        }
      });

      // Get already synced timesheets
      const alreadySyncedQuery = await prisma.xeroSyncLog.count({
        where: {
          operation: 'SYNC_TIMESHEET',
          status: 'SUCCESS'
        }
      });

      // Get pending migration timesheets (approved but not synced)
      const pendingTimesheets = await prisma.timesheetSubmission.findMany({
        where: {
          status: 'APPROVED',
          NOT: {
            id: {
              in: await prisma.xeroSyncLog.findMany({
                where: {
                  operation: 'SYNC_TIMESHEET',
                  status: 'SUCCESS'
                },
                select: { submissionId: true }
              }).then(logs => logs.map(log => log.submissionId).filter(Boolean) as string[])
            }
          }
        },
        select: {
          id: true,
          approvedAt: true
        },
        orderBy: {
          approvedAt: 'asc'
        }
      });

      const pendingCount = pendingTimesheets.length;
      const oldestPending = pendingTimesheets[0]?.approvedAt;
      const newestPending = pendingTimesheets[pendingCount - 1]?.approvedAt;

      // Estimate duration based on batch size and API limits
      const estimatedBatches = Math.ceil(pendingCount / 50); // Default batch size
      const estimatedMinutes = estimatedBatches * 2; // ~2 minutes per batch (conservative)
      const estimatedDuration = this.formatDuration(estimatedMinutes);

      return {
        totalApprovedTimesheets: totalApprovedQuery,
        alreadySyncedTimesheets: alreadySyncedQuery,
        pendingMigrationTimesheets: pendingCount,
        oldestPendingTimesheet: oldestPending || undefined,
        newestPendingTimesheet: newestPending || undefined,
        estimatedDuration
      };
    } catch (error) {
      console.error('Error analyzing migration requirements:', error);
      throw new Error('Failed to analyze migration requirements');
    }
  }

  /**
   * Validates historical data before migration
   * Safe to run - only validates, doesn't migrate
   */
  async validateHistoricalData() {
    const validationResults = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      issues: [] as Array<{
        recordId: string;
        issue: string;
        severity: 'warning' | 'error';
      }>
    };

    try {
      // Get pending migration timesheets
      const pendingTimesheets = await this.getPendingTimesheets();
      validationResults.totalRecords = pendingTimesheets.length;

      for (const submission of pendingTimesheets) {
        const issues = await this.validateSubmission(submission);
        
        if (issues.length === 0) {
          validationResults.validRecords++;
        } else {
          validationResults.invalidRecords++;
          validationResults.issues.push(...issues.map(issue => ({
            recordId: submission.id,
            issue: issue.message,
            severity: issue.severity
          })));
        }
      }

      return validationResults;
    } catch (error) {
      console.error('Error validating historical data:', error);
      throw new Error('Failed to validate historical data');
    }
  }

  /**
   * Starts a batch migration process
   * NOTE: When dryRun is false, this will actually migrate data to Xero
   */
  async startBatchMigration(config: BatchMigrationConfig): Promise<string> {
    const migrationId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Validate Xero connection first
      const connectionStatus = await this.xeroApi.getConnectionStatus();
      if (!connectionStatus.connected) {
        throw new Error('Xero connection is not active. Please connect to Xero first.');
      }

      // Get pending timesheets based on config
      const pendingTimesheets = await this.getPendingTimesheets(config.dateRange);
      
      if (pendingTimesheets.length === 0) {
        throw new Error('No pending timesheets found for migration');
      }

      // Create migration progress tracking
      const progress: BatchMigrationProgress = {
        id: migrationId,
        status: 'pending',
        totalRecords: pendingTimesheets.length,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        currentBatch: 0,
        totalBatches: Math.ceil(pendingTimesheets.length / config.batchSize),
        startedAt: new Date(),
        errors: []
      };

      this.activeMigrations.set(migrationId, progress);

      // Start the migration process (don't await - run in background)
      this.executeBatchMigration(migrationId, pendingTimesheets, config).catch(error => {
        console.error(`Migration ${migrationId} failed:`, error);
        const progress = this.activeMigrations.get(migrationId);
        if (progress) {
          progress.status = 'failed';
          progress.errors.push({
            recordId: 'SYSTEM',
            error: error.message,
            timestamp: new Date(),
            retryCount: 0
          });
        }
      });

      return migrationId;
    } catch (error) {
      console.error('Error starting batch migration:', error);
      throw error;
    }
  }

  /**
   * Gets the progress of a batch migration
   */
  async getBatchMigrationProgress(migrationId: string): Promise<BatchMigrationProgress | null> {
    return this.activeMigrations.get(migrationId) || null;
  }

  /**
   * Pauses a running batch migration
   */
  async pauseBatchMigration(migrationId: string): Promise<boolean> {
    const progress = this.activeMigrations.get(migrationId);
    if (progress && progress.status === 'running') {
      progress.status = 'paused';
      return true;
    }
    return false;
  }

  /**
   * Resumes a paused batch migration
   */
  async resumeBatchMigration(migrationId: string): Promise<boolean> {
    const progress = this.activeMigrations.get(migrationId);
    if (progress && progress.status === 'paused') {
      progress.status = 'running';
      // Resume processing would be implemented here
      return true;
    }
    return false;
  }

  /**
   * Cancels a running batch migration
   */
  async cancelBatchMigration(migrationId: string): Promise<boolean> {
    const progress = this.activeMigrations.get(migrationId);
    if (progress && ['running', 'paused'].includes(progress.status)) {
      progress.status = 'failed';
      progress.errors.push({
        recordId: 'SYSTEM',
        error: 'Migration cancelled by user',
        timestamp: new Date(),
        retryCount: 0
      });
      return true;
    }
    return false;
  }

  /**
   * Gets all active migrations
   */
  async getActiveMigrations(): Promise<BatchMigrationProgress[]> {
    return Array.from(this.activeMigrations.values());
  }

  // Private helper methods

  private async getPendingTimesheets(dateRange?: { startDate: Date; endDate: Date }) {
    const where: any = {
      status: 'APPROVED',
      NOT: {
        id: {
          in: await prisma.xeroSyncLog.findMany({
            where: {
              operation: 'SYNC_TIMESHEET',
              status: 'SUCCESS'
            },
            select: { submissionId: true }
          }).then(logs => logs.map(log => log.submissionId).filter(Boolean) as string[])
        }
      }
    };

    if (dateRange) {
      where.approvedAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      };
    }

    return await prisma.timesheetSubmission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entries: {
          include: {
            timeEntry: {
              include: {
                project: {
                  include: {
                    client: true
                  }
                },
                task: true
              }
            }
          }
        }
      },
      orderBy: {
        approvedAt: 'asc'
      }
    });
  }

  private async validateSubmission(submission: any) {
    const issues = [];

    // Check if user exists and has required fields
    if (!submission.user?.email) {
      issues.push({
        message: 'User email is missing',
        severity: 'error' as const
      });
    }

    // Check if entries exist
    if (!submission.entries?.length) {
      issues.push({
        message: 'No time entries found',
        severity: 'error' as const
      });
    }

    // Validate each entry
    for (const entry of submission.entries || []) {
      const timeEntry = entry.timeEntry;
      
      if (!timeEntry.project?.client) {
        issues.push({
          message: `Time entry ${timeEntry.id} missing client information`,
          severity: 'error' as const
        });
      }

      if (timeEntry.billable && !timeEntry.billRate) {
        issues.push({
          message: `Billable time entry ${timeEntry.id} missing bill rate`,
          severity: 'warning' as const
        });
      }
    }

    return issues;
  }

  private async executeBatchMigration(
    migrationId: string,
    timesheets: any[],
    config: BatchMigrationConfig
  ) {
    const progress = this.activeMigrations.get(migrationId)!;
    progress.status = 'running';

    const batches = this.createBatches(timesheets, config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      if (progress.status !== 'running') {
        break; // Migration was paused or cancelled
      }

      progress.currentBatch = i + 1;
      progress.lastBatchAt = new Date();

      const batch = batches[i];
      
      for (const submission of batch) {
        try {
          if (config.dryRun) {
            // Dry run - just validate and log
            await this.validateSubmission(submission);
            console.log(`[DRY RUN] Would migrate timesheet: ${submission.id}`);
          } else {
            // Actually sync to Xero
            await this.xeroSync.syncTimesheetSubmission(submission);
          }
          
          progress.successfulRecords++;
        } catch (error) {
          progress.failedRecords++;
          progress.errors.push({
            recordId: submission.id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            retryCount: 0
          });
        }
        
        progress.processedRecords++;
      }

      // Delay between batches to respect API limits
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
      }
    }

    // Update final status
    progress.status = progress.failedRecords > 0 ? 'completed' : 'completed';
    progress.estimatedCompletionAt = new Date();
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) { // Less than a day
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${remainingHours}h`;
    }
  }
}

// Export singleton instance
export const xeroBatchMigration = new XeroBatchMigrationService();
