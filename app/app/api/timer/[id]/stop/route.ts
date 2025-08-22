
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/timer/[id]/stop - Stop running timer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    // Check if timer exists and is running
    const timer = await prisma.timeEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        isRunning: true,
      },
    });

    if (!timer) {
      return NextResponse.json({ 
        error: 'Timer not found or not running' 
      }, { status: 404 });
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - timer.startTime!.getTime()) / (1000 * 60 * 60); // Convert to hours

    // Update timer with stop time and duration
    const stoppedTimer = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        endTime,
        duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
        description: description || timer.description,
        isRunning: false,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
    });

    return NextResponse.json({ data: stoppedTimer });
  } catch (error) {
    console.error('Error stopping timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
