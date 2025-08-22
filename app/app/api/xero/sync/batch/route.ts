
/**
 * Batch Xero Sync API
 * Phase 2B-3: Real-time Sync Pipeline
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { XeroSyncQueueManager } from '@/lib/queue/xero-sync-queue';

// POST /api/xero/sync/batch - Trigger batch sync for date range
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { fromDate, toDate, userIds, force = false } = body;

    // Validate required fields
    if (!fromDate || !toDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: fromDate, toDate' 
      }, { status: 400 });
    }

    // Validate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format' 
      }, { status: 400 });
    }

    if (from >= to) {
      return NextResponse.json({ 
        error: 'fromDate must be before toDate' 
      }, { status: 400 });
    }

    // Limit batch size to prevent overwhelming the system
    const maxDays = 90; // 3 months
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > maxDays) {
      return NextResponse.json({ 
        error: `Date range too large. Maximum ${maxDays} days allowed` 
      }, { status: 400 });
    }

    // Queue batch sync job
    const job = await XeroSyncQueueManager.addBatchSyncJob({
      fromDate: fromDate,
      toDate: toDate,
      userIds: userIds || undefined,
      force,
      trigger: 'manual',
    });

    console.log(`[BatchSyncAPI] Queued batch sync job: ${job.id}`, {
      fromDate,
      toDate,
      userIds: userIds?.length,
      force,
      triggeredBy: session.user.id,
    });

    return NextResponse.json({
      message: 'Batch sync job queued successfully',
      jobId: job.id,
      details: {
        fromDate,
        toDate,
        userIds: userIds || 'all',
        force,
        estimatedDays: diffDays,
      },
    });

  } catch (error) {
    console.error('[BatchSyncAPI] Error triggering batch sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
