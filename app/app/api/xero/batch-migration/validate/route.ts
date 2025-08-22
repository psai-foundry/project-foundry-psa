
/**
 * Batch Migration Validation API Route
 * Phase 2B-5: Batch Processing & Historical Data Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroBatchMigration } from '@/lib/xero-batch-migration';

// GET /api/xero/batch-migration/validate - Validate historical data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const validation = await xeroBatchMigration.validateHistoricalData();
    
    return NextResponse.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Error validating historical data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate historical data' },
      { status: 500 }
    );
  }
}
