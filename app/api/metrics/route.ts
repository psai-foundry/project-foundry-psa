
/**
 * Metrics API Endpoints
 * Phase 2B-8a: Performance metrics query and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { metricsService } from '@/lib/services/metrics-service';
import { prisma } from '@/lib/db';
import { MetricType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get('name');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const aggregation = searchParams.get('aggregation') || 'raw';
    const limit = parseInt(searchParams.get('limit') || '100');
    
    if (!metricName) {
      return NextResponse.json(
        { error: 'Metric name is required' },
        { status: 400 }
      );
    }

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const toDate = to ? new Date(to) : new Date();

    if (aggregation === 'raw') {
      // Return raw metrics
      const metrics = await getMetricsRaw(metricName, fromDate, toDate, entityType, entityId, limit);
      return NextResponse.json({
        metrics,
        aggregation: 'raw',
        timeRange: { from: fromDate, to: toDate },
        count: metrics.length,
      });
    } else {
      // Return aggregated metrics
      const aggregatedMetrics = await getMetricsAggregated(metricName, fromDate, toDate, aggregation, entityType, entityId);
      return NextResponse.json({
        metrics: aggregatedMetrics,
        aggregation,
        timeRange: { from: fromDate, to: toDate },
        count: aggregatedMetrics.length,
      });
    }

  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
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
    const { metricType, name, value, unit, entityType, entityId, tags } = body;

    if (!metricType || !name || value === undefined || !unit) {
      return NextResponse.json(
        { error: 'metricType, name, value, and unit are required' },
        { status: 400 }
      );
    }

    await metricsService.recordMetric({
      metricType: metricType as MetricType,
      name,
      value,
      unit,
      entityType,
      entityId,
      tags,
      userId: session.user.id,
      source: 'manual',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to record metric:', error);
    return NextResponse.json(
      { error: 'Failed to record metric' },
      { status: 500 }
    );
  }
}

async function getMetricsRaw(
  name: string,
  from: Date,
  to: Date,
  entityType?: string | null,
  entityId?: string | null,
  limit: number = 100
) {
  const where: any = {
    name,
    timestamp: {
      gte: from,
      lte: to,
    },
  };

  if (entityType) {
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  return await prisma.performanceMetric.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      id: true,
      value: true,
      unit: true,
      timestamp: true,
      tags: true,
      entityType: true,
      entityId: true,
      executionId: true,
      userId: true,
    },
  });
}

async function getMetricsAggregated(
  name: string,
  from: Date,
  to: Date,
  aggregation: string,
  entityType?: string | null,
  entityId?: string | null
) {
  // Time window calculations
  const timeDiff = to.getTime() - from.getTime();
  let intervalMinutes = 5; // Default 5-minute intervals

  if (timeDiff > 7 * 24 * 60 * 60 * 1000) { // More than 7 days
    intervalMinutes = 60; // 1-hour intervals
  } else if (timeDiff > 24 * 60 * 60 * 1000) { // More than 1 day
    intervalMinutes = 15; // 15-minute intervals
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  const where: any = {
    name,
    timestamp: {
      gte: from,
      lte: to,
    },
  };

  if (entityType) {
    where.entityType = entityType;
  }

  if (entityId) {
    where.entityId = entityId;
  }

  // Get raw data
  const rawMetrics = await prisma.performanceMetric.findMany({
    where,
    orderBy: { timestamp: 'asc' },
    select: {
      value: true,
      timestamp: true,
    },
  });

  // Group by time intervals
  const grouped: Record<string, number[]> = {};
  
  rawMetrics.forEach(metric => {
    const intervalStart = Math.floor(metric.timestamp.getTime() / intervalMs) * intervalMs;
    const key = new Date(intervalStart).toISOString();
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(metric.value);
  });

  // Calculate aggregations
  const aggregatedData = Object.entries(grouped).map(([timestamp, values]) => {
    const result: any = {
      timestamp: new Date(timestamp),
      count: values.length,
    };

    switch (aggregation) {
      case 'avg':
        result.value = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'sum':
        result.value = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'min':
        result.value = Math.min(...values);
        break;
      case 'max':
        result.value = Math.max(...values);
        break;
      case 'count':
        result.value = values.length;
        break;
      case 'p95':
        values.sort((a, b) => a - b);
        const p95Index = Math.ceil(values.length * 0.95) - 1;
        result.value = values[p95Index] || 0;
        break;
      case 'p99':
        values.sort((a, b) => a - b);
        const p99Index = Math.ceil(values.length * 0.99) - 1;
        result.value = values[p99Index] || 0;
        break;
      default:
        result.value = values.reduce((sum, val) => sum + val, 0) / values.length; // Default to average
    }

    return result;
  });

  return aggregatedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
