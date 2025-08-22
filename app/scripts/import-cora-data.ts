
import { PrismaClient, UserRole } from '@prisma/client'
import { promises as fs } from 'fs'
import { parse } from 'csv'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

interface CORAUser {
  User_ID: string
  UserName: string
  FirstName: string
  Surname: string
  Email: string
  User_Type_Desc: string
  Practice: string
}

interface CORAProject {
  'Column1.id': string
  'Column1.description': string
  'Column1.liveDate': string
  'Column1.startDate': string
  'Column1.finishDate': string
  'Column1.projectStatusDescription': string
  'Column1.percentageComplete': string
}

interface CORATask {
  id: string
  description: string
  projectId: string
  projectName: string
  startDate: string
  finishDate: string
  duration: string
  statusDescription: string
}

interface CORATimesheet {
  'Column1.id': string
  'Column1.userId': string
  'Column1.username': string
  'Column1.userFullName': string
  'Column1.startDate': string
  'Column1.endDate': string
  'Column1.statusDescription': string
}

interface CORATimesheetEntry {
  Timesheet_ID: string
  UserId: string
  Username: string
  TaskId: string
  TaskDescription: string
  ProjectId: string
  ProjectDescription: string
  Hours: string
  Timesheet_Entry_Date: string
  Days: string
}

// Helper function to parse CSV files
async function parseCSV<T>(filePath: string): Promise<T[]> {
  let fileContent = await fs.readFile(filePath, 'utf8')
  
  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1)
  }
  
  return new Promise((resolve, reject) => {
    const records: T[] = []
    
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    parser.on('readable', function(this: any) {
      let record
      while (record = this.read()) {
        records.push(record)
      }
    })
    .on('error', reject)
    .on('end', () => resolve(records))
  })
}

// Map CORA user type to system role
function mapUserRole(userType: string): UserRole {
  switch (userType?.toLowerCase()) {
    case 'administrator':
      return UserRole.ADMIN
    case 'manager':
      return UserRole.MANAGER
    case 'partner':
      return UserRole.PARTNER
    case 'principal':
      return UserRole.PRINCIPAL
    case 'senior consultant':
      return UserRole.SENIOR_CONSULTANT
    case 'junior consultant':
      return UserRole.JUNIOR_CONSULTANT
    case 'contractor':
      return UserRole.CONTRACTOR
    default:
      return UserRole.EMPLOYEE
  }
}

// Create a default client if none exists
async function ensureDefaultClient() {
  let defaultClient = await prisma.client.findFirst({
    where: { name: 'Default Client' }
  })
  
  if (!defaultClient) {
    defaultClient = await prisma.client.create({
      data: {
        name: 'Default Client',
        email: 'admin@defaultclient.com',
        description: 'Auto-created client for CORA data import'
      }
    })
  }
  
  return defaultClient
}

// Extract client name from project description
function extractClientName(projectDescription: string): string {
  // Try to extract client name from project description
  // Common patterns: "Client - ProjectName" or "ProjectName - Client"
  const parts = projectDescription.split(' - ')
  if (parts.length >= 2) {
    return parts[0].trim()
  }
  return 'Unknown Client'
}

async function importUsers() {
  console.log('🔄 Importing Users...')
  
  // Import completed - external files no longer needed
  const coraUsers: CORAUser[] = []
  
  const userMap = new Map<string, string>() // CORA ID -> New ID
  let imported = 0
  
  for (const coraUser of coraUsers) {
    try {
      // Skip invalid records
      if (!coraUser.Email || coraUser.User_Type_Desc?.toLowerCase() === 'inactive') {
        continue
      }
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: coraUser.Email }
      })
      
      if (existingUser) {
        userMap.set(coraUser.User_ID, existingUser.id)
        continue
      }
      
      const hashedPassword = await bcrypt.hash('tempPassword123!', 10)
      
      const user = await prisma.user.create({
        data: {
          email: coraUser.Email,
          name: `${coraUser.FirstName} ${coraUser.Surname}`.trim(),
          password: hashedPassword,
          role: mapUserRole(coraUser.User_Type_Desc),
          department: coraUser.Practice || null,
          isActive: coraUser.User_Type_Desc?.toLowerCase() !== 'inactive'
        }
      })
      
      userMap.set(coraUser.User_ID, user.id)
      imported++
    } catch (error) {
      console.error(`❌ Error importing user ${coraUser.Email}:`, error)
    }
  }
  
  console.log(`✅ Imported ${imported} users`)
  return userMap
}

