
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Award, TrendingUp } from 'lucide-react';

interface ReportData {
  capacityUtilization: number;
  totalResources: number;
  activeProjects: number;
  totalRevenue: number;
  utilizationTrend: number[];
  departmentBreakdown: { department: string; utilization: number; resources: number }[];
  projectHealth: { healthy: number; atRisk: number; critical: number };
}

interface ResourceReportsProps {
  data: ReportData;
}

export function ResourceReports({ data }: ResourceReportsProps) {
  // Mock top performers data
  const topPerformers = [
    { name: 'John Smith', role: 'Senior Developer', utilization: 95, projects: 3, rating: 4.8 },
    { name: 'Emily Davis', role: 'UX Designer', utilization: 92, projects: 4, rating: 4.9 },
    { name: 'Michael Chen', role: 'Project Manager', utilization: 88, projects: 5, rating: 4.7 }
  ];

  const resourceMetrics = [
    { label: 'High Performers', value: '8', description: 'Above 85% utilization' },
    { label: 'Balanced Load', value: '12', description: '70-85% utilization' },
    { label: 'Available Capacity', value: '5', description: 'Below 70% utilization' }
  ];

  return (
    <div className="space-y-6">
      {/* Resource Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resourceMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{metric.value}</div>
                <div className="font-medium text-gray-900 mb-1">{metric.label}</div>
                <div className="text-sm text-gray-600">{metric.description}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={performer.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{performer.name}</h4>
                    <p className="text-sm text-gray-600">{performer.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{performer.utilization}%</div>
                    <div className="text-gray-500">Utilization</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{performer.projects}</div>
                    <div className="text-gray-500">Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{performer.rating}</div>
                    <div className="text-gray-500">Rating</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Distribution by Department */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Resource Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.departmentBreakdown.map((dept) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{dept.department}</div>
                  <Badge variant="outline">{dept.resources} members</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(dept.resources / data.totalResources) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 w-12">
                    {Math.round((dept.resources / data.totalResources) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Skills Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Skills Analysis Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              Comprehensive skills gap analysis and recommendations will be available in the next update.
            </p>
            <Badge variant="secondary">Feature in Development</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
