
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/ai/insights/[id]/dismiss - Dismiss an AI insight
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if insight exists and belongs to user
    const insight = await prisma.aIInsight.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Update insight to dismissed
    const updatedInsight = await prisma.aIInsight.update({
      where: { id: params.id },
      data: {
        dismissed: true,
      },
    });

    return NextResponse.json({
      data: updatedInsight,
      message: 'Insight dismissed successfully',
    });
  } catch (error) {
    console.error('Error dismissing AI insight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
