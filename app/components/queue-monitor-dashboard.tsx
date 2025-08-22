
/**
 * Phase 2B-7c: Queue Monitoring Dashboard Component
 * Provides real-time monitoring and management of queue systems
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity,
  Pause,
  Play,
  Square,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  BarChart3,
  Zap,
  Timer,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface RecentActivity {
  id: string;
  operation: string;
  status: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
  } | null;
  details: any;
}

export default function QueueMonitorDashboard() {
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchQueueData, 5000);
      fetchQueueData();
      return () => clearInterval(interval);
    } else {
      fetchQueueData();
    }
  }, [autoRefresh]);

  const fetchQueueData = useCallback(async () => {
    try {
      const response = await fetch('/api/xero/queue-management');
      const data = await response.json();
      
      if (data.success) {
        setQueueStats(data.data.queues || []);
        setRecentActivity(data.data.recentActivity || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  }, []);

  const handleQueueAction = async (action: string, queueName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/xero/queue-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, queueName })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchQueueData();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
      console.error('Queue action error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'SYNC_TIMESHEET':
        return <Clock className="w-4 h-4" />;
      case 'BATCH_SYNC':
        return <Database className="w-4 h-4" />;
      case 'HEALTH_CHECK':
        return <Activity className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const calculateTotalStats = () => {
    return queueStats.reduce(
      (totals, queue) => ({
        waiting: totals.waiting + queue.waiting,
        active: totals.active + queue.active,
        completed: totals.completed + queue.completed,
        failed: totals.failed + queue.failed,
        delayed: totals.delayed + queue.delayed
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );
  };

  const filteredStats = selectedQueue === 'all' 
    ? queueStats 
    : queueStats.filter(q => q.queueName === selectedQueue);

  const totalStats = calculateTotalStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Queue Monitoring Dashboard</span>
          </CardTitle>
          <CardDescription>
            Real-time monitoring and management of queue systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="queues">Queue Details</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* System Overview */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Waiting</p>
                      <p className="text-2xl font-bold text-yellow-600">{totalStats.waiting}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-blue-600">{totalStats.active}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{totalStats.completed}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">{totalStats.failed}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Delayed</p>
                      <p className="text-2xl font-bold text-orange-600">{totalStats.delayed}</p>
                    </div>
                    <Timer className="w-8 h-8 text-orange-600" />
                  </div>
                </Card>
              </div>

              {/* Queue Status Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Queue Status</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={autoRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                      <span className="ml-2">Auto Refresh</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchQueueData}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queueStats.map((queue) => (
                    <Card key={queue.queueName} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{queue.queueName}</h4>
                          <Badge variant={queue.paused ? "destructive" : "default"}>
                            {queue.paused ? 'Paused' : 'Active'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Waiting:</span>
                            <span className="font-semibold text-yellow-600">{queue.waiting}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Active:</span>
                            <span className="font-semibold text-blue-600">{queue.active}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-semibold text-green-600">{queue.completed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Failed:</span>
                            <span className="font-semibold text-red-600">{queue.failed}</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          {queue.paused ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQueueAction('resume', queue.queueName)}
                              disabled={loading}
                              className="flex-1"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQueueAction('pause', queue.queueName)}
                              disabled={loading}
                              className="flex-1"
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleQueueAction('clear', queue.queueName)}
                            disabled={loading}
                            className="flex-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="queues" className="space-y-4">
              <div className="flex items-center space-x-4">
                <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select queue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Queues</SelectItem>
                    {queueStats.map((queue) => (
                      <SelectItem key={queue.queueName} value={queue.queueName}>
                        {queue.queueName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredStats.map((queue) => (
                  <Card key={queue.queueName} className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{queue.queueName}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant={queue.paused ? "destructive" : "default"}>
                            {queue.paused ? 'Paused' : 'Active'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{queue.waiting}</p>
                          <p className="text-sm text-gray-600">Waiting</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{queue.active}</p>
                          <p className="text-sm text-gray-600">Active</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{queue.completed}</p>
                          <p className="text-sm text-gray-600">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{queue.failed}</p>
                          <p className="text-sm text-gray-600">Failed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{queue.delayed}</p>
                          <p className="text-sm text-gray-600">Delayed</p>
                        </div>
                      </div>

                      {/* Progress bar showing queue health */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Queue Health</span>
                          <span>
                            {queue.completed + queue.failed > 0 
                              ? `${Math.round((queue.completed / (queue.completed + queue.failed)) * 100)}%`
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <Progress 
                          value={
                            queue.completed + queue.failed > 0 
                              ? (queue.completed / (queue.completed + queue.failed)) * 100
                              : 0
                          } 
                          className="h-2"
                        />
                      </div>

                      <div className="flex space-x-2">
                        {queue.paused ? (
                          <Button
                            variant="outline"
                            onClick={() => handleQueueAction('resume', queue.queueName)}
                            disabled={loading}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume Queue
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleQueueAction('pause', queue.queueName)}
                            disabled={loading}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause Queue
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => handleQueueAction('clear', queue.queueName)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Clear Queue
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Activity (Last 24h)</h3>
                <Button variant="outline" size="sm" onClick={fetchQueueData}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {recentActivity.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No recent queue activity found</AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {recentActivity.map((activity) => (
                      <Card key={activity.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getOperationIcon(activity.operation)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-sm">{activity.operation}</span>
                                <Badge variant="outline" className={getStatusColor(activity.status)}>
                                  {activity.status}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <span>{activity.entityType}: {activity.entityId}</span>
                                {activity.user && (
                                  <>
                                    <span>•</span>
                                    <span>{activity.user.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(activity.timestamp), 'MMM dd, HH:mm:ss')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
