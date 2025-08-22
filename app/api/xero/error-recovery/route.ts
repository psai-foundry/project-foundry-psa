
/**
 * Xero Error Recovery API
 * Phase 2B-6: Automated error recovery and batch processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroErrorHandlingService } from '@/lib/xero/error-handling-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      dryRun = false, 
      maxRecords = 100, 
      priorityOnly = false, 
      entityTypes 
    } = body;

    const result = await xeroErrorHandlingService.runErrorRecovery({
      dryRun,
      maxRecords,
      priorityOnly,
      entityTypes
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/xero/error-recovery error:', error);
    return NextResponse.json(
      { error: 'Failed to run error recovery' },
      { status: 500 }
    );
  }
}
