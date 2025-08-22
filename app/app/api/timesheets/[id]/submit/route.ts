
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTimesheetSubmissionNotification } from '@/lib/notifications';

// POST /api/timesheets/[id]/submit - Submit timesheet entry for approval
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    // Check if entry is in the correct status for submission
    if (existingEntry.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: 'Time entry must be in draft status to submit' 
      }, { status: 400 });
    }

    // Update time entry status to submitted
    const timeEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification to managers for approval
    await createTimesheetSubmissionNotification(
      timeEntry.user.id,
      timeEntry.user.name || timeEntry.user.email || 'User',
      params.id,
      timeEntry.project?.name
    );

    return NextResponse.json({ 
      data: timeEntry,
      message: 'Time entry submitted for approval' 
    });
  } catch (error) {
    console.error('Error submitting timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
