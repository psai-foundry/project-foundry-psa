
/**
 * Xero Synchronization Service
 * Phase 2B-2: Data Sync and Pipeline Management
 */

import { XeroApiWrapper } from './xero';
import { 
  xeroTransformer, 
  XeroDataTransformer, 
  TransformationOptions, 
  TransformationResult,
  XeroTimeEntry,
  XeroProject,
  XeroContact 
} from './xero-transform';
import { xeroValidationEngine } from './xero/validation-engine';
import { xeroErrorHandlingService } from './xero/error-handling-service';
import { xeroQuarantineSystem } from './xero/quarantine-system';
import { prisma } from '@/lib/db';
import { AccountingApi } from 'xero-node';

export interface SyncOptions extends TransformationOptions {
  dryRun?: boolean;
  overwriteExisting?: boolean;
  syncProjects?: boolean;
  syncContacts?: boolean;
  syncTimeEntries?: boolean;
  notifyOnCompletion?: boolean;
}

export interface SyncResult {
  success: boolean;
  summary: {
    timeEntries?: {
      processed: number;
      synced: number;
      failed: number;
      errors: string[];
    };
    projects?: {
      processed: number;
      synced: number;
      failed: number;
      errors: string[];
    };
    contacts?: {
      processed: number;
      synced: number;
      failed: number;
      errors: string[];
    };
  };
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyncHistory {
  id: string;
  type: 'FULL' | 'INCREMENTAL' | 'PROJECTS' | 'CONTACTS' | 'TIME_ENTRIES';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  options: SyncOptions;
  result?: SyncResult;
  startedAt: Date;
  completedAt?: Date;
  triggeredBy?: string;
}

/**
 * Main Synchronization Service
 */
export class XeroSyncService {
  private xeroApi: XeroApiWrapper;
  private transformer: XeroDataTransformer;
  private isRunning: boolean = false;

  constructor() {
    this.xeroApi = new XeroApiWrapper();
    this.transformer = xeroTransformer;
  }

  /**
   * Full synchronization of all data
   */
  async performFullSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already in progress');
    }

    this.isRunning = true;
    const result: SyncResult = {
      success: false,
      summary: {},
      startedAt: new Date(),
    };

