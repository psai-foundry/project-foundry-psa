
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroApi } from '@/lib/xero';

// POST /api/xero/disconnect - Disconnect from Xero
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can disconnect from Xero
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can disconnect from Xero.' },
        { status: 403 }
      );
    }

    // Disconnect from Xero
    await xeroApi.disconnect();

    return NextResponse.json({
      message: 'Successfully disconnected from Xero',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error disconnecting from Xero:', error);
    return NextResponse.json(
      { 
        error: 'Failed to disconnect from Xero',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
