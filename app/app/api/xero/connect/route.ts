
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroApi } from '@/lib/xero';

// GET /api/xero/connect - Initiate Xero OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can connect to Xero
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can connect to Xero.' },
        { status: 403 }
      );
    }

    // Generate Xero authorization URL
    const authorizationUrl = await xeroApi.getAuthorizationUrl();

    return NextResponse.json({
      authorizationUrl,
      message: 'Redirect to this URL to authorize Xero connection'
    });

  } catch (error) {
    console.error('Error initiating Xero connection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate Xero connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
