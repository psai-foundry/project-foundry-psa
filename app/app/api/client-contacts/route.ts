
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/client-contacts - Get client contacts with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('search');
    const isPrimary = searchParams.get('isPrimary');
    const isActive = searchParams.get('isActive');

    // Build filter conditions
    const where: any = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPrimary !== null) {
      where.isPrimary = isPrimary === 'true';
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const contacts = await prisma.clientContact.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error('Error fetching client contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/client-contacts - Create new client contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create client contacts
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      firstName,
      lastName,
      email,
      phone,
      role,
      isPrimary = false,
      isActive = true,
    } = body;

    // Validate required fields
    if (!clientId || !firstName || !lastName) {
      return NextResponse.json({ 
        error: 'Missing required fields: clientId, firstName, lastName' 
      }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // If setting as primary, unset other primary contacts for this client
    if (isPrimary) {
      await prisma.clientContact.updateMany({
        where: { 
          clientId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.create({
      data: {
        clientId,
        firstName,
        lastName,
        email,
        phone,
        role,
        isPrimary,
        isActive,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    console.error('Error creating client contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
