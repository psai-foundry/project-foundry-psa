
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/notifications - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'UNREAD', 'READ', 'DISMISSED'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = {
      userId: session.user.id
    };

    if (status && ['UNREAD', 'READ', 'DISMISSED'].includes(status)) {
      whereClause.status = status;
    }

    // Fetch notifications
    const notifications = await prisma.notifications.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        priority: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        readAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.notifications.count({
      where: whereClause
    });

    // Get unread count
    const unreadCount = await prisma.notifications.count({
      where: {
        userId: session.user.id,
        status: 'UNREAD'
      }
    });

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (for testing/admin use)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      type, 
      title, 
      message, 
      entityType, 
      entityId, 
      priority = 'NORMAL',
      scheduledFor 
    } = body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    // Validate enum values
    const validTypes = [
      'EMAIL_DIGEST', 'APPROVAL_REMINDER', 'ESCALATION_ALERT', 
      'TIMESHEET_STATUS_UPDATE', 'SLACK_NOTIFICATION', 
      'URGENT_APPROVAL', 'SYSTEM_ALERT'
    ];
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await prisma.notifications.create({
      data: {
        id: require('crypto').randomBytes(12).toString('hex'), // Generate random ID
        userId,
        type,
        title,
        message,
        entityType: entityType || null,
        entityId: entityId || null,
        priority,
        status: 'UNREAD',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Notification created successfully',
      notification
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
