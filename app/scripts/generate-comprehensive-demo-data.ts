
import 'dotenv/config';
import { PrismaClient, UserRole, TimeEntryStatus, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test Data Configuration for Comprehensive UAT Testing
const UAT_TEST_SCENARIOS = {
  // Time periods for testing
  testPeriods: {
    current: new Date(),
    lastMonth: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    twoMonthsAgo: new Date(new Date().setMonth(new Date().getMonth() - 2)),
    threeMonthsAgo: new Date(new Date().setMonth(new Date().getMonth() - 3))
  },
  
  // Billing scenarios for testing
  billingScenarios: {
    hourlyRates: [85, 120, 150, 200, 275, 350],
    billRates: [100, 145, 180, 250, 325, 450]
  }
};

async function generateComprehensiveUATData() {
  console.log('🎯 Starting Comprehensive UAT Demo Data Generation...');
  
  try {
    // Clear existing data except test users (respecting foreign key constraints)
    console.log('📝 Clearing existing demo data...');
    
    // Delete in order to respect foreign key constraints
    await prisma.timeEntry.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectAssignment.deleteMany();
    await prisma.project.deleteMany(); 
    await prisma.clientContact.deleteMany();
    await prisma.client.deleteMany();

    // 1. CLIENTS - Diverse client portfolio for testing different scenarios
    console.log('🏢 Creating diverse client portfolio...');
    const clients = await Promise.all([
      // Enterprise Clients
      prisma.client.create({
        data: {
          name: 'GlobalTech Enterprises',
          email: 'procurement@globaltech.com',
          phone: '+1-555-0101',
          address: '1000 Corporate Blvd, Suite 500, New York, NY 10001',
          description: 'Large enterprise client - Fortune 500 company. Multiple concurrent projects.',
          industry: 'Technology',
          website: 'https://globaltech.com',
          isActive: true
        }
      }),
      
      prisma.client.create({
        data: {
          name: 'Financial Services Corp',
          email: 'projects@fscorp.com',
          phone: '+1-555-0201',
          address: '250 Wall Street, Floor 15, New York, NY 10005',
          description: 'Financial services - requires high security clearance. Regulatory compliance focus.',
          industry: 'Financial Services',
          website: 'https://fscorp.com',
          isActive: true
        }
      }),

      // Mid-Market Clients
      prisma.client.create({
        data: {
          name: 'Regional Healthcare Network',
          email: 'it@regionalhealthcare.org',
          phone: '+1-555-0301',
          address: '500 Medical Center Dr, Chicago, IL 60601',
          description: 'Healthcare sector - HIPAA compliance required. EHR system modernization.',
          industry: 'Healthcare',
          website: 'https://regionalhealthcare.org',
          isActive: true
        }
      }),

      prisma.client.create({
        data: {
          name: 'Manufacturing Solutions Inc',
          email: 'digitalops@manufacturingsolutions.com',
          phone: '+1-555-0401',
          address: '1200 Industrial Way, Detroit, MI 48201',
          description: 'Manufacturing - IoT and Industry 4.0 initiatives. Heavy machinery integration.',
          industry: 'Manufacturing',
          website: 'https://manufacturingsolutions.com',
          isActive: true
        }
      }),

      // Growth-Stage Clients
      prisma.client.create({
        data: {
          name: 'TechStart Innovations',
          email: 'founders@techstart.io',
          phone: '+1-555-0501',
          address: '100 Innovation Drive, Austin, TX 78701',
          description: 'Fast-growing startup - Series B funding. Rapid scaling requirements.',
          industry: 'Technology Startup',
          website: 'https://techstart.io',
          isActive: true
        }
      }),

      prisma.client.create({
        data: {
          name: 'E-Commerce Dynamics',
          email: 'tech@ecommercedynamics.com',
          phone: '+1-555-0601',
          address: '2000 Commerce Plaza, Los Angeles, CA 90210',
          description: 'E-commerce platform - high transaction volumes. Peak season scalability.',
          industry: 'E-Commerce',
          website: 'https://ecommercedynamics.com',
          isActive: true
        }
      }),

      // Government/Non-Profit
      prisma.client.create({
        data: {
          name: 'City of Riverside',
          email: 'it@cityofriverside.gov',
          phone: '+1-555-0701',
          address: '3900 Main Street, Riverside, CA 92522',
          description: 'Government sector - strict procurement processes. Public records compliance.',
          industry: 'Government',
          website: 'https://cityofriverside.gov',
          isActive: true
        }
      }),

      // Specialty/Boutique Clients
      prisma.client.create({
        data: {
          name: 'Artisan Coffee Roasters',
          email: 'hello@artisancoffee.com',
          phone: '+1-555-0801',
          address: '50 Craft Street, Portland, OR 97201',
          description: 'Small business - specialty coffee. Point of sale and inventory management.',
          industry: 'Food & Beverage',
          website: 'https://artisancoffee.com',
          isActive: true
        }
      }),

      // International Client
      prisma.client.create({
        data: {
          name: 'European Tech Consortium',
          email: 'projects@eurotech.eu',
          phone: '+44-20-7123-4567',
          address: 'Tower Bridge House, London SE1 2UP, United Kingdom',
          description: 'International client - GDPR compliance critical. Multi-timezone coordination.',
          industry: 'Technology',
          website: 'https://eurotech.eu',
          isActive: true
        }
      }),

      // Inactive/Test Client
      prisma.client.create({
        data: {
          name: 'Legacy Systems Corp (Inactive)',
          email: 'archived@legacysystems.com',
          phone: '+1-555-0901',
          address: '999 Old Tech Blvd, San Francisco, CA 94105',
          description: 'INACTIVE CLIENT - Use for testing inactive client scenarios.',
          industry: 'Legacy Technology',
          website: 'https://legacysystems.com',
          isActive: false
        }
      })
    ]);

    console.log(`✅ Created ${clients.length} diverse clients`);

    // 2. PROJECTS - Comprehensive project scenarios
    console.log('📋 Creating comprehensive project portfolio...');
    
    const projects = [];
    
    // GlobalTech Enterprise Projects
    const globaltechProjects = await Promise.all([
      prisma.project.create({
        data: {
          name: 'Enterprise Resource Planning Modernization',
          code: 'GT-ERP-2024',
          description: 'Complete overhaul of legacy ERP system with modern cloud-based solution. Includes data migration, process re-engineering, and staff training.',
          clientId: clients[0].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-06-01'),
          endDate: new Date('2025-03-31'),
          budget: 850000,
          billable: true,
          defaultBillRate: 185
        }
      }),
      
      prisma.project.create({
        data: {
          name: 'Customer Data Platform Implementation',
          code: 'GT-CDP-2024',
          description: 'Implementation of unified customer data platform for 360-degree customer view across all touchpoints.',
          clientId: clients[0].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-08-01'),
          endDate: new Date('2024-12-15'),
          budget: 320000,
          billable: true,
          defaultBillRate: 165
        }
      }),

      prisma.project.create({
        data: {
          name: 'Security Audit & Compliance Review',
          code: 'GT-SEC-2024',
          description: 'Comprehensive security assessment and SOC 2 Type II compliance preparation.',
          clientId: clients[0].id,
          status: ProjectStatus.COMPLETED,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-04-30'),
          budget: 125000,
          billable: true,
          defaultBillRate: 220
        }
      })
    ]);
    
    // Financial Services Projects
    const finservProjects = await Promise.all([
      prisma.project.create({
        data: {
          name: 'Regulatory Reporting Automation',
          code: 'FS-REG-2024',
          description: 'Automated regulatory reporting system for Basel III and Dodd-Frank compliance.',
          clientId: clients[1].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2025-01-31'),
          budget: 650000,
          billable: true,
          defaultBillRate: 275
        }
      }),
      
      prisma.project.create({
        data: {
          name: 'Real-time Risk Management System',
          code: 'FS-RISK-2024',
          description: 'Development of real-time risk monitoring and alerting system for trading operations.',
          clientId: clients[1].id,
          status: ProjectStatus.PLANNING,
          startDate: new Date('2024-10-01'),
          endDate: new Date('2025-06-30'),
          budget: 475000,
          billable: true,
          defaultBillRate: 225
        }
      })
    ]);

    // Healthcare Projects
    const healthcareProjects = await Promise.all([
      prisma.project.create({
        data: {
          name: 'Electronic Health Records Integration',
          code: 'RHN-EHR-2024',
          description: 'Integration of multiple EHR systems across hospital network with HIPAA compliance.',
          clientId: clients[2].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2025-02-28'),
          budget: 380000,
          billable: true,
          defaultBillRate: 155
        }
      }),

      prisma.project.create({
        data: {
          name: 'Telemedicine Platform Enhancement',
          code: 'RHN-TELE-2024',
          description: 'Enhancement of existing telemedicine platform with advanced video conferencing and patient monitoring capabilities.',
          clientId: clients[2].id,
          status: ProjectStatus.ON_HOLD,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-03-31'),
          budget: 195000,
          billable: true,
          defaultBillRate: 145
        }
      })
    ]);

    // Additional projects for other clients...
    const additionalProjects = await Promise.all([
      // Manufacturing
      prisma.project.create({
        data: {
          name: 'Industrial IoT Implementation',
          code: 'MSI-IOT-2024',
          description: 'Implementation of IoT sensors and analytics platform for predictive maintenance.',
          clientId: clients[3].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-06-15'),
          endDate: new Date('2024-12-31'),
          budget: 295000,
          billable: true,
          defaultBillRate: 170
        }
      }),

      // TechStart
      prisma.project.create({
        data: {
          name: 'Scalable Architecture Design',
          code: 'TSI-ARCH-2024',
          description: 'Design and implementation of scalable cloud architecture to support 10x user growth.',
          clientId: clients[4].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-08-15'),
          endDate: new Date('2025-01-15'),
          budget: 180000,
          billable: true,
          defaultBillRate: 195
        }
      }),

      // E-Commerce
      prisma.project.create({
        data: {
          name: 'Peak Season Performance Optimization',
          code: 'ECD-PERF-2024',
          description: 'Performance optimization and load testing for Black Friday/holiday traffic.',
          clientId: clients[5].id,
          status: ProjectStatus.COMPLETED,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-11-15'),
          budget: 85000,
          billable: true,
          defaultBillRate: 160
        }
      }),

      // Government
      prisma.project.create({
        data: {
          name: 'Public Portal Modernization',
          code: 'COR-PORTAL-2024',
          description: 'Modernization of citizen services portal with accessibility and mobile-first design.',
          clientId: clients[6].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2025-03-31'),
          budget: 245000,
          billable: true,
          defaultBillRate: 135
        }
      }),

      // Small Business
      prisma.project.create({
        data: {
          name: 'Point of Sale & Inventory Management',
          code: 'ACR-POS-2024',
          description: 'Custom POS system with real-time inventory tracking and supplier integration.',
          clientId: clients[7].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-01'),
          budget: 35000,
          billable: true,
          defaultBillRate: 125
        }
      }),

      // International
      prisma.project.create({
        data: {
          name: 'GDPR Compliance & Data Governance',
          code: 'ETC-GDPR-2024',
          description: 'GDPR compliance implementation with comprehensive data governance framework.',
          clientId: clients[8].id,
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2025-01-31'),
          budget: 425000,
          billable: true,
          defaultBillRate: 210
        }
      })
    ]);

    projects.push(...globaltechProjects, ...finservProjects, ...healthcareProjects, ...additionalProjects);
    console.log(`✅ Created ${projects.length} comprehensive projects`);

    // 3. GET EXISTING USERS FOR TIMESHEET GENERATION
    console.log('👥 Retrieving existing test users...');
    const users = await prisma.user.findMany({
      where: {
        email: {
          not: 'declan@theprojectfoundry.com' // Exclude the main admin
        }
      }
    });

    console.log(`✅ Found ${users.length} users for timesheet generation`);

    // 4. COMPREHENSIVE TIMESHEET GENERATION
    console.log('⏰ Generating comprehensive timesheet scenarios...');
    
    const timesheetData = [];
    const currentDate = new Date();
    
    // Generate timesheets for the last 3 months with various scenarios
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - monthOffset, 1);
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const workDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
        
        // Skip weekends for most entries (but include some weekend work)
        if (workDate.getDay() === 0 || workDate.getDay() === 6) {
          // Only 20% chance of weekend work
          if (Math.random() > 0.2) continue;
        }

        // Generate timesheets for different users with various patterns
        for (const user of users.slice(0, 12)) { // Use first 12 users
          const shouldGenerateTimesheet = Math.random() > 0.15; // 85% chance
          if (!shouldGenerateTimesheet) continue;

          // Select random project for this user
          const randomProject = projects[Math.floor(Math.random() * projects.length)];
          
          // Generate realistic work scenarios
          const scenarios = [
            // Regular full day
            { duration: 8, description: 'Project development and client meetings', billable: true, status: TimeEntryStatus.APPROVED },
            // Half day
            { duration: 4, description: 'Morning client workshop', billable: true, status: TimeEntryStatus.APPROVED },
            // Overtime
            { duration: 10, description: 'Critical deployment - extended hours', billable: true, status: TimeEntryStatus.APPROVED },
            // Non-billable work
            { duration: 6, description: 'Internal training and development', billable: false, status: TimeEntryStatus.APPROVED },
            // Partial day
            { duration: 6, description: 'Client site visit and requirements gathering', billable: true, status: TimeEntryStatus.APPROVED },
            // Recent submitted (pending approval)
            { duration: 8, description: 'System integration testing', billable: true, status: TimeEntryStatus.SUBMITTED },
            // Recent draft
            { duration: 7.5, description: 'Code review and documentation', billable: true, status: TimeEntryStatus.DRAFT },
            // Rejected (for workflow testing)
            { duration: 8, description: 'Project work - needs better description', billable: true, status: TimeEntryStatus.REJECTED }
          ];

          const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
          
          // Adjust status based on date (recent entries more likely to be pending)
          let finalStatus = scenario.status;
          const daysSinceWork = Math.floor((currentDate.getTime() - workDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceWork < 7) {
            // Recent work - mix of statuses
            const recentStatuses = [TimeEntryStatus.DRAFT, TimeEntryStatus.SUBMITTED, TimeEntryStatus.APPROVED];
            finalStatus = recentStatuses[Math.floor(Math.random() * recentStatuses.length)];
          } else if (daysSinceWork < 14) {
            // Medium recent - mostly submitted or approved
            finalStatus = Math.random() > 0.3 ? TimeEntryStatus.APPROVED : TimeEntryStatus.SUBMITTED;
          } else {
            // Older work - mostly approved
            finalStatus = Math.random() > 0.1 ? TimeEntryStatus.APPROVED : TimeEntryStatus.REJECTED;
          }

          timesheetData.push({
            userId: user.id,
            projectId: randomProject.id,
            date: workDate,
            duration: scenario.duration,
            description: scenario.description,
            billable: scenario.billable,
            status: finalStatus,
            billRate: scenario.billable ? randomProject.defaultBillRate || 150 : null
          });
        }
      }
    }

    // Batch create time entries
    console.log(`📝 Creating ${timesheetData.length} time entries...`);
    await prisma.timeEntry.createMany({
      data: timesheetData
    });

    // 5. GENERATE SUMMARY STATISTICS
    console.log('📊 Generating summary statistics...');
    
    const stats = {
      clients: await prisma.client.count(),
      activeClients: await prisma.client.count({ where: { isActive: true } }),
      projects: await prisma.project.count(),
      activeProjects: await prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      users: await prisma.user.count(),
      timeEntries: await prisma.timeEntry.count(),
      approvedTimeEntries: await prisma.timeEntry.count({ where: { status: TimeEntryStatus.APPROVED } }),
      pendingTimeEntries: await prisma.timeEntry.count({ where: { status: TimeEntryStatus.SUBMITTED } }),
      draftTimeEntries: await prisma.timeEntry.count({ where: { status: TimeEntryStatus.DRAFT } }),
      rejectedTimeEntries: await prisma.timeEntry.count({ where: { status: TimeEntryStatus.REJECTED } }),
      totalBillableHours: await prisma.timeEntry.aggregate({
        where: { billable: true, status: TimeEntryStatus.APPROVED },
        _sum: { duration: true }
      }),
      totalBillableRevenue: await prisma.timeEntry.aggregate({
        where: { billable: true, status: TimeEntryStatus.APPROVED },
        _sum: { billRate: true }
      })
    };

    console.log('\n🎯 UAT Demo Data Generation Complete!');
    console.log('================================================');
    console.log('📊 COMPREHENSIVE TEST DATA SUMMARY:');
    console.log(`   • ${stats.clients} total clients (${stats.activeClients} active)`);
    console.log(`   • ${stats.projects} total projects (${stats.activeProjects} active)`);
    console.log(`   • ${stats.users} total users across all roles`);
    console.log(`   • ${stats.timeEntries} total time entries`);
    console.log('');
    console.log('⏰ TIME ENTRY STATUS BREAKDOWN:');
    console.log(`   • ${stats.approvedTimeEntries} approved time entries`);
    console.log(`   • ${stats.pendingTimeEntries} submitted (pending approval)`);
    console.log(`   • ${stats.draftTimeEntries} draft time entries`);
    console.log(`   • ${stats.rejectedTimeEntries} rejected time entries`);
    console.log('');
    console.log('💰 FINANCIAL DATA:');
    console.log(`   • ${stats.totalBillableHours._sum.duration || 0} total billable hours approved`);
    console.log(`   • Estimated revenue data available for reporting`);
    console.log('');
    console.log('🧪 UAT TEST COVERAGE:');
    console.log('   ✅ Enterprise, mid-market, small business clients');
    console.log('   ✅ Various project types and statuses');
    console.log('   ✅ Complete time entry approval workflows');
    console.log('   ✅ Historical data spanning 3 months');
    console.log('   ✅ Edge cases (overtime, weekends, rejections)');
    console.log('   ✅ Multi-role user scenarios');
    console.log('   ✅ Billing and reporting test data');
    console.log('================================================');

  } catch (error) {
    console.error('❌ Error generating UAT demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the data generation
generateComprehensiveUATData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
