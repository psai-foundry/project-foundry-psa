
'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard,
  Clock,
  Calendar,
  BarChart3,
  Settings,
  Users,
  FolderOpen,
  CheckSquare,
  LogOut,
  Brain,
  Timer,
  Building2,
  FileText,
  Shield,
  UserCheck,
  TrendingUp,
  PieChart,
  FileBarChart
} from 'lucide-react';
import { UserRole } from '@prisma/client';
import { getRoleDisplayName, getUserPermissions, Permission } from '@/lib/permissions';

// Define navigation items with required permissions
const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    permissions: [] // Available to all authenticated users
  },
  { 
    name: 'Time Tracker', 
    href: '/dashboard/time-tracker', 
    icon: Timer,
    permissions: [Permission.SUBMIT_TIMESHEET]
  },
  { 
    name: 'Timesheets', 
    href: '/dashboard/timesheets', 
    icon: Calendar,
    permissions: [Permission.VIEW_ALL_TIMESHEETS, Permission.VIEW_TEAM_TIMESHEETS, Permission.SUBMIT_TIMESHEET]
  },
  { 
    name: 'Clients', 
    href: '/dashboard/clients', 
    icon: Building2,
    permissions: [Permission.VIEW_ALL_CLIENTS, Permission.VIEW_ASSIGNED_CLIENTS]
  },
  { 
    name: 'Projects', 
    href: '/dashboard/projects', 
    icon: FolderOpen,
    permissions: [Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS]
  },
  { 
    name: 'Tasks', 
    href: '/dashboard/tasks', 
    icon: CheckSquare,
    permissions: [Permission.VIEW_ASSIGNED_PROJECTS]
  },
  { 
    name: 'Reports', 
    href: '/dashboard/reports', 
    icon: BarChart3,
    permissions: [Permission.VIEW_EXECUTIVE_REPORTS, Permission.VIEW_TEAM_REPORTS, Permission.VIEW_PERSONAL_REPORTS]
  },
  { 
    name: 'AI Insights', 
    href: '/dashboard/insights', 
    icon: Brain,
    permissions: [Permission.VIEW_PERSONAL_REPORTS]
  },
];

// Resource & Capacity Management items
const resourceManagementItems = [
  { 
    name: 'Resource Management', 
    href: '/resource-management', 
    icon: UserCheck,
    permissions: [Permission.VIEW_ALL_USERS, Permission.VIEW_TEAM_REPORTS] 
  },
  { 
    name: 'Capacity Planning', 
    href: '/capacity-planning', 
    icon: TrendingUp,
    permissions: [Permission.VIEW_TEAM_REPORTS, Permission.VIEW_EXECUTIVE_REPORTS]
  },
  { 
    name: 'Resource Tracker', 
    href: '/resource-tracker', 
    icon: PieChart,
    permissions: [Permission.VIEW_ALL_PROJECTS, Permission.VIEW_TEAM_REPORTS]
  },
  { 
    name: 'Reports & Analytics', 
    href: '/reports', 
    icon: FileBarChart,
    permissions: [Permission.VIEW_EXECUTIVE_REPORTS, Permission.VIEW_TEAM_REPORTS]
  }
];

const managementItems = [
  { 
    name: 'Team', 
    href: '/dashboard/team', 
    icon: Users,
    permissions: [Permission.VIEW_ALL_USERS]
  },
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings,
    permissions: [Permission.SYSTEM_SETTINGS, Permission.VIEW_PERSONAL_REPORTS] // Basic settings for everyone
  },
];

const adminItems = [
  { 
    name: 'System Admin', 
    href: '/dashboard/admin', 
    icon: Shield,
    permissions: [Permission.SYSTEM_SETTINGS]
  },
  { 
    name: 'Audit Logs', 
    href: '/dashboard/audit', 
    icon: FileText,
    permissions: [Permission.AUDIT_LOGS]
  },
];

export function Sidebar() {
  const { data: session } = useSession() || {};
  const pathname = usePathname();

  const userRole = session?.user?.role as UserRole;
  const userPermissions = userRole ? getUserPermissions(userRole) : [];

  // Filter navigation items based on user permissions
  const availableNavItems = navigationItems.filter(item => 
    item.permissions.length === 0 || 
    item.permissions.some(permission => userPermissions.includes(permission))
  );

  const availableResourceManagementItems = resourceManagementItems.filter(item =>
    item.permissions.some(permission => userPermissions.includes(permission))
  );

  const availableManagementItems = managementItems.filter(item =>
    item.permissions.some(permission => userPermissions.includes(permission))
  );

  const availableAdminItems = adminItems.filter(item =>
    item.permissions.some(permission => userPermissions.includes(permission))
  );

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <Clock className="w-8 h-8 text-blue-500 mr-3" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Project Foundry</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">PSA Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Main Navigation */}
        {availableNavItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </Link>
        ))}

        {/* Resource & Capacity Management Section */}
        {availableResourceManagementItems.length > 0 && (
          <>
            <div className="pt-6 pb-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Resource & Capacity
              </h3>
            </div>
            {availableResourceManagementItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </>
        )}

        {/* Management Section */}
        {availableManagementItems.length > 0 && (
          <>
            <div className="pt-6 pb-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Management
              </h3>
            </div>
            {availableManagementItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </>
        )}

        {/* Admin Section */}
        {availableAdminItems.length > 0 && (
          <>
            <div className="pt-6 pb-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Administration
              </h3>
            </div>
            {availableAdminItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="flex flex-col p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center mb-3">
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage src="" alt={session?.user?.name || ''} />
            <AvatarFallback>
              {session?.user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session?.user?.email}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {userRole ? getRoleDisplayName(userRole) : 'Unknown Role'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
