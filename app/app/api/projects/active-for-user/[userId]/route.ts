
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects/active-for-user/[userId] - Get active projects for specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control - users can only see their own projects unless they're ADMIN/MANAGER
    if (params.userId !== session.user.id && !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('includeTasks') === 'true';
    const includeTimeEntries = searchParams.get('includeTimeEntries') === 'true';

    // Get projects where user is assigned and project is ACTIVE
    const projects = await prisma.project.findMany({
      where: {
        status: 'ACTIVE',
        assignments: {
          some: {
            userId: params.userId,
          },
        },
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
          where: {
            userId: params.userId,
          },
          select: {
            role: true,
            billRate: true,
            createdAt: true,
          },
        },
        ...(includeTasks && {
          tasks: {
            where: {
              status: {
                in: ['OPEN', 'IN_PROGRESS'],
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        }),
        ...(includeTimeEntries && {
          timeEntries: {
            where: {
              userId: params.userId,
              date: {
                gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
            include: {
              task: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { date: 'desc' },
          },
        }),
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    // Calculate recent activity stats for each project
    const projectsWithStats = projects.map((project: typeof projects[0]) => {
      let stats = {};
      
      if (includeTimeEntries) {
        const recentHours = project.timeEntries?.reduce((sum: number, entry: NonNullable<typeof project.timeEntries>[0]) => sum + entry.duration, 0) || 0;
        const recentBillableHours = project.timeEntries?.filter((e: NonNullable<typeof project.timeEntries>[0]) => e.billable).reduce((sum: number, entry: NonNullable<typeof project.timeEntries>[0]) => sum + entry.duration, 0) || 0;
        
        stats = {
          recentHours,
          recentBillableHours,
          lastActivity: project.timeEntries?.[0]?.date || null,
        };
      }

      if (includeTasks) {
        const taskStats = project.tasks?.reduce((acc: Record<string, number>, task: NonNullable<typeof project.tasks>[0]) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as any) || {};

        stats = {
          ...stats,
          activeTasks: project.tasks?.length || 0,
          tasksOpen: taskStats.OPEN || 0,
          tasksInProgress: taskStats.IN_PROGRESS || 0,
        };
      }

      return {
        ...project,
        userAssignment: project.assignments[0], // User's specific assignment details
        assignments: undefined, // Remove assignments array from response
        stats,
      };
    });

    // Get user details for response
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      },
    });

    return NextResponse.json({
      data: {
        user,
        projects: projectsWithStats,
        summary: {
          totalActiveProjects: projects.length,
          ...(includeTasks && {
            totalActiveTasks: projectsWithStats.reduce((sum: number, p: typeof projectsWithStats[0]) => sum + (p.tasks?.length || 0), 0),
          }),
          ...(includeTimeEntries && {
            recentTotalHours: projectsWithStats.reduce((sum: number, p: typeof projectsWithStats[0]) => sum + ((p.stats as any)?.recentHours || 0), 0),
          }),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching active projects for user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
