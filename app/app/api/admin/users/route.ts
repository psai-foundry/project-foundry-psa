
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Get all users for admin management
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and managers to access user management
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const role = searchParams.get('role');

    const where: any = {};
    
    if (!includeInactive) {
      where.isActive = true;
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        hourlyRate: true,
        defaultBillRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectAssignments: {
          select: {
            id: true,
            role: true,
            project: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            projectAssignments: true,
            timeEntries: true,
            approvals: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      data: users,
      summary: {
        total: users.length,
        active: users.filter((u: typeof users[0]) => u.isActive).length,
        inactive: users.filter((u: typeof users[0]) => !u.isActive).length,
        admins: users.filter((u: typeof users[0]) => u.role === 'ADMIN').length,
        partners: users.filter((u: typeof users[0]) => u.role === 'PARTNER').length,
        principals: users.filter((u: typeof users[0]) => u.role === 'PRINCIPAL').length,
        managers: users.filter((u: typeof users[0]) => u.role === 'MANAGER').length,
        practiceLeads: users.filter((u: typeof users[0]) => u.role === 'PRACTICE_LEAD').length,
        seniorConsultants: users.filter((u: typeof users[0]) => u.role === 'SENIOR_CONSULTANT').length,
        juniorConsultants: users.filter((u: typeof users[0]) => u.role === 'JUNIOR_CONSULTANT').length,
        contractors: users.filter((u: typeof users[0]) => u.role === 'CONTRACTOR').length,
        employees: users.filter((u: typeof users[0]) => u.role === 'EMPLOYEE').length,
        clientUsers: users.filter((u: typeof users[0]) => u.role === 'CLIENT_USER').length,
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to create users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      name,
      password,
      role = 'EMPLOYEE',
      department,
      hourlyRate,
      defaultBillRate,
      isActive = true,
    } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, name, password' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Check if user with same email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        department,
        hourlyRate,
        defaultBillRate,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        hourlyRate: true,
        defaultBillRate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectAssignments: {
          select: {
            id: true,
            role: true,
            project: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            projectAssignments: true,
            timeEntries: true,
            approvals: true,
          },
        },
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
