
import { UserRole } from '@prisma/client';

// Permission levels for different actions
export enum Permission {
  // Project Management
  CREATE_PROJECT = 'CREATE_PROJECT',
  EDIT_ALL_PROJECTS = 'EDIT_ALL_PROJECTS',
  EDIT_ASSIGNED_PROJECTS = 'EDIT_ASSIGNED_PROJECTS',
  VIEW_ALL_PROJECTS = 'VIEW_ALL_PROJECTS',
  VIEW_ASSIGNED_PROJECTS = 'VIEW_ASSIGNED_PROJECTS',
  DELETE_PROJECT = 'DELETE_PROJECT',
  
  // Client Management
  CREATE_CLIENT = 'CREATE_CLIENT',
  EDIT_ALL_CLIENTS = 'EDIT_ALL_CLIENTS',
  VIEW_ALL_CLIENTS = 'VIEW_ALL_CLIENTS',
  VIEW_ASSIGNED_CLIENTS = 'VIEW_ASSIGNED_CLIENTS',
  DELETE_CLIENT = 'DELETE_CLIENT',
  
  // Time Management
  APPROVE_TIMESHEET = 'APPROVE_TIMESHEET',
  VIEW_ALL_TIMESHEETS = 'VIEW_ALL_TIMESHEETS',
  VIEW_TEAM_TIMESHEETS = 'VIEW_TEAM_TIMESHEETS',
  EDIT_ALL_TIMESHEET = 'EDIT_ALL_TIMESHEET',
  SUBMIT_TIMESHEET = 'SUBMIT_TIMESHEET',
  
  // User Management
  CREATE_USER = 'CREATE_USER',
  EDIT_ALL_USERS = 'EDIT_ALL_USERS',
  VIEW_ALL_USERS = 'VIEW_ALL_USERS',
  DELETE_USER = 'DELETE_USER',
  
  // Financial
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  EDIT_BILLING_RATES = 'EDIT_BILLING_RATES',
  APPROVE_INVOICES = 'APPROVE_INVOICES',
  
  // System Administration  
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
  AUDIT_LOGS = 'AUDIT_LOGS',
  XERO_INTEGRATION = 'XERO_INTEGRATION',
  MANUAL_OVERRIDES = 'MANUAL_OVERRIDES',
  
  // Reporting
  VIEW_EXECUTIVE_REPORTS = 'VIEW_EXECUTIVE_REPORTS',
  VIEW_TEAM_REPORTS = 'VIEW_TEAM_REPORTS',
  VIEW_PERSONAL_REPORTS = 'VIEW_PERSONAL_REPORTS'
}

// Role-based permission mapping
export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full system access
    Permission.CREATE_PROJECT,
    Permission.EDIT_ALL_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,
    Permission.DELETE_PROJECT,
    Permission.CREATE_CLIENT,
    Permission.EDIT_ALL_CLIENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.DELETE_CLIENT,
    Permission.APPROVE_TIMESHEET,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.EDIT_ALL_TIMESHEET,
    Permission.SUBMIT_TIMESHEET,
    Permission.CREATE_USER,
    Permission.EDIT_ALL_USERS,
    Permission.VIEW_ALL_USERS,
    Permission.DELETE_USER,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.EDIT_BILLING_RATES,
    Permission.APPROVE_INVOICES,
    Permission.SYSTEM_SETTINGS,
    Permission.AUDIT_LOGS,
    Permission.XERO_INTEGRATION,
    Permission.MANUAL_OVERRIDES,
    Permission.VIEW_EXECUTIVE_REPORTS,
    Permission.VIEW_TEAM_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS
  ],

  [UserRole.PARTNER]: [
    // Full business access, limited system admin
    Permission.CREATE_PROJECT,
    Permission.EDIT_ALL_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,
    Permission.DELETE_PROJECT,
    Permission.CREATE_CLIENT,
    Permission.EDIT_ALL_CLIENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.APPROVE_TIMESHEET,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.VIEW_ALL_USERS,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.EDIT_BILLING_RATES,
    Permission.APPROVE_INVOICES,
    Permission.VIEW_EXECUTIVE_REPORTS,
    Permission.VIEW_TEAM_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.PRINCIPAL]: [
    // Similar to Partner but may have slightly different focus
    Permission.CREATE_PROJECT,
    Permission.EDIT_ALL_PROJECTS,
    Permission.VIEW_ALL_PROJECTS,
    Permission.CREATE_CLIENT,
    Permission.EDIT_ALL_CLIENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.APPROVE_TIMESHEET,
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.VIEW_ALL_USERS,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.EDIT_BILLING_RATES,
    Permission.APPROVE_INVOICES,
    Permission.VIEW_EXECUTIVE_REPORTS,
    Permission.VIEW_TEAM_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.PRACTICE_LEAD]: [
    // Manage assigned projects and teams
    Permission.EDIT_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_CLIENTS,
    Permission.APPROVE_TIMESHEET,
    Permission.VIEW_TEAM_TIMESHEETS,
    Permission.VIEW_FINANCIAL_REPORTS,
    Permission.VIEW_TEAM_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.MANAGER]: [
    // Team management capabilities
    Permission.EDIT_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_CLIENTS,
    Permission.APPROVE_TIMESHEET,
    Permission.VIEW_TEAM_TIMESHEETS,
    Permission.VIEW_TEAM_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.SENIOR_CONSULTANT]: [
    // Project-level access
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_ASSIGNED_CLIENTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.EMPLOYEE]: [
    // Basic employee access
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.JUNIOR_CONSULTANT]: [
    // Task-level access
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.CONTRACTOR]: [
    // Limited access similar to junior consultant
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.SUBMIT_TIMESHEET
  ],

  [UserRole.CLIENT_USER]: [
    // Read-only access to own projects
    Permission.VIEW_ASSIGNED_PROJECTS,
    Permission.VIEW_PERSONAL_REPORTS
  ]
};