async function importClients(coraProjects: CORAProject[]) {
  console.log('🔄 Creating Clients from Projects...')
  
  const clientNames = new Set<string>()
  const clientMap = new Map<string, string>() // Client Name -> Client ID
  
  // Extract unique client names from projects
  for (const project of coraProjects) {
    const clientName = extractClientName(project['Column1.description'])
    clientNames.add(clientName)
  }
  
  let imported = 0
  
  for (const clientName of Array.from(clientNames)) {
    try {
      const existingClient = await prisma.client.findFirst({
        where: { name: clientName }
      })
      
      if (existingClient) {
        clientMap.set(clientName, existingClient.id)
        continue
      }
      
      const client = await prisma.client.create({
        data: {
          name: clientName,
          description: `Client imported from CORA data`,
          isActive: true
        }
      })
      
      clientMap.set(clientName, client.id)
      imported++
    } catch (error) {
      console.error(`❌ Error creating client ${clientName}:`, error)
    }
  }
  
  console.log(`✅ Created ${imported} clients`)
  return clientMap
}

async function importProjects(clientMap: Map<string, string>) {
  console.log('🔄 Importing Projects...')
  
  // Import completed - external files no longer needed
  const coraProjects: CORAProject[] = []
  const defaultClient = await ensureDefaultClient()
  
  const projectMap = new Map<string, string>() // CORA ID -> New ID
  let imported = 0
  
  console.log(`🔍 Found ${coraProjects.length} projects in CSV`)
  
  for (const coraProject of coraProjects) {
    const projectName = coraProject['Column1.description'] || 'Unknown Project'
    try {
      
      // Skip projects with empty names
      if (!projectName || projectName.trim() === '') {
        console.log(`⚠️ Skipping project ${coraProject['Column1.id']}: empty name`)
        continue
      }
      
      const clientName = extractClientName(projectName)
      const clientId = clientMap.get(clientName) || defaultClient.id
      
      // Generate unique project code
      const projectCode = `CORA-${coraProject['Column1.id']}`
      
      // Check if project already exists
      const existingProject = await prisma.project.findUnique({
        where: { code: projectCode }
      })
      
      if (existingProject) {
        projectMap.set(coraProject['Column1.id'], existingProject.id)
        continue
      }
      
      const project = await prisma.project.create({
        data: {
          name: projectName,
          code: projectCode,
          clientId,
          description: `Imported from CORA: ${projectName}`,
          status: coraProject['Column1.projectStatusDescription'] === 'Green' ? 'ACTIVE' : 'COMPLETED',
          startDate: coraProject['Column1.startDate'] ? new Date(coraProject['Column1.startDate']) : null,
          endDate: coraProject['Column1.finishDate'] ? new Date(coraProject['Column1.finishDate']) : null,
          billable: true
        }
      })
      
      projectMap.set(coraProject['Column1.id'], project.id)
      imported++
      
      if (imported <= 5) {
        console.log(`✅ Successfully imported project: ${projectName} (ID: ${coraProject['Column1.id']})`)
      }
    } catch (error) {
      console.error(`❌ Error importing project ${coraProject['Column1.id']} (${projectName}):`, error)
      if (imported < 5) {
        console.error('Full project data:', JSON.stringify(coraProject, null, 2))
      }
    }
  }
  
  console.log(`✅ Imported ${imported} projects`)
  return projectMap
}

