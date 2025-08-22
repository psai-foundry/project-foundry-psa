
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    
    // Check if user has permission to view resource insights
    if (!hasPermission(userRole, Permission.VIEW_ALL_USERS) && 
        !hasPermission(userRole, Permission.VIEW_TEAM_TIMESHEETS) && 
        !hasPermission(userRole, Permission.APPROVE_TIMESHEET)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const nextWeekStart = new Date(weekEnd);
    nextWeekStart.setDate(weekEnd.getDate() + 1);
    nextWeekStart.setHours(0, 0, 0, 0);

    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);

    // Get resource utilization data for insights
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'CLIENT_USER' },
        isActive: true,
      },
      include: {
        timeEntries: {
          where: {
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          select: {
            duration: true,
          },
        },
        projectAssignments: {
          where: {
            project: {
              status: 'ACTIVE',
            },
          },
          include: {
            project: {
              select: {
                name: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    // Analyze resource utilization
    const resourceAnalysis = users.map(user => {
      const totalMinutes = user.timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const totalHours = totalMinutes / 60;
      const utilization = (totalHours / 40) * 100; // 40 hours per week

      return {
        id: user.id,
        name: user.name || 'Unknown',
        role: user.role,
        totalHours,
        utilization,
        activeProjects: user.projectAssignments.length,
        isOverallocated: utilization > 110,
        isUnderutilized: utilization < 60,
        hasNoProjects: user.projectAssignments.length === 0,
      };
    });

    // Generate AI insights based on resource analysis
    const insights: any[] = [];

    // Check for overallocated resources
    const overallocatedUsers = resourceAnalysis.filter(user => user.isOverallocated);
    if (overallocatedUsers.length > 0) {
      insights.push({
        id: 'overallocation-alert',
        title: 'Resource Overallocation Detected',
        description: `${overallocatedUsers.length} team members are working over capacity this week. This could lead to burnout and quality issues.`,
        type: 'alert',
        priority: 'high',
        impact: 'High - Risk of burnout and reduced quality',
        actionText: 'Rebalance Workload',
        actionUrl: '/dashboard/allocations',
        metrics: {
          value: overallocatedUsers.length,
          label: 'overallocated resources',
          change: -5, // Mock trend data
        },
      });
    }

    // Check for underutilized resources
    const underutilizedUsers = resourceAnalysis.filter(user => user.isUnderutilized && !user.hasNoProjects);
    if (underutilizedUsers.length > 0) {
      insights.push({
        id: 'underutilization-opportunity',
        title: 'Capacity Available for New Projects',
        description: `${underutilizedUsers.length} team members have available capacity that could be allocated to new initiatives.`,
        type: 'opportunity',
        priority: 'medium',
        impact: 'Medium - Increased revenue potential',
        actionText: 'View Available Capacity',
        actionUrl: '/dashboard/capacity',
        metrics: {
          value: Math.round(underutilizedUsers.reduce((sum, user) => sum + (100 - user.utilization), 0)),
          label: '% unused capacity',
          change: 12, // Mock trend data
        },
      });
    }

    // Check for unassigned resources
    const unassignedUsers = resourceAnalysis.filter(user => user.hasNoProjects);
    if (unassignedUsers.length > 0) {
      insights.push({
        id: 'unassigned-alert',
        title: 'Unassigned Team Members',
        description: `${unassignedUsers.length} team members are not currently assigned to any active projects.`,
        type: 'alert',
        priority: 'medium',
        impact: 'Medium - Potential revenue loss',
        actionText: 'Assign to Projects',
        actionUrl: '/dashboard/resources',
        metrics: {
          value: unassignedUsers.length,
          label: 'unassigned resources',
        },
      });
    }

    // Skill utilization analysis (mock data for now)
    const averageUtilization = resourceAnalysis.reduce((sum, user) => sum + user.utilization, 0) / resourceAnalysis.length;
    if (averageUtilization > 85) {
      insights.push({
        id: 'high-utilization-forecast',
        title: 'High Team Utilization Trend',
        description: 'Current team utilization is very high. Consider hiring additional resources or adjusting project timelines.',
        type: 'forecast',
        priority: 'high',
        impact: 'High - Risk of resource burnout',
        actionText: 'View Hiring Plan',
        actionUrl: '/dashboard/capacity',
        metrics: {
          value: Math.round(averageUtilization),
          label: '% average utilization',
          change: 8,
        },
      });
    }

    // Project delivery optimization
    const projectsEndingSoon = await prisma.project.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: today,
          lte: nextWeekEnd,
        },
      },
    });

    if (projectsEndingSoon > 0) {
      insights.push({
        id: 'project-completion-optimization',
        title: 'Projects Ending Soon - Resource Reallocation',
        description: `${projectsEndingSoon} projects are ending soon. Plan resource reallocation to maintain utilization.`,
        type: 'optimization',
        priority: 'medium',
        impact: 'Medium - Smooth resource transition',
        actionText: 'Plan Reallocation',
        actionUrl: '/dashboard/projects',
        metrics: {
          value: projectsEndingSoon,
          label: 'projects ending',
        },
      });
    }

    // Skill gap analysis (mock insight)
    insights.push({
      id: 'skill-gap-analysis',
      title: 'Skill Development Opportunities',
      description: 'Based on current project requirements, upskilling in cloud technologies would benefit 60% of your team.',
      type: 'opportunity',
      priority: 'low',
      impact: 'Medium - Enhanced team capabilities',
      actionText: 'View Training Plan',
      actionUrl: '/dashboard/team',
      metrics: {
        value: 60,
        label: '% team would benefit',
      },
    });

    return NextResponse.json({
      insights: insights.sort((a, b) => {
        const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      }),
      metadata: {
        totalResources: resourceAnalysis.length,
        averageUtilization: Math.round(averageUtilization),
        overallocatedCount: overallocatedUsers.length,
        underutilizedCount: underutilizedUsers.length,
        unassignedCount: unassignedUsers.length,
      },
    });

  } catch (error) {
    console.error('Resource insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle insight dismissal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { insightId } = body;

    // In a real implementation, you would store dismissed insights in the database
    // For now, just return success
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Dismiss insight error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
