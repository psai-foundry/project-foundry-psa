
/**
 * Xero Data Quarantine System
 * Phase 2B-6: Quarantine and manual review system for failed records
 */

import { prisma } from '@/lib/db';
import { ValidationError, ErrorSeverity, ErrorCategory, ErrorType } from './validation-engine';

export enum QuarantineStatus {
  QUARANTINED = 'QUARANTINED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export enum QuarantineReason {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  API_ERROR = 'API_ERROR',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  MANUAL_QUARANTINE = 'MANUAL_QUARANTINE'
}

export interface QuarantineRecord {
  id: string;
  entityType: 'timeEntry' | 'project' | 'contact' | 'submission';
  entityId: string;
  originalData: any;
  transformedData?: any;
  reason: QuarantineReason;
  status: QuarantineStatus;
  errors: ValidationError[];
  priority: ErrorSeverity;
  quarantinedAt: Date;
  quarantinedBy: string; // system or user ID
  reviewedAt?: Date;
  reviewedBy?: string;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
}

export interface QuarantineFilter {
  entityType?: string;
  status?: QuarantineStatus[];
  priority?: ErrorSeverity[];
  reason?: QuarantineReason[];
  dateFrom?: Date;
  dateTo?: Date;
  reviewedBy?: string;
}

export interface QuarantineStats {
  total: number;
  byStatus: Record<QuarantineStatus, number>;
  byPriority: Record<ErrorSeverity, number>;
  byReason: Record<QuarantineReason, number>;
  avgResolutionTime: number; // in hours
  oldestUnresolved?: Date;
}

export class XeroQuarantineSystem {
  private static instance: XeroQuarantineSystem;

  public static getInstance(): XeroQuarantineSystem {
    if (!XeroQuarantineSystem.instance) {
      XeroQuarantineSystem.instance = new XeroQuarantineSystem();
    }
    return XeroQuarantineSystem.instance;
  }

  /**
   * Quarantine a record due to validation failures
   */
  async quarantineRecord(
    entityType: 'timeEntry' | 'project' | 'contact' | 'submission',
    entityId: string,
    originalData: any,
    errors: ValidationError[],
    quarantinedBy: string = 'system',
    transformedData?: any,
    metadata?: Record<string, any>
  ): Promise<QuarantineRecord> {
    try {
      // Determine reason and priority
      const reason = this.determineQuarantineReason(errors);
      const priority = this.determinePriority(errors);

      // Create quarantine record in database
      const quarantineRecord = await prisma.xeroQuarantineRecord.create({
        data: {
          entityType,
          entityId,
          originalData: JSON.stringify(originalData),
          transformedData: transformedData ? JSON.stringify(transformedData) : null,
          reason,
          status: QuarantineStatus.QUARANTINED,
          errors: JSON.stringify(errors),
          priority,
          quarantinedBy,
          metadata: metadata ? JSON.stringify(metadata) : null,
          quarantinedAt: new Date()
        }
      });

      // Log quarantine action
      await this.logQuarantineAction(
        quarantineRecord.id,
        'QUARANTINED',
        quarantinedBy,
        `Record quarantined due to ${errors.length} validation errors`
      );

      // Check if escalation is needed
      if (this.requiresEscalation(errors)) {
        await this.escalateQuarantinedRecord(quarantineRecord.id, errors);
      }

      return {
        id: quarantineRecord.id,
        entityType: quarantineRecord.entityType as any,
        entityId: quarantineRecord.entityId,
        originalData: JSON.parse(quarantineRecord.originalData),
        transformedData: quarantineRecord.transformedData ? JSON.parse(quarantineRecord.transformedData) : undefined,
        reason: quarantineRecord.reason as QuarantineReason,
        status: quarantineRecord.status as QuarantineStatus,
        errors: JSON.parse(quarantineRecord.errors as string),
        priority: quarantineRecord.priority as ErrorSeverity,
        quarantinedAt: quarantineRecord.quarantinedAt,
        quarantinedBy: quarantineRecord.quarantinedBy,
        reviewedAt: quarantineRecord.reviewedAt || undefined,
        reviewedBy: quarantineRecord.reviewedBy || undefined,
        resolutionNotes: quarantineRecord.resolutionNotes || undefined,
        metadata: quarantineRecord.metadata ? JSON.parse(quarantineRecord.metadata) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to quarantine record: ${error}`);
    }
  }

  /**
   * Get quarantined records with filtering
   */
  async getQuarantinedRecords(
    filter: QuarantineFilter = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{
    records: QuarantineRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const where: any = {};

      // Apply filters
      if (filter.entityType) {
        where.entityType = filter.entityType;
      }

      if (filter.status && filter.status.length > 0) {
        where.status = { in: filter.status };
      }

      if (filter.priority && filter.priority.length > 0) {
        where.priority = { in: filter.priority };
      }

      if (filter.reason && filter.reason.length > 0) {
        where.reason = { in: filter.reason };
      }

      if (filter.dateFrom || filter.dateTo) {
        where.quarantinedAt = {};
        if (filter.dateFrom) {
          where.quarantinedAt.gte = filter.dateFrom;
        }
        if (filter.dateTo) {
          where.quarantinedAt.lte = filter.dateTo;
        }
      }

      if (filter.reviewedBy) {
        where.reviewedBy = filter.reviewedBy;
      }

      // Get total count
      const total = await prisma.xeroQuarantineRecord.count({ where });

      // Get records
      const records = await prisma.xeroQuarantineRecord.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { quarantinedAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      });

      const mappedRecords: QuarantineRecord[] = records.map(record => ({
        id: record.id,
        entityType: record.entityType as any,
        entityId: record.entityId,
        originalData: JSON.parse(record.originalData),
        transformedData: record.transformedData ? JSON.parse(record.transformedData) : undefined,
        reason: record.reason as QuarantineReason,
        status: record.status as QuarantineStatus,
        errors: JSON.parse(record.errors as string),
        priority: record.priority as ErrorSeverity,
        quarantinedAt: record.quarantinedAt,
        quarantinedBy: record.quarantinedBy,
        reviewedAt: record.reviewedAt || undefined,
        reviewedBy: record.reviewedBy || undefined,
        resolutionNotes: record.resolutionNotes || undefined,
        metadata: record.metadata ? JSON.parse(record.metadata) : undefined
      }));

      return {
        records: mappedRecords,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get quarantined records: ${error}`);
    }
  }

