
import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function createBackup() {
  console.log('🔄 Creating database backup...')
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')
  
  // Ensure backup directory exists
  await fs.mkdir(backupDir, { recursive: true })
  
  const backupData = {
    timestamp,
    users: await prisma.user.findMany(),
    clients: await prisma.client.findMany(),
    projects: await prisma.project.findMany(),
    tasks: await prisma.task.findMany(),
    timeEntries: await prisma.timeEntry.findMany(),
    timesheetSubmissions: await prisma.timesheetSubmission.findMany(),
    projectAssignments: await prisma.projectAssignment.findMany(),
    clientContacts: await prisma.clientContact.findMany()
  }
  
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
  await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2))
  
  console.log(`✅ Backup created: ${backupFile}`)
  
  // Create summary
  console.log('\n📊 Backup Summary:')
  console.log(`Users: ${backupData.users.length}`)
  console.log(`Clients: ${backupData.clients.length}`)
  console.log(`Projects: ${backupData.projects.length}`)
  console.log(`Tasks: ${backupData.tasks.length}`)
  console.log(`Time Entries: ${backupData.timeEntries.length}`)
  console.log(`Timesheet Submissions: ${backupData.timesheetSubmissions.length}`)
  console.log(`Project Assignments: ${backupData.projectAssignments.length}`)
  console.log(`Client Contacts: ${backupData.clientContacts.length}`)
  
  return backupFile
}

async function main() {
  try {
    await createBackup()
  } catch (error) {
    console.error('❌ Backup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { createBackup }
