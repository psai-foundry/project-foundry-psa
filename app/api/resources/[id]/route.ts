

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// PATCH /api/resources/[id] - Update a resource
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Validate resource exists
    const existingResource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Update the resource
    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        ...body,
        // Rename function field if provided
        ...(body.function && { function: body.function }),
      },
      include: {
        resourceOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ resource: updatedResource });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/resources/[id] - Delete a resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Validate resource exists
    const existingResource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!existingResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check for existing allocations before deletion
    const existingAllocations = await prisma.resourceAllocation.findMany({
      where: { resourceId: id },
    });

    if (existingAllocations.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete resource with existing allocations' },
        { status: 400 }
      );
    }

    // Delete the resource
    await prisma.resource.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