async function importTasks(projectMap: Map<string, string>) {
  console.log('🔄 Importing Tasks...')
  
  // Import completed - external files no longer needed
  const coraTasks: CORATask[] = []
  
  const taskMap = new Map<string, string>() // CORA ID -> New ID
  let imported = 0
  
  for (const coraTask of coraTasks) {
    try {
      const projectId = projectMap.get(coraTask.projectId)
      if (!projectId) {
        console.log(`⚠️ Skipping task ${coraTask.id}: Project ${coraTask.projectId} not found`)
        continue
      }
      
      // Check if task already exists
      const existingTask = await prisma.task.findFirst({
        where: {
          projectId,
          name: coraTask.description
        }
      })
      
      if (existingTask) {
        taskMap.set(coraTask.id, existingTask.id)
        continue
      }
      
      const task = await prisma.task.create({
        data: {
          name: coraTask.description,
          projectId,
          description: `Imported from CORA: ${coraTask.description}`,
          status: coraTask.statusDescription?.toLowerCase().includes('complete') ? 'COMPLETED' : 'OPEN',
          estimatedHours: coraTask.duration ? parseFloat(coraTask.duration) : null,
          billable: true
        }
      })
      
      taskMap.set(coraTask.id, task.id)
      imported++
    } catch (error) {
      console.error(`❌ Error importing task ${coraTask.id}:`, error)
    }
  }
  
  console.log(`✅ Imported ${imported} tasks`)
  return taskMap
}

async function importTimeEntries(
  userMap: Map<string, string>, 
  projectMap: Map<string, string>,
  taskMap: Map<string, string>
) {
  console.log('🔄 Importing Time Entries...')
  
  // Import completed - external files no longer needed
  const coraEntries: CORATimesheetEntry[] = []
  
  let imported = 0
  let skipped = 0
  
  for (const entry of coraEntries) {
    try {
      const userId = userMap.get(entry.UserId)
      const projectId = projectMap.get(entry.ProjectId)
      const taskId = taskMap.get(entry.TaskId)
      
      if (!userId || !projectId) {
        skipped++
        continue
      }
      
      const hours = parseFloat(entry.Hours)
      if (isNaN(hours) || hours <= 0) {
        skipped++
        continue
      }
      
      // Parse date - handle different formats
      let entryDate: Date
      try {
        const dateStr = entry.Timesheet_Entry_Date
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/')
          entryDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
        } else {
          entryDate = new Date(dateStr)
        }
      } catch {
        entryDate = new Date()
      }
      
      // Check for duplicate entry
      const existingEntry = await prisma.timeEntry.findFirst({
        where: {
          userId,
          projectId,
          date: entryDate,
          duration: hours
        }
      })
      
      if (existingEntry) {
        continue
      }
      
      await prisma.timeEntry.create({
        data: {
          userId,
          projectId,
          taskId: taskId || null,
          date: entryDate,
          duration: hours,
          description: entry.TaskDescription || 'Imported from CORA',
          billable: true,
          status: 'SUBMITTED'
        }
      })
      
      imported++
      
      if (imported % 1000 === 0) {
        console.log(`📈 Imported ${imported} time entries...`)
      }
    } catch (error) {
      console.error(`❌ Error importing time entry:`, error)
      skipped++
    }
  }
  
  console.log(`✅ Imported ${imported} time entries (${skipped} skipped)`)
}

async function main() {
  console.log('🚀 Starting CORA Data Import...')
  
  try {
    // Import in dependency order
    const userMap = await importUsers()
    
    // Load projects first to extract clients
    // Import completed - external files no longer needed
    const coraProjects: CORAProject[] = []
    const clientMap = await importClients(coraProjects)
    
    const projectMap = await importProjects(clientMap)
    const taskMap = await importTasks(projectMap)
    
    await importTimeEntries(userMap, projectMap, taskMap)
    
    console.log('🎉 CORA Data Import Complete!')
    
    // Print summary
    const userCount = await prisma.user.count()
    const clientCount = await prisma.client.count()
    const projectCount = await prisma.project.count()
    const taskCount = await prisma.task.count()
    const timeEntryCount = await prisma.timeEntry.count()
    
    console.log('\n📊 Database Summary:')
    console.log(`Users: ${userCount}`)
    console.log(`Clients: ${clientCount}`)
    console.log(`Projects: ${projectCount}`)
    console.log(`Tasks: ${taskCount}`)
    console.log(`Time Entries: ${timeEntryCount}`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
