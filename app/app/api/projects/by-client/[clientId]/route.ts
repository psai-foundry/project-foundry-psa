
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects/by-client/[clientId] - Get projects for specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build filter conditions based on user role
    const where: any = {
      clientId: params.clientId,
    };

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      where.assignments = {
        some: {
          userId: session.user.id,
        },
      };
    }

    if (status) {
      where.status = status;
    }

    // Verify client exists and user has access
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            estimatedHours: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        ...(includeStats && {
          timeEntries: {
            select: {
              duration: true,
              billable: true,
            },
          },
        }),
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate statistics if requested
    let projectsWithStats: any = projects;
    if (includeStats) {
      projectsWithStats = projects.map(project => {
        const totalHours = project.timeEntries?.reduce((sum, entry) => sum + entry.duration, 0) || 0;
        const billableHours = project.timeEntries?.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0) || 0;
        
        const taskStats = project.tasks?.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as any) || {};

        const { timeEntries, ...projectWithoutTimeEntries } = project;
        
        return {
          ...projectWithoutTimeEntries,
          stats: {
            totalHours,
            billableHours,
            tasksTotal: project.tasks?.length || 0,
            tasksOpen: taskStats.OPEN || 0,
            tasksInProgress: taskStats.IN_PROGRESS || 0,
            tasksCompleted: taskStats.COMPLETED || 0,
            tasksOnHold: taskStats.ON_HOLD || 0,
          },
        };
      });
    }

    return NextResponse.json({
      data: {
        client,
        projects: projectsWithStats,
      },
    });
  } catch (error) {
    console.error('Error fetching projects by client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
