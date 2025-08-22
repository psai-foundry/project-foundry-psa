
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/clients - Get all clients for admin management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to access client management
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    
    if (!includeInactive) {
      where.isActive = true;
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      data: clients,
      summary: {
        total: clients.length,
        active: clients.filter((c: any) => c.isActive).length,
        inactive: clients.filter((c: any) => !c.isActive).length,
        totalProjects: clients.reduce((sum: number, c: any) => sum + c._count.projects, 0),
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to create clients
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      isActive = true,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Client name is required' 
      }, { status: 400 });
    }

    // Check if client with same name already exists
    const existingClient = await prisma.client.findFirst({
      where: { 
        name: {
          equals: name,
          mode: 'insensitive'
        }
      },
    });

    if (existingClient) {
      return NextResponse.json({ 
        error: 'Client with this name already exists' 
      }, { status: 400 });
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        isActive,
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
