
/**
 * Real-time Xero Sync Dashboard
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Enhanced dashboard with queue monitoring and real-time sync management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Pause, 
  Play, 
  RefreshCw,
  Trash2,
  BarChart3,
  Zap,
  Timer,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface SyncStats {
  recentLogs: Array<{
    id: string;
    submissionId: string | null;
    operation: string;
    status: string;
    error: string | null;
    createdAt: string;
    duration: number | null;
  }>;
  stats: {
    last24Hours: {
      successful: number;
      failed: number;
      total: number;
      successRate: string;
    };
  };
}

interface ConnectionStatus {
  connected: boolean;
  error?: string;
}

interface QueueStatusData {
  queue: QueueStats;
  sync: SyncStats;
  connection: ConnectionStatus;
  timestamp: string;
}

export function XeroRealtimeSyncDashboard() {
  const [statusData, setStatusData] = useState<QueueStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Auto-refresh interval (30 seconds)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setRefreshing(true);
        const response = await fetch('/api/xero/sync/queue/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch queue status');
        }
        
        const data = await response.json();
        setStatusData(data);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to fetch queue status:', error);
        toast.error('Failed to refresh sync status');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up auto-refresh
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleQueueAction = async (action: string) => {
    try {
      const response = await fetch('/api/xero/sync/queue/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} queue`);
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Refresh status after action
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(`Queue action ${action} failed:`, error);
      toast.error(`Failed to ${action} queue`);
    }
  };

  const handleManualSync = async () => {
    // This would typically open a modal to select submissions
    toast.info('Manual sync feature - would open submission selector');
  };

  const handleBatchSync = async () => {
    // This would typically open a modal to configure batch sync
    toast.info('Batch sync feature - would open date range selector');
  };

  const formatDuration = (milliseconds: number | null) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'RUNNING':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Sync Dashboard
          </CardTitle>
          <CardDescription>Loading sync status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statusData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Sync Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load sync status. Please refresh the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { queue, sync, connection } = statusData;

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Real-time Sync Dashboard
              </CardTitle>
              <CardDescription>
                Monitor and manage automatic Xero synchronization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={connection.connected ? "default" : "destructive"}
                className={connection.connected ? "bg-green-100 text-green-800" : ""}
              >
                {connection.connected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              {lastRefresh && (
                <span className="text-sm text-muted-foreground">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Queue Active</p>
                <p className="text-2xl font-bold">{queue.active}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Waiting</p>
                <p className="text-2xl font-bold">{queue.waiting}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{sync.stats.last24Hours.successRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Jobs</p>
                <p className="text-2xl font-bold">{queue.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Queue Status</TabsTrigger>
          <TabsTrigger value="logs">Recent Activity</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 24-Hour Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">24-Hour Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Syncs</span>
                    <span className="font-medium">{sync.stats.last24Hours.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful</span>
                    <span className="font-medium text-green-600">{sync.stats.last24Hours.successful}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed</span>
                    <span className="font-medium text-red-600">{sync.stats.last24Hours.failed}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{sync.stats.last24Hours.successRate}%</span>
                  </div>
                  <Progress 
                    value={parseFloat(sync.stats.last24Hours.successRate)} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Queue Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Queue Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{queue.active}</p>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{queue.waiting}</p>
                    <p className="text-sm text-muted-foreground">Waiting</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{queue.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{queue.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Queue Status Details</CardTitle>
              <CardDescription>Current state of the sync job queue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <Timer className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xl font-bold">{queue.waiting}</p>
                    <p className="text-sm text-muted-foreground">Waiting</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-xl font-bold">{queue.active}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-xl font-bold">{queue.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <p className="text-xl font-bold">{queue.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                    <p className="text-xl font-bold">{queue.delayed}</p>
                    <p className="text-sm text-muted-foreground">Delayed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Latest sync operations and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sync.recentLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent sync activity</p>
                ) : (
                  sync.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(log.status)}
                        <div>
                          <p className="font-medium">{log.operation.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.submissionId ? `Submission: ${log.submissionId.slice(-8)}` : 'System operation'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{formatDuration(log.duration)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manual Operations */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Operations</CardTitle>
                <CardDescription>Trigger sync operations manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleManualSync} className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Manual Sync Selected
                </Button>
                <Button onClick={handleBatchSync} variant="outline" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Batch Sync Date Range
                </Button>
              </CardContent>
            </Card>

            {/* Queue Management */}
            <Card>
              <CardHeader>
                <CardTitle>Queue Management</CardTitle>
                <CardDescription>Control queue operations (Admin only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleQueueAction('pause')} 
                    variant="outline" 
                    size="sm"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                  <Button 
                    onClick={() => handleQueueAction('resume')} 
                    variant="outline" 
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                </div>
                <Button 
                  onClick={() => handleQueueAction('retryFailed')} 
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed Jobs
                </Button>
                <Button 
                  onClick={() => handleQueueAction('clearFailed')} 
                  variant="destructive" 
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Failed Jobs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default XeroRealtimeSyncDashboard;
