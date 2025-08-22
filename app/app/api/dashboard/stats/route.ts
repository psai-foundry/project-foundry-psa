

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

    const userId = session.user.id;
    const userRole = session.user.role as UserRole;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get today's hours
    const todayHours = await prisma.timeEntry.aggregate({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      _sum: {
        duration: true,
      },
    });

    // Get week's hours
    const weekHours = await prisma.timeEntry.aggregate({
      where: {
        userId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      _sum: {
        duration: true,
      },
    });

    // Get billable hours for the week
    const billableHours = await prisma.timeEntry.aggregate({
      where: {
        userId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        billable: true,
      },
      _sum: {
        duration: true,
      },
    });

    // **FIX #7: Improved project access counting based on role permissions**
    const activeProjectsWhere = (() => {
      if (hasPermission(userRole, Permission.VIEW_ALL_PROJECTS)) {
        return {
          status: 'ACTIVE' as any,
        };
      }
      
      if (hasPermission(userRole, Permission.VIEW_ASSIGNED_PROJECTS)) {
        return {
          status: 'ACTIVE' as any,
          OR: [
            {
              assignments: {
                some: {
                  userId,
                },
              },
            },
            // **Additional access for consultants to see projects they can work on**
            ...(userRole === UserRole.SENIOR_CONSULTANT || 
                userRole === UserRole.JUNIOR_CONSULTANT || 
                userRole === UserRole.CONTRACTOR || 
                userRole === UserRole.EMPLOYEE ? [{
              status: 'ACTIVE' as any,
            }] : []),
          ],
        };
      }

      return { id: 'never-match' };
    })();

    const activeProjects = await prisma.project.count({
      where: activeProjectsWhere,
    });

    // **FIX #8: Role-based pending approvals - improved logic**
    const pendingApprovals = (() => {
      if (hasPermission(userRole, Permission.APPROVE_TIMESHEET)) {
        return prisma.timesheetSubmission.count({
          where: {
            status: 'PENDING',
          },
        });
      }
      return Promise.resolve(0);
    })();

    // **FIX #9: Team members count - role-based visibility**
    const teamMembers = (() => {
      if (hasPermission(userRole, Permission.VIEW_ALL_USERS)) {
        return prisma.user.count({
          where: {
            role: {
              not: 'CLIENT_USER',
            },
            // Exclude inactive users
            updatedAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Active in last 90 days
            },
          },
        });
      }
      
      if (hasPermission(userRole, Permission.VIEW_TEAM_TIMESHEETS)) {
        // For team leads, count their direct reports/team members
        return prisma.user.count({
          where: {
            // This would need to be enhanced based on team structure
            // For now, counting all non-client users they can see
            role: {
              in: ['SENIOR_CONSULTANT', 'JUNIOR_CONSULTANT', 'EMPLOYEE', 'CONTRACTOR'],
            },
            updatedAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        });
      }
      
      return Promise.resolve(0);
    })();

    // Get completed tasks this week - improved logic
    const completedTasks = (() => {
      const baseWhere = {
        status: 'COMPLETED' as any,
        updatedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      };

      if (hasPermission(userRole, Permission.VIEW_ALL_PROJECTS)) {
        return prisma.task.count({ where: baseWhere });
      }

      if (hasPermission(userRole, Permission.VIEW_ASSIGNED_PROJECTS)) {
        return prisma.task.count({
          where: {
            ...baseWhere,
            project: {
              OR: [
                {
                  assignments: {
                    some: {
                      userId,
                    },
                  },
                },
                // Additional access for consultants
                ...(userRole === UserRole.SENIOR_CONSULTANT || 
                    userRole === UserRole.JUNIOR_CONSULTANT || 
                    userRole === UserRole.CONTRACTOR || 
                    userRole === UserRole.EMPLOYEE ? [{
                  status: 'ACTIVE' as any,
                }] : []),
              ],
            },
          },
        });
      }

      return Promise.resolve(0);
    })();

    // **FIX #10: Revenue calculation - role-based access**
    const totalRevenue = (() => {
      if (hasPermission(userRole, Permission.VIEW_FINANCIAL_REPORTS)) {
        return prisma.timeEntry.aggregate({
          where: {
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
            billable: true,
            status: {
              in: ['SUBMITTED', 'APPROVED'],
            },
          },
          _sum: {
            billRate: true,
          },
        }).then(result => result._sum.billRate || 0);
      }
      
      if (hasPermission(userRole, Permission.VIEW_TEAM_REPORTS)) {
        // Team leads can see their team's revenue
        return prisma.timeEntry.aggregate({
          where: {
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
            billable: true,
            status: {
              in: ['SUBMITTED', 'APPROVED'],
            },
            project: {
              assignments: {
                some: {
                  userId, // Projects they're involved in
                },
              },
            },
          },
          _sum: {
            billRate: true,
          },
        }).then(result => result._sum.billRate || 0);
      }

      return Promise.resolve(0);
    })();

    // Get recent time entries with improved access
    const recentTimeEntriesWhere = (() => {
      if (hasPermission(userRole, Permission.VIEW_ALL_TIMESHEETS)) {
        return {}; // Can see all entries
      }
      
      if (hasPermission(userRole, Permission.VIEW_TEAM_TIMESHEETS)) {
        return {
          OR: [
            { userId }, // Own entries
            {
              project: {
                assignments: {
                  some: {
                    userId, // Entries from projects they manage
                  },
                },
              },
            },
          ],
        };
      }

      return { userId }; // Only own entries
    })();

    const recentTimeEntries = await prisma.timeEntry.findMany({
      where: recentTimeEntriesWhere,
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Increased to show more activity
    });

    // Get AI insights
    const aiInsights = await prisma.aIInsight.findMany({
      where: {
        userId,
        dismissed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Increased to show more insights
    });

    // Get running timer
    const runningTimer = await prisma.timeEntry.findFirst({
      where: {
        userId,
        isRunning: true,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
    });

    // Await all the promises
    const [
      pendingApprovalsCount,
      teamMembersCount,
      completedTasksCount,
      totalRevenueAmount,
    ] = await Promise.all([
      pendingApprovals,
      teamMembers,
      completedTasks,
      totalRevenue,
    ]);

    return NextResponse.json({
      totalHoursToday: todayHours._sum.duration || 0,
      totalHoursWeek: weekHours._sum.duration || 0,
      billableHoursWeek: billableHours._sum.duration || 0,
      activeProjects,
      pendingApprovals: pendingApprovalsCount,
      completedTasks: completedTasksCount,
      teamMembers: teamMembersCount,
      totalRevenue: totalRevenueAmount,
      recentTimeEntries,
      aiInsights,
      runningTimer,
      // Additional metadata for debugging
      metadata: {
        userRole,
        hasViewAllProjects: hasPermission(userRole, Permission.VIEW_ALL_PROJECTS),
        hasViewAssignedProjects: hasPermission(userRole, Permission.VIEW_ASSIGNED_PROJECTS),
        hasViewFinancialReports: hasPermission(userRole, Permission.VIEW_FINANCIAL_REPORTS),
        hasApproveTimesheet: hasPermission(userRole, Permission.APPROVE_TIMESHEET),
        hasViewAllUsers: hasPermission(userRole, Permission.VIEW_ALL_USERS),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

