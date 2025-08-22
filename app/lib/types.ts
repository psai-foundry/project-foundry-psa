
import { UserRole, ProjectStatus, TaskStatus } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department?: string | null;
  hourlyRate?: number | null;
  defaultBillRate?: number | null;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  description: string | null;
  billable: boolean;
  billRate: number | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  isRunning: boolean;
  aiSuggested: boolean;
  aiCategory: string | null;
  aiConfidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  contacts?: ClientContact[];
  projects?: Project[];
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  client?: Client;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  clientId: string;
  portfolioId: string | null;
  programId: string | null;
  status: ProjectStatus;
  budget: number | null;
  startDate: Date | null;
  endDate: Date | null;
  billable: boolean;
  defaultBillRate: number | null;
  createdAt: Date;
  updatedAt: Date;
  client?: Client;
  tasks?: Task[];
  assignments?: ProjectAssignment[];
  timeEntries?: TimeEntry[];
}

export interface Task {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  status: TaskStatus;
  estimatedHours: number | null;
  billable: boolean;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  timeEntries?: TimeEntry[];
}

export interface ProjectAssignment {
  id: string;
  userId: string;
  projectId: string;
  role: string | null;
  billRate: number | null;
  createdAt: Date;
  user?: User;
  project?: Project;
}

export interface TimesheetSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entriesCount: number;
  weekStartDate: Date;
  weekEndDate: Date;
}

export interface AIInsight {
  id: string;
  type: 'PRODUCTIVITY_PATTERN' | 'TIME_OPTIMIZATION' | 'PROJECT_SUGGESTION' | 'BILLING_ANOMALY' | 'DUPLICATE_DETECTION';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  dismissed: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalHoursToday: number;
  totalHoursWeek: number;
  activeProjects: number;
  pendingApprovals: number;
  completedTasks: number;
  billableHoursWeek: number;
  recentTimeEntries: TimeEntry[];
  aiInsights: AIInsight[];
}
