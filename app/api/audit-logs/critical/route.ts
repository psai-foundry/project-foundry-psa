

/**
 * Critical Actions API
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const criticalActions = await AuditService.getRecentCriticalActions(limit);

    return NextResponse.json({
      success: true,
      data: criticalActions,
      total: criticalActions.length,
    });

  } catch (error) {
    console.error('GET /api/audit-logs/critical error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch critical actions' },
      { status: 500 }
    );
  }
}

