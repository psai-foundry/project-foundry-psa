
/**
 * Xero Data Transformation Layer
 * Phase 2B-2: PSA-to-Xero Data Mapping and Transformation
 */

import { prisma } from '@/lib/db';
import { 
  TimeEntry, 
  TimesheetSubmission, 
  Project, 
  Client, 
  User, 
  Task 
} from '@prisma/client';

// Extended types with relations
export interface ExtendedTimeEntry extends TimeEntry {
  project: Project & { client: Client };
  task?: Task;
  user: User;
}

export interface ExtendedTimesheetSubmission extends TimesheetSubmission {
  user: User;
  entries: Array<{
    timeEntry: ExtendedTimeEntry;
  }>;
}

// Xero API compatible data structures
export interface XeroTimeEntry {
  userID: string;
  projectID?: string;
  taskID?: string;
  description: string;
  duration: number; // in minutes
  dateUTC: string; // ISO date string
  billableStatus: 'billable' | 'non-billable';
  unitAmount?: number; // hourly rate
  totalAmount?: number; // total billable amount
}

export interface XeroProject {
  projectID?: string;
  name: string;
  code: string;
  status: 'inProgress' | 'completed' | 'quote' | 'invoiced';
  contactID?: string;
  description?: string;
  budgetAmount?: number;
  costRate?: number;
  chargeRate?: number;
  startDate?: string;
  endDate?: string;
}

