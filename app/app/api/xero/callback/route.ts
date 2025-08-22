
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { xeroApi } from '@/lib/xero';

// GET /api/xero/callback - Handle Xero OAuth callback
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const error = url.searchParams.get('error');

    if (error) {
      console.error('Xero OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?xero_error=${encodeURIComponent(error)}`);
    }

    // Pass the full callback URL to the Xero API
    const callbackUrl = request.url;
    
    // Exchange callback URL for tokens
    const tokenSet = await xeroApi.handleCallback(callbackUrl);
    
    console.log('Xero OAuth callback successful');
    
    // Redirect to settings page with success message
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?xero_connected=true`);

  } catch (error) {
    console.error('Error handling Xero callback:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?xero_error=${encodeURIComponent(errorMessage)}`
    );
  }
}
