
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects - Get projects with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeTasks = searchParams.get('includeTasks') === 'true';
    const includeClient = searchParams.get('includeClient') === 'true';
    const includeAssignments = searchParams.get('includeAssignments') === 'true';

    // Build filter conditions based on user role
    const where: any = {};

    // Role-based access control
    if (!['ADMIN', 'PARTNER', 'PRINCIPAL', 'MANAGER', 'PRACTICE_LEAD'].includes(session.user.role)) {
      // Regular employees can only see projects they're assigned to
      where.assignments = {
        some: {
          userId: session.user.id,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (startDate || endDate) {
      where.AND = [];
      
      if (startDate) {
        where.AND.push({
          OR: [
            { startDate: { gte: new Date(startDate) } },
            { startDate: null },
          ],
        });
      }
      
      if (endDate) {
        where.AND.push({
          OR: [
            { endDate: { lte: new Date(endDate) } },
            { endDate: null },
          ],
        });
      }
    }

    // Build include conditions
    const include: any = {};
    
    if (includeClient) {
      include.client = {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      };
    }

    if (includeTasks) {
      include.tasks = {
        select: {
          id: true,
          name: true,
          status: true,
          estimatedHours: true,
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    if (includeAssignments) {
      include.assignments = {
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
        orderBy: { createdAt: 'asc' },
      };
    }

    // Get projects with pagination
    const projects = await prisma.project.findMany({
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
    const total = await prisma.project.count({ where });

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN, PARTNER, PRINCIPAL, MANAGER, and PRACTICE_LEAD can create projects
    if (!['ADMIN', 'PARTNER', 'PRINCIPAL', 'MANAGER', 'PRACTICE_LEAD'].includes(session.user.role)) {
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
      assignments = [],
      initialTasks = [],
    } = body;

    // Validate required fields
    if (!name || !code || !clientId) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, code, clientId' 
      }, { status: 400 });
    }

    // Check if code is unique
    const existingProject = await prisma.project.findFirst({
      where: { code },
    });

    if (existingProject) {
      return NextResponse.json({ 
        error: 'Project code must be unique' 
      }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create project with assignments and tasks
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
        assignments: {
          create: assignments?.map((assignment: any) => ({
            userId: assignment.userId,
            role: assignment.role,
            billRate: assignment.billRate,
          })) || [],
        },
        tasks: {
          create: initialTasks?.map((task: any) => ({
            name: task.name,
            description: task.description,
            status: task.status || 'OPEN',
            estimatedHours: task.estimatedHours,
            billable: task.billable !== undefined ? task.billable : true,
          })) || [],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            industry: true,
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
        tasks: true,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
