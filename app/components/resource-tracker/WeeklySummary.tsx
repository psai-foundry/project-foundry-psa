
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName: string;
  role: string;
  department: string;
  projectId: string;
  projectName: string;
  allocatedHours: number;
  actualHours: number;
  week: string;
  status: 'planned' | 'active' | 'completed' | 'overrun';
}

interface WeeklySummaryProps {
  allocations: ResourceAllocation[];
}

export function WeeklySummary({ allocations }: WeeklySummaryProps) {
  // Group allocations by resource
  const resourceSummary = allocations.reduce((acc, allocation) => {
    const key = allocation.resourceId;
    if (!acc[key]) {
      acc[key] = {
        resourceName: allocation.resourceName,
        role: allocation.role,
        department: allocation.department,
        totalPlanned: 0,
        totalActual: 0,
        allocations: []
      };
    }
    acc[key].totalPlanned += allocation.allocatedHours;
    acc[key].totalActual += allocation.actualHours;
    acc[key].allocations.push(allocation);
    return acc;
  }, {} as any);

  const getTrendIcon = (variance: number) => {
    if (variance > 2) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (variance < -2) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  if (Object.keys(resourceSummary).length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No summary data</h3>
            <p className="text-gray-600">Select a time period to view weekly summary.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Object.entries(resourceSummary).map(([resourceId, summary]: [string, any]) => {
        const variance = summary.totalActual - summary.totalPlanned;
        const utilization = summary.totalPlanned > 0 ? (summary.totalActual / summary.totalPlanned) * 100 : 0;

        return (
          <Card key={resourceId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{summary.resourceName}</CardTitle>
                  <p className="text-sm text-gray-600">{summary.role}</p>
                  <Badge variant="outline" className="mt-1">
                    {summary.department}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(variance)}
                    <span className={`text-sm font-medium ${
                      variance > 2 ? 'text-red-600' : 
                      variance < -2 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {variance > 0 ? `+${variance}h` : `${variance}h`}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hours Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Planned Hours</p>
                  <p className="text-lg font-semibold">{summary.totalPlanned}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Actual Hours</p>
                  <p className="text-lg font-semibold">{summary.totalActual}h</p>
                </div>
              </div>

              {/* Utilization */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Utilization</span>
                  <span className="font-medium">{Math.round(utilization)}%</span>
                </div>
                <Progress value={Math.min(150, utilization)} className="h-2" />
              </div>

              {/* Project Breakdown */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Project Allocations</p>
                <div className="space-y-2">
                  {summary.allocations.map((allocation: ResourceAllocation) => (
                    <div 
                      key={allocation.id}
                      className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                    >
                      <span className="truncate flex-1">{allocation.projectName}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-gray-600">
                          {allocation.allocatedHours}h → {allocation.actualHours}h
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            allocation.status === 'overrun' ? 'border-red-200 bg-red-50 text-red-800' :
                            allocation.status === 'completed' ? 'border-green-200 bg-green-50 text-green-800' :
                            allocation.status === 'active' ? 'border-blue-200 bg-blue-50 text-blue-800' :
                            'border-gray-200 bg-gray-50 text-gray-800'
                          }`}
                        >
                          {allocation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
