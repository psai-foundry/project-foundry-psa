
/**
 * Timesheet Event System
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Event-driven system to trigger Xero syncing on timesheet approvals
 */

import { prisma } from '@/lib/db';
import { XeroSyncQueueManager } from '../queue/xero-sync-queue';
import { EventEmitter } from 'events';

export interface TimesheetApprovedEvent {
  submissionId: string;
  userId: string;
  approvedBy: string;
  approvedAt: Date;
  weekStartDate: Date;
  totalHours: number;
  totalBillable: number;
}

export interface TimesheetRejectedEvent {
  submissionId: string;
  userId: string;
  rejectedBy: string;
  rejectedAt: Date;
  rejectionReason?: string;
}

class TimesheetEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle timesheet approval events
    this.on('timesheet:approved', async (event: TimesheetApprovedEvent) => {
      console.log('[TimesheetEvents] Timesheet approved:', {
        submissionId: event.submissionId,
        userId: event.userId,
        approvedBy: event.approvedBy,
      });

      try {
        // Check if Xero sync is enabled
        const xeroConnection = await prisma.xeroConnection.findFirst({
          where: { isActive: true },
        });

        if (!xeroConnection) {
          console.log('[TimesheetEvents] Xero sync not enabled, skipping sync');
          return;
        }

        // Add sync job to queue with high priority
        await XeroSyncQueueManager.addTimesheetSyncJob({
          submissionId: event.submissionId,
          userId: event.userId,
          weekStartDate: event.weekStartDate.toISOString(),
          priority: 'high',
          trigger: 'approval',
          metadata: {
            approvedBy: event.approvedBy,
            approvedAt: event.approvedAt.toISOString(),
          },
        });

        console.log('[TimesheetEvents] Xero sync job queued for submission:', event.submissionId);

        // Create audit log entry
        await prisma.auditLog.create({
          data: {
            userId: event.approvedBy,
            action: 'TIMESHEET_APPROVED',
            entityType: 'TimesheetSubmission',
            entityId: event.submissionId,
            newValues: {
              submissionId: event.submissionId,
              targetUserId: event.userId,
              totalHours: event.totalHours,
              xeroSyncTriggered: true,
            },
          },
        });

      } catch (error) {
        console.error('[TimesheetEvents] Error handling timesheet approval:', error);
        
        // Create error audit log
        await prisma.auditLog.create({
          data: {
            userId: event.approvedBy,
            action: 'TIMESHEET_APPROVAL_ERROR',
            entityType: 'TimesheetSubmission',
            entityId: event.submissionId,
            newValues: {
              error: error instanceof Error ? error.message : 'Unknown error',
              submissionId: event.submissionId,
            },
          },
        });
      }
    });

    // Handle timesheet rejection events
    this.on('timesheet:rejected', async (event: TimesheetRejectedEvent) => {
      console.log('[TimesheetEvents] Timesheet rejected:', {
        submissionId: event.submissionId,
        userId: event.userId,
        rejectedBy: event.rejectedBy,
      });

      try {
        // Create audit log entry
        await prisma.auditLog.create({
          data: {
            userId: event.rejectedBy,
            action: 'TIMESHEET_REJECTED',
            entityType: 'TimesheetSubmission',
            entityId: event.submissionId,
            newValues: {
              submissionId: event.submissionId,
              targetUserId: event.userId,
              rejectionReason: event.rejectionReason,
            },
          },
        });

      } catch (error) {
        console.error('[TimesheetEvents] Error handling timesheet rejection:', error);
      }
    });

    // Handle sync completion events
    this.on('sync:completed', async (data: { submissionId: string; success: boolean; details?: any }) => {
      console.log('[TimesheetEvents] Sync completed:', {
        submissionId: data.submissionId,
        success: data.success,
      });

      if (!data.success && data.details?.error) {
        // Handle sync failures - could implement notification system here
        console.error('[TimesheetEvents] Sync failed for submission:', data.submissionId, data.details.error);
      }
    });

    // Handle queue health events
    this.on('queue:health', async (data: { status: string; details?: any }) => {
      console.log('[TimesheetEvents] Queue health update:', data.status);
      
      if (data.status === 'unhealthy') {
        // Could implement alert system here
        console.warn('[TimesheetEvents] Queue is unhealthy:', data.details);
      }
    });
  }

  // Public methods to emit events
  async emitTimesheetApproved(event: TimesheetApprovedEvent) {
    this.emit('timesheet:approved', event);
  }

  async emitTimesheetRejected(event: TimesheetRejectedEvent) {
    this.emit('timesheet:rejected', event);
  }

  async emitSyncCompleted(submissionId: string, success: boolean, details?: any) {
    this.emit('sync:completed', { submissionId, success, details });
  }

  async emitQueueHealth(status: string, details?: any) {
    this.emit('queue:health', { status, details });
  }
}

// Singleton instance
export const timesheetEvents = new TimesheetEventEmitter();

// Helper functions for triggering events
export async function triggerTimesheetApproved(submissionId: string) {
  try {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        approver: true,
      },
    });

    if (!submission || submission.status !== 'APPROVED' || !submission.approvedBy || !submission.approvedAt) {
      throw new Error('Invalid submission state for approval event');
    }

    await timesheetEvents.emitTimesheetApproved({
      submissionId: submission.id,
      userId: submission.userId,
      approvedBy: submission.approvedBy,
      approvedAt: submission.approvedAt,
      weekStartDate: submission.weekStartDate,
      totalHours: submission.totalHours,
      totalBillable: submission.totalBillable,
    });

  } catch (error) {
    console.error('[TimesheetEvents] Error triggering timesheet approved event:', error);
    throw error;
  }
}

export async function triggerTimesheetRejected(submissionId: string) {
  try {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.status !== 'REJECTED' || !submission.rejectedAt) {
      throw new Error('Invalid submission state for rejection event');
    }

    await timesheetEvents.emitTimesheetRejected({
      submissionId: submission.id,
      userId: submission.userId,
      rejectedBy: 'system', // Could be enhanced to track who rejected
      rejectedAt: submission.rejectedAt,
      rejectionReason: submission.rejectionReason || undefined,
    });

  } catch (error) {
    console.error('[TimesheetEvents] Error triggering timesheet rejected event:', error);
    throw error;
  }
}

export default timesheetEvents;
