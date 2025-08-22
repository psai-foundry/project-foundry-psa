

/**
 * Comprehensive Audit Service
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 * 
 * Service for logging and managing audit trails for all administrative actions
 */

import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    details?: any;
  };
  userId?: string;
}

export interface AuditQueryFilter {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  search?: string;
}

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async log(data: AuditLogData, request?: Request): Promise<void> {
    try {
      // Get user context if not provided
      let userId = data.userId;
      if (!userId) {
        try {
          const session = await getServerSession(authOptions);
          userId = session?.user?.id;
        } catch (error) {
          // Continue without user context for system actions
        }
      }

      // Extract request metadata if available
      let metadata = data.metadata || {};
      if (request) {
        metadata = {
          ...metadata,
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        };
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
          newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });

      console.log(`[AuditService] Logged: ${data.action} on ${data.entityType}${data.entityId ? ` (${data.entityId})` : ''} by ${userId || 'system'}`);
    } catch (error) {
      console.error('[AuditService] Failed to create audit log:', error);
      // Don't throw to avoid breaking the main operation
    }
  }

  /**
   * Log manual sync operations
   */
  static async logManualSync(data: {
    timesheetIds: string[];
    syncType: string;
    dryRun: boolean;
    result: any;
    userId: string;
  }, request?: Request): Promise<void> {
    await this.log({
      action: 'MANUAL_XERO_SYNC',
      entityType: 'TimesheetBatch',
      entityId: `batch-${Date.now()}`,
      newValues: {
        timesheetIds: data.timesheetIds,
        syncType: data.syncType,
        dryRun: data.dryRun,
        result: {
          success: data.result.success,
          processed: data.result.processed?.length || 0,
          failed: data.result.failed?.length || 0,
          errors: data.result.errors || [],
        },
        timestamp: new Date().toISOString(),
      },
      userId: data.userId,
      metadata: {
        source: 'manual_sync_dashboard',
        details: {
          batchSize: data.timesheetIds.length,
          syncMode: data.dryRun ? 'dry_run' : 'live',
        },
      },
    }, request);
  }

  /**
   * Log validation override operations
   */
  static async logValidationOverride(data: {
    overrideId: string;
    action: 'CREATE' | 'APPROVE' | 'REVOKE' | 'EXTEND';
    entityId: string;
    entityType: string;
    overriddenRules: string[];
    justification?: string;
    userId: string;
    oldStatus?: string;
    newStatus?: string;
  }, request?: Request): Promise<void> {
    await this.log({
      action: `VALIDATION_OVERRIDE_${data.action}`,
      entityType: 'XeroValidationOverride',
      entityId: data.overrideId,
      oldValues: data.oldStatus ? { status: data.oldStatus } : null,
      newValues: {
        status: data.newStatus || 'ACTIVE',
        targetEntityId: data.entityId,
        targetEntityType: data.entityType,
        overriddenRules: data.overriddenRules,
        justification: data.justification,
        timestamp: new Date().toISOString(),
      },
      userId: data.userId,
      metadata: {
        source: 'validation_override_system',
        details: {
          rulesCount: data.overriddenRules.length,
          targetEntity: `${data.entityType}:${data.entityId}`,
        },
      },
    }, request);
  }

  /**
   * Log bulk reprocessing operations
   */
  static async logBulkReprocess(data: {
    jobId: string;
    jobType: string;
    entityIds: string[];
    filters: any;
    result: any;
    userId: string;
  }, request?: Request): Promise<void> {
    await this.log({
      action: 'BULK_REPROCESS_JOB',
      entityType: 'BulkProcessingJob',
      entityId: data.jobId,
      newValues: {
        jobType: data.jobType,
        entityIds: data.entityIds,
        filters: data.filters,
        result: {
          status: data.result.status,
          processed: data.result.processed || 0,
          succeeded: data.result.succeeded || 0,
          failed: data.result.failed || 0,
          errors: data.result.errors || [],
        },
        timestamp: new Date().toISOString(),
      },
      userId: data.userId,
      metadata: {
        source: 'bulk_reprocess_dashboard',
        details: {
          batchSize: data.entityIds.length,
          estimatedDuration: data.result.estimatedDuration,
        },
      },
    }, request);
  }

  /**
   * Log system administrative actions
   */
  static async logSystemAction(data: {
    action: string;
    details: any;
    userId: string;
  }, request?: Request): Promise<void> {
    await this.log({
      action: `SYSTEM_${data.action.toUpperCase()}`,
      entityType: 'System',
      newValues: {
        ...data.details,
        timestamp: new Date().toISOString(),
      },
      userId: data.userId,
      metadata: {
        source: 'system_admin',
      },
    }, request);
  }

  /**
   * Query audit logs with filters
   */
  static async query(filters: AuditQueryFilter = {}): Promise<{
    logs: any[];
    total: number;
  }> {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      search,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit statistics
   */
  static async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalLogs: number;
    actionBreakdown: Record<string, number>;
    entityBreakdown: Record<string, number>;
    userBreakdown: Array<{ userId: string; userName: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
    criticalActions: number;
  }> {
    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [
      totalLogs,
      actionStats,
      entityStats,
      userStats,
      dailyStats,
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
      }),
      
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
        _count: true,
      }),
      
      prisma.auditLog.groupBy({
        by: ['timestamp'],
        where,
        _count: true,
        orderBy: { timestamp: 'desc' },
        take: 30,
      }),
    ]);

    // Process results
    const actionBreakdown = actionStats.reduce((acc: any, stat: any) => {
      acc[stat.action] = stat._count;
      return acc;
    }, {});

    const entityBreakdown = entityStats.reduce((acc: any, stat: any) => {
      acc[stat.entityType] = stat._count;
      return acc;
    }, {});

    const userBreakdown = await Promise.all(
      userStats.map(async (stat: any) => {
        const user = stat.userId ? await prisma.user.findUnique({
          where: { id: stat.userId },
          select: { name: true },
        }) : null;
        return {
          userId: stat.userId,
          userName: user?.name || 'Unknown User',
          count: stat._count,
        };
      })
    );

    const dailyActivity = dailyStats.map((stat: any) => ({
      date: stat.timestamp.toISOString().split('T')[0],
      count: stat._count,
    }));

    // Count critical actions (manual overrides, bulk operations, etc.)
    const criticalActions = await prisma.auditLog.count({
      where: {
        ...where,
        action: {
          in: [
            'MANUAL_XERO_SYNC',
            'VALIDATION_OVERRIDE_CREATE',
            'VALIDATION_OVERRIDE_APPROVE',
            'BULK_REPROCESS_JOB',
            'SYSTEM_CONFIG_CHANGE',
          ],
        },
      },
    });

    return {
      totalLogs,
      actionBreakdown,
      entityBreakdown,
      userBreakdown,
      dailyActivity,
      criticalActions,
    };
  }

  /**
   * Get recent critical actions for dashboard
   */
  static async getRecentCriticalActions(limit = 10): Promise<any[]> {
    return prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'MANUAL_XERO_SYNC',
            'VALIDATION_OVERRIDE_CREATE',
            'VALIDATION_OVERRIDE_APPROVE',
            'VALIDATION_OVERRIDE_REVOKE',
            'BULK_REPROCESS_JOB',
          ],
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

export default AuditService;

