
import { prisma } from '@/lib/db';

export interface CreateNotificationParams {
  userId: string;
  type: 'EMAIL_DIGEST' | 'APPROVAL_REMINDER' | 'ESCALATION_ALERT' | 'TIMESHEET_STATUS_UPDATE' | 'SLACK_NOTIFICATION' | 'URGENT_APPROVAL' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledFor?: Date;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<any> {
  try {
    const notification = await prisma.notifications.create({
      data: {
        id: require('crypto').randomBytes(12).toString('hex'),
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        priority: params.priority || 'NORMAL',
        status: 'UNREAD',
        scheduledFor: params.scheduledFor || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification for timesheet submission
 */
export async function createTimesheetSubmissionNotification(
  submitterId: string,
  submitterName: string,
  timesheetId: string,
  projectName?: string
): Promise<void> {
  try {
    // Find managers/admins who should be notified
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'MANAGER']
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Create notifications for all managers
    const notifications = managers.map(manager => 
      createNotification({
        userId: manager.id,
        type: 'APPROVAL_REMINDER',
        title: 'New Timesheet Submission',
        message: `${submitterName} has submitted a timesheet${projectName ? ` for ${projectName}` : ''} that requires your approval.`,
        entityType: 'timesheet',
        entityId: timesheetId,
        priority: 'NORMAL'
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error creating timesheet submission notifications:', error);
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Create notification for timesheet approval
 */
export async function createTimesheetApprovalNotification(
  submitterId: string,
  approverName: string,
  timesheetId: string,
  projectName?: string,
  comments?: string
): Promise<void> {
  try {
    await createNotification({
      userId: submitterId,
      type: 'TIMESHEET_STATUS_UPDATE',
      title: 'Timesheet Approved',
      message: `Your timesheet${projectName ? ` for ${projectName}` : ''} has been approved by ${approverName}.${comments ? ` Comment: ${comments}` : ''}`,
      entityType: 'timesheet',
      entityId: timesheetId,
      priority: 'NORMAL'
    });
  } catch (error) {
    console.error('Error creating timesheet approval notification:', error);
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Create notification for timesheet rejection
 */
export async function createTimesheetRejectionNotification(
  submitterId: string,
  approverName: string,
  timesheetId: string,
  reason: string,
  projectName?: string
): Promise<void> {
  try {
    await createNotification({
      userId: submitterId,
      type: 'TIMESHEET_STATUS_UPDATE',
      title: 'Timesheet Rejected',
      message: `Your timesheet${projectName ? ` for ${projectName}` : ''} has been rejected by ${approverName}. Reason: ${reason}`,
      entityType: 'timesheet',
      entityId: timesheetId,
      priority: 'HIGH'
    });
  } catch (error) {
    console.error('Error creating timesheet rejection notification:', error);
    // Don't throw - notifications shouldn't break the main flow
  }
}
