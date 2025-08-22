

/**
 * Enhanced Queue Metrics API
 * Phase 2B-4: Queue Infrastructure Setup
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enhancedQueueWorker } from '@/lib/queue/enhanced-queue-worker';
import { redisConnectionManager } from '@/lib/queue/redis-config';
import { prisma } from '@/lib/db';

// GET /api/xero/sync/queue/metrics - Get comprehensive queue metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get comprehensive metrics
    const [
      queueMetrics,
      queueStatus,
      redisStatus,
      recentLogs,
      systemHealth
    ] = await Promise.all([
      getQueueMetrics(),
      getQueueStatus(),
      getRedisStatus(),
      getRecentSyncLogs(),
      getSystemHealth(),
    ]);

    return NextResponse.json({
      metrics: queueMetrics,
      status: queueStatus,
      redis: redisStatus,
      recentLogs,
      health: systemHealth,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[QueueMetricsAPI] Error fetching metrics:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function getQueueMetrics() {
  const allMetrics = enhancedQueueWorker.getMetrics() as Map<string, any>;
  const metricsObject: Record<string, any> = {};
  
  for (const [queueName, metrics] of allMetrics) {
    metricsObject[queueName] = {
      ...metrics,
      lastProcessed: metrics.lastProcessed?.toISOString(),
    };
  }

  return metricsObject;
}

async function getQueueStatus() {
  const queues = enhancedQueueWorker.getAllQueues();
  const queueStatus: Record<string, any> = {};

  for (const [queueName, queue] of queues) {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
        queue.isPaused(),
      ]);

      queueStatus[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused,
      };
    } catch (error) {
      queueStatus[queueName] = {
        error: error instanceof Error ? error.message : 'Unknown error',
        healthy: false,
      };
    }
  }

  return queueStatus;
}

async function getRedisStatus() {
  try {
    const isReady = redisConnectionManager.isReady();
    const pingResult = await redisConnectionManager.ping();
    
    return {
      connected: isReady,
      ping: pingResult,
      healthy: isReady && pingResult,
    };
  } catch (error) {
    return {
      connected: false,
      ping: false,
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getRecentSyncLogs() {
  try {
    const logs = await prisma.xeroSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        submissionId: true,
        operation: true,
        status: true,
        error: true,
        trigger: true,
        jobId: true,
        createdAt: true,
      },
    });

    return logs.map(log => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching recent sync logs:', error);
    return [];
  }
}

async function getSystemHealth() {
  const status = enhancedQueueWorker.getStatus();
  const redisStatus = await getRedisStatus();
  
  // Calculate overall health score
  let healthScore = 100;
  let issues: string[] = [];

  if (!status.running) {
    healthScore -= 50;
    issues.push('Queue worker not running');
  }

  if (!status.healthy) {
    healthScore -= 30;
    issues.push('Queue worker unhealthy');
  }

  if (!redisStatus.healthy) {
    healthScore -= 40;
    issues.push('Redis connection unhealthy');
  }

  // Check for high error rates
  const metrics = enhancedQueueWorker.getMetrics() as Map<string, any>;
  for (const [queueName, queueMetrics] of metrics) {
    if (queueMetrics.errorRate > 25) {
      healthScore -= 10;
      issues.push(`High error rate in ${queueName}: ${queueMetrics.errorRate.toFixed(1)}%`);
    }
  }

  let healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (healthScore >= 90) {
    healthStatus = 'healthy';
  } else if (healthScore >= 70) {
    healthStatus = 'degraded';
  } else {
    healthStatus = 'unhealthy';
  }

  return {
    score: Math.max(0, healthScore),
    status: healthStatus,
    issues,
    checks: {
      queueWorkerRunning: status.running,
      queueWorkerHealthy: status.healthy,
      redisConnected: redisStatus.healthy,
    },
  };
}
