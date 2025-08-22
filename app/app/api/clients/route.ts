
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clients - Get all clients with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control - only ADMIN and MANAGER can view all clients
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeContacts = searchParams.get('includeContacts') === 'true';
    const includeProjects = searchParams.get('includeProjects') === 'true';

    // Build filter conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' };
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Build include conditions
    const include: any = {};
    if (includeContacts) {
      include.contacts = {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
      };
    }
    if (includeProjects) {
      include.projects = {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where,
      include,
      orderBy: [
        { name: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get total count for pagination
    const total = await prisma.client.count({ where });

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create clients
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
      isActive = true,
      contacts = [],
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 });
    }

    // Create client with contacts
    const client = await prisma.client.create({
      data: {
        name,
        description,
        industry,
        website,
        email,
        phone,
        address,
        isActive,
        contacts: {
          create: contacts?.map((contact: any) => ({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
            isPrimary: contact.isPrimary || false,
          })) || [],
        },
      },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
        },
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
