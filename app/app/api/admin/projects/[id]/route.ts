
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/projects/[id] - Get specific project
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

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        portfolio: true,
        program: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
              },
            },
          },
        },
        tasks: {
          include: {
            _count: {
              select: {
                timeEntries: true,
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
            task: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 10, // Recent 10 entries
        },
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
            assignments: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/projects/[id] - Update project
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

    // Check if project code already exists (excluding current project)
    if (code && code !== existingProject.code) {
      const codeExists = await prisma.project.findFirst({
        where: {
          code,
          id: { not: params.id },
        },
      });

      if (codeExists) {
        return NextResponse.json({ 
          error: 'Project code already exists' 
        }, { status: 400 });
      }
    }

    // Update project
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
        client: true,
        portfolio: true,
        program: true,
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
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
            assignments: true,
          },
        },
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/projects/[id] - Delete project
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

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project has time entries or tasks
    if (project._count.timeEntries > 0 || project._count.tasks > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete project with existing time entries or tasks. Set status to CANCELLED instead.' 
      }, { status: 400 });
    }

    // Delete project and related data
    await prisma.$transaction([
      // Delete project assignments first
      prisma.projectAssignment.deleteMany({
        where: { projectId: params.id },
      }),
      // Delete the project
      prisma.project.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
