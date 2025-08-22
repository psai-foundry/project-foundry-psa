

/**
 * Audit Statistics API
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService from '@/lib/services/audit-service';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    const stats = await AuditService.getStats(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: stats,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days,
      },
    });

  } catch (error) {
    console.error('GET /api/audit-logs/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit statistics' },
      { status: 500 }
    );
  }
}

