
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { triggerTimesheetApproved } from '@/lib/events/timesheet-events';

// POST /api/timesheets/submissions/[id]/approve - Approve timesheet submission
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

    // Check if submission exists and is in the correct status
    const submission = await prisma.timesheetSubmission.findFirst({
      where: {
        id: params.id,
        status: 'PENDING',
      },
      include: {
        entries: {
          include: {
            timeEntry: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ 
        error: 'Submission not found or not in pending status' 
      }, { status: 404 });
    }

    // Update submission status
    const updatedSubmission = await prisma.timesheetSubmission.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update all associated time entries to approved
    await prisma.timeEntry.updateMany({
      where: {
        submissionEntry: {
          some: {
            submissionId: params.id,
          },
        },
      },
      data: {
        status: 'APPROVED',
      },
    });

    // Trigger real-time sync to Xero
    try {
      await triggerTimesheetApproved(params.id);
      console.log(`[ApprovalAPI] Xero sync triggered for submission: ${params.id}`);
    } catch (syncError) {
      console.error(`[ApprovalAPI] Failed to trigger Xero sync for submission: ${params.id}`, syncError);
      // Don't fail the approval if sync trigger fails
    }

    return NextResponse.json({ 
      data: updatedSubmission,
      message: 'Timesheet submission approved successfully' 
    });
  } catch (error) {
    console.error('Error approving timesheet submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
