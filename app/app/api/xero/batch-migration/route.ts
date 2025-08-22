
/**
 * Xero Batch Migration API Routes
 * Phase 2B-5: Batch Processing & Historical Data Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroBatchMigration } from '@/lib/xero-batch-migration';

// POST /api/xero/batch-migration - Start a batch migration
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      batchSize = 50,
      delayBetweenBatches = 2000,
      maxRetries = 3,
      dryRun = true, // Default to dry run for safety
      dateRange,
      includeRejected = false
    } = body;

    // Validate configuration
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        { error: 'Batch size must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (delayBetweenBatches < 1000) {
      return NextResponse.json(
        { error: 'Delay between batches must be at least 1000ms' },
        { status: 400 }
      );
    }

    // Start the migration
    const migrationId = await xeroBatchMigration.startBatchMigration({
      batchSize,
      delayBetweenBatches,
      maxRetries,
      dryRun,
      dateRange: dateRange ? {
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate)
      } : undefined,
      includeRejected
    });

    return NextResponse.json({
      success: true,
      migrationId,
      message: dryRun ? 'Dry run migration started' : 'Live migration started'
    });

  } catch (error) {
    console.error('Error starting batch migration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start migration' },
      { status: 500 }
    );
  }
}

// GET /api/xero/batch-migration - Get active migrations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const activeMigrations = await xeroBatchMigration.getActiveMigrations();
    
    return NextResponse.json({
      success: true,
      migrations: activeMigrations
    });

  } catch (error) {
    console.error('Error getting migrations:', error);
    return NextResponse.json(
      { error: 'Failed to get migrations' },
      { status: 500 }
    );
  }
}
