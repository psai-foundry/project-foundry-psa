
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/projects - Get all projects for admin management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to access project management
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const clientId = searchParams.get('clientId');

    const where: any = {};
    
    if (!includeInactive) {
      where.status = {
        not: 'CANCELLED'
      };
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        portfolio: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          select: {
            id: true,
            name: true,
            status: true,
            estimatedHours: true,
          },
          where: {
            status: {
              not: 'COMPLETED'
            }
          }
        },
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
            assignments: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      data: projects,
      summary: {
        total: projects.length,
        active: projects.filter((p: any) => p.status === 'ACTIVE').length,
        completed: projects.filter((p: any) => p.status === 'COMPLETED').length,
        onHold: projects.filter((p: any) => p.status === 'ON_HOLD').length,
        cancelled: projects.filter((p: any) => p.status === 'CANCELLED').length,
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to create projects
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      clientId,
      portfolioId,
      programId,
      status = 'ACTIVE',
      budget,
      startDate,
      endDate,
      billable = true,
      defaultBillRate,
    } = body;

    // Validate required fields
    if (!name || !code || !clientId) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, code, clientId' 
      }, { status: 400 });
    }

    // Check if project code already exists
    const existingProject = await prisma.project.findUnique({
      where: { code },
    });

    if (existingProject) {
      return NextResponse.json({ 
        error: 'Project code already exists' 
      }, { status: 400 });
    }

    // Validate client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        clientId,
        portfolioId,
        programId,
        status,
        budget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        billable,
        defaultBillRate,
      },
      include: {
        client: true,
        portfolio: true,
        program: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: true,
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
            assignments: true,
          },
        },
      },
    });

    // Auto-assign the creating user as project manager if they're a manager
    if (session.user.role === 'MANAGER') {
      await prisma.projectAssignment.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          role: 'Project Manager',
          billRate: defaultBillRate || 0,
        },
      });
    }

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
