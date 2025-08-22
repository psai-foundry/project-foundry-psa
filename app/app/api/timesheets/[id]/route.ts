
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseISO } from 'date-fns';

// GET /api/timesheets/[id] - Get specific timesheet entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: params.id,
        userId: session.user.id, // Users can only access their own entries
      },
      include: {
        project: {
          include: {
            client: true,
            portfolio: true,
            program: true,
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

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    return NextResponse.json({ data: timeEntry });
  } catch (error) {
    console.error('Error fetching timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/timesheets/[id] - Update timesheet entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      taskId,
      date,
      startTime,
      endTime,
      duration,
      description,
      billable,
      billRate,
    } = body;

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

    // Check if entry is still editable (not approved)
    if (existingEntry.status === 'APPROVED') {
      return NextResponse.json({ 
        error: 'Cannot edit approved time entry' 
      }, { status: 400 });
    }

    // Validate project access if projectId is being changed
    if (projectId && projectId !== existingEntry.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          assignments: {
            some: {
              userId: session.user.id,
            },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
      }
    }

    // Validate task if provided
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId: projectId || existingEntry.projectId,
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    // Update time entry
    const timeEntry = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        ...(projectId && { projectId }),
        ...(taskId !== undefined && { taskId }),
        ...(date && { date: parseISO(date) }),
        ...(startTime && { startTime: parseISO(startTime) }),
        ...(endTime && { endTime: parseISO(endTime) }),
        ...(duration !== undefined && { duration }),
        ...(description !== undefined && { description }),
        ...(billable !== undefined && { billable }),
        ...(billRate !== undefined && { billRate }),
        status: 'DRAFT', // Reset status to draft when edited
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

    return NextResponse.json({ data: timeEntry });
  } catch (error) {
    console.error('Error updating timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/timesheets/[id] - Delete timesheet entry
export async function DELETE(
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

    // Check if entry is still deletable (not approved)
    if (existingEntry.status === 'APPROVED') {
      return NextResponse.json({ 
        error: 'Cannot delete approved time entry' 
      }, { status: 400 });
    }

    // Delete time entry
    await prisma.timeEntry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
