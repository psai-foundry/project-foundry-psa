
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects/[id] - Get specific project
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
      where.assignments = {
        some: {
          userId: session.user.id,
        },
      };
    }

    const project = await prisma.project.findFirst({
      where,
      include: {
        client: {
          include: {
            contacts: {
              where: { isActive: true },
              orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
            },
          },
        },
        tasks: {
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                hourlyRate: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            task: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 10, // Latest 10 entries
        },
        portfolio: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Calculate project statistics
    const stats = await calculateProjectStats(params.id);

    return NextResponse.json({ 
      data: {
        ...project,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update projects
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      clientId,
      portfolioId,
      programId,
      status,
      budget,
      startDate,
      endDate,
      billable,
      defaultBillRate,
    } = body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if code is unique (if being changed)
    if (code && code !== existingProject.code) {
      const codeExists = await prisma.project.findFirst({
        where: { 
          code,
          id: { not: params.id },
        },
      });

      if (codeExists) {
        return NextResponse.json({ 
          error: 'Project code must be unique' 
        }, { status: 400 });
      }
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        code,
        description,
        clientId,
        portfolioId,
        programId,
        status,
        budget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        billable,
        defaultBillRate,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            industry: true,
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
        tasks: true,
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project (status change to CANCELLED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete projects
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        timeEntries: true,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project has time entries
    if (existingProject.timeEntries.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete project with time entries. Please set status to CANCELLED instead.' 
      }, { status: 400 });
    }

    // Change status to CANCELLED instead of hard delete
    const project = await prisma.project.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ 
      message: 'Project cancelled successfully',
      data: project 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate project statistics
async function calculateProjectStats(projectId: string) {
  try {
    const timeStats = await prisma.timeEntry.aggregate({
      where: { projectId },
      _sum: {
        duration: true,
      },
      _count: {
        id: true,
      },
    });

    const billableStats = await prisma.timeEntry.aggregate({
      where: { 
        projectId,
        billable: true,
      },
      _sum: {
        duration: true,
      },
    });

    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: {
        id: true,
      },
    });

    const taskSummary = taskStats.reduce((acc: Record<string, number>, stat: typeof taskStats[0]) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as any);

    return {
      totalHours: timeStats._sum.duration || 0,
      billableHours: billableStats._sum.duration || 0,
      totalTimeEntries: timeStats._count.id || 0,
      tasksTotal: Object.values(taskSummary).reduce((sum: number, count: any) => sum + count, 0),
      tasksOpen: taskSummary.OPEN || 0,
      tasksInProgress: taskSummary.IN_PROGRESS || 0,
      tasksCompleted: taskSummary.COMPLETED || 0,
      tasksOnHold: taskSummary.ON_HOLD || 0,
    };
  } catch (error) {
    console.error('Error calculating project stats:', error);
    return {
      totalHours: 0,
      billableHours: 0,
      totalTimeEntries: 0,
      tasksTotal: 0,
      tasksOpen: 0,
      tasksInProgress: 0,
      tasksCompleted: 0,
      tasksOnHold: 0,
    };
  }
}
