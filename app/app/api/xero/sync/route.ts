
/**
 * Xero Data Synchronization API Endpoints
 * Phase 2B-2: Data sync and pipeline management endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroSyncService, SyncOptions } from '@/lib/xero-sync';
import { prisma } from '@/lib/db';

/**
 * GET /api/xero/sync - Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';

    // Get current sync status
    const status = await xeroSyncService.getSyncStatus();

    const response: any = {
      success: true,
      data: status,
    };

    // Include sync history if requested
    if (includeHistory) {
      // In a real implementation, you'd fetch from a sync_history table
      // For now, we'll return mock data structure
      response.data.history = [];
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xero/sync - Trigger data synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = 'full', // 'full', 'incremental', 'projects', 'contacts', 'timeEntries'
      options = {},
    } = body;

    const syncOptions: SyncOptions = {
      dryRun: options.dryRun || false,
      overwriteExisting: options.overwriteExisting || false,
      syncProjects: options.syncProjects !== false,
      syncContacts: options.syncContacts !== false,
      syncTimeEntries: options.syncTimeEntries !== false,
      notifyOnCompletion: options.notifyOnCompletion || false,
      includeDrafts: options.includeDrafts || false,
      dateRange: options.dateRange ? {
        startDate: new Date(options.dateRange.startDate),
        endDate: new Date(options.dateRange.endDate),
      } : undefined,
      projectFilter: options.projectFilter,
      userFilter: options.userFilter,
      batchSize: options.batchSize || 50,
    };

    let result;

    // Execute sync based on type
    switch (type) {
      case 'incremental':
        result = await xeroSyncService.performIncrementalSync(syncOptions);
        break;
      
      case 'full':
      default:
        result = await xeroSyncService.performFullSync(syncOptions);
        break;
    }

    // Log the sync activity
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `XERO_SYNC_${type.toUpperCase()}`,
        entityType: 'XERO_INTEGRATION',
        entityId: 'default',
        newValues: {
          type,
          options: JSON.parse(JSON.stringify(syncOptions)),
          result: {
            success: result.success,
            summary: JSON.parse(JSON.stringify(result.summary)),
          },
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        type,
        options: syncOptions,
        result,
      },
    });
  } catch (error) {
    console.error('Sync execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute sync', details: String(error) },
      { status: 500 }
    );
  }
}