export interface XeroContact {
  contactID?: string;
  name: string;
  emailAddress?: string;
  addresses?: Array<{
    addressType: 'POBOX' | 'STREET';
    addressLine1?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
  phones?: Array<{
    phoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX';
    phoneNumber: string;
  }>;
  website?: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
}

export interface XeroUser {
  userID?: string;
  firstName?: string;
  lastName?: string;
  emailAddress: string;
  isSubscriber?: boolean;
  organisationRole?: string;
}

export interface TransformationOptions {
  includeDrafts?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  projectFilter?: string[];
  userFilter?: string[];
  batchSize?: number;
}

export interface TransformationResult<T> {
  data: T[];
  errors: Array<{
    sourceId: string;
    error: string;
    sourceData?: any;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processed_at: Date;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Main Data Transformation Class
 */
export class XeroDataTransformer {
  
  /**
   * Transform approved timesheet submissions to Xero time entries
   */
  async transformApprovedTimesheets(
    options: TransformationOptions = {}
  ): Promise<TransformationResult<XeroTimeEntry>> {
    const errors: Array<{ sourceId: string; error: string; sourceData?: any }> = [];
    const xeroTimeEntries: XeroTimeEntry[] = [];

    try {
      // Build query filters
      const whereClause: any = {
        status: 'APPROVED', // Only approved timesheets
      };

      if (options.dateRange) {
        whereClause.weekStartDate = {
          gte: options.dateRange.startDate,
          lte: options.dateRange.endDate,
        };
      }

      if (options.userFilter) {
        whereClause.userId = {
          in: options.userFilter,
        };
      }

      // Fetch approved timesheet submissions with all relations
      const submissions = await prisma.timesheetSubmission.findMany({
        where: whereClause,
        include: {
          user: true,
          entries: {
            include: {
              timeEntry: {
                include: {
                  project: {
                    include: {
                      client: true,
                    },
                  },
                  task: true,
                  user: true,
                },
              },
            },
          },
        },
        take: options.batchSize || 100,
      });

      // Transform each submission
      for (const submission of submissions) {
        try {
          const transformedEntries = await this.transformTimesheetEntries(
            submission as ExtendedTimesheetSubmission,
            options
          );
          xeroTimeEntries.push(...transformedEntries.data);
          errors.push(...transformedEntries.errors);
        } catch (error) {
          errors.push({
            sourceId: submission.id,
            error: `Failed to transform timesheet submission: ${error}`,
            sourceData: { submissionId: submission.id, userId: submission.userId },
          });
        }
      }

      return {
        data: xeroTimeEntries,
        errors,
        summary: {
          total: submissions.length,
          successful: xeroTimeEntries.length,
          failed: errors.length,
          processed_at: new Date(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to transform approved timesheets: ${error}`);
    }
  }

  /**
   * Transform individual timesheet entries
   */
  private async transformTimesheetEntries(
    submission: ExtendedTimesheetSubmission,
    options: TransformationOptions
  ): Promise<TransformationResult<XeroTimeEntry>> {
    const errors: Array<{ sourceId: string; error: string; sourceData?: any }> = [];
    const xeroTimeEntries: XeroTimeEntry[] = [];

    for (const entryRelation of submission.entries) {
      const entry = entryRelation.timeEntry;
      
      try {
        // Validate entry data
        const validationErrors = this.validateTimeEntry(entry);
        if (validationErrors.length > 0) {
          errors.push({
            sourceId: entry.id,
            error: `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
            sourceData: entry,
          });
          continue;
        }

        // Skip non-billable entries if not requested
        if (!entry.billable && !options.includeDrafts) {
          continue;
        }

        // Apply project filter
        if (options.projectFilter && !options.projectFilter.includes(entry.projectId)) {
          continue;
        }

        // Transform to Xero format
        const xeroEntry: XeroTimeEntry = {
          userID: await this.mapUserToXero(entry.user),
          projectID: await this.mapProjectToXero(entry.project),
          taskID: entry.task ? await this.mapTaskToXero(entry.task) : undefined,
          description: entry.description || `${entry.project.name}${entry.task ? ` - ${entry.task.name}` : ''}`,
          duration: Math.round(entry.duration * 60), // Convert hours to minutes
          dateUTC: entry.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          billableStatus: entry.billable ? 'billable' : 'non-billable',
          unitAmount: entry.billRate || entry.project.defaultBillRate || entry.user.defaultBillRate || undefined,
          totalAmount: entry.billable ? 
            (entry.billRate || entry.project.defaultBillRate || entry.user.defaultBillRate || 0) * entry.duration : 
            undefined,
        };

        xeroTimeEntries.push(xeroEntry);
      } catch (error) {
        errors.push({
          sourceId: entry.id,
          error: `Failed to transform time entry: ${error}`,
          sourceData: entry,
        });
      }
    }

    return {
      data: xeroTimeEntries,
      errors,
      summary: {
        total: submission.entries.length,
        successful: xeroTimeEntries.length,
        failed: errors.length,
        processed_at: new Date(),
      },
    };
  }

  /**
   * Transform PSA projects to Xero projects
   */
  async transformProjects(
    options: TransformationOptions = {}
  ): Promise<TransformationResult<XeroProject>> {
    const errors: Array<{ sourceId: string; error: string; sourceData?: any }> = [];
    const xeroProjects: XeroProject[] = [];

    try {
      const whereClause: any = {
        status: { in: ['ACTIVE', 'COMPLETED'] },
      };

      if (options.projectFilter) {
        whereClause.id = { in: options.projectFilter };
      }

      const projects = await prisma.project.findMany({
        where: whereClause,
        include: {
          client: true,
        },
        take: options.batchSize || 100,
      });

      for (const project of projects) {
        try {
          const validationErrors = this.validateProject(project);
          if (validationErrors.length > 0) {
            errors.push({
              sourceId: project.id,
              error: `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
              sourceData: project,
            });
            continue;
          }

          const xeroProject: XeroProject = {
            name: project.name,
            code: project.code,
            status: this.mapProjectStatus(project.status),
            contactID: await this.mapClientToXero(project.client),
            description: project.description || undefined,
            budgetAmount: project.budget || undefined,
            chargeRate: project.defaultBillRate || undefined,
            startDate: project.startDate?.toISOString().split('T')[0],
            endDate: project.endDate?.toISOString().split('T')[0],
          };

          xeroProjects.push(xeroProject);
        } catch (error) {
          errors.push({
            sourceId: project.id,
            error: `Failed to transform project: ${error}`,
            sourceData: project,
          });
        }
      }

      return {
        data: xeroProjects,
        errors,
        summary: {
          total: projects.length,
          successful: xeroProjects.length,
          failed: errors.length,
          processed_at: new Date(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to transform projects: ${error}`);
    }
  }

  /**
   * Transform PSA clients to Xero contacts
   */
  async transformClients(
    options: TransformationOptions = {}
  ): Promise<TransformationResult<XeroContact>> {
    const errors: Array<{ sourceId: string; error: string; sourceData?: any }> = [];
    const xeroContacts: XeroContact[] = [];

    try {
      const whereClause: any = {
        isActive: true,
      };

      const clients = await prisma.client.findMany({
        where: whereClause,
        take: options.batchSize || 100,
      });

      for (const client of clients) {
        try {
          const validationErrors = this.validateClient(client);
          if (validationErrors.length > 0) {
            errors.push({
              sourceId: client.id,
              error: `Validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
              sourceData: client,
            });
            continue;
          }

          const xeroContact: XeroContact = {
            name: client.name,
            emailAddress: client.email || undefined,
            isCustomer: true,
            isSupplier: false,
            website: client.website || undefined,
            phones: client.phone ? [{
              phoneType: 'DEFAULT',
              phoneNumber: client.phone,
            }] : undefined,
            addresses: client.address ? [{
              addressType: 'STREET',
              addressLine1: client.address,
            }] : undefined,
          };

          xeroContacts.push(xeroContact);
        } catch (error) {
          errors.push({
            sourceId: client.id,
            error: `Failed to transform client: ${error}`,
            sourceData: client,
          });
        }
      }

      return {
        data: xeroContacts,
        errors,
        summary: {
          total: clients.length,
          successful: xeroContacts.length,
          failed: errors.length,
          processed_at: new Date(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to transform clients: ${error}`);
    }
  }

  /**
   * Validation Methods
   */
  private validateTimeEntry(entry: ExtendedTimeEntry): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!entry.duration || entry.duration <= 0) {
      errors.push({ field: 'duration', message: 'Duration must be greater than 0', value: entry.duration });
    }

    if (!entry.date) {
      errors.push({ field: 'date', message: 'Date is required' });
    }

    if (!entry.user?.email) {
      errors.push({ field: 'user.email', message: 'User email is required for Xero mapping' });
    }

    if (!entry.project?.name) {
      errors.push({ field: 'project.name', message: 'Project name is required' });
    }

    if (entry.billable && !entry.billRate && !entry.project?.defaultBillRate && !entry.user?.defaultBillRate) {
      errors.push({ field: 'billRate', message: 'Billable entries must have a billing rate defined' });
    }

    return errors;
  }

  private validateProject(project: Project & { client: Client }): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!project.name?.trim()) {
      errors.push({ field: 'name', message: 'Project name is required', value: project.name });
    }

    if (!project.code?.trim()) {
      errors.push({ field: 'code', message: 'Project code is required', value: project.code });
    }

    if (!project.client?.name?.trim()) {
      errors.push({ field: 'client.name', message: 'Client name is required for project mapping' });
    }

    return errors;
  }

  private validateClient(client: Client): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!client.name?.trim()) {
      errors.push({ field: 'name', message: 'Client name is required', value: client.name });
    }

    return errors;
  }

  /**
   * Mapping Utility Methods
   */
  private async mapUserToXero(user: User): Promise<string> {
    // In a real implementation, this would map to existing Xero user IDs
    // For now, use email as the identifier
    return user.email;
  }

  private async mapProjectToXero(project: Project): Promise<string> {
    // Use project code as Xero project identifier
    return project.code;
  }

  private async mapTaskToXero(task: Task): Promise<string> {
    // Use task name as identifier (Xero doesn't have a separate task entity)
    return task.name;
  }

  private async mapClientToXero(client: Client): Promise<string> {
    // Use client name as identifier for Xero contact
    return client.name;
  }

  private mapProjectStatus(status: string): 'inProgress' | 'completed' | 'quote' | 'invoiced' {
    switch (status) {
      case 'ACTIVE':
      case 'PLANNING':
        return 'inProgress';
      case 'COMPLETED':
        return 'completed';
      case 'ON_HOLD':
      case 'CANCELLED':
        return 'quote';
      default:
        return 'inProgress';
    }
  }

  /**
   * Batch Processing Methods
   */
  async processInBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<TransformationResult<R>>,
    batchSize: number = 50
  ): Promise<TransformationResult<R>> {
    const allResults: R[] = [];
    const allErrors: Array<{ sourceId: string; error: string; sourceData?: any }> = [];
    let totalProcessed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      try {
        const result = await processor(batch);
        allResults.push(...result.data);
        allErrors.push(...result.errors);
        totalProcessed += batch.length;
        
        // Add delay between batches to prevent rate limiting
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        allErrors.push({
          sourceId: `batch_${i}`,
          error: `Batch processing failed: ${error}`,
          sourceData: { batchStart: i, batchSize: batch.length },
        });
      }
    }

    return {
      data: allResults,
      errors: allErrors,
      summary: {
        total: items.length,
        successful: allResults.length,
        failed: allErrors.length,
        processed_at: new Date(),
      },
    };
  }

  /**
   * Get transformation statistics
   */
  async getTransformationStats(dateRange?: { startDate: Date; endDate: Date }) {
    const whereClause = dateRange ? {
      weekStartDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    } : {};

    const [approvedTimesheets, totalProjects, totalClients, totalTimeEntries] = await Promise.all([
      prisma.timesheetSubmission.count({
        where: { ...whereClause, status: 'APPROVED' },
      }),
      prisma.project.count({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      }),
      prisma.client.count({
        where: { isActive: true },
      }),
      prisma.timeEntry.count({
        where: dateRange ? {
          date: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        } : undefined,
      }),
    ]);

    return {
      approved_timesheets: approvedTimesheets,
      active_projects: totalProjects,
      active_clients: totalClients,
      total_time_entries: totalTimeEntries,
      ready_for_sync: approvedTimesheets > 0,
    };
  }
}

// Export singleton instance
export const xeroTransformer = new XeroDataTransformer();
