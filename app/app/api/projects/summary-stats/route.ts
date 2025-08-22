
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects/summary-stats - Get overall project statistics and insights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can access summary stats
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const clientId = searchParams.get('clientId');

    // Build date filter for time entries
    const timeFilter: any = {};
    if (startDate || endDate) {
      timeFilter.date = {};
      if (startDate) timeFilter.date.gte = new Date(startDate);
      if (endDate) timeFilter.date.lte = new Date(endDate);
    }

    // Build project filter
    const projectFilter: any = {};
    if (clientId) {
      projectFilter.clientId = clientId;
    }

    // Get project counts by status
    const projectsByStatus = await prisma.project.groupBy({
      by: ['status'],
      where: projectFilter,
      _count: {
        id: true,
      },
    });

    // Get total project count
    const totalProjects = await prisma.project.count({
      where: projectFilter,
    });

    // Get client statistics
    const activeClients = await prisma.client.count({
      where: {
        isActive: true,
        ...(clientId && { id: clientId }),
      },
    });

    // Get task statistics
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: {
        ...(projectFilter.clientId && {
          project: {
            clientId: projectFilter.clientId,
          },
        }),
      },
      _count: {
        id: true,
      },
    });

    // Get time entry statistics
    const timeStats = await prisma.timeEntry.aggregate({
      where: {
        ...timeFilter,
        ...(projectFilter.clientId && {
          project: {
            clientId: projectFilter.clientId,
          },
        }),
      },
      _sum: {
        duration: true,
      },
      _count: {
        id: true,
      },
    });

    const billableTimeStats = await prisma.timeEntry.aggregate({
      where: {
        ...timeFilter,
        billable: true,
        ...(projectFilter.clientId && {
          project: {
            clientId: projectFilter.clientId,
          },
        }),
      },
      _sum: {
        duration: true,
      },
    });

    // Get revenue statistics (based on billable hours and rates)
    const revenueStats = await prisma.timeEntry.aggregate({
      where: {
        ...timeFilter,
        billable: true,
        billRate: { not: null },
        ...(projectFilter.clientId && {
          project: {
            clientId: projectFilter.clientId,
          },
        }),
      },
      _sum: {
        duration: true,
      },
    });

    // Get project budget utilization
    const projectBudgets = await prisma.project.aggregate({
      where: {
        ...projectFilter,
        budget: { not: null },
      },
      _sum: {
        budget: true,
      },
      _count: {
        id: true,
      },
    });

    // Get most active projects (by time entries in selected period)
    const mostActiveProjects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        client: {
          select: {
            name: true,
          },
        },
        timeEntries: {
          where: timeFilter,
          select: {
            duration: true,
            billable: true,
          },
        },
      },
      take: 10,
    });

    // Calculate activity for projects and sort
    const projectActivity = mostActiveProjects
      .map(project => ({
        id: project.id,
        name: project.name,
        code: project.code,
        client: project.client.name,
        status: project.status,
        totalHours: project.timeEntries.reduce((sum, entry) => sum + entry.duration, 0),
        billableHours: project.timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0),
        entryCount: project.timeEntries.length,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);

    // Get team utilization statistics
    const teamUtilization = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['EMPLOYEE', 'MANAGER'] },
      },
      include: {
        timeEntries: {
          where: timeFilter,
          select: {
            duration: true,
            billable: true,
          },
        },
      },
      take: 10,
    });

    const teamStats = teamUtilization.map(user => ({
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      totalHours: user.timeEntries.reduce((sum, entry) => sum + entry.duration, 0),
      billableHours: user.timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0),
      entryCount: user.timeEntries.length,
    })).sort((a, b) => b.totalHours - a.totalHours);

    // Format response
    const response = {
      data: {
        projects: {
          total: totalProjects,
          active: projectsByStatus.find(p => p.status === 'ACTIVE')?._count.id || 0,
          completed: projectsByStatus.find(p => p.status === 'COMPLETED')?._count.id || 0,
          onHold: projectsByStatus.find(p => p.status === 'ON_HOLD')?._count.id || 0,
          cancelled: projectsByStatus.find(p => p.status === 'CANCELLED')?._count.id || 0,
          withBudget: projectBudgets._count.id,
          totalBudget: projectBudgets._sum.budget || 0,
        },
        clients: {
          total: activeClients,
        },
        tasks: {
          total: tasksByStatus.reduce((sum, task) => sum + task._count.id, 0),
          open: tasksByStatus.find(t => t.status === 'OPEN')?._count.id || 0,
          inProgress: tasksByStatus.find(t => t.status === 'IN_PROGRESS')?._count.id || 0,
          completed: tasksByStatus.find(t => t.status === 'COMPLETED')?._count.id || 0,
          onHold: tasksByStatus.find(t => t.status === 'ON_HOLD')?._count.id || 0,
        },
        timeTracking: {
          totalHours: timeStats._sum.duration || 0,
          billableHours: billableTimeStats._sum.duration || 0,
          nonBillableHours: (timeStats._sum.duration || 0) - (billableTimeStats._sum.duration || 0),
          totalEntries: timeStats._count.id || 0,
          billabilityRate: timeStats._sum.duration ? 
            ((billableTimeStats._sum.duration || 0) / timeStats._sum.duration * 100).toFixed(1) : '0',
        },
        topProjects: projectActivity,
        teamUtilization: teamStats,
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present',
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching project summary stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
