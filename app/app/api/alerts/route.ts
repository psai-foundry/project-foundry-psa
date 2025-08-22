

/**
 * Alerts API Routes
 * Phase 2B-8c: Automated Alerting System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { alertEngine } from '@/lib/services/alert-engine';
import { AlertStatus, AlertSeverity } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as AlertStatus | null;
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              description: true,
              metricType: true,
              condition: true,
              threshold: true
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      }),
      prisma.alert.count({ where })
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      }
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertId } = body;

    if (action === 'acknowledge' && alertId) {
      await alertEngine.acknowledgeAlert(alertId, session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === 'resolve' && alertId) {
      await alertEngine.resolveAlert(alertId, session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing alertId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Alerts POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

