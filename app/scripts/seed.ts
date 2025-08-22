
import { PrismaClient, UserRole, ProjectStatus, TaskStatus, TimeEntryStatus, SubmissionStatus, InsightType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.timesheetSubmissionEntry.deleteMany();
  await prisma.timesheetSubmission.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.projectAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.aIPreference.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  const hashedManagerPassword = await bcrypt.hash('manager123', 10);
  const hashedEmployeePassword = await bcrypt.hash('employee123', 10);

  // Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
      role: UserRole.ADMIN,
      department: 'Administration',
      hourlyRate: 150.0,
      defaultBillRate: 200.0,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@projectfoundry.com',
      name: 'Sarah Johnson',
      password: hashedManagerPassword,
      role: UserRole.MANAGER,
      department: 'Engineering',
      hourlyRate: 120.0,
      defaultBillRate: 180.0,
      isActive: true,
    },
  });

  const employeeUser1 = await prisma.user.create({
    data: {
      email: 'alice@projectfoundry.com',
      name: 'Alice Smith',
      password: hashedEmployeePassword,
      role: UserRole.EMPLOYEE,
      department: 'Engineering',
      hourlyRate: 85.0,
      defaultBillRate: 130.0,
      isActive: true,
    },
  });

  const employeeUser2 = await prisma.user.create({
    data: {
      email: 'bob@projectfoundry.com',
      name: 'Bob Wilson',
      password: hashedEmployeePassword,
      role: UserRole.EMPLOYEE,
      department: 'Design',
      hourlyRate: 90.0,
      defaultBillRate: 140.0,
      isActive: true,
    },
  });

  const employeeUser3 = await prisma.user.create({
    data: {
      email: 'emma@projectfoundry.com',
      name: 'Emma Davis',
      password: hashedEmployeePassword,
      role: UserRole.EMPLOYEE,
      department: 'Engineering',
      hourlyRate: 95.0,
      defaultBillRate: 145.0,
      isActive: true,
    },
  });

  console.log('✅ Users created');

  // Create Clients
  const client1 = await prisma.client.create({
    data: {
      name: 'TechCorp Solutions',
      email: 'contact@techcorp.com',
      phone: '+1-555-0123',
      address: '123 Tech Street, San Francisco, CA 94105',
      isActive: true,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Digital Innovations Ltd',
      email: 'hello@digitalinnovations.com',
      phone: '+1-555-0456',
      address: '456 Innovation Ave, New York, NY 10001',
      isActive: true,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'StartupXYZ',
      email: 'team@startupxyz.com',
      phone: '+1-555-0789',
      address: '789 Startup Blvd, Austin, TX 78701',
      isActive: true,
    },
  });

  console.log('✅ Clients created');

  // Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'E-commerce Platform Redesign',
      code: 'TCP-001',
      description: 'Complete redesign of the e-commerce platform with modern UI/UX',
      clientId: client1.id,
      status: ProjectStatus.ACTIVE,
      budget: 150000.0,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-06-15'),
      billable: true,
      defaultBillRate: 160.0,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      code: 'DI-002',
      description: 'Native iOS and Android app development',
      clientId: client2.id,
      status: ProjectStatus.ACTIVE,
      budget: 200000.0,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-08-01'),
      billable: true,
      defaultBillRate: 170.0,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'AI Integration Project',
      code: 'SUX-003',
      description: 'Integration of AI capabilities into existing system',
      clientId: client3.id,
      status: ProjectStatus.ACTIVE,
      budget: 100000.0,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-09-01'),
      billable: true,
      defaultBillRate: 180.0,
    },
  });

  const internalProject = await prisma.project.create({
    data: {
      name: 'Internal PSA Development',
      code: 'INT-004',
      description: 'Development of internal PSA platform',
      clientId: client1.id,
      status: ProjectStatus.ACTIVE,
      budget: 50000.0,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      billable: false,
      defaultBillRate: 0.0,
    },
  });

  console.log('✅ Projects created');

  // Create Tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        name: 'UI Design',
        description: 'Create modern user interface designs',
        projectId: project1.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedHours: 80.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Backend Development',
        description: 'Develop backend API endpoints',
        projectId: project1.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedHours: 120.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Frontend Development',
        description: 'Implement responsive frontend',
        projectId: project1.id,
        status: TaskStatus.OPEN,
        estimatedHours: 100.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'iOS Development',
        description: 'Native iOS app development',
        projectId: project2.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedHours: 200.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Android Development',
        description: 'Native Android app development',
        projectId: project2.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedHours: 200.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'AI Model Integration',
        description: 'Integrate AI models into the system',
        projectId: project3.id,
        status: TaskStatus.OPEN,
        estimatedHours: 150.0,
        billable: true,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Timesheet Module',
        description: 'Develop timesheet tracking module',
        projectId: internalProject.id,
        status: TaskStatus.IN_PROGRESS,
        estimatedHours: 60.0,
        billable: false,
      },
    }),
    prisma.task.create({
      data: {
        name: 'Project Management Module',
        description: 'Develop project management features',
        projectId: internalProject.id,
        status: TaskStatus.OPEN,
        estimatedHours: 80.0,
        billable: false,
      },
    }),
  ]);

  console.log('✅ Tasks created');

  // Create Project Assignments
  await Promise.all([
    prisma.projectAssignment.create({
      data: {
        userId: managerUser.id,
        projectId: project1.id,
        role: 'Project Manager',
        billRate: 180.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser1.id,
        projectId: project1.id,
        role: 'Full Stack Developer',
        billRate: 130.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser2.id,
        projectId: project1.id,
        role: 'UI/UX Designer',
        billRate: 140.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser1.id,
        projectId: project2.id,
        role: 'Mobile Developer',
        billRate: 130.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser3.id,
        projectId: project2.id,
        role: 'Mobile Developer',
        billRate: 145.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: adminUser.id,
        projectId: project3.id,
        role: 'AI Consultant',
        billRate: 200.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser3.id,
        projectId: project3.id,
        role: 'AI Developer',
        billRate: 145.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: adminUser.id,
        projectId: internalProject.id,
        role: 'Technical Lead',
        billRate: 0.0,
      },
    }),
    prisma.projectAssignment.create({
      data: {
        userId: employeeUser1.id,
        projectId: internalProject.id,
        role: 'Developer',
        billRate: 0.0,
      },
    }),
  ]);

  console.log('✅ Project assignments created');

  // Create Time Entries for the past few weeks
  const now = new Date();
  const pastWeeks = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7 + now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    pastWeeks.push(weekStart);
  }

  // Create time entries for each user across different projects
  const timeEntries = [];
  
  for (const weekStart of pastWeeks) {
    for (let day = 0; day < 5; day++) { // Monday to Friday
      const entryDate = new Date(weekStart);
      entryDate.setDate(weekStart.getDate() + day);
      
      // Admin user time entries
      timeEntries.push({
        userId: adminUser.id,
        projectId: project3.id,
        taskId: tasks[5].id, // AI Model Integration
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(entryDate.getTime() + 13 * 60 * 60 * 1000), // 1 PM
        duration: 4.0,
        description: 'AI model research and integration planning',
        billable: true,
        billRate: 200.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.7,
        aiCategory: 'Development',
        aiConfidence: 0.85,
      });

      timeEntries.push({
        userId: adminUser.id,
        projectId: internalProject.id,
        taskId: tasks[6].id, // Timesheet Module
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        endTime: new Date(entryDate.getTime() + 18 * 60 * 60 * 1000), // 6 PM
        duration: 4.0,
        description: 'PSA platform development and architecture',
        billable: false,
        billRate: 0.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.7,
        aiCategory: 'Internal Development',
        aiConfidence: 0.92,
      });

      // Manager user time entries
      timeEntries.push({
        userId: managerUser.id,
        projectId: project1.id,
        taskId: tasks[0].id, // UI Design
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(entryDate.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        duration: 8.0,
        description: 'Project management and team coordination',
        billable: true,
        billRate: 180.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.6,
        aiCategory: 'Management',
        aiConfidence: 0.78,
      });

      // Employee 1 time entries
      timeEntries.push({
        userId: employeeUser1.id,
        projectId: project1.id,
        taskId: tasks[1].id, // Backend Development
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(entryDate.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        duration: 8.0,
        description: 'API development and database design',
        billable: true,
        billRate: 130.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.5,
        aiCategory: 'Development',
        aiConfidence: 0.88,
      });

      // Employee 2 time entries
      timeEntries.push({
        userId: employeeUser2.id,
        projectId: project1.id,
        taskId: tasks[0].id, // UI Design
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(entryDate.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        duration: 8.0,
        description: 'UI/UX design and prototyping',
        billable: true,
        billRate: 140.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.4,
        aiCategory: 'Design',
        aiConfidence: 0.91,
      });

      // Employee 3 time entries
      timeEntries.push({
        userId: employeeUser3.id,
        projectId: project2.id,
        taskId: tasks[3].id, // iOS Development
        date: entryDate,
        startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(entryDate.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        duration: 8.0,
        description: 'iOS app development and testing',
        billable: true,
        billRate: 145.0,
        status: TimeEntryStatus.APPROVED,
        aiSuggested: Math.random() > 0.3,
        aiCategory: 'Mobile Development',
        aiConfidence: 0.86,
      });
    }
  }

  // Create time entries in batches
  for (let i = 0; i < timeEntries.length; i += 50) {
    const batch = timeEntries.slice(i, i + 50);
    await Promise.all(batch.map(entry => prisma.timeEntry.create({ data: entry })));
  }

  console.log('✅ Time entries created');

  // Create some current week time entries (in progress)
  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);

  const currentTimeEntries = [];
  for (let day = 0; day < 3; day++) { // Monday to Wednesday
    const entryDate = new Date(currentWeekStart);
    entryDate.setDate(currentWeekStart.getDate() + day);
    
    currentTimeEntries.push({
      userId: adminUser.id,
      projectId: internalProject.id,
      taskId: tasks[6].id,
      date: entryDate,
      startTime: new Date(entryDate.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(entryDate.getTime() + 17 * 60 * 60 * 1000),
      duration: 8.0,
      description: 'Current week PSA development',
      billable: false,
      billRate: 0.0,
      status: TimeEntryStatus.DRAFT,
      aiSuggested: true,
      aiCategory: 'Internal Development',
      aiConfidence: 0.95,
    });
  }

  // Add a running timer for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runningStartTime = new Date();
  runningStartTime.setHours(9, 0, 0, 0);
  
  currentTimeEntries.push({
    userId: adminUser.id,
    projectId: internalProject.id,
    taskId: tasks[6].id,
    date: today,
    startTime: runningStartTime,
    endTime: null,
    duration: 0.0,
    description: 'Building PSA timesheet system',
    billable: false,
    billRate: 0.0,
    status: TimeEntryStatus.DRAFT,
    isRunning: true,
    aiSuggested: false,
    aiCategory: 'Internal Development',
    aiConfidence: 0.98,
  });

  await Promise.all(currentTimeEntries.map(entry => prisma.timeEntry.create({ data: entry })));

  console.log('✅ Current week time entries created');

  // Create AI Preferences for users
  await Promise.all([
    prisma.aIPreference.create({
      data: {
        userId: adminUser.id,
        enableSuggestions: true,
        enableAutoCategory: true,
        enableTimeEstimation: true,
        enableInsights: true,
        preferredCategories: ['Development', 'Management', 'Research'],
      },
    }),
    prisma.aIPreference.create({
      data: {
        userId: managerUser.id,
        enableSuggestions: true,
        enableAutoCategory: true,
        enableTimeEstimation: true,
        enableInsights: true,
        preferredCategories: ['Management', 'Planning', 'Meetings'],
      },
    }),
    prisma.aIPreference.create({
      data: {
        userId: employeeUser1.id,
        enableSuggestions: true,
        enableAutoCategory: true,
        enableTimeEstimation: true,
        enableInsights: true,
        preferredCategories: ['Development', 'Testing', 'Documentation'],
      },
    }),
  ]);

  console.log('✅ AI preferences created');

  // Create AI Insights
  await Promise.all([
    prisma.aIInsight.create({
      data: {
        userId: adminUser.id,
        type: InsightType.PRODUCTIVITY_PATTERN,
        title: 'Peak Productivity Hours',
        description: 'You are most productive between 9 AM and 1 PM. Consider scheduling complex tasks during this time.',
        confidence: 0.87,
        actionable: true,
        dismissed: false,
      },
    }),
    prisma.aIInsight.create({
      data: {
        userId: adminUser.id,
        type: InsightType.TIME_OPTIMIZATION,
        title: 'Frequent Task Switching',
        description: 'You switch between projects frequently. Consider time-blocking for better focus.',
        confidence: 0.92,
        actionable: true,
        dismissed: false,
      },
    }),
    prisma.aIInsight.create({
      data: {
        userId: employeeUser1.id,
        type: InsightType.PROJECT_SUGGESTION,
        title: 'Similar Task Detected',
        description: 'Based on your history, this task is similar to "API development" from the TechCorp project.',
        confidence: 0.78,
        actionable: true,
        dismissed: false,
      },
    }),
    prisma.aIInsight.create({
      data: {
        userId: managerUser.id,
        type: InsightType.BILLING_ANOMALY,
        title: 'Billing Rate Variance',
        description: 'Your billing rate for the TechCorp project is 10% higher than similar projects.',
        confidence: 0.95,
        actionable: true,
        dismissed: false,
      },
    }),
  ]);

  console.log('✅ AI insights created');

  // Create System Settings
  await Promise.all([
    prisma.systemSetting.create({
      data: {
        key: 'DEFAULT_WORK_HOURS',
        value: '8',
        description: 'Default work hours per day',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'OVERTIME_THRESHOLD',
        value: '40',
        description: 'Weekly hours threshold for overtime',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'AUTO_SUBMIT_TIMESHEET',
        value: 'false',
        description: 'Automatically submit timesheets at end of week',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'AI_SUGGESTIONS_ENABLED',
        value: 'true',
        description: 'Enable AI-powered suggestions system-wide',
      },
    }),
    prisma.systemSetting.create({
      data: {
        key: 'BILLABLE_HOURS_TRACKING',
        value: 'true',
        description: 'Track billable vs non-billable hours',
      },
    }),
  ]);

  console.log('✅ System settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`👥 Users: ${await prisma.user.count()}`);
  console.log(`🏢 Clients: ${await prisma.client.count()}`);
  console.log(`📋 Projects: ${await prisma.project.count()}`);
  console.log(`✅ Tasks: ${await prisma.task.count()}`);
  console.log(`⏰ Time Entries: ${await prisma.timeEntry.count()}`);
  console.log(`🤖 AI Insights: ${await prisma.aIInsight.count()}`);
  console.log(`⚙️ System Settings: ${await prisma.systemSetting.count()}`);
  console.log('\n🔑 Demo Account:');
  console.log('Email: john@doe.com');
  console.log('Password: johndoe123');
  console.log('Role: ADMIN');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
