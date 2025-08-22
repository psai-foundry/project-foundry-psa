
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfWeek, endOfWeek, subDays } from 'date-fns';

// GET /api/timesheets/submissions - Get timesheet submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Build filter conditions
    const where: any = {};

    // Role-based filtering
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      where.userId = session.user.id;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // Get submissions with user and entry details
    const submissions = await prisma.timesheetSubmission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        entries: {
          include: {
            timeEntry: {
              include: {
                project: {
                  include: {
                    client: true,
                  },
                },
                task: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { submittedAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.timesheetSubmission.count({ where });

    return NextResponse.json({
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching timesheet submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
