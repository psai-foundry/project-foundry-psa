
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
    
    // Check if user has permission to view resource data
    if (!hasPermission(userRole, Permission.VIEW_ALL_USERS) && 
        !hasPermission(userRole, Permission.VIEW_TEAM_TIMESHEETS) && 
        !hasPermission(userRole, Permission.APPROVE_TIMESHEET)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get total active resources (excluding clients)
    const totalResources = await prisma.user.count({
      where: {
        role: {
          not: 'CLIENT_USER',
        },
        isActive: true,
      },
    });

    // Mock data for resource allocations (to be replaced with real data from Resource tables)
    const mockResourceData = {
      totalResources,
      activeAllocations: Math.floor(totalResources * 0.85), // 85% allocated
      overallocatedResources: Math.floor(totalResources * 0.12), // 12% overallocated
      availableCapacity: 23, // 23% available capacity
      utilizationRate: 87, // 87% utilization
      upcomingAllocations: Math.floor(totalResources * 0.3), // 30% have upcoming allocations
      capacityTrend: 5, // 5% increase from last week
      resourceHealth: 'warning' as const, // warning due to some overallocations
      
      topResourceIssues: [
        {
          id: '1',
          resourceName: 'Sarah Connor',
          issue: 'Overallocated by 15 hours this week',
          severity: 'high' as const,
        },
        {
          id: '2',
          resourceName: 'John Smith',
          issue: 'No allocation for next week',
          severity: 'medium' as const,
        },
        {
          id: '3',
          resourceName: 'Emily Johnson',
          issue: 'Skills mismatch on current project',
          severity: 'low' as const,
        },
      ],

      capacityByRole: [
        {
          role: 'Senior Consultant',
          allocated: 160,
          available: 20,
          utilization: 89,
        },
        {
          role: 'Junior Consultant',
          allocated: 120,
          available: 40,
          utilization: 75,
        },
        {
          role: 'Manager',
          allocated: 100,
          available: 60,
          utilization: 63,
        },
        {
          role: 'Employee',
          allocated: 140,
          available: 30,
          utilization: 82,
        },
      ],
    };

    // Get real project assignment data for active allocations
    const activeProjectAssignments = await prisma.projectAssignment.count({
      where: {
        project: {
          status: 'ACTIVE',
        },
      },
    });

    // Get time entries for utilization calculation
    const weekTimeEntries = await prisma.timeEntry.aggregate({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        user: {
          role: {
            not: 'CLIENT_USER',
          },
          isActive: true,
        },
      },
      _sum: {
        duration: true,
      },
      _count: {
        userId: true,
      },
    });

    // Calculate actual utilization rate
    const totalPossibleHours = totalResources * 40 * 60; // 40 hours per week in minutes
    const actualUtilizationRate = totalPossibleHours > 0 
      ? Math.round(((weekTimeEntries._sum.duration || 0) / totalPossibleHours) * 100)
      : mockResourceData.utilizationRate;

    // Get users with high time entries (potential overallocation)
    const overallocatedUsers = await prisma.user.findMany({
      where: {
        role: {
          not: 'CLIENT_USER',
        },
        isActive: true,
        timeEntries: {
          some: {
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
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
      },
    });

    const overallocatedCount = overallocatedUsers.filter(user => {
      const totalMinutes = user.timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
      return totalMinutes > (45 * 60); // More than 45 hours per week
    }).length;

    // Get upcoming project assignments
    const upcomingAssignments = await prisma.projectAssignment.count({
      where: {
        project: {
          startDate: {
            gte: weekEnd,
            lte: new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
          },
        },
      },
    });

    // Determine resource health based on metrics
    const resourceHealth = overallocatedCount > totalResources * 0.2 ? 'critical' :
                          overallocatedCount > totalResources * 0.1 ? 'warning' : 'good';

    // Build response with mix of real and mock data
    const responseData = {
      ...mockResourceData,
      totalResources,
      activeAllocations: activeProjectAssignments,
      overallocatedResources: overallocatedCount,
      utilizationRate: actualUtilizationRate,
      upcomingAllocations: upcomingAssignments,
      resourceHealth,
      availableCapacity: Math.max(0, 100 - actualUtilizationRate),
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Resource dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
