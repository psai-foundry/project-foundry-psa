
/**
 * Phase 2B-8b: Demo Data Generation API
 * Endpoint for generating demo performance metrics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { demoMetricsGenerator } from '@/lib/services/demo-metrics-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'generate-sample-data':
        await demoMetricsGenerator.generateSampleMetrics();
        return NextResponse.json({ 
          success: true, 
          message: 'Sample metrics data generated successfully' 
        });

      case 'generate-realtime-demo':
        await demoMetricsGenerator.generateRealtimeDemo();
        return NextResponse.json({ 
          success: true, 
          message: 'Real-time demo data generated successfully' 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Demo data generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' }, 
      { status: 500 }
    );
  }
}
