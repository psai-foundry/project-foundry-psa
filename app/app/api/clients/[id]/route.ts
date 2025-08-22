
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clients/[id] - Get specific client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
        },
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            startDate: true,
            endDate: true,
            budget: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update clients
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      industry,
      website,
      email,
      phone,
      address,
      isActive,
    } = body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update client
    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name,
        description,
        industry,
        website,
        email,
        phone,
        address,
        isActive,
      },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
        },
      },
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Delete (deactivate) client
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can delete clients
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        projects: true,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if client has active projects
    const activeProjects = existingClient.projects.filter((p: typeof existingClient.projects[0]) => p.status === 'ACTIVE');
    if (activeProjects.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete client with active projects. Please complete or cancel all active projects first.' 
      }, { status: 400 });
    }

    // Soft delete by deactivating
    const client = await prisma.client.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ 
      message: 'Client deactivated successfully',
      data: client 
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
