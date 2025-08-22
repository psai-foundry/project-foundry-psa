

/**
 * Audit Logs API
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuditService from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      userId: searchParams.get('userId') || undefined,
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    // Non-admin managers can only see their team's audit logs
    if (session.user.role === 'MANAGER') {
      // This would need to be enhanced based on team structure
      // For now, managers can see all logs but we could restrict this
    }

    const result = await AuditService.query(filters);

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
      filters,
    });

  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

