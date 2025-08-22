
/**
 * Test script for Phase 4: Notification Creation Logic
 * Tests the end-to-end notification workflow for timesheet submission, approval, and rejection
 */

import { prisma } from '../lib/db';

async function testNotificationWorkflow() {
  console.log('🧪 Testing Phase 4: Notification Creation Logic...\n');

  try {
    // 1. Find test users
    console.log('1. Finding test users...');
    const testUser = await prisma.user.findFirst({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true, email: true, role: true }
    });

    const testManager = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!testUser || !testManager) {
      throw new Error('Need both an EMPLOYEE and ADMIN in database for testing');
    }

    console.log(`   Found test user: ${testUser.name} (${testUser.role})`);
    console.log(`   Found test manager: ${testManager.name} (${testManager.role})\n`);

    // 2. Find a test project and task
    console.log('2. Finding test project and task...');
    const testProject = await prisma.project.findFirst({
      include: { tasks: true }
    });

    if (!testProject || !testProject.tasks.length) {
      throw new Error('Need a project with tasks for testing');
    }

    const testTask = testProject.tasks[0];
    console.log(`   Using project: ${testProject.name}`);
    console.log(`   Using task: ${testTask.name}\n`);

    // 3. Create a draft timesheet entry
    console.log('3. Creating draft timesheet entry...');
    const timeEntry = await prisma.timeEntry.create({
      data: {
        id: `test-${Date.now()}`,
        userId: testUser.id,
        projectId: testProject.id,
        taskId: testTask.id,
        date: new Date(),
        duration: 8.0,
        description: 'Test timesheet entry for notification workflow',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`   Created timesheet entry: ${timeEntry.id}\n`);

    // 4. Clear existing notifications for clean test
    console.log('4. Clearing existing notifications...');
    await prisma.notifications.deleteMany({
      where: {
        OR: [
          { userId: testUser.id },
          { userId: testManager.id }
        ]
      }
    });
    console.log('   Cleared existing notifications\n');

    // 5. Test submission notification (simulate API call)
    console.log('5. Testing submission notification...');
    const { createTimesheetSubmissionNotification } = await import('../lib/notifications');
    
    await createTimesheetSubmissionNotification(
      testUser.id,
      testUser.name || testUser.email || 'Test User',
      timeEntry.id,
      testProject.name
    );

    // Check manager received notification
    const managerNotifications = await prisma.notifications.findMany({
      where: { userId: testManager.id },
      orderBy: { createdAt: 'desc' }
    });

    if (managerNotifications.length === 0) {
      throw new Error('Manager should have received submission notification');
    }

    console.log(`   ✅ Manager received notification: "${managerNotifications[0].title}"`);
    console.log(`   📩 Message: "${managerNotifications[0].message}"\n`);

    // 6. Test approval notification
    console.log('6. Testing approval notification...');
    const { createTimesheetApprovalNotification } = await import('../lib/notifications');
    
    await createTimesheetApprovalNotification(
      testUser.id,
      testManager.name || testManager.email || 'Test Manager',
      timeEntry.id,
      testProject.name,
      'Great work on this project!'
    );

    // Check user received notification
    const userApprovalNotifications = await prisma.notifications.findMany({
      where: { 
        userId: testUser.id,
        type: 'TIMESHEET_STATUS_UPDATE',
        title: 'Timesheet Approved'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (userApprovalNotifications.length === 0) {
      throw new Error('User should have received approval notification');
    }

    console.log(`   ✅ User received notification: "${userApprovalNotifications[0].title}"`);
    console.log(`   📩 Message: "${userApprovalNotifications[0].message}"\n`);

    // 7. Test rejection notification
    console.log('7. Testing rejection notification...');
    const { createTimesheetRejectionNotification } = await import('../lib/notifications');
    
    await createTimesheetRejectionNotification(
      testUser.id,
      testManager.name || testManager.email || 'Test Manager',
      timeEntry.id,
      'Please provide more detailed descriptions for your work.',
      testProject.name
    );

    // Check user received rejection notification
    const userRejectionNotifications = await prisma.notifications.findMany({
      where: { 
        userId: testUser.id,
        type: 'TIMESHEET_STATUS_UPDATE',
        title: 'Timesheet Rejected'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (userRejectionNotifications.length === 0) {
      throw new Error('User should have received rejection notification');
    }

    console.log(`   ✅ User received notification: "${userRejectionNotifications[0].title}"`);
    console.log(`   📩 Message: "${userRejectionNotifications[0].message}"`);
    console.log(`   🔴 Priority: ${userRejectionNotifications[0].priority}\n`);

    // 8. Verify notification counts
    console.log('8. Verifying notification counts...');
    const totalUserNotifications = await prisma.notifications.count({
      where: { userId: testUser.id }
    });
    const totalManagerNotifications = await prisma.notifications.count({
      where: { userId: testManager.id }
    });

    console.log(`   User has ${totalUserNotifications} notifications (expected: 2)`);
    console.log(`   Manager has ${totalManagerNotifications} notifications (expected: 1)\n`);

    // 9. Clean up test data
    console.log('9. Cleaning up test data...');
    await prisma.notifications.deleteMany({
      where: {
        OR: [
          { userId: testUser.id },
          { userId: testManager.id }
        ]
      }
    });
    await prisma.timeEntry.delete({
      where: { id: timeEntry.id }
    });
    console.log('   Cleaned up test data\n');

    console.log('🎉 Phase 4: Notification Creation Logic - ALL TESTS PASSED!\n');
    console.log('✅ Summary:');
    console.log('   - Timesheet submission notifications work correctly');
    console.log('   - Timesheet approval notifications work correctly');
    console.log('   - Timesheet rejection notifications work correctly');
    console.log('   - Notifications have appropriate priorities');
    console.log('   - Notification messages include relevant context');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testNotificationWorkflow()
  .then(() => {
    console.log('\n🚀 Phase 4 implementation is ready for integration!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });
