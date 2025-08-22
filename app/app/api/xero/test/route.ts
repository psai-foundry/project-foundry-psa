
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { xeroApi } from '@/lib/xero';

// GET /api/xero/test - Test Xero connection and get organization info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins and managers can test Xero connection
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Test connection and get organization info
    const [connectionStatus, organizationInfo] = await Promise.allSettled([
      xeroApi.getConnectionStatus(),
      xeroApi.getOrganizationInfo()
    ]);

    const status = connectionStatus.status === 'fulfilled' ? connectionStatus.value : null;
    const orgInfo = organizationInfo.status === 'fulfilled' ? organizationInfo.value : null;

    if (!status?.connected) {
      return NextResponse.json({
        connected: false,
        error: status?.error || 'Connection failed',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    return NextResponse.json({
      connected: true,
      status,
      organization: {
        name: orgInfo?.name,
        legalName: orgInfo?.legalName,
        paysTax: orgInfo?.paysTax,
        version: orgInfo?.version,
        organisationType: orgInfo?.organisationType,
        baseCurrency: orgInfo?.baseCurrency,
        countryCode: orgInfo?.countryCode,
        isDemoCompany: orgInfo?.isDemoCompany,
        organisationStatus: orgInfo?.organisationStatus,
        registrationNumber: orgInfo?.registrationNumber,
        employerIdentificationNumber: orgInfo?.employerIdentificationNumber,
        financialYearEndDay: orgInfo?.financialYearEndDay,
        financialYearEndMonth: orgInfo?.financialYearEndMonth,
        salesTaxBasis: orgInfo?.salesTaxBasis,
        salesTaxPeriod: orgInfo?.salesTaxPeriod
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing Xero connection:', error);
    return NextResponse.json(
      { 
        connected: false,
        error: 'Failed to test Xero connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
