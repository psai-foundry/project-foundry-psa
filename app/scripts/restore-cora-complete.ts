
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  users: any[];
  clients: any[];
  projects: any[];
  tasks: any[];
  timeEntries: any[];
  timesheetSubmissions: any[];
  timesheetSubmissionEntries: any[];
}

async function restoreCompleteCORAData() {
  console.log('🔄 Starting complete CORA data restoration...');
  
  try {
    // Load the backup with complete CORA data
    const backupPath = path.join(process.cwd(), 'backups', 'backup-2025-08-18T13-14-14-099Z.json');
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    console.log('📂 Loading backup file...');
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);
    
    // Create current backup before restoration
    const currentBackupName = `backup-before-complete-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const currentBackupPath = path.join(process.cwd(), 'backups', currentBackupName);
    
    console.log('💾 Creating backup of current state...');
    const currentData = {
      timestamp: new Date().toISOString(),
      users: await prisma.user.findMany(),
      clients: await prisma.client.findMany(),
      projects: await prisma.project.findMany(),
      tasks: await prisma.task.findMany(),
      timeEntries: await prisma.timeEntry.findMany(),
      timesheetSubmissions: await prisma.timesheetSubmission.findMany(),
      timesheetSubmissionEntries: await prisma.timesheetSubmissionEntry.findMany()
    };
    
    fs.writeFileSync(currentBackupPath, JSON.stringify(currentData, null, 2));
    console.log(`✅ Current state backed up to: ${currentBackupName}`);
    
    // Get current client IDs to avoid duplicates
    const existingClients = await prisma.client.findMany({ select: { id: true } });
    const existingClientIds = new Set(existingClients.map(c => c.id));
    
    // Filter out CORA users that might conflict with existing ones
    const currentUsers = await prisma.user.findMany({ select: { email: true } });
    const existingEmails = new Set(currentUsers.map(u => u.email));
    
    const coraUsers = backupData.users.filter(user => 
      !existingEmails.has(user.email) && user.email.includes('cora')
    );
    
    // Restore CORA users first (if any new ones)
    if (coraUsers.length > 0) {
      console.log(`👥 Restoring ${coraUsers.length} CORA users...`);
      for (const user of coraUsers) {
        await prisma.user.create({ data: user });
      }
    }
    
    // Restore projects (all from backup since we have 0)
    console.log(`📁 Restoring ${backupData.projects.length} projects...`);
    for (const project of backupData.projects) {
      await prisma.project.create({ data: project });
    }
    
    // Restore tasks (all from backup since we have 0)
    console.log(`📋 Restoring ${backupData.tasks.length} tasks...`);
    for (const task of backupData.tasks) {
      await prisma.task.create({ data: task });
    }
    
    // Restore time entries (all from backup since we have 0)
    console.log(`⏰ Restoring ${backupData.timeEntries.length} time entries...`);
    for (const timeEntry of backupData.timeEntries) {
      await prisma.timeEntry.create({ data: timeEntry });
    }
    
    // Restore timesheet submissions (all from backup since we have 0)
    if (backupData.timesheetSubmissions) {
      console.log(`📝 Restoring ${backupData.timesheetSubmissions.length} timesheet submissions...`);
      for (const submission of backupData.timesheetSubmissions) {
        await prisma.timesheetSubmission.create({ data: submission });
      }
    }
    
    // Restore timesheet submission entries (all from backup since we have 0)
    if (backupData.timesheetSubmissionEntries) {
      console.log(`📄 Restoring ${backupData.timesheetSubmissionEntries.length} timesheet submission entries...`);
      for (const entry of backupData.timesheetSubmissionEntries) {
        await prisma.timesheetSubmissionEntry.create({ data: entry });
      }
    }
    
    // Final count verification
    console.log('\n📊 Final database counts:');
    const finalCounts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      timeEntries: await prisma.timeEntry.count(),
      timesheetSubmissions: await prisma.timesheetSubmission.count(),
      timesheetSubmissionEntries: await prisma.timesheetSubmissionEntry.count(),
    };
    
    console.log(`Users: ${finalCounts.users}`);
    console.log(`Clients: ${finalCounts.clients}`);
    console.log(`Projects: ${finalCounts.projects}`);
    console.log(`Tasks: ${finalCounts.tasks}`);
    console.log(`Time Entries: ${finalCounts.timeEntries}`);
    console.log(`Timesheet Submissions: ${finalCounts.timesheetSubmissions}`);
    console.log(`Timesheet Submission Entries: ${finalCounts.timesheetSubmissionEntries}`);
    
    console.log('\n✅ Complete CORA data restoration successful!');
    console.log('🔹 All clients, projects, tasks, and timesheets are now available');
    console.log('🔹 No duplicate clients were created');
    console.log('🔹 Current state backed up before restoration');
    
  } catch (error) {
    console.error('❌ Error during CORA data restoration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreCompleteCORAData();
