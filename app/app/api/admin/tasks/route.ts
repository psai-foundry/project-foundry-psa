
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/tasks - Get all tasks for admin management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to access task management
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const billable = searchParams.get('billable');

    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (billable !== null && billable !== 'ALL') {
      where.billable = billable === 'true';
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            timeEntries: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      data: tasks,
      summary: {
        total: tasks.length,
        open: tasks.filter((t: any) => t.status === 'OPEN').length,
        inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter((t: any) => t.status === 'COMPLETED').length,
        onHold: tasks.filter((t: any) => t.status === 'ON_HOLD').length,
        billable: tasks.filter((t: any) => t.billable).length,
        nonBillable: tasks.filter((t: any) => !t.billable).length,
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to create tasks
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

    // Create task
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
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            timeEntries: true,
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
