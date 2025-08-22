
/**
 * Enhanced Xero Sync Service
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Provides methods for syncing individual timesheet submissions and managing sync operations
 */

import { XeroSyncService as BaseXeroSyncService } from './xero-sync';
import { xeroTransformer } from './xero-transform';
import { XeroApiWrapper } from './xero';
import { prisma } from '@/lib/db';
import { timesheetEvents } from './events/timesheet-events';

export interface TimesheetSubmissionWithEntries {
  id: string;
  userId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  totalHours: number;
  totalBillable: number;
  status: string;
  submittedAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  entries: Array<{
    timeEntry: {
      id: string;
      projectId: string;
      taskId: string | null;
      date: Date;
      duration: number;
      description: string | null;
      billable: boolean;
      billRate: number | null;
      project: {
        id: string;
        name: string;
        code: string | null;
        client: any; // Use any for flexibility with different client structures
      };
      task: {
        id: string;
        name: string;
      } | null;
    };
  }>;
}

export interface SyncTimesheetOptions {
  dryRun?: boolean;
  validateData?: boolean;
  updateExisting?: boolean;
  notifyOnCompletion?: boolean;
}

export interface SyncTimesheetResult {
  success: boolean;
  submissionId: string;
  xeroTimeEntryIds: string[];
  summary: {
    timeEntries: {
      processed: number;
      synced: number;
      failed: number;
      errors: string[];
    };
  };
  errors: string[];
  warnings: string[];
}

export class XeroSyncService {
  private baseService: BaseXeroSyncService;
  
  constructor() {
    this.baseService = new BaseXeroSyncService();
  }
  
