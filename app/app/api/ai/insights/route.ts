
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, subDays, subWeeks } from 'date-fns';

// GET /api/ai/insights - Get AI insights for timesheet data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const weekStart = searchParams.get('weekStart');

    // Role-based access control
    if (userId !== session.user.id && !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's AI preferences
    const aiPreferences = await prisma.aIPreference.findUnique({
      where: { userId },
    });

    if (!aiPreferences?.enableInsights) {
      return NextResponse.json({ 
        data: { 
          insights: [],
          stats: null,
          message: 'AI insights are disabled' 
        } 
      });
    }

    // Get existing insights
    const insights = await prisma.aIInsight.findMany({
      where: {
        userId,
        dismissed: false,
      },
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    // Generate stats for the specified week or current week
    const targetWeekStart = weekStart ? 
      startOfWeek(new Date(weekStart), { weekStartsOn: 1 }) :
      startOfWeek(new Date(), { weekStartsOn: 1 });
    const targetWeekEnd = endOfWeek(targetWeekStart, { weekStartsOn: 1 });

    // Get current week's time entries
    const currentWeekEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: targetWeekStart,
          lte: targetWeekEnd,
        },
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

    // Get previous week's time entries for comparison
    const previousWeekStart = subWeeks(targetWeekStart, 1);
    const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });

    const previousWeekEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: previousWeekStart,
          lte: previousWeekEnd,
        },
      },
    });

    // Calculate statistics
    const currentWeekHours = currentWeekEntries.reduce((sum: number, entry: typeof currentWeekEntries[0]) => sum + entry.duration, 0);
    const previousWeekHours = previousWeekEntries.reduce((sum: number, entry: typeof previousWeekEntries[0]) => sum + entry.duration, 0);
    const hoursChange = currentWeekHours - previousWeekHours;

    const currentWeekBillableHours = currentWeekEntries.filter((e: typeof currentWeekEntries[0]) => e.billable).reduce((sum: number, entry: typeof currentWeekEntries[0]) => sum + entry.duration, 0);
    const previousWeekBillableHours = previousWeekEntries.filter((e: typeof previousWeekEntries[0]) => e.billable).reduce((sum: number, entry: typeof previousWeekEntries[0]) => sum + entry.duration, 0);

    const currentProductivity = currentWeekHours > 0 ? (currentWeekBillableHours / currentWeekHours) * 100 : 0;
    const previousProductivity = previousWeekHours > 0 ? (previousWeekBillableHours / previousWeekHours) * 100 : 0;
    const productivityChange = currentProductivity - previousProductivity;

    const utilization = Math.min((currentWeekHours / 40) * 100, 100); // Assuming 40-hour work week
    const projectCount = new Set(currentWeekEntries.map((e: typeof currentWeekEntries[0]) => e.projectId)).size;

    const stats = {
      totalHours: currentWeekHours,
      hoursChange,
      productivity: currentProductivity,
      productivityChange,
      utilization,
      projectCount,
    };

    // Generate AI insights if we have enough data
    if (insights.length === 0 && currentWeekEntries.length > 0) {
      await generateAIInsights(userId, currentWeekEntries, previousWeekEntries);
    }

    return NextResponse.json({
      data: {
        insights,
        stats,
        weekStart: targetWeekStart,
        weekEnd: targetWeekEnd,
      },
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate AI insights
async function generateAIInsights(userId: string, currentWeekEntries: any[], previousWeekEntries: any[]) {
  try {
    const insights = [];

    // Productivity pattern analysis
    const currentHours = currentWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const previousHours = previousWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);

    if (currentHours > previousHours * 1.2) {
      insights.push({
        userId,
        type: 'PRODUCTIVITY_PATTERN' as const,
        title: 'Increased Productivity Detected',
        description: `You've logged ${(currentHours - previousHours).toFixed(1)} more hours this week than last week. Great job maintaining momentum!`,
        confidence: 0.8,
        actionable: true,
      });
    } else if (currentHours < previousHours * 0.8) {
      insights.push({
        userId,
        type: 'PRODUCTIVITY_PATTERN' as const,
        title: 'Decreased Activity This Week',
        description: `Your time tracking is down ${(previousHours - currentHours).toFixed(1)} hours from last week. Consider reviewing your schedule.`,
        confidence: 0.7,
        actionable: true,
      });
    }

    // Workload balance analysis
    const projectHours = currentWeekEntries.reduce((acc, entry) => {
      acc[entry.projectId] = (acc[entry.projectId] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>);

    const projects = Object.keys(projectHours);
    if (projects.length > 0) {
      const maxProjectHours = Math.max(...Object.values(projectHours) as number[]);
      const totalHours = currentHours;
      
      if (maxProjectHours > totalHours * 0.8) {
        insights.push({
          userId,
          type: 'WORKLOAD_BALANCE' as const,
          title: 'Project Concentration Alert',
          description: `${((maxProjectHours / totalHours) * 100).toFixed(0)}% of your time is on one project. Consider diversifying your workload.`,
          confidence: 0.6,
          actionable: true,
        });
      }
    }

    // Efficiency trend analysis
    const avgDailyHours = currentHours / 7;
    if (avgDailyHours > 10) {
      insights.push({
        userId,
        type: 'BURNOUT_WARNING' as const,
        title: 'High Workload Warning',
        description: `You're averaging ${avgDailyHours.toFixed(1)} hours per day. Consider taking breaks to maintain productivity.`,
        confidence: 0.9,
        actionable: true,
      });
    }

    // Save insights to database
    for (const insight of insights) {
      await prisma.aIInsight.create({
        data: insight,
      });
    }
  } catch (error) {
    console.error('Error generating AI insights:', error);
    // Don't throw error here, as this is a background task
  }
}
