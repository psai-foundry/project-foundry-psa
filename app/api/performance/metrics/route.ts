
/**
 * Phase 2B-8b: Performance Metrics API
 * Provides endpoints for retrieving performance metrics and system health data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { metricsService } from '@/lib/services/metrics-service';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { HealthStatus, MetricType, PipelineType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const timeRange = searchParams.get('timeRange') || '24h';
    const metricType = searchParams.get('metricType');
    const component = searchParams.get('component');
    
    const now = new Date();
    let startTime = new Date();
    
    // Calculate time range
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Handle different metric endpoints
    switch (endpoint) {
      case 'overview':
        return await handleOverviewMetrics(startTime, now);
      
      case 'system-health':
        return await handleSystemHealth();
      
      case 'pipeline-metrics':
        return await handlePipelineMetrics(startTime, now);
      
      case 'performance-trends':
        return await handlePerformanceTrends(startTime, now, metricType as MetricType);
      
      case 'component-health':
        return await handleComponentHealth(component || 'all');
      
      case 'real-time-stats':
        return await handleRealTimeStats();
      
      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('Performance metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' }, 
      { status: 500 }
    );
  }
}

async function handleOverviewMetrics(startTime: Date, endTime: Date) {
  const [systemHealth, recentMetrics, pipelineStats] = await Promise.all([
    metricsService.getSystemHealth(),
    
    prisma.performanceMetric.findMany({
      where: {
        timestamp: { gte: startTime, lte: endTime }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    }),
    
    prisma.pipelineMetrics.findMany({
      where: {
        startedAt: { gte: startTime, lte: endTime }
      },
      orderBy: { startedAt: 'desc' },
      take: 100
    })
  ]);

  // Calculate key performance indicators
  const totalOperations = recentMetrics.length;
  const avgResponseTime = recentMetrics
    .filter(m => m.name.includes('response_time'))
    .reduce((sum, m) => sum + m.value, 0) / Math.max(1, recentMetrics.filter(m => m.name.includes('response_time')).length);

  const totalPipelineRuns = pipelineStats.length;
  const avgPipelineSuccess = pipelineStats.length > 0 
    ? pipelineStats.reduce((sum, p) => sum + p.successRate, 0) / pipelineStats.length 
    : 100;

  const errorRate = recentMetrics
    .filter(m => m.name.includes('error'))
    .reduce((sum, m) => sum + m.value, 0);

  return NextResponse.json({
    overview: {
      systemHealth: systemHealth.overall,
      totalOperations,
      avgResponseTime: Math.round(avgResponseTime || 0),
      totalPipelineRuns,
      avgPipelineSuccess: Math.round(avgPipelineSuccess),
      errorRate: Math.round(errorRate),
    },
    systemHealth,
    recentActivity: recentMetrics.slice(0, 20).map(metric => ({
      timestamp: metric.timestamp,
      type: metric.name,
      value: metric.value,
      unit: metric.unit,
      source: metric.source
    }))
  });
}

async function handleSystemHealth() {
  const health = await metricsService.getSystemHealth();
  
  // Get recent health checks for each component
  const healthHistory = await prisma.systemHealthCheck.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 200
  });

  // Group by component
  const componentHistory: Record<string, any[]> = {};
  healthHistory.forEach(check => {
    if (!componentHistory[check.component]) {
      componentHistory[check.component] = [];
    }
    componentHistory[check.component].push({
      timestamp: check.timestamp,
      status: check.status,
      responseTime: check.responseTime,
      slaBreached: check.slaBreached
    });
  });

  return NextResponse.json({
    overall: health,
    history: componentHistory
  });
}

async function handlePipelineMetrics(startTime: Date, endTime: Date) {
  const pipelineMetrics = await prisma.pipelineMetrics.findMany({
    where: {
      startedAt: { gte: startTime, lte: endTime }
    },
    orderBy: { startedAt: 'desc' }
  });

  // Group by pipeline type
  const byType: Record<string, any> = {};
  pipelineMetrics.forEach(pipeline => {
    if (!byType[pipeline.pipelineType]) {
      byType[pipeline.pipelineType] = {
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0,
        avgThroughput: 0,
        totalProcessed: 0
      };
    }

    const stats = byType[pipeline.pipelineType];
    stats.total += 1;
    stats.totalProcessed += pipeline.itemsProcessed;
    
    if (pipeline.completedAt && pipeline.totalDuration) {
      stats.avgDuration += pipeline.totalDuration;
      if (pipeline.successRate >= 95) stats.successful += 1;
      else stats.failed += 1;
    }
  });

  // Calculate averages
  Object.values(byType).forEach((stats: any) => {
    if (stats.total > 0) {
      stats.avgDuration = Math.round(stats.avgDuration / stats.total);
      stats.avgThroughput = Math.round(stats.totalProcessed / stats.total);
      stats.successRate = Math.round((stats.successful / stats.total) * 100);
    }
  });

  return NextResponse.json({
    summary: byType,
    recent: pipelineMetrics.slice(0, 20).map(pipeline => ({
      id: pipeline.id,
      type: pipeline.pipelineType,
      executionId: pipeline.executionId,
      startedAt: pipeline.startedAt,
      completedAt: pipeline.completedAt,
      duration: pipeline.totalDuration,
      processed: pipeline.itemsProcessed,
      successful: pipeline.itemsSuccessful,
      failed: pipeline.itemsFailed,
      successRate: pipeline.successRate,
      triggeredBy: pipeline.triggeredBy,
      status: pipeline.status
    }))
  });
}

async function handlePerformanceTrends(startTime: Date, endTime: Date, metricType?: MetricType) {
  const where: any = {
    timestamp: { gte: startTime, lte: endTime }
  };
  
  if (metricType) {
    where.metricType = metricType;
  }

  const metrics = await prisma.performanceMetric.findMany({
    where,
    orderBy: { timestamp: 'asc' }
  });

  // Group metrics by time buckets for charting
  const bucketSize = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / (60 * 1000))); // 1 minute buckets
  const trends: Record<string, { timestamp: Date; value: number }[]> = {};

  metrics.forEach(metric => {
    const bucketTime = new Date(Math.floor(metric.timestamp.getTime() / (bucketSize * 60 * 1000)) * (bucketSize * 60 * 1000));
    
    if (!trends[metric.name]) {
      trends[metric.name] = [];
    }
    
    trends[metric.name].push({
      timestamp: bucketTime,
      value: metric.value
    });
  });

  return NextResponse.json({ trends });
}

async function handleComponentHealth(component: string) {
  const where: any = {};
  if (component !== 'all') {
    where.component = component;
  }

  const checks = await prisma.systemHealthCheck.findMany({
    where: {
      ...where,
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 500
  });

  // Group by component and calculate uptime
  const componentStats: Record<string, any> = {};
  checks.forEach(check => {
    if (!componentStats[check.component]) {
      componentStats[check.component] = {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        avgResponseTime: 0,
        slaBreaches: 0,
        uptime: 0
      };
    }

    const stats = componentStats[check.component];
    stats.total += 1;
    stats.avgResponseTime += check.responseTime || 0;
    
    if (check.slaBreached) stats.slaBreaches += 1;
    
    switch (check.status) {
      case HealthStatus.HEALTHY:
        stats.healthy += 1;
        break;
      case HealthStatus.DEGRADED:
        stats.degraded += 1;
        break;
      case HealthStatus.UNHEALTHY:
        stats.unhealthy += 1;
        break;
    }
  });

  // Calculate percentages and uptime
  Object.entries(componentStats).forEach(([comp, stats]: [string, any]) => {
    stats.avgResponseTime = Math.round(stats.avgResponseTime / stats.total);
    stats.uptime = Math.round(((stats.healthy + stats.degraded) / stats.total) * 100);
    stats.healthyPercent = Math.round((stats.healthy / stats.total) * 100);
    stats.degradedPercent = Math.round((stats.degraded / stats.total) * 100);
    stats.unhealthyPercent = Math.round((stats.unhealthy / stats.total) * 100);
  });

  return NextResponse.json({ components: componentStats });
}

async function handleRealTimeStats() {
  const [
    currentHealth,
    recentMetrics,
    activePipelines
  ] = await Promise.all([
    metricsService.getSystemHealth(),
    
    prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    }),
    
    prisma.pipelineMetrics.findMany({
      where: {
        completedAt: null, // Active pipelines
        startedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { startedAt: 'desc' }
    })
  ]);

  const currentLoad = recentMetrics.length;
  const avgResponseTime = recentMetrics
    .filter(m => m.name.includes('response_time'))
    .reduce((sum, m) => sum + m.value, 0) / Math.max(1, recentMetrics.filter(m => m.name.includes('response_time')).length);

  return NextResponse.json({
    health: currentHealth.overall,
    currentLoad,
    avgResponseTime: Math.round(avgResponseTime || 0),
    activePipelines: activePipelines.length,
    recentErrors: recentMetrics.filter(m => m.name.includes('error')).length,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    
    switch (action) {
      case 'refresh-health-checks':
        // Trigger immediate health checks
        const components = ['database', 'xero_api', 'redis', 'filesystem'];
        const healthPromises = components.map(component =>
          metricsService.recordHealthCheck({
            checkType: 'AVAILABILITY',
            component,
            responseTime: Math.random() * 100 + 50, // Simulated for demo
          })
        );
        await Promise.all(healthPromises);
        
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Performance metrics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' }, 
      { status: 500 }
    );
  }
}
