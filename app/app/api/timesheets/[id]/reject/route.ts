
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTimesheetRejectionNotification } from '@/lib/notifications';

// POST /api/timesheets/[id]/reject - Reject timesheet entry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has approval permissions
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ 
        error: 'Rejection reason is required' 
      }, { status: 400 });
    }

    // Check if entry exists and is in the correct status
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id: params.id,
        status: 'SUBMITTED',
      },
      include: {
        user: true,
        project: true,
      },
    });

    if (!existingEntry) {
      return NextResponse.json({ 
        error: 'Time entry not found or not in submitted status' 
      }, { status: 404 });
    }

    // Update time entry status to rejected
    const timeEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
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

    // Create approval record
    await prisma.approval.create({
      data: {
        submissionId: params.id, // Using timesheet ID as submission ID for now
        approverId: session.user.id,
        status: 'REJECTED',
        comments: reason,
      },
    });

    // Send notification to user about rejection
    await createTimesheetRejectionNotification(
      timeEntry.user.id,
      session.user.name || session.user.email || 'Manager',
      params.id,
      reason,
      timeEntry.project?.name
    );

    return NextResponse.json({ 
      data: timeEntry,
      message: 'Time entry rejected' 
    });
  } catch (error) {
    console.error('Error rejecting timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
