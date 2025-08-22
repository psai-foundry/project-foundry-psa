
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

interface ReportData {
  capacityUtilization: number;
  totalResources: number;
  activeProjects: number;
  totalRevenue: number;
  utilizationTrend: number[];
  departmentBreakdown: { department: string; utilization: number; resources: number }[];
  projectHealth: { healthy: number; atRisk: number; critical: number };
}

interface ProjectReportsProps {
  data: ReportData;
}

export function ProjectReports({ data }: ProjectReportsProps) {
  // Mock project data
  const projectsOverview = [
    { name: 'E-commerce Platform', status: 'healthy', progress: 85, resources: 8, budget: 450000 },
    { name: 'Mobile App Development', status: 'at-risk', progress: 60, resources: 6, budget: 320000 },
    { name: 'Data Analytics Dashboard', status: 'healthy', progress: 95, resources: 4, budget: 280000 },
    { name: 'Marketing Automation', status: 'critical', progress: 30, resources: 3, budget: 180000 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'at-risk':
        return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'at-risk':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const totalBudget = projectsOverview.reduce((acc, project) => acc + project.budget, 0);

  return (
    <div className="space-y-6">
      {/* Project Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">{data.projectHealth.healthy}</div>
                <div className="text-sm text-green-600">Healthy Projects</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-700">{data.projectHealth.atRisk}</div>
                <div className="text-sm text-orange-600">At Risk</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-700">{data.projectHealth.critical}</div>
                <div className="text-sm text-red-600">Critical</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Active Projects Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {projectsOverview.map((project) => (
              <div key={project.name} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(project.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline"
                          className={`text-xs ${getStatusColor(project.status)}`}
                        >
                          {project.status.replace('-', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {project.resources} resources
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ${project.budget.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Budget</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress 
                    value={project.progress} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Budget Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Budget Distribution</h4>
              <div className="space-y-3">
                {projectsOverview.map((project) => (
                  <div key={project.name} className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 truncate flex-1 mr-4">
                      {project.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        ${(project.budget / 1000).toFixed(0)}K
                      </div>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(project.budget / totalBudget) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Budget Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Budget</span>
                  <span className="font-medium">${(totalBudget / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average per Project</span>
                  <span className="font-medium">${(totalBudget / projectsOverview.length / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projects on Track</span>
                  <span className="font-medium text-green-600">
                    {projectsOverview.filter(p => p.status === 'healthy').length} / {projectsOverview.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. Progress</span>
                  <span className="font-medium">
                    {Math.round(projectsOverview.reduce((acc, p) => acc + p.progress, 0) / projectsOverview.length)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
