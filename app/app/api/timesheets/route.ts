
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, parseISO, format } from 'date-fns';

// GET /api/timesheets - Get timesheet entries with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Role-based access control
    if (userId !== session.user.id && !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build filter conditions
    const where: any = {
      userId: userId,
    };

    if (weekStart && weekEnd) {
      where.date = {
        gte: parseISO(weekStart),
        lte: parseISO(weekEnd),
      };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    // Get timesheet entries with related data
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
            portfolio: true,
            program: true,
          },
        },
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.timeEntry.count({ where });

    // Group entries by week for easier consumption
    const entriesByWeek = timeEntries.reduce((acc, entry) => {
      const weekKey = format(startOfWeek(entry.date), 'yyyy-MM-dd');
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(entry);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate weekly totals
    const weeklyTotals = Object.keys(entriesByWeek).map(weekKey => {
      const entries = entriesByWeek[weekKey];
      const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
      const billableHours = entries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0);
      
      return {
        weekStart: weekKey,
        weekEnd: format(endOfWeek(parseISO(weekKey)), 'yyyy-MM-dd'),
        totalHours,
        billableHours,
        entryCount: entries.length,
        entries,
      };
    });

    return NextResponse.json({
      data: {
        timeEntries,
        entriesByWeek,
        weeklyTotals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching timesheet entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/timesheets - Create new timesheet entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      taskId,
      date,
      startTime,
      endTime,
      duration,
      description,
      billable = true,
      billRate,
      aiSuggested = false,
      aiCategory,
      aiConfidence,
    } = body;

    // Validate required fields
    if (!projectId || !date || !duration) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, date, duration' 
      }, { status: 400 });
    }

    // Validate project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        assignments: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Allow access for ADMIN/MANAGER or if user is assigned to project
    const hasAccess = ['ADMIN', 'MANAGER'].includes(session.user.role) || 
                     project.assignments.length > 0;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied - not assigned to project' }, { status: 403 });
    }

    // Validate task if provided
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId: projectId,
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        projectId,
        taskId,
        date: parseISO(date),
        startTime: startTime ? parseISO(startTime) : null,
        endTime: endTime ? parseISO(endTime) : null,
        duration,
        description,
        billable,
        billRate: billRate || project.defaultBillRate,
        aiSuggested,
        aiCategory,
        aiConfidence,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update time patterns for AI learning
    if (aiSuggested) {
      await updateTimePatterns(session.user.id, projectId, taskId, duration);
    }

    return NextResponse.json({ data: timeEntry }, { status: 201 });
  } catch (error) {
    console.error('Error creating timesheet entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to update time patterns for AI learning
async function updateTimePatterns(userId: string, projectId: string, taskId: string | null, duration: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17) timeOfDay = 'evening';

  try {
    // Find existing pattern or create new one
    const existingPattern = await prisma.timePattern.findFirst({
      where: {
        userId,
        projectId,
        taskId,
        patternType: 'DAILY_ROUTINE',
        dayOfWeek,
        timeOfDay,
      },
    });

    if (existingPattern) {
      // Update existing pattern
      await prisma.timePattern.update({
        where: { id: existingPattern.id },
        data: {
          frequency: existingPattern.frequency + 1,
          duration: (existingPattern.duration || 0 + duration) / 2, // Average duration
          confidence: Math.min(existingPattern.confidence + 0.1, 1.0),
          lastUsed: now,
        },
      });
    } else {
      // Create new pattern
      await prisma.timePattern.create({
        data: {
          userId,
          projectId,
          taskId,
          patternType: 'DAILY_ROUTINE',
          dayOfWeek,
          timeOfDay,
          duration,
          frequency: 1,
          confidence: 0.5,
          lastUsed: now,
        },
      });
    }
  } catch (error) {
    console.error('Error updating time patterns:', error);
    // Don't throw error here, as this is a background task
  }
}
