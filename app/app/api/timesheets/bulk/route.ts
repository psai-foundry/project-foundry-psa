
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseISO } from 'date-fns';

// POST /api/timesheets/bulk - Bulk create timesheet entries
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid entries format' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      try {
        // Validate required fields
        if (!entry.projectId || !entry.date || !entry.duration) {
          errors.push({
            index: i,
            error: 'Missing required fields: projectId, date, duration'
          });
          continue;
        }

        // Validate project access
        const project = await prisma.project.findFirst({
          where: {
            id: entry.projectId,
            assignments: {
              some: {
                userId: session.user.id,
              },
            },
          },
        });

        if (!project) {
          errors.push({
            index: i,
            error: 'Project not found or access denied'
          });
          continue;
        }

        // Validate task if provided
        if (entry.taskId) {
          const task = await prisma.task.findFirst({
            where: {
              id: entry.taskId,
              projectId: entry.projectId,
            },
          });

          if (!task) {
            errors.push({
              index: i,
              error: 'Task not found'
            });
            continue;
          }
        }

        // Create time entry
        const timeEntry = await prisma.timeEntry.create({
          data: {
            userId: session.user.id,
            projectId: entry.projectId,
            taskId: entry.taskId,
            date: parseISO(entry.date),
            startTime: entry.startTime ? parseISO(entry.startTime) : null,
            endTime: entry.endTime ? parseISO(entry.endTime) : null,
            duration: entry.duration,
            description: entry.description,
            billable: entry.billable ?? project.billable,
            billRate: entry.billRate ?? project.defaultBillRate,
            aiSuggested: entry.aiSuggested ?? false,
            aiCategory: entry.aiCategory,
            aiConfidence: entry.aiConfidence,
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

        results.push(timeEntry);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      data: {
        created: results,
        errors: errors,
        summary: {
          total: entries.length,
          successful: results.length,
          failed: errors.length,
        }
      }
    });
  } catch (error) {
    console.error('Error bulk creating timesheet entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/timesheets/bulk - Bulk update timesheet entries
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid updates format' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each update
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      
      try {
        if (!update.id) {
          errors.push({
            index: i,
            error: 'Missing entry ID'
          });
          continue;
        }

        // Check if entry exists and belongs to user
        const existingEntry = await prisma.timeEntry.findFirst({
          where: {
            id: update.id,
            userId: session.user.id,
          },
        });

        if (!existingEntry) {
          errors.push({
            index: i,
            error: 'Time entry not found'
          });
          continue;
        }

        // Check if entry is still editable
        if (existingEntry.status === 'APPROVED') {
          errors.push({
            index: i,
            error: 'Cannot edit approved time entry'
          });
          continue;
        }

        // Update time entry
        const timeEntry = await prisma.timeEntry.update({
          where: { id: update.id },
          data: {
            ...(update.projectId && { projectId: update.projectId }),
            ...(update.taskId !== undefined && { taskId: update.taskId }),
            ...(update.date && { date: parseISO(update.date) }),
            ...(update.startTime && { startTime: parseISO(update.startTime) }),
            ...(update.endTime && { endTime: parseISO(update.endTime) }),
            ...(update.duration !== undefined && { duration: update.duration }),
            ...(update.description !== undefined && { description: update.description }),
            ...(update.billable !== undefined && { billable: update.billable }),
            ...(update.billRate !== undefined && { billRate: update.billRate }),
            status: 'DRAFT', // Reset status to draft when edited
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

        results.push(timeEntry);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      data: {
        updated: results,
        errors: errors,
        summary: {
          total: updates.length,
          successful: results.length,
          failed: errors.length,
        }
      }
    });
  } catch (error) {
    console.error('Error bulk updating timesheet entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/timesheets/bulk - Bulk delete timesheet entries
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid IDs format' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each deletion
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      
      try {
        // Check if entry exists and belongs to user
        const existingEntry = await prisma.timeEntry.findFirst({
          where: {
            id: id,
            userId: session.user.id,
          },
        });

        if (!existingEntry) {
          errors.push({
            index: i,
            id: id,
            error: 'Time entry not found'
          });
          continue;
        }

        // Check if entry is still deletable
        if (existingEntry.status === 'APPROVED') {
          errors.push({
            index: i,
            id: id,
            error: 'Cannot delete approved time entry'
          });
          continue;
        }

        // Delete time entry
        await prisma.timeEntry.delete({
          where: { id: id },
        });

        results.push(id);
      } catch (error) {
        errors.push({
          index: i,
          id: id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      data: {
        deleted: results,
        errors: errors,
        summary: {
          total: ids.length,
          successful: results.length,
          failed: errors.length,
        }
      }
    });
  } catch (error) {
    console.error('Error bulk deleting timesheet entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
