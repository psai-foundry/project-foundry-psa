

/**
 * Enhanced Queue Jobs API
 * Phase 2B-4: Queue Infrastructure Setup
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enhancedQueueWorker } from '@/lib/queue/enhanced-queue-worker';

// GET /api/xero/sync/queue/jobs - Get detailed job information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queueName = searchParams.get('queue');
    const jobType = searchParams.get('type'); // waiting, active, completed, failed, delayed
    const limit = parseInt(searchParams.get('limit') || '50');

    const queues = enhancedQueueWorker.getAllQueues();
    const jobsData: Record<string, any> = {};

    for (const [name, queue] of queues) {
      // Skip if specific queue requested and this isn't it
      if (queueName && name !== queueName) {
        continue;
      }

      try {
        const queueJobs: Record<string, any[]> = {};

        if (!jobType || jobType === 'waiting') {
          const waiting = await queue.getWaiting(0, limit);
          queueJobs.waiting = waiting.map(job => formatJob(job));
        }

        if (!jobType || jobType === 'active') {
          const active = await queue.getActive(0, limit);
          queueJobs.active = active.map(job => formatJob(job));
        }

        if (!jobType || jobType === 'completed') {
          const completed = await queue.getCompleted(0, limit);
          queueJobs.completed = completed.map(job => formatJob(job));
        }

        if (!jobType || jobType === 'failed') {
          const failed = await queue.getFailed(0, limit);
          queueJobs.failed = failed.map(job => formatJob(job));
        }

        if (!jobType || jobType === 'delayed') {
          const delayed = await queue.getDelayed(0, limit);
          queueJobs.delayed = delayed.map(job => formatJob(job));
        }

        jobsData[name] = queueJobs;

      } catch (error) {
        jobsData[name] = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return NextResponse.json({
      jobs: jobsData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[QueueJobsAPI] Error fetching jobs:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST /api/xero/sync/queue/jobs - Job-specific actions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin permissions required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, queueName, jobId } = body;

    if (!queueName || !jobId) {
      return NextResponse.json({ 
        error: 'queueName and jobId are required' 
      }, { status: 400 });
    }

    const queues = enhancedQueueWorker.getAllQueues();
    const queue = queues.get(queueName);

    if (!queue) {
      return NextResponse.json({ 
        error: `Queue '${queueName}' not found` 
      }, { status: 404 });
    }

    let result: any = {};

    switch (action) {
      case 'retryJob':
        const failedJob = await queue.getJob(jobId);
        if (!failedJob) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        
        await failedJob.retry();
        result = { message: `Job ${jobId} queued for retry` };
        break;

      case 'removeJob':
        const job = await queue.getJob(jobId);
        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        
        await job.remove();
        result = { message: `Job ${jobId} removed` };
        break;

      case 'getJobDetails':
        const detailJob = await queue.getJob(jobId);
        if (!detailJob) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        
        result = {
          message: 'Job details retrieved successfully',
          job: formatJob(detailJob, true),
        };
        break;

      default:
        return NextResponse.json({ 
          error: `Invalid action: ${action}. Valid actions: retryJob, removeJob, getJobDetails` 
        }, { status: 400 });
    }

    console.log(`[QueueJobsAPI] Job action completed: ${action}`, {
      queueName,
      jobId,
      executedBy: session.user.id,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[QueueJobsAPI] Error executing job action:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function formatJob(job: any, detailed: boolean = false) {
  const basicInfo = {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress(),
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };

  if (detailed) {
    return {
      ...basicInfo,
      opts: job.opts,
      returnvalue: job.returnvalue,
      stacktrace: job.stacktrace,
      delay: job.delay,
      priority: job.opts?.priority,
    };
  }

  return basicInfo;
}
