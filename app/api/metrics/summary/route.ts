
/**
 * Metrics Summary API
 * Phase 2B-8a: Provides aggregated metrics summaries for dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    
    const { fromDate, toDate } = getPeriodRange(period);
    
    // Get pipeline metrics summary
    const pipelineMetrics = await getPipelineSummary(fromDate, toDate);
    
    // Get sync performance summary
    const syncMetrics = await getSyncPerformanceSummary(fromDate, toDate);
    
    // Get error rates and health metrics
    const healthMetrics = await getHealthSummary(fromDate, toDate);
    
    // Get resource utilization metrics
    const resourceMetrics = await getResourceSummary(fromDate, toDate);

    return NextResponse.json({
      period,
      timeRange: { from: fromDate, to: toDate },
      summary: {
        pipeline: pipelineMetrics,
        sync: syncMetrics,
        health: healthMetrics,
        resources: resourceMetrics,
      },
      generated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to generate metrics summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics summary' },
      { status: 500 }
    );
  }
}

function getPeriodRange(period: string): { fromDate: Date; toDate: Date } {
  const toDate = new Date();
  let fromDate: Date;

  switch (period) {
    case '1h':
      fromDate = new Date(toDate.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      fromDate = new Date(toDate.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return { fromDate, toDate };
}

async function getPipelineSummary(from: Date, to: Date) {
  try {
    const pipelines = await prisma.pipelineMetrics.findMany({
      where: {
        startedAt: {
          gte: from,
          lte: to,
        },
      },
    });

    const total = pipelines.length;
    const completed = pipelines.filter(p => p.status === 'SUCCESS').length;
    const failed = pipelines.filter(p => p.status === 'FAILED').length;
    const running = pipelines.filter(p => p.status === 'RUNNING').length;

    const avgDuration = pipelines
      .filter(p => p.totalDuration)
      .reduce((sum, p) => sum + (p.totalDuration || 0), 0) / (pipelines.filter(p => p.totalDuration).length || 1);

    const totalProcessed = pipelines.reduce((sum, p) => sum + p.itemsProcessed, 0);
    const totalSuccessful = pipelines.reduce((sum, p) => sum + p.itemsSuccessful, 0);
    const totalFailed = pipelines.reduce((sum, p) => sum + p.itemsFailed, 0);

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      throughput: {
        total: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        successRate: totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 0,
      },
    };
  } catch (error) {
    console.error('Failed to get pipeline summary:', error);
    return {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
      successRate: 0,
      avgDuration: 0,
      throughput: {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
      },
    };
  }
}

async function getSyncPerformanceSummary(from: Date, to: Date) {
  try {
    // Get sync-related metrics
    const syncMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: {
          contains: 'xero_sync',
        },
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    });

    const apiMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: {
          contains: 'xero_api',
        },
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    });

    const syncTimes = syncMetrics
      .filter(m => m.name.includes('duration') || m.name.includes('time'))
      .map(m => m.value);

    const apiResponseTimes = apiMetrics
      .filter(m => m.name.includes('response_time') || m.name.includes('duration'))
      .map(m => m.value);

    return {
      syncOperations: {
        total: syncMetrics.filter(m => m.name.includes('total')).length,
        avgDuration: syncTimes.length > 0 ? 
          syncTimes.reduce((sum, val) => sum + val, 0) / syncTimes.length : 0,
        minDuration: syncTimes.length > 0 ? Math.min(...syncTimes) : 0,
        maxDuration: syncTimes.length > 0 ? Math.max(...syncTimes) : 0,
      },
      apiCalls: {
        total: apiMetrics.length,
        avgResponseTime: apiResponseTimes.length > 0 ?
          apiResponseTimes.reduce((sum, val) => sum + val, 0) / apiResponseTimes.length : 0,
        minResponseTime: apiResponseTimes.length > 0 ? Math.min(...apiResponseTimes) : 0,
        maxResponseTime: apiResponseTimes.length > 0 ? Math.max(...apiResponseTimes) : 0,
      },
    };
  } catch (error) {
    console.error('Failed to get sync performance summary:', error);
    return {
      syncOperations: {
        total: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      },
      apiCalls: {
        total: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
      },
    };
  }
}

async function getHealthSummary(from: Date, to: Date) {
  try {
    const healthChecks = await prisma.systemHealthCheck.findMany({
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    });

    const errorMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: {
          contains: 'error',
        },
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    });

    const componentHealth = healthChecks.reduce((acc, check) => {
      if (!acc[check.component]) {
        acc[check.component] = {
          total: 0,
          healthy: 0,
          degraded: 0,
          unhealthy: 0,
          avgResponseTime: 0,
          slaBreaches: 0,
        };
      }

      const component = acc[check.component];
      component.total++;
      
      if (check.status === 'HEALTHY') component.healthy++;
      else if (check.status === 'DEGRADED') component.degraded++;
      else if (check.status === 'UNHEALTHY') component.unhealthy++;
      
      if (check.responseTime) {
        component.avgResponseTime += check.responseTime;
      }
      
      if (check.slaBreached) {
        component.slaBreaches++;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.values(componentHealth).forEach((component: any) => {
      if (component.total > 0) {
        component.avgResponseTime = component.avgResponseTime / component.total;
        component.healthScore = (component.healthy / component.total) * 100;
      }
    });

    const totalErrors = errorMetrics
      .filter(m => m.name.includes('error') || m.name.includes('failed'))
      .reduce((sum, metric) => sum + metric.value, 0);

    return {
      overall: {
        totalChecks: healthChecks.length,
        healthy: healthChecks.filter(c => c.status === 'HEALTHY').length,
        degraded: healthChecks.filter(c => c.status === 'DEGRADED').length,
        unhealthy: healthChecks.filter(c => c.status === 'UNHEALTHY').length,
        slaBreaches: healthChecks.filter(c => c.slaBreached).length,
      },
      components: componentHealth,
      errors: {
        total: totalErrors,
        rate: errorMetrics.length > 0 ? totalErrors / errorMetrics.length : 0,
      },
    };
  } catch (error) {
    console.error('Failed to get health summary:', error);
    return {
      overall: {
        totalChecks: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        slaBreaches: 0,
      },
      components: {},
      errors: {
        total: 0,
        rate: 0,
      },
    };
  }
}

async function getResourceSummary(from: Date, to: Date) {
  try {
    const memoryMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: 'memory_usage',
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const cpuMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: 'cpu_usage',
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const dbMetrics = await prisma.performanceMetric.findMany({
      where: {
        name: {
          contains: 'db_',
        },
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    });

    return {
      memory: {
        current: memoryMetrics[0]?.value || 0,
        avg: memoryMetrics.length > 0 ?
          memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length : 0,
        peak: memoryMetrics.length > 0 ? Math.max(...memoryMetrics.map(m => m.value)) : 0,
      },
      cpu: {
        current: cpuMetrics[0]?.value || 0,
        avg: cpuMetrics.length > 0 ?
          cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length : 0,
        peak: cpuMetrics.length > 0 ? Math.max(...cpuMetrics.map(m => m.value)) : 0,
      },
      database: {
        totalQueries: dbMetrics.filter(m => m.name.includes('queries')).length,
        avgQueryTime: dbMetrics
          .filter(m => m.name.includes('query_time') || m.name.includes('duration'))
          .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0),
        slowQueries: dbMetrics
          .filter(m => (m.name.includes('duration') || m.name.includes('time')) && m.value > 1000).length,
      },
    };
  } catch (error) {
    console.error('Failed to get resource summary:', error);
    return {
      memory: { current: 0, avg: 0, peak: 0 },
      cpu: { current: 0, avg: 0, peak: 0 },
      database: { totalQueries: 0, avgQueryTime: 0, slowQueries: 0 },
    };
  }
}
