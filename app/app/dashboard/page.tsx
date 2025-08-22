
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RunningTimer } from '@/components/dashboard/running-timer';
import { RecentEntries } from '@/components/dashboard/recent-entries';
import { AIInsights } from '@/components/dashboard/ai-insights';
import { ResourceWidgets } from '@/components/dashboard/resource-widgets';
import { ResourceInsights } from '@/components/dashboard/resource-insights';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/role-guard';
import { 
  Clock, 
  Calendar, 
  FolderOpen, 
  CheckSquare,
  TrendingUp,
  DollarSign,
  Play,
  BarChart3,
  Plus,
  Users,
  AlertTriangle,
  Target,
  Activity,
  Gauge,
  UserCog,
  Calendar as CalendarIcon,
  Zap,
  TrendingDown
} from 'lucide-react';
import { formatDuration, getTimeOfDay } from '@/lib/utils';
import { UserRole } from '@prisma/client';
import { Permission, getRoleDisplayName } from '@/lib/permissions';
import Link from 'next/link';

interface DashboardData {
  totalHoursToday: number;
  totalHoursWeek: number;
  billableHoursWeek: number;
  activeProjects: number;
  pendingApprovals: number;
  completedTasks: number;
  teamMembers: number;
  totalRevenue: number;
  recentTimeEntries: any[];
  aiInsights: any[];
  runningTimer: any;
}

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = session?.user?.role as UserRole;

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStopTimer = async () => {
    // TODO: Implement stop timer functionality
    console.log('Stop timer');
    fetchDashboardData();
  };

  const handlePauseTimer = async () => {
    // TODO: Implement pause timer functionality
    console.log('Pause timer');
    fetchDashboardData();
  };

  const handleDismissInsight = async (id: string) => {
    // TODO: Implement dismiss insight functionality
    console.log('Dismiss insight:', id);
    fetchDashboardData();
  };

  const timeOfDay = getTimeOfDay();
  const greeting = `Good ${timeOfDay}, ${session?.user?.name?.split(' ')[0] || 'there'}!`;
  const roleDisplayName = userRole ? getRoleDisplayName(userRole) : 'User';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {greeting}
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your {roleDisplayName} dashboard - Here's your overview for today
          </p>
        </div>
        <RoleGuard requiredPermission={Permission.SUBMIT_TIMESHEET}>
          <div className="flex space-x-3">
            <Button asChild>
              <Link href="/dashboard/time-tracker">
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/timesheets">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Link>
            </Button>
          </div>
        </RoleGuard>
      </div>

      {/* Role-specific Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Personal Stats - Available to all roles */}
        <RoleGuard requiredPermission={Permission.SUBMIT_TIMESHEET}>
          <StatsCard
            title="Today's Hours"
            value={formatDuration(dashboardData?.totalHoursToday || 0)}
            icon={Clock}
            description="Time tracked today"
          />
        </RoleGuard>
        
        <RoleGuard requiredPermission={Permission.VIEW_PERSONAL_REPORTS}>
          <StatsCard
            title="This Week"
            value={formatDuration(dashboardData?.totalHoursWeek || 0)}
            icon={Calendar}
            description="Total hours this week"
          />
        </RoleGuard>

        <RoleGuard requiredPermission={Permission.SUBMIT_TIMESHEET}>
          <StatsCard
            title="Billable Hours"
            value={formatDuration(dashboardData?.billableHoursWeek || 0)}
            icon={DollarSign}
            description="Billable hours this week"
          />
        </RoleGuard>

        <RoleGuard requiredPermissions={[Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS]}>
          <StatsCard
            title="Active Projects"
            value={dashboardData?.activeProjects || 0}
            icon={FolderOpen}
            description="Projects you're working on"
          />
        </RoleGuard>
      </div>

      {/* Management Stats - For Managers and Above */}
      <RoleGuard requiredPermissions={[Permission.APPROVE_TIMESHEET, Permission.VIEW_ALL_TIMESHEETS]}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Pending Approvals"
            value={dashboardData?.pendingApprovals || 0}
            icon={CheckSquare}
            description="Timesheets awaiting approval"
          />
          <StatsCard
            title="Team Members"
            value={dashboardData?.teamMembers || 0}
            icon={Users}
            description="Active team members"
          />
          <StatsCard
            title="Completed Tasks"
            value={dashboardData?.completedTasks || 0}
            icon={Target}
            description="Tasks completed this week"
          />
          <StatsCard
            title="Team Utilization"
            value="92%"
            icon={TrendingUp}
            description="Average team utilization"
          />
        </div>
      </RoleGuard>

      {/* Executive Stats - For Partners, Principals, Admins */}
      <RoleGuard requiredPermissions={[Permission.VIEW_FINANCIAL_REPORTS, Permission.VIEW_EXECUTIVE_REPORTS]}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Monthly Revenue"
            value={`$${(dashboardData?.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign}
            description="Revenue this month"
          />
          <StatsCard
            title="Profit Margin"
            value="34%"
            icon={TrendingUp}
            description="Current profit margin"
          />
          <StatsCard
            title="Client Satisfaction"
            value="4.8/5"
            icon={BarChart3}
            description="Average client rating"
          />
        </div>
      </RoleGuard>

      {/* Resource Management Dashboard - For Managers and Above */}
      <RoleGuard requiredPermissions={[Permission.VIEW_ALL_USERS, Permission.VIEW_TEAM_TIMESHEETS, Permission.APPROVE_TIMESHEET]}>
        <div className="border-t pt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Resource & Capacity Management
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor resource utilization, capacity planning, and allocation insights
            </p>
          </div>
          <ResourceWidgets userRole={userRole} />
        </div>
      </RoleGuard>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Timer and Recent Entries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Running Timer - Only for roles that can submit timesheets */}
          <RoleGuard requiredPermission={Permission.SUBMIT_TIMESHEET}>
            <RunningTimer
              timer={dashboardData?.runningTimer}
              onStop={handleStopTimer}
              onPause={handlePauseTimer}
            />
          </RoleGuard>

          {/* Recent Entries - Role-based visibility */}
          <RoleGuard requiredPermissions={[Permission.VIEW_ALL_TIMESHEETS, Permission.VIEW_TEAM_TIMESHEETS, Permission.SUBMIT_TIMESHEET]}>
            <RecentEntries entries={dashboardData?.recentTimeEntries || []} />
          </RoleGuard>

          {/* Quick Actions - Role-based actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <RoleGuard requiredPermission={Permission.SUBMIT_TIMESHEET}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/time-tracker">
                      <div className="text-center">
                        <Play className="w-6 h-6 mx-auto mb-2 text-green-500" />
                        <div className="text-sm font-medium">Start Timer</div>
                        <div className="text-xs text-muted-foreground">Begin tracking time</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>
                
                <RoleGuard requiredPermissions={[Permission.VIEW_ALL_TIMESHEETS, Permission.VIEW_TEAM_TIMESHEETS, Permission.SUBMIT_TIMESHEET]}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/timesheets">
                      <div className="text-center">
                        <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <div className="text-sm font-medium">View Timesheets</div>
                        <div className="text-xs text-muted-foreground">Manage your timesheets</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermissions={[Permission.VIEW_ALL_PROJECTS, Permission.VIEW_ASSIGNED_PROJECTS]}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/projects">
                      <div className="text-center">
                        <FolderOpen className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                        <div className="text-sm font-medium">Projects</div>
                        <div className="text-xs text-muted-foreground">View active projects</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermissions={[Permission.VIEW_EXECUTIVE_REPORTS, Permission.VIEW_TEAM_REPORTS, Permission.VIEW_PERSONAL_REPORTS]}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/reports">
                      <div className="text-center">
                        <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                        <div className="text-sm font-medium">Reports</div>
                        <div className="text-xs text-muted-foreground">View analytics</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermission={Permission.APPROVE_TIMESHEET}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/approvals">
                      <div className="text-center">
                        <CheckSquare className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        <div className="text-sm font-medium">Approvals</div>
                        <div className="text-xs text-muted-foreground">Review submissions</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermission={Permission.VIEW_ALL_USERS}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/team">
                      <div className="text-center">
                        <Users className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
                        <div className="text-sm font-medium">Team</div>
                        <div className="text-xs text-muted-foreground">Manage team members</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermissions={[Permission.VIEW_ALL_USERS, Permission.VIEW_TEAM_TIMESHEETS]}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/resources">
                      <div className="text-center">
                        <UserCog className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                        <div className="text-sm font-medium">Resources</div>
                        <div className="text-xs text-muted-foreground">Resource management</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>

                <RoleGuard requiredPermissions={[Permission.VIEW_ALL_USERS, Permission.APPROVE_TIMESHEET]}>
                  <Button variant="outline" asChild className="h-auto p-4">
                    <Link href="/dashboard/capacity">
                      <div className="text-center">
                        <Gauge className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                        <div className="text-sm font-medium">Capacity</div>
                        <div className="text-xs text-muted-foreground">Capacity planning</div>
                      </div>
                    </Link>
                  </Button>
                </RoleGuard>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - AI Insights and Summary */}
        <div className="space-y-6">
          {/* Resource Insights for Managers and Above */}
          <RoleGuard requiredPermissions={[Permission.VIEW_ALL_USERS, Permission.VIEW_TEAM_TIMESHEETS, Permission.APPROVE_TIMESHEET]}>
            <ResourceInsights
              userRole={userRole}
              onDismiss={handleDismissInsight}
            />
          </RoleGuard>

          {/* General AI Insights */}
          <AIInsights
            insights={dashboardData?.aiInsights || []}
            onDismiss={handleDismissInsight}
          />

          {/* Weekly Summary */}
          <RoleGuard requiredPermission={Permission.VIEW_PERSONAL_REPORTS}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Weekly Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Hours</span>
                  <span className="font-medium">
                    {formatDuration(dashboardData?.totalHoursWeek || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Billable Hours</span>
                  <span className="font-medium">
                    {formatDuration(dashboardData?.billableHoursWeek || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Utilization</span>
                  <span className="font-medium">
                    {dashboardData?.totalHoursWeek ? 
                      Math.round((dashboardData.billableHoursWeek / dashboardData.totalHoursWeek) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/dashboard/reports">
                      View Detailed Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RoleGuard>

          {/* Client Users get limited view */}
          <RoleGuard requiredRole={UserRole.CLIENT_USER}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Client Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  You have read-only access to your project information.
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/dashboard/projects">
                    View Your Projects
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </RoleGuard>
        </div>
      </div>
    </div>
  );
}
