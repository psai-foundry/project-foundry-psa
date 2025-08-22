

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/resource-owners - Fetch all resource owners
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resourceOwners = await prisma.resourceOwner.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ resourceOwners });
  } catch (error) {
    console.error('Error fetching resource owners:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/resource-owners - Create a new resource owner
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, department, role, phone } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const resourceOwner = await prisma.resourceOwner.create({
      data: {
        name,
        email,
        department,
        role,
        phone,
      },
    });

    return NextResponse.json({ resourceOwner }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource owner:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