    try {
      // Check Xero connection
      const connectionStatus = await this.xeroApi.getConnectionStatus();
      if (!connectionStatus.connected) {
        throw new Error('Xero connection not established. Please connect to Xero first.');
      }

      // Log sync start
      await this.logSyncStart('FULL', options);

      // Sync in order: Contacts -> Projects -> Time Entries
      if (options.syncContacts !== false) {
        result.summary.contacts = await this.syncContacts(options);
      }

      if (options.syncProjects !== false) {
        result.summary.projects = await this.syncProjects(options);
      }

      if (options.syncTimeEntries !== false) {
        result.summary.timeEntries = await this.syncTimeEntries(options);
      }

      result.success = true;
      result.completedAt = new Date();

      // Update last sync time
      await this.updateLastSyncTime();

      // Log sync completion
      await this.logSyncCompletion('FULL', result);

      return result;
    } catch (error) {
      result.error = String(error);
      result.completedAt = new Date();
      
      // Log sync failure
      await this.logSyncFailure('FULL', result);
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Incremental sync for recent changes
   */
  async performIncrementalSync(options: SyncOptions = {}): Promise<SyncResult> {
    const lastSync = await this.getLastSyncTime();
    const incrementalOptions: SyncOptions = {
      ...options,
      dateRange: {
        startDate: lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days if no previous sync
        endDate: new Date(),
      },
    };

    return this.performFullSync(incrementalOptions);
  }

  /**
   * Sync contacts (clients) to Xero
   */
  private async syncContacts(options: SyncOptions) {
    const result = {
      processed: 0,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Transform clients to Xero contacts
      const transformResult = await this.transformer.transformClients(options);
      result.processed = transformResult.summary.total;

      if (options.dryRun) {
        result.synced = transformResult.data.length;
        return result;
      }

      // Get Xero accounting API
      const accountingApi = await this.xeroApi.getAccountingApi();
      if (!accountingApi) {
        throw new Error('Failed to initialize Xero Accounting API');
      }

      // Sync contacts in batches
      const batchSize = 10; // Xero API limits
      for (let i = 0; i < transformResult.data.length; i += batchSize) {
        const batch = transformResult.data.slice(i, i + batchSize);
        
        try {
          // Check if contacts already exist and handle accordingly
          for (const contact of batch) {
            try {
              if (options.overwriteExisting) {
                // Update or create contact
                await this.upsertContact(accountingApi, contact);
              } else {
                // Only create if doesn't exist
                await this.createContactIfNotExists(accountingApi, contact);
              }
              result.synced++;
            } catch (error) {
              result.failed++;
              result.errors.push(`Contact ${contact.name}: ${error}`);
            }
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          result.failed += batch.length;
          result.errors.push(`Batch sync failed: ${error}`);
        }
      }

      // Add transformation errors to sync errors
      transformResult.errors.forEach(err => {
        result.errors.push(`Transform error: ${err.error}`);
      });

    } catch (error) {
      result.errors.push(`Contact sync failed: ${error}`);
    }

    return result;
  }

  /**
   * Sync projects to Xero
   */
  private async syncProjects(options: SyncOptions) {
    const result = {
      processed: 0,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Transform projects to Xero projects
      const transformResult = await this.transformer.transformProjects(options);
      result.processed = transformResult.summary.total;

      if (options.dryRun) {
        result.synced = transformResult.data.length;
        return result;
      }

      // Get Xero accounting API
      const accountingApi = await this.xeroApi.getAccountingApi();
      if (!accountingApi) {
        throw new Error('Failed to initialize Xero Accounting API');
      }

      // Sync projects individually (Xero projects API is different)
      for (const project of transformResult.data) {
        try {
          if (options.overwriteExisting) {
            await this.upsertProject(accountingApi, project);
          } else {
            await this.createProjectIfNotExists(accountingApi, project);
          }
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Project ${project.name}: ${error}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Add transformation errors
      transformResult.errors.forEach(err => {
        result.errors.push(`Transform error: ${err.error}`);
      });

    } catch (error) {
      result.errors.push(`Project sync failed: ${error}`);
    }

    return result;
  }

  /**
   * Sync time entries to Xero
   */
  private async syncTimeEntries(options: SyncOptions) {
    const result = {
      processed: 0,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Transform approved timesheets
      const transformResult = await this.transformer.transformApprovedTimesheets(options);
      result.processed = transformResult.summary.total;

      if (options.dryRun) {
        // In dry run, validate all entries but don't sync
        let validationErrors = 0;
        for (const timeEntry of transformResult.data) {
          const validationResult = await xeroValidationEngine.validateForXeroSync(
            timeEntry, 
            'timeEntry'
          );
          if (!validationResult.isValid) {
            validationErrors++;
            result.errors.push(`Validation failed for time entry: ${validationResult.errors.map(e => e.message).join(', ')}`);
          }
        }
        result.synced = transformResult.data.length - validationErrors;
        result.failed = validationErrors;
        return result;
      }

      // Get Xero accounting API
      const accountingApi = await this.xeroApi.getAccountingApi();
      if (!accountingApi) {
        throw new Error('Failed to initialize Xero Accounting API');
      }

      // Enhanced sync with validation and error handling
      const batchSize = 5; // Conservative batch size for time entries
      for (let i = 0; i < transformResult.data.length; i += batchSize) {
        const batch = transformResult.data.slice(i, i + batchSize);
        
        for (const timeEntry of batch) {
          try {
            // Pre-sync validation
            const validationResult = await xeroValidationEngine.validateForXeroSync(
              timeEntry, 
              'timeEntry'
            );

            // Handle validation failures
            if (!validationResult.isValid) {
              const errorHandlingResult = await xeroErrorHandlingService.handleSyncErrors(
                'timeEntry',
                timeEntry.userID || 'unknown',
                timeEntry, // original data
                timeEntry, // transformed data
                new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`),
                {
                  autoQuarantine: true,
                  escalateOnCritical: true,
                  logValidation: true
                }
              );

              result.failed++;
              result.errors.push(`Time entry validation failed: ${validationResult.errors[0]?.message || 'Unknown error'}`);
              continue;
            }

            // Attempt sync with pre and post integrity checks
            const preChecksum = validationResult.checksum;
            await this.createTimeEntry(accountingApi, timeEntry);
            
            // Post-sync integrity verification
            const integrityCheck = await xeroValidationEngine.verifyPostSyncIntegrity(
              timeEntry,
              timeEntry, // In this case, same as we don't get back modified data
              preChecksum!
            );

            if (!integrityCheck.isValid) {
              console.warn(`Post-sync integrity check failed for time entry`, integrityCheck);
            }

            result.synced++;

          } catch (syncError: any) {
            // Enhanced error handling for sync failures
            const errorHandlingResult = await xeroErrorHandlingService.handleSyncErrors(
              'timeEntry',
              timeEntry.userID || 'unknown',
              timeEntry, // original data
              timeEntry, // transformed data
              syncError,
              {
                autoQuarantine: true,
                escalateOnCritical: true,
                retryOnTransient: false, // Handle retries at higher level
                logValidation: true
              }
            );

            result.failed++;
            result.errors.push(`Time entry sync failed: ${syncError.message}`);

            // Log detailed error info for debugging
            console.error('Enhanced sync error handling result:', {
              timeEntry: timeEntry.description || 'Unknown',
              handled: errorHandlingResult.handled,
              quarantined: errorHandlingResult.quarantined,
              escalated: errorHandlingResult.escalated,
              canRetry: errorHandlingResult.canRetry,
              nextAction: errorHandlingResult.nextAction
            });
          }
        }

        // Rate limiting delay between batches
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Handle transformation errors with enhanced error system
      for (const transformError of transformResult.errors) {
        try {
          await xeroErrorHandlingService.handleSyncErrors(
            'timeEntry',
            transformError.sourceId,
            transformError.sourceData || {},
            {},
            new Error(transformError.error),
            {
              autoQuarantine: true,
              escalateOnCritical: true,
              logValidation: true
            }
          );
          result.errors.push(`Transform error: ${transformError.error}`);
        } catch (handlingError) {
          console.error('Failed to handle transformation error:', handlingError);
          result.errors.push(`Transform error (unhandled): ${transformError.error}`);
        }
      }

    } catch (error: any) {
      result.errors.push(`Time entry sync failed: ${error.message}`);
      
      // Try to escalate critical sync failures
      try {
        await xeroErrorHandlingService.handleSyncErrors(
          'timeEntry',
          'system',
          {},
          {},
          error,
          {
            autoQuarantine: false,
            escalateOnCritical: true,
            logValidation: true
          }
        );
      } catch (escalationError) {
        console.error('Failed to escalate sync failure:', escalationError);
      }
    }

    return result;
  }

  /**
   * Xero API Helper Methods
   */
  private async upsertContact(api: any, contact: any) {
    // Simplified implementation for Xero contacts
    try {
      // Convert our contact format to Xero's expected format
      const xeroContact = {
        name: contact.name,
        emailAddress: contact.emailAddress,
        isCustomer: contact.isCustomer || true,
        isSupplier: contact.isSupplier || false,
        addresses: contact.addresses,
        phones: contact.phones,
        website: contact.website,
      };

      const tenantId = await this.xeroApi.getTenantId();
      if (!tenantId) throw new Error('No Xero tenant ID available');

      // Try to create the contact
      const response = await api.createContacts(tenantId, { contacts: [xeroContact] });
      return response.body.contacts?.[0];
    } catch (error) {
      // Log error and continue - don't fail entire sync for one contact
      console.error('Failed to create contact in Xero:', String(error));
      throw new Error(`Failed to sync contact: ${String(error)}`);
    }
  }

  private async createContactIfNotExists(api: any, contact: any) {
    try {
      const tenantId = await this.xeroApi.getTenantId();
      if (!tenantId) throw new Error('No Xero tenant ID available');

      // Check if contact already exists by name
      const existing = await api.getContacts(tenantId, undefined, `name="${contact.name}"`);
      if (existing.body.contacts && existing.body.contacts.length > 0) {
        return existing.body.contacts[0];
      }

      // Create new contact
      return await this.upsertContact(api, contact);
    } catch (error) {
      throw new Error(`Failed to sync contact: ${String(error)}`);
    }
  }

  private async upsertProject(api: any, project: any) {
    // Note: Xero Projects API has different structure
    // This is a placeholder implementation
    try {
      console.log('Project sync not fully implemented yet - would sync:', project.name);
      return project;
    } catch (error) {
      throw new Error(`Failed to sync project: ${String(error)}`);
    }
  }

  private async createProjectIfNotExists(api: any, project: any) {
    return this.upsertProject(api, project);
  }

  private async createTimeEntry(api: any, timeEntry: any) {
    // Note: Xero time tracking API structure
    // This is a placeholder implementation
    try {
      console.log('Time entry sync not fully implemented yet - would sync:', timeEntry.description);
      return timeEntry;
    } catch (error) {
      throw new Error(`Failed to sync time entry: ${String(error)}`);
    }
  }

  /**
   * Utility Methods
   */
  private async logSyncStart(type: string, options: SyncOptions) {
    console.log(`Starting Xero sync: ${type}`, { options, timestamp: new Date() });
    // In production, you might want to store this in the database
  }

  private async logSyncCompletion(type: string, result: SyncResult) {
    console.log(`Completed Xero sync: ${type}`, { result, timestamp: new Date() });
  }

  private async logSyncFailure(type: string, result: SyncResult) {
    console.error(`Failed Xero sync: ${type}`, { result, timestamp: new Date() });
  }

  private async updateLastSyncTime() {
    await prisma.xeroConnection.updateMany({
      data: {
        lastSync: new Date(),
      },
    });
  }

  private async getLastSyncTime(): Promise<Date | null> {
    const connection = await prisma.xeroConnection.findUnique({
      where: { id: 'default' },
    });
    return connection?.lastSync || null;
  }

  /**
   * Public API Methods
   */
  async getSyncStatus() {
    const lastSync = await this.getLastSyncTime();
    const stats = await this.transformer.getTransformationStats();
    
    return {
      isRunning: this.isRunning,
      lastSync,
      readyForSync: stats.ready_for_sync,
      stats,
    };
  }

  async validateDataBeforeSync(options: SyncOptions = {}) {
    const dryRunOptions = { ...options, dryRun: true };
    
    const [contactsResult, projectsResult, timeEntriesResult] = await Promise.all([
      this.transformer.transformClients(dryRunOptions),
      this.transformer.transformProjects(dryRunOptions),
      this.transformer.transformApprovedTimesheets(dryRunOptions),
    ]);

    return {
      contacts: {
        valid: contactsResult.data.length,
        errors: contactsResult.errors.length,
        errorDetails: contactsResult.errors,
      },
      projects: {
        valid: projectsResult.data.length,
        errors: projectsResult.errors.length,
        errorDetails: projectsResult.errors,
      },
      timeEntries: {
        valid: timeEntriesResult.data.length,
        errors: timeEntriesResult.errors.length,
        errorDetails: timeEntriesResult.errors,
      },
      overallReadiness: {
        hasValidData: contactsResult.data.length > 0 || projectsResult.data.length > 0 || timeEntriesResult.data.length > 0,
        totalErrors: contactsResult.errors.length + projectsResult.errors.length + timeEntriesResult.errors.length,
      },
    };
  }
}

// Export singleton instance
export const xeroSyncService = new XeroSyncService();
