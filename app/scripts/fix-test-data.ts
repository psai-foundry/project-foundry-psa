
// Script to create proper test data and project assignments for UAT testing
// This addresses the core issue of users not being assigned to projects

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTestDataAndAssignments() {
  console.log('🚀 Starting PSA Timesheet System UAT Test Data Fix...');

  try {
    // **FIX #11: Ensure all test users exist with proper roles**
    const testUsers = [
      { email: 'admin@foundry.com', name: 'Admin User', role: UserRole.ADMIN, department: 'IT' },
      { email: 'partner@foundry.com', name: 'Sarah Partner', role: UserRole.PARTNER, department: 'Leadership' },
      { email: 'principal@foundry.com', name: 'Michael Principal', role: UserRole.PRINCIPAL, department: 'Strategy' },
      { email: 'practicelead@foundry.com', name: 'Jennifer Practice-Lead', role: UserRole.PRACTICE_LEAD, department: 'Digital Transformation' },
      { email: 'manager@foundry.com', name: 'David Manager', role: UserRole.MANAGER, department: 'Project Management' },
      { email: 'senior@foundry.com', name: 'Lisa Senior-Consultant', role: UserRole.SENIOR_CONSULTANT, department: 'Technology' },
      { email: 'employee@foundry.com', name: 'Robert Employee', role: UserRole.EMPLOYEE, department: 'Operations' },
      { email: 'junior@foundry.com', name: 'Emily Junior-Consultant', role: UserRole.JUNIOR_CONSULTANT, department: 'Analytics' },
      { email: 'contractor@foundry.com', name: 'Alex Contractor', role: UserRole.CONTRACTOR, department: 'Development' },
      { email: 'client@foundry.com', name: 'Maria Client-User', role: UserRole.CLIENT_USER, department: 'External' }
    ];

    console.log('📝 Creating/updating test users...');
    for (const userData of testUsers) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          role: userData.role,
          department: userData.department,
        },
        create: {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          department: userData.department,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        },
      });
      console.log(`  ✅ User: ${userData.name} (${userData.role})`);
    }

    // **FIX #12: Ensure clients exist**
    console.log('🏢 Creating/updating clients...');
    const clients = [
      { name: 'StartupXYZ', industry: 'Technology', email: 'contact@startupxyz.com' },
      { name: 'TechCorp Solutions', industry: 'Software', email: 'info@techcorp.com' },
      { name: 'Digital Innovations Ltd', industry: 'Digital Services', email: 'hello@digitalinnovations.com' },
      { name: 'Regional Healthcare Network', industry: 'Healthcare', email: 'contact@regionalhealthcare.org' },
      { name: 'GlobalTech Enterprises', industry: 'Technology', email: 'business@globaltech.com' },
      { name: 'Financial Services Corp', industry: 'Finance', email: 'info@financialservices.com' },
      { name: 'City of Riverside', industry: 'Government', email: 'contact@cityofriverside.gov' },
      { name: 'Manufacturing Solutions Inc', industry: 'Manufacturing', email: 'info@manufacturingsolutions.com' },
      { name: 'TechStart Innovations', industry: 'Startups', email: 'hello@techstart.io' },
    ];

    const clientMap = new Map<string, string>(); // name -> id mapping
    for (const clientData of clients) {
      // Try to find existing client first
      let client = await prisma.client.findFirst({
        where: { name: clientData.name },
      });

      if (client) {
        // Update existing client
        client = await prisma.client.update({
          where: { id: client.id },
          data: clientData,
        });
      } else {
        // Create new client
        client = await prisma.client.create({
          data: {
            ...clientData,
            isActive: true,
            address: '123 Business St',
          },
        });
      }
      
      clientMap.set(clientData.name, client.id);
      console.log(`  ✅ Client: ${clientData.name}`);
    }

    // **FIX #13: Create comprehensive project portfolio**
    console.log('📁 Creating/updating projects...');
    const projects = [
      {
        name: 'AI Integration Project',
        code: 'SUX-003',
        clientName: 'StartupXYZ',
        description: 'Implementing AI capabilities across the platform',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 150,
      },
      {
        name: 'E-commerce Platform Redesign',
        code: 'TCP-001',
        clientName: 'TechCorp Solutions',
        description: 'Complete redesign of the e-commerce platform',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 125,
      },
      {
        name: 'Internal PSA Development',
        code: 'INT-004',
        clientName: 'TechCorp Solutions',
        description: 'Development of internal PSA system',
        status: 'ACTIVE',
        billable: false,
        defaultBillRate: 100,
      },
      {
        name: 'Mobile App Development',
        code: 'DI-002',
        clientName: 'Digital Innovations Ltd',
        description: 'Native mobile app development project',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 135,
      },
      {
        name: 'Electronic Health Records Integration',
        code: 'RHN-001',
        clientName: 'Regional Healthcare Network',
        description: 'Integration of EHR systems across the network',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 165,
      },
      {
        name: 'Customer Data Platform Implementation',
        code: 'GTE-001',
        clientName: 'GlobalTech Enterprises',
        description: 'Implementation of unified customer data platform',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 145,
      },
      {
        name: 'Regulatory Reporting Automation',
        code: 'FSC-001',
        clientName: 'Financial Services Corp',
        description: 'Automated regulatory reporting system',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 175,
      },
      {
        name: 'Public Portal Modernization',
        code: 'COR-001',
        clientName: 'City of Riverside',
        description: 'Modernizing the city public services portal',
        status: 'ACTIVE',
        billable: true,
        defaultBillRate: 120,
      },
    ];

    for (const projectData of projects) {
      const clientId = clientMap.get(projectData.clientName);

      if (clientId) {
        await prisma.project.upsert({
          where: { code: projectData.code },
          update: {
            name: projectData.name,
            description: projectData.description,
            status: projectData.status as any,
            billable: projectData.billable,
            defaultBillRate: projectData.defaultBillRate,
          },
          create: {
            name: projectData.name,
            code: projectData.code,
            description: projectData.description,
            status: projectData.status as any,
            billable: projectData.billable,
            defaultBillRate: projectData.defaultBillRate,
            clientId: clientId,
            startDate: new Date(),
            budget: 100000,
          },
        });
        console.log(`  ✅ Project: ${projectData.name} (${projectData.code})`);
      }
    }

    // **FIX #14: Create proper project assignments for all roles**
    console.log('👥 Creating project assignments...');
    
    const allProjects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
    });

    const allUsers = await prisma.user.findMany({
      where: { 
        role: { not: 'CLIENT_USER' } // Everyone except client users
      },
    });

    // Clear existing assignments
    await prisma.projectAssignment.deleteMany({});

    // Create strategic assignments based on roles
    for (const user of allUsers) {
      let assignmentCount = 0;
      const maxAssignments = (() => {
        switch (user.role) {
          case UserRole.ADMIN:
          case UserRole.PARTNER:
          case UserRole.PRINCIPAL:
            return allProjects.length; // All projects
          case UserRole.PRACTICE_LEAD:
          case UserRole.MANAGER:
            return Math.min(5, allProjects.length); // Up to 5 projects
          case UserRole.SENIOR_CONSULTANT:
            return Math.min(4, allProjects.length); // Up to 4 projects
          case UserRole.EMPLOYEE:
          case UserRole.JUNIOR_CONSULTANT:
          case UserRole.CONTRACTOR:
            return Math.min(3, allProjects.length); // Up to 3 projects
          default:
            return 2;
        }
      })();

      for (const project of allProjects.slice(0, maxAssignments)) {
        const assignmentRole = (() => {
          switch (user.role) {
            case UserRole.ADMIN:
              return 'PROJECT_ADMIN';
            case UserRole.PARTNER:
            case UserRole.PRINCIPAL:
              return 'PROJECT_LEAD';
            case UserRole.PRACTICE_LEAD:
            case UserRole.MANAGER:
              return 'PROJECT_MANAGER';
            default:
              return 'TEAM_MEMBER';
          }
        })();

        await prisma.projectAssignment.create({
          data: {
            projectId: project.id,
            userId: user.id,
            role: assignmentRole,
          },
        });

        assignmentCount++;
        console.log(`  ✅ ${user.name} → ${project.name} (${assignmentRole})`);
      }

      console.log(`  📊 ${user.name}: ${assignmentCount} project assignments`);
    }

    // **FIX #15: Create sample tasks for each project**
    console.log('📋 Creating project tasks...');
    
    const taskTemplates = [
      'Requirements Analysis',
      'System Design',
      'Development',
      'Testing & QA',
      'Deployment',
      'Documentation',
      'Client Training',
      'Project Management',
      'Code Review',
      'Bug Fixes',
    ];

    for (const project of allProjects) {
      const taskCount = Math.floor(Math.random() * 5) + 3; // 3-7 tasks per project
      
      for (let i = 0; i < taskCount; i++) {
        const taskName = taskTemplates[i % taskTemplates.length];
        const taskDescription = `${taskName} for ${project.name}`;
        
        // Check if task already exists for this project
        const existingTask = await prisma.task.findFirst({
          where: {
            projectId: project.id,
            name: taskName,
          },
        });

        if (!existingTask) {
          await prisma.task.create({
            data: {
              name: taskName,
              description: taskDescription,
              projectId: project.id,
              status: i < 2 ? 'IN_PROGRESS' : 'OPEN',
              estimatedHours: Math.floor(Math.random() * 40) + 10, // 10-50 hours
              billable: project.billable,
            },
          });
        }
      }
      
      console.log(`  ✅ Tasks created for ${project.name}`);
    }

    // **FIX #16: Create sample historical time entries**
    console.log('⏰ Creating historical time entries...');
    
    const workingUsers = allUsers.filter(u => u.role !== UserRole.CLIENT_USER);
    const daysBack = 14; // Create entries for last 2 weeks
    
    for (let dayOffset = 0; dayOffset < daysBack; dayOffset++) {
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - dayOffset);
      entryDate.setHours(9, 0, 0, 0); // Start at 9 AM
      
      // Skip weekends
      if (entryDate.getDay() === 0 || entryDate.getDay() === 6) continue;
      
      for (const user of workingUsers.slice(0, Math.floor(workingUsers.length / 2))) { // Half of users per day
        const userProjects = await prisma.project.findMany({
          where: {
            status: 'ACTIVE',
            assignments: {
              some: {
                userId: user.id,
              },
            },
          },
          take: 2, // Max 2 projects per day per user
        });

        for (const project of userProjects) {
          if (Math.random() > 0.7) continue; // 30% chance of entry per project
          
          const duration = Math.floor(Math.random() * 6 + 1) * 30; // 30min to 3hr increments
          const startTime = new Date(entryDate);
          startTime.setHours(startTime.getHours() + Math.floor(Math.random() * 8)); // Random start time during day
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + duration);
          
          await prisma.timeEntry.create({
            data: {
              userId: user.id,
              projectId: project.id,
              date: entryDate,
              startTime,
              endTime,
              duration,
              description: [
                'Development work',
                'Client meeting',
                'Code review',
                'Testing and debugging',
                'Documentation update',
                'Requirements gathering',
                'Team standup',
                'Architecture planning',
              ][Math.floor(Math.random() * 8)],
              billable: project.billable && Math.random() > 0.2, // 80% of project entries are billable if project is billable
              billRate: project.defaultBillRate,
              status: dayOffset > 5 ? 'APPROVED' : 'SUBMITTED', // Older entries are approved
              isRunning: false,
            },
          });
        }
      }
    }
    
    console.log('  ✅ Historical time entries created');

    // **FIX #17: Create sample insights for testing**
    console.log('🧠 Creating AI insights...');
    
    const insightTemplates = [
      {
        type: 'PRODUCTIVITY_PATTERN',
        title: 'Optimize Your Morning Routine',
        description: 'You tend to be most productive between 9-11 AM. Consider scheduling complex tasks during this time.',
        confidence: 0.85,
      },
      {
        type: 'PROJECT_SUGGESTION',
        title: 'Project Timeline Risk',
        description: 'AI Integration Project is 15% behind schedule. Consider allocating additional resources.',
        confidence: 0.92,
      },
      {
        type: 'TIME_OPTIMIZATION',
        title: 'Utilization Optimization',
        description: 'Your billable utilization is at 78%. Industry benchmark is 75-85%.',
        confidence: 0.88,
      },
      {
        type: 'WORKLOAD_BALANCE',
        title: 'Team Collaboration Opportunity',
        description: 'Consider pairing with Lisa Senior-Consultant on the TechCorp project for knowledge sharing.',
        confidence: 0.75,
      },
      {
        type: 'EFFICIENCY_TREND',
        title: 'Client Satisfaction Trend',
        description: 'StartupXYZ satisfaction has improved 12% this month based on time allocation patterns.',
        confidence: 0.90,
      },
    ];

    for (const user of allUsers.slice(0, 6)) { // Create insights for first 6 users
      const insightCount = Math.floor(Math.random() * 3) + 1; // 1-3 insights per user
      
      for (let i = 0; i < insightCount; i++) {
        const template = insightTemplates[Math.floor(Math.random() * insightTemplates.length)];
        
        await prisma.aIInsight.create({
          data: {
            userId: user.id,
            type: template.type as any,
            title: template.title,
            description: template.description,
            confidence: template.confidence,
            dismissed: false,
          },
        });
      }
      
      console.log(`  ✅ AI insights created for ${user.name}`);
    }

    // **Final verification**
    console.log('🔍 Verifying test data...');
    
    const stats = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      projects: await prisma.project.count({ where: { status: 'ACTIVE' } }),
      assignments: await prisma.projectAssignment.count(),
      tasks: await prisma.task.count(),
      timeEntries: await prisma.timeEntry.count(),
      insights: await prisma.aIInsight.count(),
    };

    console.log('📊 Test Data Summary:');
    console.log(`  👥 Users: ${stats.users}`);
    console.log(`  🏢 Clients: ${stats.clients}`);
    console.log(`  📁 Active Projects: ${stats.projects}`);
    console.log(`  🔗 Project Assignments: ${stats.assignments}`);
    console.log(`  📋 Tasks: ${stats.tasks}`);
    console.log(`  ⏰ Time Entries: ${stats.timeEntries}`);
    console.log(`  🧠 AI Insights: ${stats.insights}`);

    console.log('\n✅ PSA Timesheet System UAT Test Data Fix Completed Successfully!');
    console.log('\n🚀 System should now be fully functional for all UAT test scenarios:');
    console.log('   • All roles can access appropriate projects');
    console.log('   • Timer functionality works for all authorized users');
    console.log('   • Team management shows proper team members');
    console.log('   • Dashboard stats display correctly');
    console.log('   • Revenue tracking shows actual data');
    console.log('   • Historical data available for testing');

  } catch (error) {
    console.error('❌ Error fixing test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
if (require.main === module) {
  fixTestDataAndAssignments()
    .then(() => {
      console.log('\n🎉 All UAT test data fixes completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test data fix failed:', error);
      process.exit(1);
    });
}

export default fixTestDataAndAssignments;

