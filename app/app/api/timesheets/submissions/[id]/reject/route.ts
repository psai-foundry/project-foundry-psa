
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/timesheets/submissions/[id]/reject - Reject timesheet submission
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
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedBy: session.user.id, // Track who rejected it
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

    // Update all associated time entries to rejected
    await prisma.timeEntry.updateMany({
      where: {
        submissionEntry: {
          some: {
            submissionId: params.id,
          },
        },
      },
      data: {
        status: 'REJECTED',
      },
    });

    return NextResponse.json({ 
      data: updatedSubmission,
      message: 'Timesheet submission rejected' 
    });
  } catch (error) {
    console.error('Error rejecting timesheet submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
