
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/tasks/by-project/[projectId] - Get tasks for specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeTimeEntries = searchParams.get('includeTimeEntries') === 'true';

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
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
      include: {
        client: {
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

    // Build filter conditions
    const where: any = {
      projectId: params.projectId,
    };

    if (status) {
      where.status = status;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        ...(includeTimeEntries && {
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
            take: 10, // Latest 10 entries per task
          },
        }),
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Calculate statistics if requested
    let tasksWithStats = tasks;
    if (includeStats) {
      tasksWithStats = tasks.map(task => {
        const totalHours = task.timeEntries?.reduce((sum, entry) => sum + entry.duration, 0) || 0;
        const billableHours = task.timeEntries?.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0) || 0;
        const contributorsCount = new Set(task.timeEntries?.map(e => e.userId) || []).size;
        const completionPercentage = task.estimatedHours ? 
          Math.min((totalHours / task.estimatedHours) * 100, 100) : null;

        return {
          ...task,
          stats: {
            totalHours,
            billableHours,
            totalEntries: task.timeEntries?.length || 0,
            contributorsCount,
            completionPercentage,
            isOverBudget: task.estimatedHours ? totalHours > task.estimatedHours : false,
          },
          ...(includeTimeEntries && { timeEntries: task.timeEntries }),
        };
      });
    }

    // Calculate project-level task statistics
    const taskStatsByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as any);

    const projectTaskStats = {
      total: tasks.length,
      open: taskStatsByStatus.OPEN || 0,
      inProgress: taskStatsByStatus.IN_PROGRESS || 0,
      completed: taskStatsByStatus.COMPLETED || 0,
      onHold: taskStatsByStatus.ON_HOLD || 0,
      ...(includeStats && {
        totalHours: tasksWithStats.reduce((sum, task: any) => sum + (task.stats?.totalHours || 0), 0),
        totalBillableHours: tasksWithStats.reduce((sum, task: any) => sum + (task.stats?.billableHours || 0), 0),
        averageCompletionRate: tasksWithStats
          .filter((task: any) => task.stats?.completionPercentage !== null)
          .reduce((sum, task: any, _, arr) => sum + (task.stats?.completionPercentage || 0) / arr.length, 0),
      }),
    };

    return NextResponse.json({
      data: {
        project,
        tasks: tasksWithStats,
        summary: projectTaskStats,
      },
    });
  } catch (error) {
    console.error('Error fetching tasks by project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
