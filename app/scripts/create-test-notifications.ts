
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    console.log('Creating test notifications...');

    // Get the first user (assuming there's at least one user in the database)
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.error('No users found in database. Please ensure users exist before creating notifications.');
      return;
    }

    console.log(`Creating notifications for user: ${user.email}`);

    // Create test notifications
    const now = new Date();
    const notifications = [
      {
        id: 'notification1_' + Date.now(),
        title: 'Welcome to Project Foundry PSA!',
        message: 'Your account has been successfully set up and you can start tracking time.',
        type: 'SYSTEM_ALERT' as const,
        userId: user.id,
        updatedAt: now,
      },
      {
        id: 'notification2_' + (Date.now() + 1),
        title: 'Timesheet Reminder',
        message: 'Don\'t forget to submit your timesheet for this week before Friday.',
        type: 'TIMESHEET_STATUS_UPDATE' as const,
        userId: user.id,
        updatedAt: now,
      },
      {
        id: 'notification3_' + (Date.now() + 2),
        title: 'Project Deadline Approaching',
        message: 'The deadline for Project Alpha is in 3 days. Please review your tasks.',
        type: 'SYSTEM_ALERT' as const,
        userId: user.id,
        updatedAt: now,
      },
      {
        id: 'notification4_' + (Date.now() + 3),
        title: 'New Task Assigned',
        message: 'You have been assigned a new task: "Review system documentation".',
        type: 'SYSTEM_ALERT' as const,
        userId: user.id,
        updatedAt: now,
      },
      {
        id: 'notification5_' + (Date.now() + 4),
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2:00 AM - 4:00 AM.',
        type: 'SYSTEM_ALERT' as const,
        userId: user.id,
        updatedAt: now,
      }
    ];

    const createdNotifications = await prisma.notifications.createMany({
      data: notifications,
    });

    console.log(`✅ Successfully created ${createdNotifications.count} test notifications`);
    
    // Display the created notifications
    const allNotifications = await prisma.notifications.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n📋 Created notifications:');
    allNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. [${notification.type}] ${notification.title}`);
      console.log(`   ${notification.message}`);
      console.log(`   Created: ${notification.createdAt.toISOString()}`);
      console.log(`   Status: ${notification.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error creating test notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
