
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/timer/[id]/pause - Pause running timer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const pauseTime = new Date();
    const currentDuration = (pauseTime.getTime() - timer.startTime!.getTime()) / (1000 * 60 * 60);

    // Update timer with current duration and pause state
    const pausedTimer = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        duration: Math.round(currentDuration * 100) / 100,
        isRunning: false,
        // We'll store the pause time in a metadata field for resume functionality
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

    return NextResponse.json({ data: pausedTimer });
  } catch (error) {
    console.error('Error pausing timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
