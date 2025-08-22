
/**
 * Xero Data Validation API Endpoints
 * Phase 2B-2: Data validation and readiness check endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroSyncService } from '@/lib/xero-sync';
import { XeroApiWrapper } from '@/lib/xero';

/**
 * POST /api/xero/validate - Validate data before sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { options = {} } = body;

    // Validate Xero connection first
    const xeroApi = new XeroApiWrapper();
    const connectionStatus = await xeroApi.getConnectionStatus();
    
    if (!connectionStatus.connected) {
      return NextResponse.json({
        success: false,
        error: 'Xero connection not established',
        data: {
          connection: connectionStatus,
          validation: null,
        },
      });
    }

    // Perform data validation
    const validation = await xeroSyncService.validateDataBeforeSync(options);

    // Calculate overall readiness score
    const readinessScore = calculateReadinessScore(validation);

    return NextResponse.json({
      success: true,
      data: {
        connection: connectionStatus,
        validation,
        readiness: {
          score: readinessScore,
          level: getReadinessLevel(readinessScore),
          recommendations: generateRecommendations(validation, readinessScore),
        },
        validated_at: new Date(),
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate data', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/xero/validate/health - Quick health check
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Quick health checks
    const xeroApi = new XeroApiWrapper();
    const connectionStatus = await xeroApi.getConnectionStatus();
    const syncStatus = await xeroSyncService.getSyncStatus();

    const health = {
      connection: {
        status: connectionStatus.connected ? 'healthy' : 'unhealthy',
        details: connectionStatus,
      },
      sync: {
        status: syncStatus.isRunning ? 'running' : 'idle',
        details: syncStatus,
      },
      overall: {
        status: connectionStatus.connected && !syncStatus.isRunning ? 'ready' : 
                connectionStatus.connected && syncStatus.isRunning ? 'busy' : 'not_ready',
        ready_for_sync: connectionStatus.connected && !syncStatus.isRunning,
      },
    };

    return NextResponse.json({
      success: true,
      data: health,
      checked_at: new Date(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateReadinessScore(validation: any): number {
  const totalValid = validation.contacts.valid + validation.projects.valid + validation.timeEntries.valid;
  const totalErrors = validation.overallReadiness.totalErrors;
  
  if (totalValid === 0) return 0;
  
  const errorRate = totalErrors / (totalValid + totalErrors);
  const baseScore = Math.max(0, 100 - (errorRate * 100));
  
  // Bonus points for having data in all categories
  const categoryBonus = [validation.contacts.valid > 0, validation.projects.valid > 0, validation.timeEntries.valid > 0]
    .filter(Boolean).length * 5;
  
  return Math.min(100, Math.round(baseScore + categoryBonus));
}

function getReadinessLevel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'not_ready';
}

function generateRecommendations(validation: any, score: number): string[] {
  const recommendations: string[] = [];
  
  if (score < 50) {
    recommendations.push('Data quality needs improvement before syncing to Xero');
  }
  
  if (validation.contacts.errors > 0) {
    recommendations.push(`Fix ${validation.contacts.errors} client validation errors`);
  }
  
  if (validation.projects.errors > 0) {
    recommendations.push(`Fix ${validation.projects.errors} project validation errors`);
  }
  
  if (validation.timeEntries.errors > 0) {
    recommendations.push(`Fix ${validation.timeEntries.errors} timesheet validation errors`);
  }
  
  if (validation.timeEntries.valid === 0) {
    recommendations.push('No approved timesheets available for sync');
  }
  
  if (validation.contacts.valid === 0) {
    recommendations.push('No active clients available for sync');
  }
  
  if (validation.projects.valid === 0) {
    recommendations.push('No active projects available for sync');
  }
  
  if (score >= 75) {
    recommendations.push('Data is ready for synchronization to Xero');
  }
  
  return recommendations;
}
