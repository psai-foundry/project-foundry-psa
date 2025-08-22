
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  ChevronRight,
  Timer,
  BarChart3,
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface ApprovalVelocityWidgetProps {
  stats: any;
  onDrillDown?: (data: any) => void;
  className?: string;
}

export function ApprovalVelocityWidget({ 
  stats, 
  onDrillDown,
  className = "" 
}: ApprovalVelocityWidgetProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  if (!stats) return null;

  const {
    avgApprovalTime,
    pendingAging,
    managerApprovals,
    bottlenecks,
    velocityMetrics
  } = stats;

  // Prepare aging data for pie chart
  const agingData = [
    { name: '0-2 days', value: pendingAging?.['0-2_days'] || 0, color: '#10B981' },
    { name: '3-5 days', value: pendingAging?.['3-5_days'] || 0, color: '#F59E0B' },
    { name: '6+ days', value: pendingAging?.['6+_days'] || 0, color: '#EF4444' },
  ];

  // Prepare manager comparison data
  const managerData = (managerApprovals || []).slice(0, 5).map((manager: any) => ({
    name: manager.managerName?.split(' ')[0] || 'Unknown',
    approvals: manager.approvalCount,
  }));

  // Calculate velocity trend (mock data for demo)
  const velocityTrend = avgApprovalTime <= 24 ? 'improving' : avgApprovalTime <= 48 ? 'stable' : 'declining';
  const velocityIcon = velocityTrend === 'improving' ? ArrowDown : velocityTrend === 'declining' ? ArrowUp : Minus;
  const velocityColor = velocityTrend === 'improving' ? 'text-green-600' : velocityTrend === 'declining' ? 'text-red-600' : 'text-yellow-600';

  const handleDrillDown = (metric: string, data: any) => {
    if (onDrillDown) {
      onDrillDown({ metric, data });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-medium">{`${label}: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`${className} border-l-4 border-l-blue-500`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Timer className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold">Approval Velocity</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Last 30 days
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Average Approval Time */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center space-x-1">
              <Clock className={`w-4 h-4 ${velocityColor}`} />
              {React.createElement(velocityIcon, { className: `w-3 h-3 ${velocityColor}` })}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {avgApprovalTime || 0}h
            </div>
            <div className="text-xs text-muted-foreground">Avg Time</div>
          </div>

          {/* Pending Count */}
          <div className="text-center space-y-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />
            <div className="text-2xl font-bold text-yellow-600">
              {velocityMetrics?.totalPending || 0}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>

          {/* Urgent Count */}
          <div className="text-center space-y-1">
            <Target className="w-4 h-4 text-red-500 mx-auto" />
            <div className="text-2xl font-bold text-red-600">
              {velocityMetrics?.urgentCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">Urgent</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aging Pie Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Pending Aging</h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDrillDown('aging', agingData)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pending Approvals Aging Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {agingData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline">{item.value} submissions</Badge>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {agingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Manager Performance Bar Chart */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Manager Performance</h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDrillDown('managers', managerData)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Manager Approval Performance</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {(bottlenecks || []).slice(0, 5).map((manager: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-blue-500" />
                            <div>
                              <div className="font-medium">{manager.managerName}</div>
                              <div className="text-sm text-muted-foreground">
                                {manager.totalApprovals} approvals
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {Math.round(manager.avgApprovalTime * 10) / 10}h
                            </div>
                            <div className="text-xs text-muted-foreground">avg time</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={managerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="approvals" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <BarChart3 className="w-3 h-3" />
            <span>Updated {format(new Date(), 'HH:mm')}</span>
          </div>
          <div className="flex space-x-2">
            {velocityMetrics?.urgentCount > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleDrillDown('urgent', { count: velocityMetrics.urgentCount })}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                View Urgent
              </Button>
            )}
            <Button 
              size="sm"
              onClick={() => handleDrillDown('overview', stats)}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
