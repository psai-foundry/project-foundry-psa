
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatsCard } from '@/components/dashboard/stats-card';
import { 
  Users, 
  Activity, 
  Gauge, 
  UserCog, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface ResourceData {
  totalResources: number;
  activeAllocations: number;
  overallocatedResources: number;
  availableCapacity: number;
  utilizationRate: number;
  upcomingAllocations: number;
  capacityTrend: number;
  resourceHealth: 'good' | 'warning' | 'critical';
  topResourceIssues: Array<{
    id: string;
    resourceName: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  capacityByRole: Array<{
    role: string;
    allocated: number;
    available: number;
    utilization: number;
  }>;
}

interface ResourceWidgetsProps {
  userRole?: string;
}

export function ResourceWidgets({ userRole }: ResourceWidgetsProps) {
  const [resourceData, setResourceData] = useState<ResourceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResourceData = async () => {
      try {
        const response = await fetch('/api/dashboard/resources');
        if (response.ok) {
          const data = await response.json();
          setResourceData(data);
        }
      } catch (error) {
        console.error('Error fetching resource data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResourceData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!resourceData) {
    return null;
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return TrendingUp;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resource Management Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Resources"
          value={resourceData.totalResources}
          icon={Users}
          description="Active team members"
          trend={{
            value: 3,
            label: "vs last month"
          }}
        />

        <StatsCard
          title="Resource Utilization"
          value={`${resourceData.utilizationRate}%`}
          icon={Gauge}
          description="Average team utilization"
          trend={{
            value: resourceData.capacityTrend,
            label: "vs last week"
          }}
        />

        <StatsCard
          title="Active Allocations"
          value={resourceData.activeAllocations}
          icon={Activity}
          description="Current assignments"
        />

        <StatsCard
          title="Overallocated"
          value={resourceData.overallocatedResources}
          icon={AlertTriangle}
          description="Resources at capacity"
          className={resourceData.overallocatedResources > 0 ? "border-red-200 bg-red-50" : ""}
        />
      </div>

      {/* Resource Health & Capacity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Health Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(getHealthIcon(resourceData.resourceHealth), {
                className: `h-5 w-5 ${getHealthColor(resourceData.resourceHealth)}`
              })}
              Resource Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Overall Health</span>
              <Badge className={
                resourceData.resourceHealth === 'good' ? 'bg-green-100 text-green-800 border-green-200' :
                resourceData.resourceHealth === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-red-100 text-red-800 border-red-200'
              }>
                {resourceData.resourceHealth.charAt(0).toUpperCase() + resourceData.resourceHealth.slice(1)}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Team Utilization</span>
                <span className="text-sm font-medium">{resourceData.utilizationRate}%</span>
              </div>
              <Progress value={resourceData.utilizationRate} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Capacity</span>
                <span className="text-sm font-medium">{resourceData.availableCapacity}%</span>
              </div>
              <Progress 
                value={resourceData.availableCapacity} 
                className="h-2" 
              />
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/dashboard/capacity">
                  <Gauge className="w-4 h-4 mr-2" />
                  View Capacity Planning
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Capacity by Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Capacity by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resourceData.capacityByRole.map((role, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{role.role}</span>
                    <span className="text-sm text-muted-foreground">
                      {role.allocated}/{role.allocated + role.available} hrs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Utilization: {role.utilization}%</span>
                    <span className={role.utilization > 90 ? 'text-red-600' : role.utilization > 80 ? 'text-yellow-600' : 'text-green-600'}>
                      {role.available > 0 ? `${role.available}h available` : 'At capacity'}
                    </span>
                  </div>
                  <Progress 
                    value={role.utilization} 
                    className="h-1" 
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Issues & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Resource Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Resource Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resourceData.topResourceIssues.length > 0 ? (
              <div className="space-y-3">
                {resourceData.topResourceIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{issue.resourceName}</p>
                      <p className="text-xs text-muted-foreground">{issue.issue}</p>
                    </div>
                    <Badge className={
                      issue.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                      issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-blue-100 text-blue-800 border-blue-200'
                    }>
                      {issue.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No resource issues detected</p>
                <p className="text-xs text-muted-foreground">All resources are operating within normal parameters</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resource Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Resource Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="h-auto p-3" asChild>
                <Link href="/dashboard/resources">
                  <div className="text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <div className="text-xs font-medium">Manage Resources</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="h-auto p-3" asChild>
                <Link href="/dashboard/allocations">
                  <div className="text-center">
                    <Activity className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <div className="text-xs font-medium">View Allocations</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="h-auto p-3" asChild>
                <Link href="/dashboard/capacity">
                  <div className="text-center">
                    <Gauge className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <div className="text-xs font-medium">Capacity Planning</div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="h-auto p-3" asChild>
                <Link href="/dashboard/capacity-calendar">
                  <div className="text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <div className="text-xs font-medium">Resource Calendar</div>
                  </div>
                </Link>
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Upcoming Allocations</span>
                <span className="font-medium">{resourceData.upcomingAllocations} this week</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
