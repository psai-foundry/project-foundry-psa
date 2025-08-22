
/**
 * Xero Data Transformation API Endpoints
 * Phase 2B-2: Data transformation and validation endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroTransformer, TransformationOptions } from '@/lib/xero-transform';
import { prisma } from '@/lib/db';

/**
 * GET /api/xero/transform - Get transformation statistics and readiness
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateRange = startDate && endDate ? {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    } : undefined;

    // Get transformation statistics
    const stats = await xeroTransformer.getTransformationStats(dateRange);

    // Get connection status
    const connection = await prisma.xeroConnection.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        connection: {
          connected: connection?.connected || false,
          lastSync: connection?.lastSync,
          tenantId: connection?.tenantId,
        },
        ready_for_transformation: stats.ready_for_sync,
      },
    });
  } catch (error) {
    console.error('Transform stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get transformation statistics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/xero/transform - Perform data transformation (dry run)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = 'all', // 'timesheets', 'projects', 'clients', 'all'
      options = {},
    } = body;

    const transformOptions: TransformationOptions = {
      includeDrafts: options.includeDrafts || false,
      dateRange: options.dateRange ? {
        startDate: new Date(options.dateRange.startDate),
        endDate: new Date(options.dateRange.endDate),
      } : undefined,
      projectFilter: options.projectFilter,
      userFilter: options.userFilter,
      batchSize: options.batchSize || 100,
    };

    let results: any = {};

    switch (type) {
      case 'timesheets':
        results.timesheets = await xeroTransformer.transformApprovedTimesheets(transformOptions);
        break;
      
      case 'projects':
        results.projects = await xeroTransformer.transformProjects(transformOptions);
        break;
      
      case 'clients':
        results.clients = await xeroTransformer.transformClients(transformOptions);
        break;
      
      case 'all':
      default:
        const [timesheets, projects, clients] = await Promise.all([
          xeroTransformer.transformApprovedTimesheets(transformOptions),
          xeroTransformer.transformProjects(transformOptions),
          xeroTransformer.transformClients(transformOptions),
        ]);
        results = { timesheets, projects, clients };
        break;
    }

    // Calculate overall summary
    const overallSummary = {
      total_processed: Object.values(results).reduce((sum: number, result: any) => sum + result.summary.total, 0),
      total_successful: Object.values(results).reduce((sum: number, result: any) => sum + result.summary.successful, 0),
      total_failed: Object.values(results).reduce((sum: number, result: any) => sum + result.summary.failed, 0),
      total_errors: Object.values(results).reduce((sum: number, result: any) => sum + result.errors.length, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        type,
        options: transformOptions,
        results,
        summary: overallSummary,
        processed_at: new Date(),
      },
    });
  } catch (error) {
    console.error('Transform data error:', error);
    return NextResponse.json(
      { error: 'Failed to transform data', details: String(error) },
      { status: 500 }
    );
  }
}
