
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createTimesheetApprovalNotification } from '@/lib/notifications';

// POST /api/timesheets/[id]/approve - Approve timesheet entry
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
    const { comments } = body;

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

    // Update time entry status to approved
    const timeEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
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
        status: 'APPROVED',
        comments,
        approvedAt: new Date(),
      },
    });

    // Send notification to user about approval
    await createTimesheetApprovalNotification(
      timeEntry.user.id,
      session.user.name || session.user.email || 'Manager',
      params.id,
      timeEntry.project?.name,
      comments
    );

    return NextResponse.json({ 
      data: timeEntry,
      message: 'Time entry approved successfully' 
    });
  } catch (error) {
    console.error('Error approving timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
