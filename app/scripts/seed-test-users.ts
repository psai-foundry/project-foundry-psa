
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test users for UAT testing...');

  // Hash password for all test users
  const hashedPassword = await bcrypt.hash('TestUser123!', 12);

  const testUsers = [
    {
      email: 'admin@foundry.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      department: 'IT',
      hourlyRate: 150.0,
      defaultBillRate: 200.0
    },
    {
      email: 'partner@foundry.com',
      name: 'Sarah Partner',
      role: UserRole.PARTNER,
      department: 'Leadership',
      hourlyRate: 300.0,
      defaultBillRate: 400.0
    },
    {
      email: 'principal@foundry.com',
      name: 'Michael Principal',
      role: UserRole.PRINCIPAL,
      department: 'Strategy',
      hourlyRate: 275.0,
      defaultBillRate: 375.0
    },
    {
      email: 'practicelead@foundry.com',
      name: 'Jennifer Practice-Lead',
      role: UserRole.PRACTICE_LEAD,
      department: 'Digital Transformation',
      hourlyRate: 200.0,
      defaultBillRate: 275.0
    },
    {
      email: 'manager@foundry.com',
      name: 'David Manager',
      role: UserRole.MANAGER,
      department: 'Project Management',
      hourlyRate: 125.0,
      defaultBillRate: 175.0
    },
    {
      email: 'senior@foundry.com',
      name: 'Lisa Senior-Consultant',
      role: UserRole.SENIOR_CONSULTANT,
      department: 'Technology',
      hourlyRate: 110.0,
      defaultBillRate: 150.0
    },
    {
      email: 'employee@foundry.com',
      name: 'Robert Employee',
      role: UserRole.EMPLOYEE,
      department: 'Operations',
      hourlyRate: 85.0,
      defaultBillRate: 115.0
    },
    {
      email: 'junior@foundry.com',
      name: 'Emily Junior-Consultant',
      role: UserRole.JUNIOR_CONSULTANT,
      department: 'Analytics',
      hourlyRate: 65.0,
      defaultBillRate: 90.0
    },
    {
      email: 'contractor@foundry.com',
      name: 'Alex Contractor',
      role: UserRole.CONTRACTOR,
      department: 'Development',
      hourlyRate: 95.0,
      defaultBillRate: 130.0
    },
    {
      email: 'client@foundry.com',
      name: 'Maria Client-User',
      role: UserRole.CLIENT_USER,
      department: 'External',
      hourlyRate: 0.0,
      defaultBillRate: 0.0
    }
  ];

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { email: userData.email },
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      console.log(`✅ Updated user: ${userData.email} (${userData.role})`);
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword
        }
      });
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    }
  }

  console.log('\n🎉 Test user seeding completed!');
  console.log('\n📋 Test User Credentials:');
  console.log('Password for all users: TestUser123!');
  console.log('\n👥 Available test accounts:');
  
  testUsers.forEach(user => {
    console.log(`${user.role.padEnd(20)} | ${user.email.padEnd(25)} | ${user.name}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
