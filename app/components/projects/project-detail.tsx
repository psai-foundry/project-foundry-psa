
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Target,
  TrendingUp,
  FileText,
  Settings,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import TaskManagement from './task-management';
import ProjectTeam from './project-team';

interface ProjectDetailProps {
  projectId: string;
  onEdit?: () => void;
}

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  budget: number | null;
  startDate: Date | null;
  endDate: Date | null;
  billable: boolean;
  defaultBillRate: number | null;
  client: {
    id: string;
    name: string;
    industry?: string;
    contacts?: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      role?: string;
      isPrimary: boolean;
    }>;
  };
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    estimatedHours?: number;
  }>;
  assignments: Array<{
    id: string;
    role?: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  timeEntries: Array<{
    id: string;
    duration: number;
    date: Date;
    user: {
      name: string;
    };
    task?: {
      name: string;
    };
  }>;
  stats: {
    totalHours: number;
    billableHours: number;
    totalTimeEntries: number;
    tasksTotal: number;
    tasksOpen: number;
    tasksInProgress: number;
    tasksCompleted: number;
    tasksOnHold: number;
  };
}

export default function ProjectDetail({ projectId, onEdit }: ProjectDetailProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (response.ok) {
        setProject(data.data);
      } else {
        console.error('Error fetching project:', data.error);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!project?.stats) return 0;
    const { tasksTotal, tasksCompleted } = project.stats;
    return tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;
  };

  const calculateBudgetUtilization = () => {
    if (!project?.budget || !project?.stats?.billableHours || !project?.defaultBillRate) {
      return { used: 0, percentage: 0 };
    }
    
    const used = project.stats.billableHours * project.defaultBillRate;
    const percentage = (used / project.budget) * 100;
    
    return { used, percentage };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
            <p className="text-gray-500">The project you're looking for doesn't exist or you don't have access to it.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetInfo = calculateBudgetUtilization();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-gray-500">{project.code}</span>
          </div>
        </div>
        {(['ADMIN', 'MANAGER'].includes(session?.user?.role || '')) && (
          <Button 
            onClick={() => {
              if (onEdit) {
                onEdit();
              } else {
                router.push(`/dashboard/projects/${projectId}/edit`);
              }
            }} 
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Project
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{project.stats?.totalHours?.toFixed(1) || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">{project.stats?.billableHours?.toFixed(1) || '0'}</p>
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
                <p className="text-sm font-medium text-gray-600">Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {project.stats?.tasksCompleted || 0}/{project.stats?.tasksTotal || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">{project.assignments?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1">{project.description || 'No description provided'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Start Date</label>
                    <p className="text-gray-900 mt-1">
                      {project.startDate ? format(new Date(project.startDate), 'MMM dd, yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">End Date</label>
                    <p className="text-gray-900 mt-1">
                      {project.endDate ? format(new Date(project.endDate), 'MMM dd, yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Billable</label>
                    <p className="text-gray-900 mt-1">{project.billable ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Default Rate</label>
                    <p className="text-gray-900 mt-1">
                      {project.defaultBillRate ? `$${project.defaultBillRate}/hour` : 'Not set'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Client Name</label>
                  <p className="text-gray-900 mt-1">{project.client?.name}</p>
                </div>
                
                {project.client?.industry && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Industry</label>
                    <p className="text-gray-900 mt-1">{project.client.industry}</p>
                  </div>
                )}

                {project.client?.contacts && project.client.contacts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Primary Contact</label>
                    {project.client.contacts
                      .filter(contact => contact.isPrimary)
                      .map(contact => (
                        <div key={contact.id} className="mt-1">
                          <p className="text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.email && (
                            <p className="text-sm text-gray-500">{contact.email}</p>
                          )}
                          {contact.role && (
                            <p className="text-sm text-gray-500">{contact.role}</p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Task Completion</span>
                    <span className="text-sm text-gray-900">{calculateProgress().toFixed(0)}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2" />
                </div>

                {project.budget && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Budget Utilization</span>
                      <span className="text-sm text-gray-900">
                        ${budgetInfo.used.toLocaleString()} / ${project.budget.toLocaleString()}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(budgetInfo.percentage, 100)} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManagement projectId={projectId} />
        </TabsContent>

        <TabsContent value="team">
          <ProjectTeam projectId={projectId} />
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Budget & Financial Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Budget</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Budget Used</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ${budgetInfo.used.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Budget Remaining</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {project.budget ? `$${(project.budget - budgetInfo.used).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.timeEntries?.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{entry.user?.name}</p>
                      <p className="text-sm text-gray-500">
                        {entry.task?.name || 'General work'} • {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {entry.duration}h
                    </div>
                  </div>
                ))}
                {(!project.timeEntries || project.timeEntries.length === 0) && (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
