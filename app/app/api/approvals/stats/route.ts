
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, subDays, differenceInDays } from 'date-fns';

// GET /api/approvals/stats - Get approval statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has approval permissions
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    // Get submission counts by status
    const submissionCounts = await prisma.timesheetSubmission.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: {
        submittedAt: {
          gte: subDays(new Date(), 30), // Last 30 days
        },
      },
    });

    // Get average approval time
    const approvedSubmissions = await prisma.timesheetSubmission.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: {
          not: null,
        },
        submittedAt: {
          gte: subDays(new Date(), 30),
        },
      },
      select: {
        submittedAt: true,
        approvedAt: true,
      },
    });

    const avgApprovalTime = approvedSubmissions.length > 0
      ? approvedSubmissions.reduce((sum: number, sub: any) => {
          const timeDiff = sub.approvedAt!.getTime() - sub.submittedAt.getTime();
          return sum + (timeDiff / (1000 * 60 * 60)); // Convert to hours
        }, 0) / approvedSubmissions.length
      : 0;

    // Get total team hours this week
    const totalHoursThisWeek = await prisma.timeEntry.aggregate({
      _sum: {
        duration: true,
      },
      where: {
        date: {
          gte: currentWeekStart,
          lte: currentWeekEnd,
        },
      },
    });

    // Get active team members count
    const activeTeamMembers = await prisma.user.count({
      where: {
        isActive: true,
        role: {
          in: ['EMPLOYEE', 'MANAGER'],
        },
      },
    });

    // Calculate utilization rate (assuming 40 hours per week per person)
    const expectedHours = activeTeamMembers * 40;
    const actualHours = totalHoursThisWeek._sum.duration || 0;
    const utilizationRate = expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0;

    // Get pending approvals with aging data
    const pendingSubmissions = await prisma.timesheetSubmission.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        id: true,
        submittedAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate pending aging buckets
    const now = new Date();
    const pendingAging = {
      '0-2_days': 0,
      '3-5_days': 0,
      '6+_days': 0,
    };

    pendingSubmissions.forEach((submission: any) => {
      const daysPending = differenceInDays(now, submission.submittedAt);
      if (daysPending <= 2) {
        pendingAging['0-2_days']++;
      } else if (daysPending <= 5) {
        pendingAging['3-5_days']++;
      } else {
        pendingAging['6+_days']++;
      }
    });

    // Get manager approval rates
    const managerStats = await prisma.timesheetSubmission.groupBy({
      by: ['approvedBy'],
      where: {
        status: 'APPROVED',
        approvedBy: {
          not: null,
        },
        submittedAt: {
          gte: subDays(new Date(), 30),
        },
      },
      _count: {
        id: true,
      },
    });

    // Get manager names
    const managerApprovals = await Promise.all(
      managerStats.map(async (stat: any) => {
        const manager = await prisma.user.findUnique({
          where: { id: stat.approvedBy! },
          select: { name: true },
        });
        return {
          managerId: stat.approvedBy,
          managerName: manager?.name || 'Unknown',
          approvalCount: stat._count.id,
        };
      })
    );

    // Get bottleneck details (slow approval times by manager)
    const bottleneckData = await prisma.timesheetSubmission.findMany({
      where: {
        status: 'APPROVED',
        approvedAt: {
          not: null,
        },
        submittedAt: {
          gte: subDays(new Date(), 30),
        },
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const managerBottlenecks = bottleneckData.reduce((acc: any, submission: typeof bottleneckData[0]) => {
      if (submission.approver) {
        const approvalTime = (submission.approvedAt!.getTime() - submission.submittedAt.getTime()) / (1000 * 60 * 60);
        if (!acc[submission.approver.id]) {
          acc[submission.approver.id] = {
            managerId: submission.approver.id,
            managerName: submission.approver.name,
            totalApprovals: 0,
            totalApprovalTime: 0,
            avgApprovalTime: 0,
          };
        }
        acc[submission.approver.id].totalApprovals++;
        acc[submission.approver.id].totalApprovalTime += approvalTime;
        acc[submission.approver.id].avgApprovalTime = 
          acc[submission.approver.id].totalApprovalTime / acc[submission.approver.id].totalApprovals;
      }
      return acc;
    }, {});

    // Get recent activity
    const recentActivity = await prisma.timesheetSubmission.findMany({
      where: {
        submittedAt: {
          gte: subDays(new Date(), 7), // Last 7 days
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 10,
    });

    const stats = {
      submissionCounts: submissionCounts.reduce((acc: Record<string, number>, item: typeof submissionCounts[0]) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      avgApprovalTime: Math.round(avgApprovalTime * 10) / 10, // Round to 1 decimal
      totalHoursThisWeek: totalHoursThisWeek._sum.duration || 0,
      activeTeamMembers,
      utilizationRate: Math.round(utilizationRate),
      recentActivity,
      // New velocity data
      pendingAging,
      managerApprovals,
      bottlenecks: Object.values(managerBottlenecks).sort((a: any, b: any) => b.avgApprovalTime - a.avgApprovalTime),
      velocityMetrics: {
        avgApprovalTimeHours: Math.round(avgApprovalTime * 10) / 10,
        totalPending: pendingSubmissions.length,
        urgentCount: pendingAging['6+_days'],
      },
    };

    return NextResponse.json({
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
