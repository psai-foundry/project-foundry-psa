
/**
 * Queue Management API
 * Phase 2B-7c: Queue Management and Monitoring
 * 
 * Provides comprehensive queue management, monitoring, and control capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EnhancedQueueManager } from '@/lib/queue/queue-manager';
import { prisma } from '@/lib/db';

interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts: any;
  progress: number;
  processedOn: number | null;
  finishedOn: number | null;
  failedReason: string | null;
  delay: number;
  timestamp: number;
  attemptsMade: number;
  returnvalue: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const queueName = searchParams.get('queue');

    const queueManager = EnhancedQueueManager.getInstance();

    switch (action) {
      case 'stats':
        return handleGetStats(queueManager, queueName);
      case 'jobs':
        return handleGetJobs(queueManager, queueName, searchParams);
      case 'health':
        return handleHealthCheck(queueManager);
      default:
        return handleGetOverview(queueManager);
    }

  } catch (error) {
    console.error('GET /api/xero/queue-management error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue information' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, queueName, jobIds, data } = body;

    const queueManager = EnhancedQueueManager.getInstance();

    switch (action) {
      case 'pause':
        return handlePauseQueue(queueManager, queueName, session.user.id);
      case 'resume':
        return handleResumeQueue(queueManager, queueName, session.user.id);
      case 'clear':
        return handleClearQueue(queueManager, queueName, data?.jobTypes, session.user.id);
      case 'retry':
        return handleRetryJobs(queueManager, queueName, jobIds, session.user.id);
      case 'remove':
        return handleRemoveJobs(queueManager, queueName, jobIds, session.user.id);
      case 'add':
        return handleAddJob(queueManager, queueName, data, session.user.id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('POST /api/xero/queue-management error:', error);
    return NextResponse.json(
      { error: 'Queue management operation failed' },
      { status: 500 }
    );
  }
}

async function handleGetOverview(queueManager: EnhancedQueueManager) {
  // Get overall system status
  const status = await queueManager.getSystemStatus();
  
  return NextResponse.json({
    success: true,
    data: {
      system: status,
      queues: await getQueueStats(),
      recentActivity: await getRecentActivity()
    }
  });
}

async function handleGetStats(queueManager: EnhancedQueueManager, queueName: string | null) {
  const stats = await getQueueStats(queueName);
  
  return NextResponse.json({
    success: true,
    data: stats
  });
}

async function handleGetJobs(queueManager: EnhancedQueueManager, queueName: string | null, searchParams: URLSearchParams) {
  if (!queueName) {
    return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
  }

  const jobType = searchParams.get('type') || 'waiting'; // waiting, active, completed, failed
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Get jobs from the specific queue
  // This would integrate with the actual queue system
  const jobs = await getQueueJobs(queueName, jobType, limit, offset);

  return NextResponse.json({
    success: true,
    data: {
      jobs,
      total: jobs.length,
      type: jobType
    }
  });
}

async function handleHealthCheck(queueManager: EnhancedQueueManager) {
  const health = await queueManager.healthCheck();
  
  return NextResponse.json({
    success: true,
    data: health
  });
}

async function handlePauseQueue(queueManager: EnhancedQueueManager, queueName: string, userId: string) {
  if (!queueName) {
    return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
  }

  // Pause the queue
  await queueManager.pauseQueue(queueName);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'HEALTH_CHECK',
      status: 'SUCCESS',
      entityType: 'Queue',
      entityId: queueName,
      details: JSON.stringify({ action: 'pause' }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Queue ${queueName} paused successfully`
  });
}

async function handleResumeQueue(queueManager: EnhancedQueueManager, queueName: string, userId: string) {
  if (!queueName) {
    return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
  }

  // Resume the queue
  await queueManager.resumeQueue(queueName);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'HEALTH_CHECK',
      status: 'SUCCESS',
      entityType: 'Queue',
      entityId: queueName,
      details: JSON.stringify({ action: 'resume' }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Queue ${queueName} resumed successfully`
  });
}

async function handleClearQueue(queueManager: EnhancedQueueManager, queueName: string, jobTypes: string[] | undefined, userId: string) {
  if (!queueName) {
    return NextResponse.json({ error: 'Queue name is required' }, { status: 400 });
  }

  // Clear specific job types or all jobs
  const clearedCount = await queueManager.clearQueue(queueName, jobTypes);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'HEALTH_CHECK',
      status: 'SUCCESS',
      entityType: 'Queue',
      entityId: queueName,
      details: JSON.stringify({ 
        action: 'clear', 
        jobTypes: jobTypes || 'all',
        clearedCount 
      }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Cleared ${clearedCount} jobs from queue ${queueName}`
  });
}

async function handleRetryJobs(queueManager: EnhancedQueueManager, queueName: string, jobIds: string[], userId: string) {
  if (!queueName || !jobIds?.length) {
    return NextResponse.json({ error: 'Queue name and job IDs are required' }, { status: 400 });
  }

  // Retry specific jobs
  const results = await queueManager.retryJobs(queueName, jobIds);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'BATCH_SYNC',
      status: 'SUCCESS',
      entityType: 'QueueJobs',
      entityId: jobIds.join(','),
      details: JSON.stringify({ 
        action: 'retry',
        queueName,
        jobIds: jobIds.length,
        results
      }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Retry initiated for ${jobIds.length} jobs`,
    data: results
  });
}

async function handleRemoveJobs(queueManager: EnhancedQueueManager, queueName: string, jobIds: string[], userId: string) {
  if (!queueName || !jobIds?.length) {
    return NextResponse.json({ error: 'Queue name and job IDs are required' }, { status: 400 });
  }

  // Remove specific jobs
  const removedCount = await queueManager.removeJobs(queueName, jobIds);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'HEALTH_CHECK',
      status: 'SUCCESS',
      entityType: 'QueueJobs',
      entityId: jobIds.join(','),
      details: JSON.stringify({ 
        action: 'remove',
        queueName,
        jobIds: jobIds.length,
        removedCount
      }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Removed ${removedCount} jobs from queue ${queueName}`
  });
}

async function handleAddJob(queueManager: EnhancedQueueManager, queueName: string, jobData: any, userId: string) {
  if (!queueName || !jobData) {
    return NextResponse.json({ error: 'Queue name and job data are required' }, { status: 400 });
  }

  // Add job to queue
  const job = await queueManager.addJob(queueName, jobData);

  // Log the action
  await prisma.xeroSyncLog.create({
    data: {
      userId,
      operation: 'SYNC_TIMESHEET',
      status: 'PENDING',
      entityType: 'QueueJob',
      entityId: job.id.toString(),
      details: JSON.stringify({ 
        action: 'add',
        queueName,
        jobData
      }),
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: `Job added to queue ${queueName}`,
    data: { jobId: job.id }
  });
}

// Helper functions
async function getQueueStats(queueName?: string | null): Promise<QueueStats[]> {
  // This would integrate with the actual queue system to get real stats
  // For now, we'll simulate the data structure
  const mockStats: QueueStats[] = [
    {
      queueName: 'xero-sync-high-priority',
      waiting: 0,
      active: 0,
      completed: 150,
      failed: 5,
      delayed: 0,
      paused: false
    },
    {
      queueName: 'xero-sync-medium-priority',
      waiting: 2,
      active: 1,
      completed: 200,
      failed: 8,
      delayed: 0,
      paused: false
    },
    {
      queueName: 'xero-sync-low-priority',
      waiting: 15,
      active: 0,
      completed: 350,
      failed: 12,
      delayed: 3,
      paused: false
    }
  ];

  return queueName ? mockStats.filter(s => s.queueName === queueName) : mockStats;
}

async function getQueueJobs(queueName: string, jobType: string, limit: number, offset: number): Promise<QueueJob[]> {
  // This would integrate with the actual queue system to get real job data
  // For now, we'll return mock data
  return [];
}

async function getRecentActivity() {
  // Get recent sync logs
  const recentLogs = await prisma.xeroSyncLog.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return recentLogs.map(log => ({
    id: log.id,
    operation: log.operation,
    status: log.status,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.timestamp.toISOString(),
    user: null, // For now, we'll set this to null since userId relation might not exist
    details: log.details ? JSON.parse(log.details) : null
  }));
}
