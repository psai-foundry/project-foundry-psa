
/**
 * Individual Batch Migration Management API Routes
 * Phase 2B-5: Batch Processing & Historical Data Migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroBatchMigration } from '@/lib/xero-batch-migration';

// GET /api/xero/batch-migration/[migrationId] - Get migration progress
export async function GET(
  req: NextRequest,
  { params }: { params: { migrationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const progress = await xeroBatchMigration.getBatchMigrationProgress(params.migrationId);
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Migration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error getting migration progress:', error);
    return NextResponse.json(
      { error: 'Failed to get migration progress' },
      { status: 500 }
    );
  }
}

// PUT /api/xero/batch-migration/[migrationId] - Control migration (pause/resume/cancel)
export async function PUT(
  req: NextRequest,
  { params }: { params: { migrationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { action } = await req.json();
    
    if (!['pause', 'resume', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be pause, resume, or cancel' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'pause':
        success = await xeroBatchMigration.pauseBatchMigration(params.migrationId);
        message = success ? 'Migration paused' : 'Could not pause migration';
        break;
      case 'resume':
        success = await xeroBatchMigration.resumeBatchMigration(params.migrationId);
        message = success ? 'Migration resumed' : 'Could not resume migration';
        break;
      case 'cancel':
        success = await xeroBatchMigration.cancelBatchMigration(params.migrationId);
        message = success ? 'Migration cancelled' : 'Could not cancel migration';
        break;
    }

    return NextResponse.json({
      success,
      message
    });

  } catch (error) {
    console.error('Error controlling migration:', error);
    return NextResponse.json(
      { error: 'Failed to control migration' },
      { status: 500 }
    );
  }
}
