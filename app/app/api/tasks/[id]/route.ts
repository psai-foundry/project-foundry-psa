
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/tasks/[id] - Get specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control query
    const where: any = { id: params.id };

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      where.project = {
        assignments: {
          some: {
            userId: session.user.id,
          },
        },
      };
    }

    const task = await prisma.task.findFirst({
      where,
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    // Calculate task statistics
    const stats = {
      totalHours: task.timeEntries.reduce((sum, entry) => sum + entry.duration, 0),
      billableHours: task.timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0),
      totalEntries: task.timeEntries.length,
      contributorsCount: new Set(task.timeEntries.map(e => e.userId)).size,
      completionPercentage: task.estimatedHours ? 
        Math.min((task.timeEntries.reduce((sum, entry) => sum + entry.duration, 0) / task.estimatedHours) * 100, 100) : null,
    };

    return NextResponse.json({ 
      data: {
        ...task,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update tasks
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      status,
      estimatedHours,
      billable,
    } = body;

    // Check if task exists and user has access
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        project: {
          OR: [
            // Admin/Manager can access all projects
            ...((['ADMIN', 'MANAGER'].includes(session.user.role)) ? [{}] : []),
            // Or user is assigned to project
            {
              assignments: {
                some: {
                  userId: session.user.id,
                },
              },
            },
          ],
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        name,
        description,
        status,
        estimatedHours,
        billable,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete tasks
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        timeEntries: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task has time entries
    if (existingTask.timeEntries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete task with time entries. Please set status to COMPLETED or ON_HOLD instead.' 
      }, { status: 400 });
    }

    // Hard delete if no time entries
    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
