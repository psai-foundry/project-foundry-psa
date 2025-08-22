

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/resources - Fetch all resources
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resources = await prisma.resource.findMany({
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
      orderBy: {
        name: 'asc',
      },
    });

    // Transform database fields to match interface
    const transformedResources = resources.map(resource => ({
      id: resource.id,
      name: resource.name,
      function: resource.function,
      company: resource.company,
      employmentType: resource.employmentType,
      region: resource.region,
      country: resource.country,
      skills: resource.skills || [],
      email: resource.email,
      phone: resource.phone,
      avatar: resource.avatar,
      annualSalary: resource.annualSalary,
      workingDaysPerWeek: resource.workingDaysPerWeek,
      bauAllocationPercentage: resource.bauAllocationPercentage,
      projectAllocationPercentage: resource.projectAllocationPercentage,
      resourceOwner: resource.resourceOwner,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    }));

    return NextResponse.json({ resources: transformedResources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      function: functionRole,
      company,
      employmentType,
      region,
      country,
      skills = [],
      email,
      phone,
      avatar,
      annualSalary,
      workingDaysPerWeek = 5,
      bauAllocationPercentage = 0,
      projectAllocationPercentage = 0,
      resourceOwnerId,
    } = body;

    // Validate required fields
    if (!name || !functionRole || !company || !employmentType || !region || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate employment type
    const validEmploymentTypes = ['STAFF', 'CONTRACTOR', 'AGENCY', 'PROJECT_SERVICES'];
    if (!validEmploymentTypes.includes(employmentType)) {
      return NextResponse.json(
        { error: 'Invalid employment type' },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        function: functionRole,
        company,
        employmentType,
        region,
        country,
        skills,
        email,
        phone,
        avatar,
        annualSalary,
        workingDaysPerWeek,
        bauAllocationPercentage,
        projectAllocationPercentage,
        resourceOwnerId,
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

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

