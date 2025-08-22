

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/capacity-allocations - Fetch capacity allocations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const resourceId = url.searchParams.get('resourceId');
    const projectId = url.searchParams.get('projectId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause based on filters
    const where: any = {};
    if (resourceId) where.resourceId = resourceId;
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.weekStartDate = {};
      if (startDate) where.weekStartDate.gte = new Date(startDate);
      if (endDate) where.weekStartDate.lte = new Date(endDate);
    }

    const capacityAllocations = await prisma.capacityAllocation.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            function: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { resourceId: 'asc' },
        { weekStartDate: 'asc' },
      ],
    });

    return NextResponse.json({ capacityAllocations });
  } catch (error) {
    console.error('Error fetching capacity allocations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/capacity-allocations - Update or create capacity allocation
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resourceId, projectId, weekStartDate, allocation, type = 'FORECAST' } = body;

    // Validate required fields
    if (!resourceId || !weekStartDate || allocation === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceId, weekStartDate, allocation' },
        { status: 400 }
      );
    }

    // Validate allocation value (0-5 days)
    if (allocation < 0 || allocation > 5) {
      return NextResponse.json(
        { error: 'Allocation must be between 0 and 5 days' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['ACTUAL', 'FORECAST'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either ACTUAL or FORECAST' },
        { status: 400 }
      );
    }

    // Check if resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if project exists (if projectId provided)
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const weekStart = new Date(weekStartDate);

    // Try to find existing capacity allocation
    const existingAllocation = await prisma.capacityAllocation.findFirst({
      where: {
        resourceId,
        projectId,
        weekStartDate: weekStart,
        type,
      },
    });

    let capacityAllocation;

    if (existingAllocation) {
      // Update existing allocation
      capacityAllocation = await prisma.capacityAllocation.update({
        where: { id: existingAllocation.id },
        data: { allocation },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              function: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });
    } else {
      // Create new allocation
      capacityAllocation = await prisma.capacityAllocation.create({
        data: {
          resourceId,
          projectId,
          weekStartDate: weekStart,
          allocation,
          type,
        },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              function: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ capacityAllocation });
  } catch (error) {
    console.error('Error updating capacity allocation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/capacity-allocations - Delete capacity allocations
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resourceId, projectId, weekStartDate, type } = body;

    // Build where clause
    const where: any = {};
    if (resourceId) where.resourceId = resourceId;
    if (projectId) where.projectId = projectId;
    if (weekStartDate) where.weekStartDate = new Date(weekStartDate);
    if (type) where.type = type;

    // Delete matching capacity allocations
    const result = await prisma.capacityAllocation.deleteMany({
      where,
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    });
  } catch (error) {
    console.error('Error deleting capacity allocations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

