
/**
 * Xero Batch Migration Dashboard Component
 * Phase 2B-5: Batch Processing & Historical Data Migration
 * 
 * Provides comprehensive management interface for batch migrations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Download,
  Eye,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Settings,
  TrendingUp,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface MigrationSummary {
  totalApprovedTimesheets: number;
  alreadySyncedTimesheets: number;
  pendingMigrationTimesheets: number;
  oldestPendingTimesheet?: string;
  newestPendingTimesheet?: string;
  estimatedDuration: string;
}

interface ValidationResults {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  issues: Array<{
    recordId: string;
    issue: string;
    severity: 'warning' | 'error';
  }>;
}

interface BatchMigrationProgress {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentBatch: number;
  totalBatches: number;
  startedAt: string;
  estimatedCompletionAt?: string;
  lastBatchAt?: string;
  errors: Array<{
    recordId: string;
    error: string;
    timestamp: string;
    retryCount: number;
  }>;
}

interface BatchConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  dryRun: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export function XeroBatchMigrationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResults | null>(null);
  const [activeMigrations, setActiveMigrations] = useState<BatchMigrationProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<BatchConfig>({
    batchSize: 50,
    delayBetweenBatches: 2000,
    maxRetries: 3,
    dryRun: true
  });

  // Load initial data
  useEffect(() => {
    loadSummary();
    loadActiveMigrations();
  }, []);

  // Polling for active migration updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeMigrations.some(m => ['running', 'pending'].includes(m.status))) {
        loadActiveMigrations();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeMigrations]);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/xero/batch-migration/analyze');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.analysis);
      } else {
        toast.error('Failed to load migration summary');
      }
    } catch (error) {
      toast.error('Error loading migration summary');
    } finally {
      setIsLoading(false);
    }
  };

  const loadValidation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/xero/batch-migration/validate');
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.validation);
      } else {
        toast.error('Failed to validate data');
      }
    } catch (error) {
      toast.error('Error validating data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveMigrations = async () => {
    try {
      const response = await fetch('/api/xero/batch-migration');
      const data = await response.json();
      
      if (data.success) {
        setActiveMigrations(data.migrations);
      }
    } catch (error) {
      console.error('Error loading migrations:', error);
    }
  };

  const startMigration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/xero/batch-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadActiveMigrations();
        setActiveTab('monitor');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Error starting migration');
    } finally {
      setIsLoading(false);
    }
  };

  const controlMigration = async (migrationId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/xero/batch-migration/${migrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        loadActiveMigrations();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Error controlling migration');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      paused: 'secondary',
      completed: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Xero Batch Migration</h2>
          <p className="text-muted-foreground">
            Migrate historical approved timesheets to Xero
          </p>
        </div>
        <Button
          onClick={loadSummary}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.totalApprovedTimesheets || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All approved timesheets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Already Synced</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.alreadySyncedTimesheets || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Previously migrated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Migration</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.pendingMigrationTimesheets || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to migrate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Est. Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.estimatedDuration || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Migration time
                </p>
              </CardContent>
            </Card>
          </div>

          {summary && summary.pendingMigrationTimesheets > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {summary.pendingMigrationTimesheets} approved timesheets that haven't been synced to Xero.
                The oldest pending timesheet is from {summary.oldestPendingTimesheet ? new Date(summary.oldestPendingTimesheet).toLocaleDateString() : 'unknown date'}.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Data Validation
              </CardTitle>
              <CardDescription>
                Validate historical data before migration to identify potential issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={loadValidation}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Run Validation
              </Button>

              {validation && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{validation.totalRecords}</div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{validation.validRecords}</div>
                      <div className="text-sm text-muted-foreground">Valid</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{validation.invalidRecords}</div>
                      <div className="text-sm text-muted-foreground">Issues Found</div>
                    </div>
                  </div>

                  {validation.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Issues Found:</h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {validation.issues.map((issue, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg ${
                              issue.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                            } border`}
                          >
                            <div className="flex items-center gap-2">
                              {issue.severity === 'error' ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                              <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'}>
                                {issue.severity}
                              </Badge>
                              <span className="text-sm font-mono">{issue.recordId}</span>
                            </div>
                            <p className="text-sm mt-1">{issue.issue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Migration Configuration
              </CardTitle>
              <CardDescription>
                Configure batch migration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    min="1"
                    max="100"
                    value={config.batchSize}
                    onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 50 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of timesheets to process per batch (1-100)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delay">Delay Between Batches (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="1000"
                    value={config.delayBetweenBatches}
                    onChange={(e) => setConfig({ ...config, delayBetweenBatches: parseInt(e.target.value) || 2000 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Delay between batches to respect API limits
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retries">Max Retries</Label>
                  <Input
                    id="retries"
                    type="number"
                    min="0"
                    max="10"
                    value={config.maxRetries}
                    onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum retry attempts for failed records
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dryRun">Dry Run Mode</Label>
                    <Switch
                      id="dryRun"
                      checked={config.dryRun}
                      onCheckedChange={(checked) => setConfig({ ...config, dryRun: checked })}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.dryRun ? 'Test migration without sending data to Xero' : 'Live migration - data will be sent to Xero'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Date Range (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={config.dateRange?.startDate || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        dateRange: {
                          startDate: e.target.value,
                          endDate: config.dateRange?.endDate || ''
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={config.dateRange?.endDate || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        dateRange: {
                          startDate: config.dateRange?.startDate || '',
                          endDate: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={startMigration}
                  disabled={isLoading}
                  className="w-full"
                  variant={config.dryRun ? "outline" : "default"}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {config.dryRun ? 'Start Dry Run Migration' : 'Start Live Migration'}
                </Button>
              </div>

              {!config.dryRun && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Live migration will send data to Xero. Make sure you've tested with dry run first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Migrations
              </CardTitle>
              <CardDescription>
                Monitor and control active batch migrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeMigrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active migrations
                </div>
              ) : (
                <div className="space-y-6">
                  {activeMigrations.map((migration) => (
                    <div key={migration.id} className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(migration.status)}
                          <span className="font-mono text-sm">{migration.id}</span>
                          {getStatusBadge(migration.status)}
                        </div>
                        <div className="flex gap-2">
                          {migration.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => controlMigration(migration.id, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {migration.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => controlMigration(migration.id, 'resume')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {['running', 'paused'].includes(migration.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => controlMigration(migration.id, 'cancel')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Progress</div>
                          <div className="font-semibold">
                            {migration.processedRecords} / {migration.totalRecords}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Success Rate</div>
                          <div className="font-semibold">
                            {migration.processedRecords > 0 
                              ? Math.round((migration.successfulRecords / migration.processedRecords) * 100)
                              : 0
                            }%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Current Batch</div>
                          <div className="font-semibold">
                            {migration.currentBatch} / {migration.totalBatches}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Started</div>
                          <div className="font-semibold">
                            {new Date(migration.startedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <Progress 
                        value={(migration.processedRecords / migration.totalRecords) * 100} 
                        className="w-full"
                      />

                      {migration.errors.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-red-600">
                            Errors ({migration.errors.length})
                          </div>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {migration.errors.slice(-5).map((error, index) => (
                              <div key={index} className="text-xs p-2 bg-red-50 rounded">
                                <span className="font-mono">{error.recordId}:</span> {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
