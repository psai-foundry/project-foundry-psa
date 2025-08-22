
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/client-contacts/[id] - Get specific client contact
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

    const contact = await prisma.clientContact.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Client contact not found' }, { status: 404 });
    }

    return NextResponse.json({ data: contact });
  } catch (error) {
    console.error('Error fetching client contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/client-contacts/[id] - Update client contact
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update client contacts
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      isPrimary,
      isActive,
    } = body;

    // Check if contact exists
    const existingContact = await prisma.clientContact.findUnique({
      where: { id: params.id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Client contact not found' }, { status: 404 });
    }

    // If setting as primary, unset other primary contacts for this client
    if (isPrimary && !existingContact.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { 
          clientId: existingContact.clientId,
          isPrimary: true,
          id: { not: params.id },
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.clientContact.update({
      where: { id: params.id },
      data: {
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

    return NextResponse.json({ data: contact });
  } catch (error) {
    console.error('Error updating client contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/client-contacts/[id] - Delete client contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can delete client contacts
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if contact exists
    const existingContact = await prisma.clientContact.findUnique({
      where: { id: params.id },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Client contact not found' }, { status: 404 });
    }

    // Soft delete by deactivating
    const contact = await prisma.clientContact.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ 
      message: 'Client contact deactivated successfully',
      data: contact 
    });
  } catch (error) {
    console.error('Error deleting client contact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
