

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// PATCH /api/resource-owners/[id] - Update a resource owner
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

    // Validate resource owner exists
    const existingOwner = await prisma.resourceOwner.findUnique({
      where: { id },
    });

    if (!existingOwner) {
      return NextResponse.json({ error: 'Resource owner not found' }, { status: 404 });
    }

    // Update the resource owner
    const updatedOwner = await prisma.resourceOwner.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ resourceOwner: updatedOwner });
  } catch (error) {
    console.error('Error updating resource owner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/resource-owners/[id] - Delete a resource owner
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

    // Validate resource owner exists
    const existingOwner = await prisma.resourceOwner.findUnique({
      where: { id },
    });

    if (!existingOwner) {
      return NextResponse.json({ error: 'Resource owner not found' }, { status: 404 });
    }

    // Check for resources assigned to this owner
    const assignedResources = await prisma.resource.findMany({
      where: { resourceOwnerId: id },
    });

    if (assignedResources.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete resource owner with assigned resources' },
        { status: 400 }
      );
    }

    // Delete the resource owner
    await prisma.resourceOwner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resource owner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

