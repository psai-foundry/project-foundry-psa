
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/tasks/[id] - Get specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        project: {
          include: {
            client: true,
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
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
          orderBy: {
            date: 'desc',
          },
          take: 20, // Recent 20 entries
        },
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      projectId,
      status,
      estimatedHours,
      billable,
    } = body;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // If project is being changed, validate new project
    if (projectId && projectId !== existingTask.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          assignments: {
            where: { userId: session.user.id },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: 'New project not found' }, { status: 404 });
      }

      const hasAccess = ['ADMIN', 'MANAGER'].includes(session.user.role) || 
                       project.assignments.length > 0;

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to new project' }, { status: 403 });
      }
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        name,
        description,
        projectId,
        status,
        estimatedHours,
        billable,
      },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            timeEntries: true,
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

// DELETE /api/admin/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task has time entries
    if (task._count.timeEntries > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete task with existing time entries. Set status to COMPLETED instead.' 
      }, { status: 400 });
    }

    // Delete task
    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
