
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroApi } from '@/lib/xero';

// GET /api/xero/status - Get Xero connection status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins and managers can view Xero status
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get connection status
    const status = await xeroApi.getConnectionStatus();

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting Xero status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get Xero connection status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
