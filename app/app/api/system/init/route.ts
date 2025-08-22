

/**
 * System Initialization API
 * Phase 2B-8c: Automated Alerting System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { initializeAlertEngine, createDefaultAlertRulesForUser } from '@/lib/startup/alert-engine-init';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'PARTNER', 'PRINCIPAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'init_alert_engine':
        await initializeAlertEngine();
        return NextResponse.json({ 
          success: true, 
          message: 'Alert engine initialized successfully' 
        });

      case 'create_default_rules':
        await createDefaultAlertRulesForUser(session.user.id);
        return NextResponse.json({ 
          success: true, 
          message: 'Default alert rules created successfully' 
        });

      case 'full_init':
        // Full system initialization
        await initializeAlertEngine();
        await createDefaultAlertRulesForUser(session.user.id);
        
        return NextResponse.json({ 
          success: true, 
          message: 'System fully initialized with alert engine and default rules' 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: init_alert_engine, create_default_rules, or full_init' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('System initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize system' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return system status
    const [alertRulesCount, activeAlertsCount] = await Promise.all([
      prisma.alertRule.count({ where: { isActive: true } }),
      prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } })
    ]);

    return NextResponse.json({
      status: 'operational',
      alertEngine: {
        rulesCount: alertRulesCount,
        activeAlerts: activeAlertsCount
      },
      initialized: alertRulesCount > 0
    });
  } catch (error) {
    console.error('System status error:', error);
    return NextResponse.json(
      { error: 'Failed to get system status' },
      { status: 500 }
    );
  }
}

