
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, parseISO, format, eachDayOfInterval } from 'date-fns';

// GET /api/timesheets/weekly - Get weekly timesheet view
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    const userId = searchParams.get('userId') || session.user.id;

    // Role-based access control
    if (userId !== session.user.id && !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Default to current week if no week specified
    const targetDate = weekStart ? parseISO(weekStart) : new Date();
    const weekStartDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEndDate = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday

    // Get all time entries for the week
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      },
      include: {
        project: {
          include: {
            client: true,
            portfolio: true,
            program: true,
          },
        },
        task: true,
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Generate all days of the week
    const weekDays = eachDayOfInterval({
      start: weekStartDate,
      end: weekEndDate,
    });

    // Group entries by day
    const entriesByDay = weekDays.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayEntries = timeEntries.filter(entry => 
        format(entry.date, 'yyyy-MM-dd') === dayKey
      );
      
      const totalHours = dayEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const billableHours = dayEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0);

      return {
        date: dayKey,
        dayName: format(day, 'EEEE'),
        entries: dayEntries,
        totalHours,
        billableHours,
        entryCount: dayEntries.length,
      };
    });

    // Calculate weekly totals
    const weeklyTotals = {
      totalHours: timeEntries.reduce((sum, entry) => sum + entry.duration, 0),
      billableHours: timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0),
      entryCount: timeEntries.length,
      projectCount: new Set(timeEntries.map(e => e.projectId)).size,
    };

    // Check if week has been submitted
    const weekSubmission = await prisma.timesheetSubmission.findFirst({
      where: {
        userId: userId,
        weekStartDate: weekStartDate,
      },
    });

    return NextResponse.json({
      data: {
        weekStart: format(weekStartDate, 'yyyy-MM-dd'),
        weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
        entriesByDay,
        weeklyTotals,
        submission: weekSubmission,
        canEdit: weekSubmission?.status !== 'APPROVED',
      },
    });
  } catch (error) {
    console.error('Error fetching weekly timesheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/timesheets/weekly - Submit weekly timesheet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart, entries } = body;

    if (!weekStart) {
      return NextResponse.json({ error: 'Week start date is required' }, { status: 400 });
    }

    const weekStartDate = parseISO(weekStart);
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    // Check if week has already been submitted
    const existingSubmission = await prisma.timesheetSubmission.findFirst({
      where: {
        userId: session.user.id,
        weekStartDate: weekStartDate,
      },
    });

    if (existingSubmission) {
      return NextResponse.json({ 
        error: 'Week has already been submitted' 
      }, { status: 400 });
    }

    // Get all time entries for the week
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
        status: 'DRAFT',
      },
    });

    if (timeEntries.length === 0) {
      return NextResponse.json({ 
        error: 'No time entries found for this week' 
      }, { status: 400 });
    }

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalBillable = timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0);

    // Create submission record
    const submission = await prisma.timesheetSubmission.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStartDate,
        weekEndDate: weekEndDate,
        totalHours,
        totalBillable,
        status: 'PENDING',
      },
    });

    // Create submission entries
    const submissionEntries = await Promise.all(
      timeEntries.map(entry =>
        prisma.timesheetSubmissionEntry.create({
          data: {
            submissionId: submission.id,
            timeEntryId: entry.id,
          },
        })
      )
    );

    // Update time entries status to submitted
    await prisma.timeEntry.updateMany({
      where: {
        id: {
          in: timeEntries.map(e => e.id),
        },
      },
      data: {
        status: 'SUBMITTED',
      },
    });

    return NextResponse.json({
      data: {
        submission,
        entryCount: timeEntries.length,
        totalHours,
        totalBillable,
      },
      message: 'Weekly timesheet submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting weekly timesheet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
