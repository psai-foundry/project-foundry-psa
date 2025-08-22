
/**
 * Phase 2B-7c: Bulk Reprocessing Dashboard Component
 * Provides comprehensive interface for bulk operations and queue management
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  RotateCcw,
  Play,
  Pause,
  Square,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  Settings,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import QueueMonitorDashboard from './queue-monitor-dashboard';

interface BulkReprocessJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  startedAt: string;
  completedAt?: string;
  errors: Array<{
    entityId: string;
    error: string;
    timestamp: string;
  }>;
}

interface BulkReprocessFilters {
  dateFrom: string;
  dateTo: string;
  userIds: string[];
  submissionIds: string[];
  operations: string[];
  status: string[];
  trigger: string[];
}

interface BulkReprocessOptions {
  priority: 'high' | 'medium' | 'low';
  retryLimit: number;
  batchSize: number;
  delayBetweenBatches: number;
  dryRun: boolean;
}

export default function BulkReprocessDashboard() {
  // State management
  const [activeJobs, setActiveJobs] = useState<BulkReprocessJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  
  // Filter and options state
  const [operationType, setOperationType] = useState<string>('reprocess_failed');
  const [filters, setFilters] = useState<Partial<BulkReprocessFilters>>({
    dateFrom: '',
    dateTo: '',
    userIds: [],
    submissionIds: [],
    operations: [],
    status: [],
    trigger: []
  });
  const [options, setOptions] = useState<BulkReprocessOptions>({
    priority: 'medium',
    retryLimit: 3,
    batchSize: 10,
    delayBetweenBatches: 1000,
    dryRun: false
  });

  // Auto-refresh jobs
  useEffect(() => {
    const interval = setInterval(fetchJobs, 5000);
    fetchJobs();
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/xero/bulk-reprocess');
      const data = await response.json();
      
      if (data.success) {
        setActiveJobs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  }, []);

  const startBulkReprocess = async () => {
    setLoading(true);
    try {
      const payload = {
        operationType,
        filters: Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && (!Array.isArray(value) || value.length > 0)
          )
        ),
        options
      };

      const response = await fetch('/api/xero/bulk-reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Bulk reprocessing job started: ${data.data.jobId}`);
        await fetchJobs();
      } else {
        toast.error(data.error || 'Failed to start bulk reprocessing');
      }
    } catch (error) {
      toast.error('Failed to start bulk reprocessing');
      console.error('Bulk reprocess error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/xero/bulk-reprocess?jobId=${jobId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Job cancelled successfully');
        await fetchJobs();
      } else {
        toast.error(data.error || 'Failed to cancel job');
      }
    } catch (error) {
      toast.error('Failed to cancel job');
      console.error('Cancel job error:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-orange-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5" />
            <span>Bulk Reprocessing Tools</span>
          </CardTitle>
          <CardDescription>
            Manage bulk operations, reprocess failed syncs, and handle queue management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="configure" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="active-jobs">Active Jobs</TabsTrigger>
              <TabsTrigger value="job-details">Job Details</TabsTrigger>
              <TabsTrigger value="queue-monitor">Queue Monitor</TabsTrigger>
            </TabsList>

            <TabsContent value="configure" className="space-y-6">
              {/* Operation Type Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Operation Type</Label>
                <Select value={operationType} onValueChange={setOperationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reprocess_failed">Reprocess Failed Syncs</SelectItem>
                    <SelectItem value="reprocess_specific">Reprocess Specific Items</SelectItem>
                    <SelectItem value="reprocess_date_range">Reprocess Date Range</SelectItem>
                    <SelectItem value="clear_queue">Clear Queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Filters */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center space-x-2">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">Date From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Date To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>

                {operationType === 'reprocess_specific' && (
                  <div>
                    <Label htmlFor="submissionIds">Submission IDs (comma-separated)</Label>
                    <Input
                      id="submissionIds"
                      placeholder="sub_123, sub_456, sub_789..."
                      value={filters.submissionIds?.join(', ') || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        submissionIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Processing Options */}
              <div className="space-y-4">
                <Label className="text-base font-semibold flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Processing Options</span>
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select 
                      value={options.priority} 
                      onValueChange={(value: 'high' | 'medium' | 'low') => 
                        setOptions(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="batchSize">Batch Size</Label>
                    <Input
                      id="batchSize"
                      type="number"
                      min="1"
                      max="100"
                      value={options.batchSize}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        batchSize: parseInt(e.target.value) || 10 
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="retryLimit">Retry Limit</Label>
                    <Input
                      id="retryLimit"
                      type="number"
                      min="0"
                      max="10"
                      value={options.retryLimit}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        retryLimit: parseInt(e.target.value) || 3 
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="delay">Delay (ms)</Label>
                    <Input
                      id="delay"
                      type="number"
                      min="0"
                      max="10000"
                      value={options.delayBetweenBatches}
                      onChange={(e) => setOptions(prev => ({ 
                        ...prev, 
                        delayBetweenBatches: parseInt(e.target.value) || 1000 
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dryRun"
                    checked={options.dryRun}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, dryRun: checked as boolean }))
                    }
                  />
                  <Label htmlFor="dryRun">Dry Run (validation only)</Label>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button 
                  onClick={startBulkReprocess}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>{options.dryRun ? 'Start Dry Run' : 'Start Bulk Reprocess'}</span>
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={fetchJobs}>
                  <RefreshCw className="w-4 h-4" />
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="active-jobs" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Active Jobs ({activeJobs.length})</Label>
                <Button variant="outline" size="sm" onClick={fetchJobs}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {activeJobs.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>No active bulk reprocessing jobs</AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {activeJobs.map((job) => (
                      <Card key={job.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(job.status)}
                            <Badge variant="outline" className={`text-white ${getStatusColor(job.status)}`}>
                              {job.status.toUpperCase()}
                            </Badge>
                            <span className="font-mono text-sm text-gray-600">
                              {job.id.substring(0, 16)}...
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedJob(job.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(job.status === 'running' || job.status === 'pending') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => cancelJob(job.id)}
                              >
                                <Square className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{job.progress}% ({job.processedItems}/{job.totalItems})</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                          
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>
                              Started: {format(new Date(job.startedAt), 'MMM dd, HH:mm:ss')}
                            </span>
                            <div className="flex space-x-4">
                              <span className="text-green-600">✓ {job.successCount}</span>
                              <span className="text-red-600">✗ {job.errorCount}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="job-details" className="space-y-4">
              {selectedJob ? (
                (() => {
                  const job = activeJobs.find(j => j.id === selectedJob);
                  if (!job) {
                    return (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Selected job not found</AlertDescription>
                      </Alert>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Job Details</Label>
                        <Badge variant="outline" className={`text-white ${getStatusColor(job.status)}`}>
                          {job.status.toUpperCase()}
                        </Badge>
                      </div>

                      <Card className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-semibold">Job ID</Label>
                            <p className="font-mono text-sm">{job.id}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Status</Label>
                            <p className="flex items-center space-x-2">
                              {getStatusIcon(job.status)}
                              <span>{job.status}</span>
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Progress</Label>
                            <p>{job.progress}% ({job.processedItems}/{job.totalItems})</p>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold">Started</Label>
                            <p>{format(new Date(job.startedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                          </div>
                          {job.completedAt && (
                            <div>
                              <Label className="text-sm font-semibold">Completed</Label>
                              <p>{format(new Date(job.completedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-semibold">Results</Label>
                            <div className="flex space-x-4">
                              <span className="text-green-600">Success: {job.successCount}</span>
                              <span className="text-red-600">Errors: {job.errorCount}</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {job.errors.length > 0 && (
                        <Card className="p-4">
                          <Label className="text-base font-semibold mb-3 block">
                            Error Details ({job.errors.length})
                          </Label>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {job.errors.map((error, index) => (
                                <div key={index} className="border rounded p-2 text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-xs text-gray-600">
                                      {error.entityId}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {format(new Date(error.timestamp), 'HH:mm:ss')}
                                    </span>
                                  </div>
                                  <p className="text-red-600">{error.error}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </Card>
                      )}
                    </div>
                  );
                })()
              ) : (
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    Select a job from the Active Jobs tab to view details
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="queue-monitor" className="space-y-6">
              <QueueMonitorDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
