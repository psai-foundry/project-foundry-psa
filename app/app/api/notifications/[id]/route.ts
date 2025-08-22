
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/[id] - Update notification status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, readAt } = body;

    // Validate status
    const validStatuses = ['UNREAD', 'READ', 'DISMISSED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be UNREAD, READ, or DISMISSED' },
        { status: 400 }
      );
    }

    // Check if notification exists and belongs to the user
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status;
      
      // If marking as read, set readAt timestamp
      if (status === 'READ' && !existingNotification.readAt) {
        updateData.readAt = new Date();
      }
      
      // If marking as unread, clear readAt timestamp
      if (status === 'UNREAD') {
        updateData.readAt = null;
      }
    }

    // Allow manual readAt timestamp override
    if (readAt !== undefined) {
      updateData.readAt = readAt ? new Date(readAt) : null;
    }

    // Update notification
    const updatedNotification = await prisma.notifications.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      message: 'Notification updated successfully',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/[id] - Get single notification
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification });

  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Check if notification exists and belongs to the user
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Delete notification
    await prisma.notifications.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
