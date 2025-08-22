
/**
 * Phase 2B-8b: Real-time Performance Monitoring Dashboard
 * Comprehensive dashboard for system performance metrics and health monitoring
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  TrendingUp,
  TrendingDown,
  Server,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Gauge,
  RefreshCw,
  Eye,
  AlertCircle,
  Cpu,
  HardDrive,
  Network,
  Timer,
  Users,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

// Types
interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  components: Record<string, { status: string; lastCheck: Date }>;
}

interface OverviewMetrics {
  systemHealth: string;
  totalOperations: number;
  avgResponseTime: number;
  totalPipelineRuns: number;
  avgPipelineSuccess: number;
  errorRate: number;
}

interface PipelineMetrics {
  summary: Record<string, any>;
  recent: Array<{
    id: string;
    type: string;
    executionId: string;
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
    processed: number;
    successful: number;
    failed: number;
    successRate: number;
    status: string;
  }>;
}

interface RealTimeStats {
  health: string;
  currentLoad: number;
  avgResponseTime: number;
  activePipelines: number;
  recentErrors: number;
  timestamp: string;
}

const PerformanceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Dashboard data states
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null);
  const [componentHealth, setComponentHealth] = useState<any>(null);

  // Fetch data functions
  const fetchOverviewMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/performance/metrics?endpoint=overview&timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setOverviewMetrics(data.overview);
        setSystemHealth(data.systemHealth);
      }
    } catch (err) {
      console.error('Failed to fetch overview metrics:', err);
    }
  }, [timeRange]);

  const fetchPipelineMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/performance/metrics?endpoint=pipeline-metrics&timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setPipelineMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline metrics:', err);
    }
  }, [timeRange]);

  const fetchRealTimeStats = useCallback(async () => {
    try {
      const response = await fetch('/api/performance/metrics?endpoint=real-time-stats');
      if (response.ok) {
        const data = await response.json();
        setRealTimeStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch real-time stats:', err);
    }
  }, []);

  const fetchComponentHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/performance/metrics?endpoint=component-health&component=all');
      if (response.ok) {
        const data = await response.json();
        setComponentHealth(data.components);
      }
    } catch (err) {
      console.error('Failed to fetch component health:', err);
    }
  }, []);

  const refreshAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        fetchOverviewMetrics(),
        fetchPipelineMetrics(),
        fetchComponentHealth()
      ]);
    } catch (err) {
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/performance/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate-sample-data' }),
      });

      if (response.ok) {
        // Refresh all data after generating demo data
        await refreshAllData();
      } else {
        setError('Failed to generate demo data');
      }
    } catch (err) {
      setError('Failed to generate demo data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshAllData();
  }, [timeRange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      // Fetch real-time stats every 30 seconds
      fetchRealTimeStats();
      interval = setInterval(fetchRealTimeStats, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchRealTimeStats]);

  // Helper functions
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-50';
      case 'DEGRADED': return 'text-yellow-600 bg-yellow-50';
      case 'UNHEALTHY': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="w-4 h-4" />;
      case 'DEGRADED': return <AlertTriangle className="w-4 h-4" />;
      case 'UNHEALTHY': return <AlertCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-3 h-3 text-green-500" />;
    if (current < previous) return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Activity className="w-6 h-6 mr-2" />
            Performance Monitoring
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time system performance metrics and health monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          
          <Button onClick={refreshAllData} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={generateDemoData} 
            disabled={loading} 
            variant="outline" 
            size="sm"
          >
            <Database className="w-4 h-4 mr-2" />
            Generate Demo Data
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Real-time Status Bar */}
      {realTimeStats && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Gauge className="w-5 h-5 mr-2" />
                Real-time System Status
              </CardTitle>
              <Badge className={getHealthColor(realTimeStats.health)}>
                {getHealthIcon(realTimeStats.health)}
                <span className="ml-1">{realTimeStats.health}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{realTimeStats.currentLoad}</div>
                <div className="text-sm text-muted-foreground">Current Load</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{realTimeStats.avgResponseTime}ms</div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{realTimeStats.activePipelines}</div>
                <div className="text-sm text-muted-foreground">Active Pipelines</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{realTimeStats.recentErrors}</div>
                <div className="text-sm text-muted-foreground">Recent Errors</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Last Update</div>
                <div className="text-xs font-mono">{new Date(realTimeStats.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center">
            <Server className="w-4 h-4 mr-2" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Pipeline Performance
          </TabsTrigger>
          <TabsTrigger value="components" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Component Analysis
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {overviewMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Badge className={getHealthColor(overviewMetrics.systemHealth)}>
                      {getHealthIcon(overviewMetrics.systemHealth)}
                      <span className="ml-1">{overviewMetrics.systemHealth}</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overviewMetrics.totalOperations)}</div>
                  <p className="text-xs text-muted-foreground">
                    In selected time range
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overviewMetrics.avgResponseTime}ms</div>
                  <p className="text-xs text-muted-foreground">
                    System-wide average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pipeline Runs</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(overviewMetrics.totalPipelineRuns)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total executions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{overviewMetrics.avgPipelineSuccess}%</div>
                  <Progress value={overviewMetrics.avgPipelineSuccess} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overviewMetrics.errorRate}</div>
                  <p className="text-xs text-muted-foreground">
                    Total errors detected
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          {systemHealth && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    System Health Overview
                  </CardTitle>
                  <CardDescription>
                    Current status of all system components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <span className="font-medium">Overall Status</span>
                      <Badge className={getHealthColor(systemHealth.overall)}>
                        {getHealthIcon(systemHealth.overall)}
                        <span className="ml-1">{systemHealth.overall}</span>
                      </Badge>
                    </div>
                    
                    {Object.entries(systemHealth.components).map(([component, info]) => (
                      <div key={component} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium capitalize">{component.replace('_', ' ')}</span>
                          <div className="text-sm text-muted-foreground">
                            Last check: {new Date(info.lastCheck).toLocaleString()}
                          </div>
                        </div>
                        <Badge className={getHealthColor(info.status)}>
                          {getHealthIcon(info.status)}
                          <span className="ml-1">{info.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {componentHealth && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Component Statistics
                    </CardTitle>
                    <CardDescription>
                      Performance metrics for each system component
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {Object.entries(componentHealth).map(([component, stats]: [string, any]) => (
                          <div key={component} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{component.replace('_', ' ')}</span>
                              <Badge variant="outline">{stats.uptime}% uptime</Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Avg Response:</span>
                                <div className="font-medium">{stats.avgResponseTime}ms</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">SLA Breaches:</span>
                                <div className="font-medium">{stats.slaBreaches}</div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Healthy: {stats.healthyPercent}%</span>
                                <span>Degraded: {stats.degradedPercent}%</span>
                                <span>Unhealthy: {stats.unhealthyPercent}%</span>
                              </div>
                              <Progress value={stats.healthyPercent} className="h-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Pipeline Performance Tab */}
        <TabsContent value="pipelines" className="space-y-6">
          {pipelineMetrics && (
            <div className="space-y-6">
              {/* Pipeline Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(pipelineMetrics.summary).map(([type, stats]: [string, any]) => (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium capitalize">
                        {type.replace('_', ' ')} Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total runs</div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Success Rate:</span>
                          <Badge variant={stats.successRate >= 95 ? "default" : "destructive"}>
                            {stats.successRate}%
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Avg Duration: {formatDuration(stats.avgDuration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg Throughput: {formatNumber(stats.avgThroughput)} items
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Pipeline Runs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recent Pipeline Executions
                  </CardTitle>
                  <CardDescription>
                    Latest pipeline runs with detailed performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {pipelineMetrics.recent.map((pipeline) => (
                        <div key={pipeline.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="capitalize">
                                {pipeline.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm font-mono text-muted-foreground">
                                {pipeline.executionId.slice(0, 8)}...
                              </span>
                            </div>
                            <Badge 
                              variant={pipeline.status === 'COMPLETED' ? "default" : 
                                      pipeline.status === 'FAILED' ? "destructive" : "secondary"}
                            >
                              {pipeline.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <div className="font-medium">{formatDuration(pipeline.duration)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Processed:</span>
                              <div className="font-medium">{formatNumber(pipeline.processed)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success Rate:</span>
                              <div className="font-medium text-green-600">{pipeline.successRate}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Started:</span>
                              <div className="font-medium">{new Date(pipeline.startedAt).toLocaleString()}</div>
                            </div>
                          </div>
                          
                          {pipeline.failed > 0 && (
                            <div className="mt-2 text-sm text-red-600">
                              {pipeline.failed} items failed
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Component Analysis Tab */}
        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="w-5 h-5 mr-2" />
                  Component Performance Analysis
                </CardTitle>
                <CardDescription>
                  Detailed analysis coming in Phase 2B-8c
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Component-level performance analysis, trend detection, and predictive insights 
                  will be available in the next phase.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Trends
                </CardTitle>
                <CardDescription>
                  Historical trend analysis coming soon
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Trend Analysis</h3>
                <p className="text-muted-foreground mb-6">
                  Advanced charting, trend detection, and performance forecasting 
                  will be implemented in Phase 2B-8c.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;
