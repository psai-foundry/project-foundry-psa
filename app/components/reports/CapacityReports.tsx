
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface ReportData {
  capacityUtilization: number;
  totalResources: number;
  activeProjects: number;
  totalRevenue: number;
  utilizationTrend: number[];
  departmentBreakdown: { department: string; utilization: number; resources: number }[];
  projectHealth: { healthy: number; atRisk: number; critical: number };
}

interface CapacityReportsProps {
  data: ReportData;
}

export function CapacityReports({ data }: CapacityReportsProps) {
  const getUtilizationStatus = (utilization: number) => {
    if (utilization > 90) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Over-allocated' };
    if (utilization > 75) return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'High utilization' };
    if (utilization > 50) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Optimal' };
    return { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Under-utilized' };
  };

  return (
    <div className="space-y-6">
      {/* Utilization Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Capacity Utilization Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {data.utilizationTrend.map((value, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-blue-200 rounded-t relative min-h-[4px]"
                  style={{ height: `${(value / 100) * 200}px` }}
                >
                  <div 
                    className="w-full bg-blue-600 rounded-t"
                    style={{ height: `${Math.min(100, (value / 90) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">{value}%</div>
                <div className="text-xs text-gray-400">Week {index + 1}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Department Utilization Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.departmentBreakdown.map((dept) => {
              const status = getUtilizationStatus(dept.utilization);
              
              return (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{dept.department}</h4>
                      <Badge variant="outline" className="text-xs">
                        {dept.resources} resources
                      </Badge>
                    </div>
                    <div className={`text-sm font-medium ${status.color}`}>
                      {dept.utilization}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={dept.utilization} 
                      className="flex-1 h-2"
                    />
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${status.bg} ${status.color} border-current`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Capacity Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Capacity Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.departmentBreakdown
              .filter(dept => dept.utilization > 90 || dept.utilization < 50)
              .map((dept) => (
                <div 
                  key={dept.department}
                  className={`p-3 rounded-lg border ${
                    dept.utilization > 90 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{dept.department}</h4>
                      <p className="text-sm text-gray-600">
                        {dept.utilization > 90 
                          ? 'Over-allocated - consider redistributing workload'
                          : 'Under-utilized - opportunity for additional projects'
                        }
                      </p>
                    </div>
                    <Badge 
                      variant="outline"
                      className={
                        dept.utilization > 90 
                          ? 'text-red-800 border-red-300 bg-red-100'
                          : 'text-blue-800 border-blue-300 bg-blue-100'
                      }
                    >
                      {dept.utilization}%
                    </Badge>
                  </div>
                </div>
              ))}
            
            {data.departmentBreakdown.every(dept => dept.utilization >= 50 && dept.utilization <= 90) && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                <p className="text-gray-600">
                  All departments are operating within optimal capacity ranges.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