  /**
   * Sync a single timesheet submission to Xero
   */
  async syncTimesheetSubmission(
    submission: TimesheetSubmissionWithEntries,
    options: SyncTimesheetOptions = {}
  ): Promise<SyncTimesheetResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[XeroSyncService] Starting sync for submission: ${submission.id}`, {
        userId: submission.userId,
        weekStart: submission.weekStartDate,
        totalEntries: submission.entries.length,
        dryRun: options.dryRun,
      });

      // Validate submission status
      if (submission.status !== 'APPROVED') {
        throw new Error(`Submission ${submission.id} is not approved (status: ${submission.status})`);
      }

      // Initialize result object
      const result: SyncTimesheetResult = {
        success: false,
        submissionId: submission.id,
        xeroTimeEntryIds: [],
        summary: {
          timeEntries: {
            processed: 0,
            synced: 0,
            failed: 0,
            errors: [],
          },
        },
        errors: [],
        warnings: [],
      };

      // Check Xero connection
      const xeroWrapper = new XeroApiWrapper();
      const connectionStatus = await xeroWrapper.getConnectionStatus();
      
      if (!connectionStatus.connected) {
        throw new Error('Xero connection is not active');
      }

      // Validate data if requested
      if (options.validateData) {
        const validation = this.validateSubmissionData(submission);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          result.warnings.push(...validation.warnings);
          
          if (validation.errors.length > 0) {
            result.summary.timeEntries.failed = submission.entries.length;
            result.summary.timeEntries.errors = validation.errors;
            await this.logSyncResult(submission.id, result, Date.now() - startTime);
            return result;
          }
        }
      }

      // Transform timesheet data for this specific submission
      const transformedData = await this.transformSubmissionToXero(submission, options);
      result.summary.timeEntries.processed = transformedData.timeEntries.length;

      // Skip sync if dry run
      if (options.dryRun) {
        result.success = true;
        result.summary.timeEntries.synced = transformedData.timeEntries.length;
        console.log(`[XeroSyncService] Dry run completed for submission: ${submission.id}`);
        return result;
      }

      // Get accounting API instance
      const accountingApi = await xeroWrapper.getAccountingApi();
      
      // Sync time entries to Xero
      for (const timeEntry of transformedData.timeEntries) {
        try {
          // Check if time entry already exists in Xero
          const existingEntry = await this.findExistingTimeEntry(
            accountingApi,
            timeEntry,
            submission.id
          );

          let xeroTimeEntryId: string;

          if (existingEntry && !options.updateExisting) {
            // Skip if exists and update is not allowed
            result.warnings.push(`Time entry for ${timeEntry.date} already exists in Xero`);
            xeroTimeEntryId = existingEntry.timeID || '';
          } else if (existingEntry && options.updateExisting) {
            // Update existing entry
            const updateResponse = await accountingApi.updateTimeEntry(
              existingEntry.timeID!,
              { timeEntries: [timeEntry] }
            );
            
            xeroTimeEntryId = updateResponse.body.timeEntries?.[0]?.timeID || '';
            result.summary.timeEntries.synced++;
          } else {
            // Create new entry
            const createResponse = await accountingApi.createTimeEntry({
              timeEntries: [timeEntry],
            });
            
            xeroTimeEntryId = createResponse.body.timeEntries?.[0]?.timeID || '';
            result.summary.timeEntries.synced++;
          }

          if (xeroTimeEntryId) {
            result.xeroTimeEntryIds.push(xeroTimeEntryId);
          }

        } catch (entryError) {
          const errorMsg = `Failed to sync time entry: ${entryError instanceof Error ? entryError.message : 'Unknown error'}`;
          console.error(`[XeroSyncService] ${errorMsg}`, entryError);
          
          result.summary.timeEntries.failed++;
          result.summary.timeEntries.errors.push(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Determine overall success
      result.success = result.summary.timeEntries.synced > 0 && result.summary.timeEntries.failed === 0;

      // Log sync result
      await this.logSyncResult(submission.id, result, Date.now() - startTime);

      // Emit sync completion event
      await timesheetEvents.emitSyncCompleted(submission.id, result.success, result);

      // Send notification if requested
      if (options.notifyOnCompletion) {
        await this.sendSyncNotification(submission, result);
      }

      console.log(`[XeroSyncService] Sync completed for submission: ${submission.id}`, {
        success: result.success,
        synced: result.summary.timeEntries.synced,
        failed: result.summary.timeEntries.failed,
        duration: Date.now() - startTime,
      });

      return result;

    } catch (error) {
      console.error(`[XeroSyncService] Sync failed for submission: ${submission.id}`, error);
      
      const result: SyncTimesheetResult = {
        success: false,
        submissionId: submission.id,
        xeroTimeEntryIds: [],
        summary: {
          timeEntries: {
            processed: submission.entries.length,
            synced: 0,
            failed: submission.entries.length,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          },
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      };

      // Log sync failure
      await this.logSyncResult(submission.id, result, Date.now() - startTime);
      
      // Emit sync completion event
      await timesheetEvents.emitSyncCompleted(submission.id, false, { error: error instanceof Error ? error.message : error });

      return result;
    }
  }

  /**
   * Validate submission data before syncing
   */
  private validateSubmissionData(submission: TimesheetSubmissionWithEntries) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic submission data
    if (!submission.entries || submission.entries.length === 0) {
      errors.push('No time entries found in submission');
    }

    // Check each time entry
    for (const entry of submission.entries) {
      const timeEntry = entry.timeEntry;

      if (!timeEntry.project) {
        errors.push(`Time entry ${timeEntry.id} has no project`);
        continue;
      }

      if (!timeEntry.project.client) {
        warnings.push(`Project ${timeEntry.project.name} has no client assigned`);
      }

      if (timeEntry.duration <= 0) {
        errors.push(`Time entry ${timeEntry.id} has invalid duration: ${timeEntry.duration}`);
      }

      if (timeEntry.billable && !timeEntry.billRate) {
        warnings.push(`Billable time entry ${timeEntry.id} has no bill rate`);
      }

      if (!timeEntry.description || timeEntry.description.trim() === '') {
        warnings.push(`Time entry ${timeEntry.id} has no description`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Find existing time entry in Xero
   */
  private async findExistingTimeEntry(
    accountingApi: any,
    timeEntry: any,
    submissionId: string
  ) {
    try {
      // Search for existing time entries for the same date and user
      const response = await accountingApi.getTimeEntries(
        undefined, // tenantId will be set by wrapper
        {
          where: `Date >= DateTime(${timeEntry.date}) AND Date <= DateTime(${timeEntry.date})`,
        }
      );

      // Look for matching entry
      return response.body.timeEntries?.find((entry: any) => 
        entry.description?.includes(submissionId) ||
        (entry.duration === timeEntry.duration && entry.projectID === timeEntry.projectID)
      );

    } catch (error) {
      console.warn('[XeroSyncService] Could not search for existing time entries:', error);
      return null;
    }
  }

  /**
   * Log sync result to database
   */
  private async logSyncResult(
    submissionId: string,
    result: SyncTimesheetResult,
    duration: number
  ) {
    try {
      await prisma.xeroSyncLog.create({
        data: {
          submissionId,
          operation: 'SYNC_TIMESHEET',
          status: result.success ? 'SUCCESS' : 'FAILED',
          details: JSON.stringify(result),
          error: result.errors.length > 0 ? result.errors.join('; ') : null,
          trigger: 'approval',
          duration,
          completedAt: new Date(),
        },
      });
    } catch (logError) {
      console.error('[XeroSyncService] Failed to log sync result:', logError);
    }
  }

  /**
   * Send notification about sync completion
   */
  private async sendSyncNotification(
    submission: TimesheetSubmissionWithEntries,
    result: SyncTimesheetResult
  ) {
    try {
      // This could be enhanced to send actual notifications
      // For now, just log the notification intent
      console.log(`[XeroSyncService] Notification: Timesheet sync ${result.success ? 'completed' : 'failed'} for ${submission.user.name}`, {
        submissionId: submission.id,
        success: result.success,
        synced: result.summary.timeEntries.synced,
        failed: result.summary.timeEntries.failed,
      });
    } catch (error) {
      console.error('[XeroSyncService] Failed to send sync notification:', error);
    }
  }

  /**
   * Transform submission to Xero format
   */
  private async transformSubmissionToXero(
    submission: TimesheetSubmissionWithEntries, 
    options: SyncTimesheetOptions
  ) {
    const timeEntries: any[] = [];
    
    // Transform each time entry in the submission
    for (const entryData of submission.entries) {
      const timeEntry = entryData.timeEntry;
      
      // Basic Xero time entry structure
      const xeroEntry = {
        userID: submission.userId,
        projectID: timeEntry.project.id,
        taskID: timeEntry.taskId || undefined,
        date: timeEntry.date.toISOString().split('T')[0], // YYYY-MM-DD format
        duration: timeEntry.duration,
        description: timeEntry.description || `${timeEntry.project.name} - ${timeEntry.task?.name || 'General'}`,
      };
      
      timeEntries.push(xeroEntry);
    }
    
    return {
      timeEntries,
      projects: [], // Would be populated if needed
      contacts: [], // Would be populated if needed
    };
  }

  /**
   * Test connection to Xero
   */
  async testConnection() {
    try {
      const xeroWrapper = new XeroApiWrapper();
      return await xeroWrapper.getConnectionStatus();
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus() {
    try {
      const [recentLogs, failedCount, successCount] = await Promise.all([
        prisma.xeroSyncLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            submissionId: true,
            operation: true,
            status: true,
            error: true,
            createdAt: true,
            duration: true,
          },
        }),
        prisma.xeroSyncLog.count({
          where: {
            status: 'FAILED',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
          },
        }),
        prisma.xeroSyncLog.count({
          where: {
            status: 'SUCCESS',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
          },
        }),
      ]);

      return {
        recentLogs,
        stats: {
          last24Hours: {
            successful: successCount,
            failed: failedCount,
            total: successCount + failedCount,
            successRate: successCount + failedCount > 0 ? (successCount / (successCount + failedCount) * 100).toFixed(1) : '0',
          },
        },
      };
    } catch (error) {
      console.error('[XeroSyncService] Failed to get sync status:', error);
      throw error;
    }
  }
}

export default XeroSyncService;