  /**
   * Review and resolve quarantined record
   */
  async reviewQuarantinedRecord(
    quarantineId: string,
    reviewedBy: string,
    status: QuarantineStatus.RESOLVED | QuarantineStatus.REJECTED,
    resolutionNotes: string,
    correctedData?: any
  ): Promise<void> {
    try {
      await prisma.xeroQuarantineRecord.update({
        where: { id: quarantineId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedBy,
          resolutionNotes,
          correctedData: correctedData ? JSON.stringify(correctedData) : undefined
        }
      });

      // Log review action
      await this.logQuarantineAction(
        quarantineId,
        status === QuarantineStatus.RESOLVED ? 'RESOLVED' : 'REJECTED',
        reviewedBy,
        resolutionNotes
      );

      // If resolved with corrected data, trigger re-sync
      if (status === QuarantineStatus.RESOLVED && correctedData) {
        await this.triggerReSync(quarantineId, correctedData);
      }
    } catch (error) {
      throw new Error(`Failed to review quarantined record: ${error}`);
    }
  }

  /**
   * Get quarantine statistics
   */
  async getQuarantineStats(dateFrom?: Date, dateTo?: Date): Promise<QuarantineStats> {
    try {
      const where: any = {};
      
      if (dateFrom || dateTo) {
        where.quarantinedAt = {};
        if (dateFrom) where.quarantinedAt.gte = dateFrom;
        if (dateTo) where.quarantinedAt.lte = dateTo;
      }

      const [
        total,
        statusCounts,
        priorityCounts,
        reasonCounts,
        avgResolution,
        oldestUnresolved
      ] = await Promise.all([
        // Total count
        prisma.xeroQuarantineRecord.count({ where }),

        // Status breakdown
        prisma.xeroQuarantineRecord.groupBy({
          by: ['status'],
          where,
          _count: { id: true }
        }),

        // Priority breakdown
        prisma.xeroQuarantineRecord.groupBy({
          by: ['priority'],
          where,
          _count: { id: true }
        }),

        // Reason breakdown
        prisma.xeroQuarantineRecord.groupBy({
          by: ['reason'],
          where,
          _count: { id: true }
        }),

        // Average resolution time
        prisma.$queryRaw`
          SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - quarantined_at))/3600) as avg_hours
          FROM xero_quarantine_records 
          WHERE reviewed_at IS NOT NULL 
          ${dateFrom ? `AND quarantined_at >= ${dateFrom}` : ''}
          ${dateTo ? `AND quarantined_at <= ${dateTo}` : ''}
        `,

        // Oldest unresolved
        prisma.xeroQuarantineRecord.findFirst({
          where: {
            ...where,
            status: { in: [QuarantineStatus.QUARANTINED, QuarantineStatus.UNDER_REVIEW] }
          },
          orderBy: { quarantinedAt: 'asc' },
          select: { quarantinedAt: true }
        })
      ]);

      // Build stats object
      const byStatus = Object.values(QuarantineStatus).reduce((acc, status) => {
        acc[status] = statusCounts.find(s => s.status === status)?._count.id || 0;
        return acc;
      }, {} as Record<QuarantineStatus, number>);

      const byPriority = Object.values(ErrorSeverity).reduce((acc, priority) => {
        acc[priority] = priorityCounts.find(p => p.priority === priority)?._count.id || 0;
        return acc;
      }, {} as Record<ErrorSeverity, number>);

      const byReason = Object.values(QuarantineReason).reduce((acc, reason) => {
        acc[reason] = reasonCounts.find(r => r.reason === reason)?._count.id || 0;
        return acc;
      }, {} as Record<QuarantineReason, number>);

      return {
        total,
        byStatus,
        byPriority,
        byReason,
        avgResolutionTime: (avgResolution as any)?.[0]?.avg_hours || 0,
        oldestUnresolved: oldestUnresolved?.quarantinedAt
      };
    } catch (error) {
      throw new Error(`Failed to get quarantine stats: ${error}`);
    }
  }

