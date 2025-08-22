
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/tasks - Get tasks with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeProject = searchParams.get('includeProject') === 'true';
    const includeTimeEntries = searchParams.get('includeTimeEntries') === 'true';

    // Build filter conditions based on user role
    const where: any = {};

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      // Regular employees can only see tasks from projects they're assigned to
      where.project = {
        assignments: {
          some: {
            userId: session.user.id,
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (assignedToMe) {
      // For tasks assigned to user (via time entries or direct assignment)
      where.OR = [
        {
          timeEntries: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ];
    }

    // Build include conditions
    const include: any = {};
    
    if (includeProject) {
      include.project = {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      };
    }

    if (includeTimeEntries) {
      include.timeEntries = {
        select: {
          id: true,
          duration: true,
          date: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: 5, // Latest 5 entries
      };
    }

    // Get tasks with pagination
    const tasks = await prisma.task.findMany({
      where,
      include,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.task.count({ where });

    return NextResponse.json({
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create tasks
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      projectId,
      status = 'OPEN',
      estimatedHours,
      billable = true,
    } = body;

    // Validate required fields
    if (!name || !projectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, projectId' 
      }, { status: 400 });
    }

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        projectId,
        status,
        estimatedHours,
        billable,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
