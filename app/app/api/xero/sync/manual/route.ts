
/**
 * Manual Xero Sync API
 * Phase 2B-3: Real-time Sync Pipeline
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { XeroSyncQueueManager } from '@/lib/queue/xero-sync-queue';
import { prisma } from '@/lib/db';

// POST /api/xero/sync/manual - Manually trigger sync for specific submissions
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
    const { submissionIds, priority = 'medium' } = body;

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid submissionIds array' 
      }, { status: 400 });
    }

    // Validate submissions exist and are approved
    const submissions = await prisma.timesheetSubmission.findMany({
      where: {
        id: { in: submissionIds },
        status: 'APPROVED',
      },
      select: {
        id: true,
        userId: true,
        weekStartDate: true,
        status: true,
      },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ 
        error: 'No approved submissions found with the provided IDs' 
      }, { status: 404 });
    }

    // Queue sync jobs
    const jobs = [];
    for (const submission of submissions) {
      const job = await XeroSyncQueueManager.addTimesheetSyncJob({
        submissionId: submission.id,
        userId: submission.userId,
        weekStartDate: submission.weekStartDate.toISOString(),
        priority: priority as 'high' | 'medium' | 'low',
        trigger: 'manual',
        metadata: {
          triggeredBy: session.user.id,
          triggeredAt: new Date().toISOString(),
        },
      });
      
      jobs.push({
        submissionId: submission.id,
        jobId: job.id,
        priority,
      });
    }

    console.log(`[ManualSyncAPI] Queued ${jobs.length} manual sync jobs`, {
      submissionIds,
      triggeredBy: session.user.id,
    });

    return NextResponse.json({
      message: `Successfully queued ${jobs.length} sync jobs`,
      jobs,
      summary: {
        requested: submissionIds.length,
        queued: jobs.length,
        skipped: submissionIds.length - jobs.length,
      },
    });

  } catch (error) {
    console.error('[ManualSyncAPI] Error triggering manual sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
