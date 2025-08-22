
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Users, 
  Clock, 
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// @ts-ignore
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
});

interface ProjectStats {
  projects: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    cancelled: number;
  };
  clients: {
    total: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    onHold: number;
  };
  timeTracking: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    totalEntries: number;
    billabilityRate: string;
  };
  topProjects: Array<{
    id: string;
    name: string;
    client: string;
    status: string;
    totalHours: number;
    billableHours: number;
  }>;
  teamUtilization: Array<{
    id: string;
    name: string;
    role: string;
    totalHours: number;
    billableHours: number;
  }>;
}

export default function ProjectDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setFullYear(endDate.getFullYear() - 1);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      const response = await fetch(`/api/projects/summary-stats?${params}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data.data);
      } else {
        console.error('Error fetching stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const canViewAllStats = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  if (!canViewAllStats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
            <p className="text-gray-500">You don't have permission to view project statistics.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
            <p className="text-gray-500">Unable to load project statistics.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const projectStatusData = [
    {
      x: ['Active', 'Completed', 'On Hold', 'Cancelled'],
      y: [stats.projects.active, stats.projects.completed, stats.projects.onHold, stats.projects.cancelled],
      type: 'bar' as const,
      marker: {
        color: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
      },
      hovertemplate: '%{x}: %{y} projects<extra></extra>',
    },
  ];

  const taskStatusData = [
    {
      labels: ['Open', 'In Progress', 'Completed', 'On Hold'],
      values: [stats.tasks.open, stats.tasks.inProgress, stats.tasks.completed, stats.tasks.onHold],
      type: 'pie' as const,
      marker: {
        colors: ['#6B7280', '#3B82F6', '#10B981', '#F59E0B'],
      },
      hovertemplate: '%{label}: %{value} tasks (%{percent})<extra></extra>',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
          <p className="text-gray-600">Overview of your projects, team, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/projects')}>
            View All Projects
          </Button>
          <Button onClick={() => router.push('/dashboard/projects/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{stats.projects.total}</p>
                  <Badge variant="secondary">{stats.projects.active} active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.clients.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{stats.tasks.total}</p>
                  <Badge variant="secondary">{stats.tasks.inProgress} in progress</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{stats.timeTracking.totalHours.toFixed(0)}</p>
                  <Badge variant="secondary">{stats.timeTracking.billabilityRate}% billable</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Plot
                data={projectStatusData}
                layout={{
                  showlegend: false,
                  margin: { l: 40, r: 20, t: 20, b: 60 },
                  xaxis: {
                    title: 'Status',
                    tickangle: -45,
                  },
                  yaxis: {
                    title: 'Projects',
                  },
                } as any}
                config={{
                  responsive: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ["autoScale2d", "lasso2d", "select2d", "zoom2d", "pan2d"] as any
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Plot
                data={taskStatusData}
                layout={{
                  showlegend: true,
                  margin: { l: 20, r: 20, t: 20, b: 20 },
                  legend: {
                    orientation: 'h',
                    yanchor: 'top',
                    y: 1,
                    xanchor: 'center',
                    x: 0.5
                  }
                } as any}
                config={{
                  responsive: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ["autoScale2d", "lasso2d", "select2d", "zoom2d", "pan2d"] as any
                }}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Projects and Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Top Active Projects
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProjects.slice(0, 5).map((project, index) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">{project.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{project.totalHours.toFixed(1)}h</p>
                    <Badge variant="secondary">{project.status}</Badge>
                  </div>
                </div>
              ))}
              {stats.topProjects.length === 0 && (
                <p className="text-center text-gray-500 py-8">No active projects</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Team Utilization
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/team')}>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.teamUtilization.slice(0, 5).map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{member.totalHours.toFixed(1)}h</p>
                    <p className="text-sm text-gray-500">{member.billableHours.toFixed(1)}h billable</p>
                  </div>
                </div>
              ))}
              {stats.teamUtilization.length === 0 && (
                <p className="text-center text-gray-500 py-8">No team activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
