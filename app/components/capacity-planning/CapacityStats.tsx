
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface CapacityStatsProps {
  stats: {
    totalResources: number;
    averageUtilization: number;
    overAllocatedResources: number;
    underUtilizedResources: number;
  };
}

export function CapacityStats({ stats }: CapacityStatsProps) {
  const getUtilizationStatus = (utilization: number) => {
    if (utilization > 90) return { color: 'destructive', icon: AlertTriangle };
    if (utilization > 70) return { color: 'default', icon: CheckCircle };
    return { color: 'secondary', icon: TrendingUp };
  };

  const utilizationStatus = getUtilizationStatus(stats.averageUtilization);
  const StatusIcon = utilizationStatus.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalResources}</div>
          <p className="text-xs text-muted-foreground">
            Active team members
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
          <StatusIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageUtilization}%</div>
          <Progress 
            value={Math.min(100, stats.averageUtilization)} 
            className="mt-2 h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Across all resources
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Over-allocated</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.overAllocatedResources}
          </div>
          <p className="text-xs text-muted-foreground">
            Resources above 100%
          </p>
          {stats.overAllocatedResources > 0 && (
            <Badge variant="destructive" className="mt-2 text-xs">
              Requires attention
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Under-utilized</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.underUtilizedResources}
          </div>
          <p className="text-xs text-muted-foreground">
            Resources below 70%
          </p>
          {stats.underUtilizedResources > 0 && (
            <Badge variant="secondary" className="mt-2 text-xs">
              Available capacity
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
