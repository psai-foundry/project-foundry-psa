
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/admin/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
          include: {
            project: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
                client: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        timeEntries: {
          select: {
            id: true,
            date: true,
            duration: true,
            billable: true,
            project: {
              select: {
                name: true,
                code: true,
              },
            },
            task: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 10, // Recent 10 entries
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to update users, or users to update themselves (limited fields)
    const isSelfUpdate = session.user.id === params.id;
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isAdmin && !isSelfUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      name,
      password,
      role,
      department,
      hourlyRate,
      defaultBillRate,
      isActive,
    } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Self-update can only change limited fields
    if (isSelfUpdate && !isAdmin) {
      if (name !== undefined) updateData.name = name;
      if (department !== undefined) updateData.department = department;
      
      // Allow password change if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
    } else if (isAdmin) {
      // Admin can update all fields
      if (email !== undefined) updateData.email = email;
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
      if (defaultBillRate !== undefined) updateData.defaultBillRate = defaultBillRate;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Hash password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
    }

    // Check if email already exists (excluding current user)
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: params.id },
        },
      });

      if (emailExists) {
        return NextResponse.json({ 
          error: 'Email already exists' 
        }, { status: 400 });
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins to delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timeEntries: true,
            projectAssignments: true,
            approvals: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has time entries or assignments
    if (user._count.timeEntries > 0 || user._count.projectAssignments > 0 || user._count.approvals > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user with existing time entries, assignments, or approvals. Deactivate user instead.' 
      }, { status: 400 });
    }

    // Delete user and related data
    await prisma.$transaction([
      // Delete any remaining assignments
      prisma.projectAssignment.deleteMany({
        where: { userId: params.id },
      }),
      // Delete AI preferences
      prisma.aIPreference.deleteMany({
        where: { userId: params.id },
      }),
      // Delete the user
      prisma.user.delete({
        where: { id: params.id },
      }),
    ]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
