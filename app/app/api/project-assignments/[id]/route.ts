
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/project-assignments/[id] - Get specific project assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build access control query
    const where: any = { id: params.id };

    // Role-based access control
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      where.OR = [
        { userId: session.user.id }, // Their own assignment
        {
          project: {
            assignments: {
              some: {
                userId: session.user.id,
              },
            },
          },
        }, // Assignment in their project
      ];
    }

    const assignment = await prisma.projectAssignment.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            hourlyRate: true,
          },
        },
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ data: assignment });
  } catch (error) {
    console.error('Error fetching project assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/project-assignments/[id] - Update project assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can update project assignments
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      role,
      billRate,
    } = body;

    // Check if assignment exists
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: { id: params.id },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = await prisma.projectAssignment.update({
      where: { id: params.id },
      data: {
        role,
        billRate,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ data: assignment });
  } catch (error) {
    console.error('Error updating project assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/project-assignments/[id] - Delete project assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can delete project assignments
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if assignment exists
    const existingAssignment = await prisma.projectAssignment.findUnique({
      where: { id: params.id },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get full assignment with user and time entries
    const assignmentWithTimeEntries = await prisma.projectAssignment.findUnique({
      where: { id: params.id },
      include: {
        user: {
          include: {
            timeEntries: {
              where: {
                projectId: existingAssignment.projectId,
              },
            },
          },
        },
      },
    });

    if (!assignmentWithTimeEntries) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check if user has time entries for this project
    const hasTimeEntries = assignmentWithTimeEntries.user.timeEntries.length > 0;
    
    if (hasTimeEntries) {
      return NextResponse.json({ 
        error: 'Cannot remove assignment for user with existing time entries on this project' 
      }, { status: 400 });
    }

    await prisma.projectAssignment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      message: 'Project assignment removed successfully' 
    });
  } catch (error) {
    console.error('Error deleting project assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
