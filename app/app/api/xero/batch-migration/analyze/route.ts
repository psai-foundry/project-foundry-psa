
/**
 * Batch Migration Analysis API Route
 * Phase 2B-5: Batch Processing & Historical Data Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroBatchMigration } from '@/lib/xero-batch-migration';

// GET /api/xero/batch-migration/analyze - Analyze migration requirements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const analysis = await xeroBatchMigration.analyzeMigrationRequirements();
    
    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing migration requirements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze migration requirements' },
      { status: 500 }
    );
  }
}
