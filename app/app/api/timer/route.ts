

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from '@/lib/permissions';

// GET /api/timer - Get active timer for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeTimer = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        isRunning: true,
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json({ data: activeTimer });
  } catch (error) {
    console.error('Error fetching active timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/timer - Start new timer with improved role-based access
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as UserRole;

    // **FIX #3: Check if user can submit timesheets**
    if (!hasPermission(userRole, Permission.SUBMIT_TIMESHEET)) {
      return NextResponse.json({ 
        error: 'You do not have permission to track time' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, taskId, description } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check if there's already a running timer
    const existingTimer = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        isRunning: true,
      },
    });

    if (existingTimer) {
      return NextResponse.json({ 
        error: 'Timer is already running. Stop the current timer first.' 
      }, { status: 400 });
    }

    // **FIX #4: Improved project access validation based on role permissions**
    const projectAccessConditions = (() => {
      // Full access roles can start timer on any active project
      if (hasPermission(userRole, Permission.VIEW_ALL_PROJECTS)) {
        return {
          id: projectId,
          status: 'ACTIVE' as any,
        };
      }
      
      // Assigned project access roles
      if (hasPermission(userRole, Permission.VIEW_ASSIGNED_PROJECTS)) {
        return {
          id: projectId,
          status: 'ACTIVE' as any,
          OR: [
            // Explicitly assigned to project
            {
              assignments: {
                some: {
                  userId: session.user.id,
                },
              },
            },
            // **FIX #5: Allow consultants to start timers on active projects**
            ...(userRole === UserRole.SENIOR_CONSULTANT || 
                userRole === UserRole.JUNIOR_CONSULTANT || 
                userRole === UserRole.CONTRACTOR || 
                userRole === UserRole.EMPLOYEE ? [{
              status: 'ACTIVE' as any,
              // Additional business logic can be added here
              // For now, allowing all active projects for these roles
            }] : []),
          ],
        };
      }

      // Client users - can only track time on their projects
      if (userRole === UserRole.CLIENT_USER) {
        // For client users, they should only access projects they're explicitly assigned to
        return {
          id: projectId,
          assignments: {
            some: {
              userId: session.user.id,
            },
          },
        };
      }

      return { id: 'never-match' };
    })();

    const project = await prisma.project.findFirst({
      where: projectAccessConditions,
      include: {
        client: true,
      },
    });

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found or access denied. Please check your project assignments or contact your administrator.' 
      }, { status: 404 });
    }

    // Validate task if provided
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          projectId: projectId,
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    const startTime = new Date();
    
    // **FIX #6: Auto-assign user to project if they're not already assigned**
    // This ensures consultants can track time without explicit assignment
    if (hasPermission(userRole, Permission.SUBMIT_TIMESHEET) && 
        !hasPermission(userRole, Permission.VIEW_ALL_PROJECTS)) {
      
      const existingAssignment = await prisma.projectAssignment.findFirst({
        where: {
          projectId: projectId,
          userId: session.user.id,
        },
      });

      if (!existingAssignment) {
        await prisma.projectAssignment.create({
          data: {
            projectId: projectId,
            userId: session.user.id,
            role: 'TEAM_MEMBER',
          },
        });
      }
    }

    const timer = await prisma.timeEntry.create({
      data: {
        userId: session.user.id,
        projectId,
        taskId,
        date: startTime,
        startTime,
        duration: 0,
        description,
        isRunning: true,
        billable: project.billable,
        billRate: project.defaultBillRate,
        status: 'DRAFT',
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
    });

    return NextResponse.json({ data: timer }, { status: 201 });
  } catch (error) {
    console.error('Error starting timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/timer - Update/Stop timer
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, timerId, description } = body;

    if (!timerId) {
      return NextResponse.json({ error: 'Timer ID is required' }, { status: 400 });
    }

    const timer = await prisma.timeEntry.findFirst({
      where: {
        id: timerId,
        userId: session.user.id,
      },
    });

    if (!timer) {
      return NextResponse.json({ error: 'Timer not found' }, { status: 404 });
    }

    if (action === 'stop') {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - (timer.startTime?.getTime() || 0)) / 1000 / 60); // Duration in minutes

      const updatedTimer = await prisma.timeEntry.update({
        where: { id: timerId },
        data: {
          endTime,
          duration,
          isRunning: false,
          description: description || timer.description,
        },
        include: {
          project: {
            include: {
              client: true,
            },
          },
          task: true,
        },
      });

      return NextResponse.json({ data: updatedTimer });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating timer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