// Utility functions for permission checking
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) ?? false;
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function getUserPermissions(userRole: UserRole): Permission[] {
  return rolePermissions[userRole] ?? [];
}

// Navigation items based on role
export function getNavigationItems(userRole: UserRole) {
  const items = [];

  // Dashboard - everyone gets this
  items.push({
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'dashboard'
  });

  // Projects
  if (hasAnyPermission(userRole, [Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS])) {
    items.push({
      name: 'Projects',
      href: '/projects',
      icon: 'folder'
    });
  }

  // Clients  
  if (hasAnyPermission(userRole, [Permission.VIEW_ALL_CLIENTS, Permission.VIEW_ASSIGNED_CLIENTS])) {
    items.push({
      name: 'Clients', 
      href: '/clients',
      icon: 'users'
    });
  }

  // Time Tracking
  if (hasPermission(userRole, Permission.SUBMIT_TIMESHEET)) {
    items.push({
      name: 'Time Tracking',
      href: '/time',
      icon: 'clock'
    });
  }

  // Timesheets
  if (hasAnyPermission(userRole, [Permission.VIEW_ALL_TIMESHEETS, Permission.VIEW_TEAM_TIMESHEETS])) {
    items.push({
      name: 'Timesheets',
      href: '/timesheets', 
      icon: 'calendar'
    });
  }

  // Reports
  if (hasAnyPermission(userRole, [Permission.VIEW_EXECUTIVE_REPORTS, Permission.VIEW_TEAM_REPORTS, Permission.VIEW_PERSONAL_REPORTS])) {
    items.push({
      name: 'Reports',
      href: '/reports',
      icon: 'chart'
    });
  }

  // Users/Team
  if (hasPermission(userRole, Permission.VIEW_ALL_USERS)) {
    items.push({
      name: 'Team',
      href: '/users',
      icon: 'team'
    });
  }

  // Settings
  if (hasAnyPermission(userRole, [Permission.SYSTEM_SETTINGS, Permission.VIEW_PERSONAL_REPORTS])) {
    items.push({
      name: 'Settings',
      href: '/settings',
      icon: 'settings'
    });
  }

  return items;
}

// Role display helpers
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.PARTNER]: 'Partner',
    [UserRole.PRINCIPAL]: 'Principal',
    [UserRole.PRACTICE_LEAD]: 'Practice Lead',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.SENIOR_CONSULTANT]: 'Senior Consultant',
    [UserRole.EMPLOYEE]: 'Employee',
    [UserRole.JUNIOR_CONSULTANT]: 'Junior Consultant',
    [UserRole.CONTRACTOR]: 'Contractor',
    [UserRole.CLIENT_USER]: 'Client User'
  };
  return roleNames[role] || 'Unknown Role';
}

export function getRolePriority(role: UserRole): number {
  const priorities: Record<UserRole, number> = {
    [UserRole.ADMIN]: 100,
    [UserRole.PARTNER]: 90,
    [UserRole.PRINCIPAL]: 85,
    [UserRole.PRACTICE_LEAD]: 70,
    [UserRole.MANAGER]: 60,
    [UserRole.SENIOR_CONSULTANT]: 50,
    [UserRole.EMPLOYEE]: 40,
    [UserRole.JUNIOR_CONSULTANT]: 30,
    [UserRole.CONTRACTOR]: 20,
    [UserRole.CLIENT_USER]: 10
  };
  return priorities[role] || 0;
}
