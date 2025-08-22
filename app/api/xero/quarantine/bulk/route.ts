
/**
 * Xero Quarantine Bulk Operations API
 * Phase 2B-6: Bulk management of quarantined records
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroQuarantineSystem } from '@/lib/xero/quarantine-system';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { recordIds, updates } = body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid recordIds array' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Missing updates object' },
        { status: 400 }
      );
    }

    const result = await xeroQuarantineSystem.bulkUpdateQuarantineRecords(
      recordIds,
      updates,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('PATCH /api/xero/quarantine/bulk error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update quarantined records' },
      { status: 500 }
    );
  }
}
