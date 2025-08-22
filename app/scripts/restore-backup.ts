
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs/promises'

const prisma = new PrismaClient()

async function main() {
  const backupFile = process.argv[2]
  
  if (!backupFile) {
    console.error('Usage: tsx restore-backup.ts <backup-file>')
    process.exit(1)
  }

  try {
    console.log(`🔄 Restoring from backup: ${backupFile}`)
    
    // Read backup file
    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'))
    
    // Clear existing data (in reverse order to avoid foreign key constraints)
    console.log('🧹 Clearing existing data...')
    await prisma.timeEntry.deleteMany()
    await prisma.timesheetSubmission.deleteMany() 
    await prisma.projectAssignment.deleteMany()
    await prisma.clientContact.deleteMany()
    await prisma.task.deleteMany()
    await prisma.project.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()
    
    // Restore data (in correct order)
    console.log('📥 Restoring users...')
    for (const user of backupData.users) {
      await prisma.user.create({ data: user })
    }
    
    console.log('📥 Restoring clients...')
    for (const client of backupData.clients) {
      await prisma.client.create({ data: client })
    }
    
    console.log('📥 Restoring projects...')
    for (const project of backupData.projects) {
      await prisma.project.create({ data: project })
    }
    
    console.log('📥 Restoring tasks...')
    for (const task of backupData.tasks) {
      await prisma.task.create({ data: task })
    }
    
    console.log('📥 Restoring project assignments...')
    for (const assignment of backupData.projectAssignments) {
      await prisma.projectAssignment.create({ data: assignment })
    }
    
    console.log('📥 Restoring client contacts...')
    for (const contact of backupData.clientContacts) {
      await prisma.clientContact.create({ data: contact })
    }
    
    console.log('📥 Restoring time entries...')
    for (const entry of backupData.timeEntries) {
      await prisma.timeEntry.create({ data: entry })
    }
    
    console.log('📥 Restoring timesheet submissions...')
    for (const submission of backupData.timesheetSubmissions) {
      await prisma.timesheetSubmission.create({ data: submission })
    }
    
    console.log('✅ Restore completed successfully!')
    
    // Show final counts
    const users = await prisma.user.count()
    const clients = await prisma.client.count() 
    const projects = await prisma.project.count()
    const tasks = await prisma.task.count()
    const timeEntries = await prisma.timeEntry.count()
    const assignments = await prisma.projectAssignment.count()
    const contacts = await prisma.clientContact.count()
    const submissions = await prisma.timesheetSubmission.count()
    
    console.log('\n📊 Restored Database State:')
    console.log(`Users: ${users}`)
    console.log(`Clients: ${clients}`)
    console.log(`Projects: ${projects}`)
    console.log(`Tasks: ${tasks}`)
    console.log(`Time Entries: ${timeEntries}`)
    console.log(`Project Assignments: ${assignments}`)
    console.log(`Client Contacts: ${contacts}`)
    console.log(`Timesheet Submissions: ${submissions}`)
    
  } catch (error) {
    console.error('❌ Restore failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
