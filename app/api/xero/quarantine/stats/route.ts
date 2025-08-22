
/**
 * Xero Quarantine Statistics API
 * Phase 2B-6: Analytics and statistics for quarantine system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroQuarantineSystem } from '@/lib/xero/quarantine-system';
import { xeroErrorHandlingService } from '@/lib/xero/error-handling-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    const [quarantineStats, errorAnalytics] = await Promise.all([
      xeroQuarantineSystem.getQuarantineStats(dateFrom, dateTo),
      xeroErrorHandlingService.getErrorAnalytics(dateFrom, dateTo)
    ]);

    return NextResponse.json({
      quarantine: quarantineStats,
      analytics: errorAnalytics
    });
  } catch (error) {
    console.error('GET /api/xero/quarantine/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quarantine statistics' },
      { status: 500 }
    );
  }
}