  /**
   * Bulk operations for quarantined records
   */
  async bulkUpdateQuarantineRecords(
    recordIds: string[],
    updates: {
      status?: QuarantineStatus;
      reviewedBy?: string;
      resolutionNotes?: string;
    },
    reviewedBy: string
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const recordId of recordIds) {
      try {
        await prisma.xeroQuarantineRecord.update({
          where: { id: recordId },
          data: {
            ...updates,
            reviewedAt: new Date(),
            reviewedBy
          }
        });

        await this.logQuarantineAction(
          recordId,
          updates.status || 'BULK_UPDATE',
          reviewedBy,
          updates.resolutionNotes || 'Bulk update operation'
        );

        updated++;
      } catch (error) {
        errors.push(`Failed to update record ${recordId}: ${error}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Private helper methods
   */
  private determineQuarantineReason(errors: ValidationError[]): QuarantineReason {
    if (errors.some(e => e.category === ErrorCategory.VALIDATION)) {
      return QuarantineReason.VALIDATION_FAILED;
    }
    if (errors.some(e => e.category === ErrorCategory.API_ERROR)) {
      return QuarantineReason.API_ERROR;
    }
    if (errors.some(e => e.category === ErrorCategory.DATA_INTEGRITY)) {
      return QuarantineReason.DATA_INTEGRITY;
    }
    if (errors.some(e => e.category === ErrorCategory.BUSINESS_RULE)) {
      return QuarantineReason.BUSINESS_RULE_VIOLATION;
    }
    return QuarantineReason.VALIDATION_FAILED;
  }

  private determinePriority(errors: ValidationError[]): ErrorSeverity {
    const severities = errors.map(e => e.severity);
    if (severities.includes(ErrorSeverity.CRITICAL)) return ErrorSeverity.CRITICAL;
    if (severities.includes(ErrorSeverity.HIGH)) return ErrorSeverity.HIGH;
    if (severities.includes(ErrorSeverity.MEDIUM)) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private requiresEscalation(errors: ValidationError[]): boolean {
    return errors.some(e => e.severity === ErrorSeverity.CRITICAL);
  }

  private async escalateQuarantinedRecord(quarantineId: string, errors: ValidationError[]): Promise<void> {
    try {
      // Create escalation notification
      await prisma.notifications.create({
        data: {
          id: `escalation_${quarantineId}_${Date.now()}`,
          userId: 'admin', // TODO: Get actual admin user IDs
          type: 'SYSTEM_ALERT',
          title: 'Critical Xero Sync Error - Escalation Required',
          message: `Quarantined record ${quarantineId} has critical errors requiring immediate attention. ${errors.length} errors detected.`,
          entityType: 'xero_quarantine',
          entityId: quarantineId,
          priority: 'HIGH',
          metadata: JSON.stringify({
            quarantineId,
            errorCount: errors.length,
            criticalErrors: errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length
          }),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Failed to escalate quarantined record ${quarantineId}:`, error);
    }
  }

  private async logQuarantineAction(
    quarantineId: string,
    action: string,
    performedBy: string,
    details: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: performedBy === 'system' ? null : performedBy,
          action,
          entityType: 'xero_quarantine',
          entityId: quarantineId,
          newValues: { details },
          ipAddress: '127.0.0.1', // TODO: Get actual IP
          userAgent: 'Xero Quarantine System'
        }
      });
    } catch (error) {
      console.error(`Failed to log quarantine action for ${quarantineId}:`, error);
    }
  }

  private async triggerReSync(quarantineId: string, correctedData: any): Promise<void> {
    // TODO: Implement re-sync logic
    console.log(`Triggering re-sync for resolved quarantine record: ${quarantineId}`);
  }
}

// Singleton instance
export const xeroQuarantineSystem = XeroQuarantineSystem.getInstance();
