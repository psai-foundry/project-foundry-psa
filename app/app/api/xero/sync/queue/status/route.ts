
/**
 * Queue Status API
 * Phase 2B-3: Real-time Sync Pipeline
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { XeroSyncQueueManager } from '@/lib/queue/xero-sync-queue';
import { XeroSyncService } from '@/lib/xero-sync-service';

// GET /api/xero/sync/queue/status - Get queue status and sync statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get queue statistics
    const queueStats = await XeroSyncQueueManager.getQueueStats();
    
    // Get sync service status
    const syncService = new XeroSyncService();
    const syncStatus = await syncService.getSyncStatus();
    const connectionStatus = await syncService.testConnection();

    return NextResponse.json({
      queue: queueStats,
      sync: syncStatus,
      connection: connectionStatus,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[QueueStatusAPI] Error fetching queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/xero/sync/queue/status - Queue management actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    let result: any = {};

    switch (action) {
      case 'pause':
        await XeroSyncQueueManager.pauseQueue();
        result = { message: 'Queue paused successfully' };
        break;
        
      case 'resume':
        await XeroSyncQueueManager.resumeQueue();
        result = { message: 'Queue resumed successfully' };
        break;
        
      case 'clearFailed':
        await XeroSyncQueueManager.clearFailedJobs();
        result = { message: 'Failed jobs cleared successfully' };
        break;
        
      case 'retryFailed':
        const retryCount = await XeroSyncQueueManager.retryFailedJobs();
        result = { message: `${retryCount} failed jobs retried` };
        break;
        
      default:
        return NextResponse.json({ 
          error: `Invalid action: ${action}. Valid actions: pause, resume, clearFailed, retryFailed` 
        }, { status: 400 });
    }

    console.log(`[QueueStatusAPI] Queue action executed: ${action}`, {
      executedBy: session.user.id,
      result,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[QueueStatusAPI] Error executing queue action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
