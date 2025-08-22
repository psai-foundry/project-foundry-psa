

/**
 * Enhanced Queue Infrastructure Dashboard
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Comprehensive real-time monitoring and management interface
 * for the Redis-based queue system
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Pause, 
  Play, 
  RefreshCw,
  Trash2,
  BarChart3,
  Zap,
  Timer,
  Users,
  Database,
  Server,
  TrendingUp,
  AlertTriangle,
  Settings,
  Eye,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface QueueMetrics {
  processed: number;
  failed: number;
  active: number;
  waiting: number;
  paused: boolean;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastProcessed?: string;
  averageProcessingTime?: number;
  errorRate?: number;
}

interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface SystemHealth {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  checks: {
    queueWorkerRunning: boolean;
    queueWorkerHealthy: boolean;
    redisConnected: boolean;
  };
}

interface RecentLog {
  id: string;
  submissionId: string | null;
  operation: string;
  status: string;
  error: string | null;
  trigger: string;
  jobId: string | null;
  createdAt: string;
}

interface DashboardData {
  metrics: Record<string, QueueMetrics>;
  status: Record<string, QueueStatus>;
  redis: {
    connected: boolean;
    ping: boolean;
    healthy: boolean;
    error?: string;
  };
  recentLogs: RecentLog[];
  health: SystemHealth;
  timestamp: string;
}

export default function EnhancedQueueDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/xero/sync/queue/metrics');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const newData = await response.json();
      setData(newData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch queue metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const executeAction = async (action: string, options: any = {}) => {
    setActionLoading(action);
    
    try {
      const response = await fetch('/api/xero/sync/queue/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      toast.success(result.message || 'Action completed successfully');
      
      // Refresh data after action
      setTimeout(fetchData, 1000);
      
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'SUCCESS': 'default',
      'FAILED': 'destructive',
      'PENDING': 'secondary',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading queue dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Dashboard</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchData} 
            className="mt-4"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const queueNames = Object.keys(data.metrics);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Queue Infrastructure Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring and management of Redis-based queue system
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause Auto-refresh
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Enable Auto-refresh
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Server className="w-4 h-4 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-2">
              {getHealthIcon(data.health.status)}
              <span className={`font-semibold ${getHealthColor(data.health.status)}`}>
                {data.health.status.toUpperCase()}
              </span>
            </div>
            <div className="text-2xl font-bold mb-2">{data.health.score}%</div>
            <Progress value={data.health.score} className="h-2" />
            {data.health.issues.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Issues:</div>
                {data.health.issues.slice(0, 2).map((issue, idx) => (
                  <div key={idx} className="text-xs text-red-600">{issue}</div>
                ))}
                {data.health.issues.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{data.health.issues.length - 2} more
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Redis Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-2">
              {data.redis.healthy ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-semibold ${data.redis.healthy ? 'text-green-600' : 'text-red-600'}`}>
                {data.redis.healthy ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div>Connection: {data.redis.connected ? '✓' : '✗'}</div>
              <div>Ping: {data.redis.ping ? '✓' : '✗'}</div>
              {data.redis.error && (
                <div className="text-red-600 text-xs">{data.redis.error}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {Object.values(data.status).reduce((sum, status) => sum + status.active, 0)}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {queueNames.map(name => (
                <div key={name} className="flex justify-between">
                  <span>{name}:</span>
                  <span>{data.status[name]?.active || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Waiting Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {Object.values(data.status).reduce((sum, status) => sum + status.waiting, 0)}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {queueNames.map(name => (
                <div key={name} className="flex justify-between">
                  <span>{name}:</span>
                  <span>{data.status[name]?.waiting || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Details</TabsTrigger>
          <TabsTrigger value="jobs">Job Monitor</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {queueNames.map(queueName => {
              const metrics = data.metrics[queueName];
              const status = data.status[queueName];
              
              return (
                <Card key={queueName}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        {queueName}
                      </span>
                      <div className="flex items-center space-x-2">
                        {getHealthIcon(metrics.health)}
                        {status?.paused && <Badge variant="secondary">PAUSED</Badge>}
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Queue performance and status metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Processed</div>
                        <div className="text-lg font-semibold">{metrics.processed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Failed</div>
                        <div className="text-lg font-semibold text-red-600">{metrics.failed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Error Rate</div>
                        <div className="text-lg font-semibold">
                          {metrics.errorRate?.toFixed(1) || 0}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Time</div>
                        <div className="text-lg font-semibold">
                          {metrics.averageProcessingTime 
                            ? `${(metrics.averageProcessingTime / 1000).toFixed(1)}s`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {status && (
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-5 gap-2 text-center text-xs">
                          <div>
                            <div className="text-muted-foreground">Wait</div>
                            <div className="font-semibold">{status.waiting}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Active</div>
                            <div className="font-semibold">{status.active}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Done</div>
                            <div className="font-semibold text-green-600">{status.completed}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Failed</div>
                            <div className="font-semibold text-red-600">{status.failed}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Delay</div>
                            <div className="font-semibold">{status.delayed}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {metrics.lastProcessed && (
                      <div className="text-xs text-muted-foreground">
                        Last processed: {new Date(metrics.lastProcessed).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Queue Details Tab */}
        <TabsContent value="queues" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <Select value={selectedQueue} onValueChange={setSelectedQueue}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select queue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Queues</SelectItem>
                {queueNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {queueNames
              .filter(name => selectedQueue === 'all' || name === selectedQueue)
              .map(queueName => {
                const status = data.status[queueName];
                const metrics = data.metrics[queueName];

                return (
                  <Card key={queueName}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{queueName}</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => executeAction(
                              status?.paused ? 'resumeQueue' : 'pauseQueue',
                              { queueName }
                            )}
                            disabled={actionLoading === 'pauseQueue' || actionLoading === 'resumeQueue'}
                          >
                            {status?.paused ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                              </>
                            ) : (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => executeAction('clearFailedJobs', { queueName })}
                            disabled={actionLoading === 'clearFailedJobs'}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Failed
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{status?.waiting || 0}</div>
                          <div className="text-sm text-muted-foreground">Waiting</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{status?.active || 0}</div>
                          <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{status?.completed || 0}</div>
                          <div className="text-sm text-muted-foreground">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{status?.failed || 0}</div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Health Status</div>
                          <div className={`font-semibold ${getHealthColor(metrics.health)}`}>
                            {metrics.health.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Error Rate</div>
                          <div className="font-semibold">
                            {metrics.errorRate?.toFixed(1) || 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Queue Status</div>
                          <div className="font-semibold">
                            {status?.paused ? (
                              <Badge variant="secondary">PAUSED</Badge>
                            ) : (
                              <Badge variant="default">RUNNING</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* Job Monitor Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Job Monitor
              </CardTitle>
              <CardDescription>
                Real-time job tracking and management (detailed job view requires additional API integration)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Job detail monitoring will be available once jobs are running.</p>
                <p className="text-sm">Use the Management tab to add test jobs.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Sync Logs
              </CardTitle>
              <CardDescription>
                Latest sync operations and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(log.status)}
                        <div>
                          <div className="font-medium">{log.operation}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.submissionId ? `Submission: ${log.submissionId}` : 'System operation'}
                            {log.jobId && ` • Job: ${log.jobId}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{log.trigger}</div>
                        <div>{new Date(log.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent sync logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Management
                </CardTitle>
                <CardDescription>
                  System-level operations and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('testRedisConnection')}
                  disabled={actionLoading === 'testRedisConnection'}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Test Redis Connection
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('reconnectRedis')}
                  disabled={actionLoading === 'reconnectRedis'}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect Redis
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('initializeWorker')}
                  disabled={actionLoading === 'initializeWorker'}
                >
                  <Server className="w-4 h-4 mr-2" />
                  Initialize Worker
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('cleanupOldLogs', { daysOld: 30 })}
                  disabled={actionLoading === 'cleanupOldLogs'}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cleanup Old Logs (30d)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Test Operations
                </CardTitle>
                <CardDescription>
                  Add test jobs to verify queue functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => executeAction('addHealthCheckJob', { type: 'connection' })}
                  disabled={actionLoading === 'addHealthCheckJob'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add Health Check Job
                </Button>
                
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    To add timesheet sync jobs, use the timesheet approval workflow 
                    or the sync dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Status */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(data.timestamp).toLocaleString()}
        {autoRefresh && ' • Auto-refreshing every 5 seconds'}
      </div>
    </div>
  );
}
