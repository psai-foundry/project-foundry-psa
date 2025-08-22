
/**
 * Xero Quarantine Management API
 * Phase 2B-6: API endpoints for managing quarantined records
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType') || undefined;
    const status = searchParams.get('status')?.split(',') || undefined;
    const priority = searchParams.get('priority')?.split(',') || undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    const result = await xeroQuarantineSystem.getQuarantinedRecords(
      {
        entityType,
        status: status as any,
        priority: priority as any,
        dateFrom,
        dateTo
      },
      page,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/xero/quarantine error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quarantined records' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { recordId, status, resolutionNotes, correctedData } = body;

    if (!recordId || !status || !resolutionNotes) {
      return NextResponse.json(
        { error: 'Missing required fields: recordId, status, resolutionNotes' },
        { status: 400 }
      );
    }

    await xeroQuarantineSystem.reviewQuarantinedRecord(
      recordId,
      session.user.id,
      status,
      resolutionNotes,
      correctedData
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/xero/quarantine error:', error);
    return NextResponse.json(
      { error: 'Failed to update quarantined record' },
      { status: 500 }
    );
  }
}
