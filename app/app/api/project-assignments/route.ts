
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/project-assignments - Get project assignments with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const includeProject = searchParams.get('includeProject') === 'true';
    const includeUser = searchParams.get('includeUser') === 'true';

    // Build filter conditions based on user role
    const where: any = {};

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      // Regular employees can only see assignments for projects they're assigned to
      where.OR = [
        { userId: session.user.id }, // Their own assignments
        {
          project: {
            assignments: {
              some: {
                userId: session.user.id,
              },
            },
          },
        }, // Other assignments in their projects
      ];
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (userId) {
      where.userId = userId;
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

    if (includeUser) {
      include.user = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          hourlyRate: true,
        },
      };
    }

    const assignments = await prisma.projectAssignment.findMany({
      where,
      include,
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error('Error fetching project assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/project-assignments - Create new project assignment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create project assignments
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      projectId,
      role,
      billRate,
    } = body;

    // Validate required fields
    if (!userId || !projectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, projectId' 
      }, { status: 400 });
    }

    // Verify user and project exist
    const [user, project] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.project.findUnique({ where: { id: projectId } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.projectAssignment.findFirst({
      where: {
        userId,
        projectId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'User is already assigned to this project' 
      }, { status: 400 });
    }

    const assignment = await prisma.projectAssignment.create({
      data: {
        userId,
        projectId,
        role,
        billRate: billRate || user.defaultBillRate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
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

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating project assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
