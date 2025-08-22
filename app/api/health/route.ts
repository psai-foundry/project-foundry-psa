
/**
 * System Health Check API
 * Phase 2B-8a: Health monitoring endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsService } from '@/lib/services/metrics-service';
import { HealthCheckType, HealthStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const component = searchParams.get('component');
  const detailed = searchParams.get('detailed') === 'true';

  try {
    // If specific component requested
    if (component) {
      const health = await checkComponentHealth(component);
      return NextResponse.json(health);
    }

    // Overall system health
    const systemHealth = await metricsService.getSystemHealth();
    
    if (detailed) {
      // Include recent metrics and trends
      const recentMetrics = await getRecentPerformanceMetrics();
      return NextResponse.json({
        ...systemHealth,
        metrics: recentMetrics,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      status: systemHealth.overall,
      components: Object.keys(systemHealth.components).length,
      healthy: Object.values(systemHealth.components).filter(c => c.status === HealthStatus.HEALTHY).length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: HealthStatus.UNHEALTHY,
        error: 'Health check system failure',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { component, checkType = 'AVAILABILITY' } = await request.json();
    
    if (!component) {
      return NextResponse.json(
        { error: 'Component name is required' },
        { status: 400 }
      );
    }

    const health = await checkComponentHealth(component, checkType as HealthCheckType);
    
    return NextResponse.json({
      component,
      ...health,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Manual health check failed:', error);
    return NextResponse.json(
      { error: 'Failed to perform health check' },
      { status: 500 }
    );
  }
}

async function checkComponentHealth(component: string, checkType: HealthCheckType = HealthCheckType.AVAILABILITY) {
  const startTime = Date.now();
  let health: any = {
    status: HealthStatus.UNKNOWN,
    responseTime: 0,
    details: {},
  };

  try {
    switch (component.toLowerCase()) {
      case 'database':
        health = await checkDatabaseHealth();
        break;
      case 'xero_api':
        health = await checkXeroAPIHealth();
        break;
      case 'filesystem':
        health = await checkFilesystemHealth();
        break;
      case 'memory':
        health = await checkMemoryHealth();
        break;
      default:
        health.error = `Unknown component: ${component}`;
        health.status = HealthStatus.UNKNOWN;
    }

    health.responseTime = Date.now() - startTime;

    // Record the health check
    await metricsService.recordHealthCheck({
      checkType,
      component,
      responseTime: health.responseTime,
      details: health.details,
      error: health.error,
      expectedMax: getExpectedMaxResponseTime(component),
    });

    return health;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await metricsService.recordHealthCheck({
      checkType,
      component,
      responseTime,
      error: errorMessage,
      expectedMax: getExpectedMaxResponseTime(component),
    });

    return {
      status: HealthStatus.UNHEALTHY,
      responseTime,
      error: errorMessage,
      details: {},
    };
  }
}

async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Simple query to test database connectivity and performance
    await prisma.$queryRaw`SELECT 1`;
    
    // Get connection pool status if available
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 100 ? HealthStatus.HEALTHY : 
              responseTime < 500 ? HealthStatus.DEGRADED : 
              HealthStatus.UNHEALTHY,
      responseTime,
      details: {
        connectionPool: 'active',
        queryTime: responseTime,
      },
    };
  } catch (error) {
    throw new Error(`Database health check failed: ${error}`);
  }
}

async function checkXeroAPIHealth() {
  const startTime = Date.now();
  
  try {
    // Check Xero connection status
    const connection = await prisma.xeroConnection.findFirst({
      where: { id: 'default' },
    });

    const responseTime = Date.now() - startTime;
    const isConnected = connection?.connected || false;
    const tokenExpired = connection?.expiresAt ? connection.expiresAt < new Date() : true;

    return {
      status: isConnected && !tokenExpired ? HealthStatus.HEALTHY : 
              isConnected ? HealthStatus.DEGRADED : 
              HealthStatus.UNHEALTHY,
      responseTime,
      details: {
        connected: isConnected,
        tokenExpired,
        lastSync: connection?.lastSync,
        tenantId: connection?.tenantId ? 'configured' : 'not_configured',
      },
    };
  } catch (error) {
    throw new Error(`Xero API health check failed: ${error}`);
  }
}

async function checkFilesystemHealth() {
  const startTime = Date.now();
  
  try {
    // Check if we can write/read from the uploads directory
    const fs = require('fs').promises;
    const path = require('path');
    
    const testDir = path.join(process.cwd(), 'uploads', 'health-check');
    const testFile = path.join(testDir, 'test.txt');
    
    // Ensure directory exists
    await fs.mkdir(testDir, { recursive: true });
    
    // Write test file
    await fs.writeFile(testFile, 'health check test');
    
    // Read test file
    const content = await fs.readFile(testFile, 'utf8');
    
    // Clean up
    await fs.unlink(testFile);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: content === 'health check test' ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      responseTime,
      details: {
        canWrite: true,
        canRead: true,
        testPath: testDir,
      },
    };
  } catch (error) {
    throw new Error(`Filesystem health check failed: ${error}`);
  }
}

async function checkMemoryHealth() {
  const startTime = Date.now();
  
  try {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      throw new Error('Memory usage not available');
    }

    const memory = process.memoryUsage();
    const memoryMB = {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
    };

    const heapUsagePercent = (memoryMB.heapUsed / memoryMB.heapTotal) * 100;
    const responseTime = Date.now() - startTime;

    return {
      status: heapUsagePercent < 80 ? HealthStatus.HEALTHY :
              heapUsagePercent < 95 ? HealthStatus.DEGRADED :
              HealthStatus.UNHEALTHY,
      responseTime,
      details: {
        memory: memoryMB,
        heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
      },
    };
  } catch (error) {
    throw new Error(`Memory health check failed: ${error}`);
  }
}

function getExpectedMaxResponseTime(component: string): number {
  const expectations: Record<string, number> = {
    database: 100,     // 100ms
    xero_api: 2000,    // 2 seconds
    filesystem: 50,    // 50ms
    memory: 10,        // 10ms
  };
  
  return expectations[component.toLowerCase()] || 1000;
}

async function getRecentPerformanceMetrics() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  try {
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: fiveMinutesAgo,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    });

    // Group by metric name and calculate aggregates
    const aggregated: Record<string, any> = {};
    
    metrics.forEach(metric => {
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = {
          count: 0,
          sum: 0,
          min: metric.value,
          max: metric.value,
          avg: 0,
          unit: metric.unit,
        };
      }
      
      const agg = aggregated[metric.name];
      agg.count++;
      agg.sum += metric.value;
      agg.min = Math.min(agg.min, metric.value);
      agg.max = Math.max(agg.max, metric.value);
      agg.avg = agg.sum / agg.count;
    });

    return aggregated;
  } catch (error) {
    console.error('Failed to get recent metrics:', error);
    return {};
  }
}
