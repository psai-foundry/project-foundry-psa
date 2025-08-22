
/**
 * Xero Sync Dashboard Component
 * Phase 2B-2: UI for managing data transformation and sync
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RotateCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Database, 
  FileText, 
  Users, 
  Building,
  Loader2,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatus {
  isRunning: boolean;
  lastSync?: Date;
  readyForSync: boolean;
  stats: {
    approved_timesheets: number;
    active_projects: number;
    active_clients: number;
    total_time_entries: number;
  };
}

interface ValidationResult {
  connection: {
    connected: boolean;
    organizationName?: string;
    error?: string;
  };
  validation: {
    contacts: { valid: number; errors: number; errorDetails: any[] };
    projects: { valid: number; errors: number; errorDetails: any[] };
    timeEntries: { valid: number; errors: number; errorDetails: any[] };
    overallReadiness: { hasValidData: boolean; totalErrors: number };
  };
  readiness: {
    score: number;
    level: string;
    recommendations: string[];
  };
}

interface SyncOptions {
  dryRun: boolean;
  overwriteExisting: boolean;
  syncProjects: boolean;
  syncContacts: boolean;
  syncTimeEntries: boolean;
  includeDrafts: boolean;
}

export function XeroSyncDashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    dryRun: false,
    overwriteExisting: false,
    syncProjects: true,
    syncContacts: true,
    syncTimeEntries: true,
    includeDrafts: false,
  });
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/xero/sync');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        toast.error('Failed to load sync status');
      }
    } catch (error) {
      toast.error('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  const validateData = async () => {
    setValidating(true);
    try {
      const response = await fetch('/api/xero/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: {} }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setValidation(data.data);
        toast.success('Data validation completed');
      } else {
        toast.error(data.error || 'Validation failed');
      }
    } catch (error) {
      toast.error('Failed to validate data');
    } finally {
      setValidating(false);
    }
  };

  const performSync = async (type: string = 'full') => {
    setSyncing(true);
    try {
      const response = await fetch('/api/xero/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, options: syncOptions }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const result = data.data.result;
        if (result.success) {
          toast.success(`${type} sync completed successfully`);
          // Show summary
          const summary = result.summary;
          let message = 'Sync Summary:\n';
          if (summary.contacts) {
            message += `Contacts: ${summary.contacts.synced}/${summary.contacts.processed}\n`;
          }
          if (summary.projects) {
            message += `Projects: ${summary.projects.synced}/${summary.projects.processed}\n`;
          }
          if (summary.timeEntries) {
            message += `Time Entries: ${summary.timeEntries.synced}/${summary.timeEntries.processed}\n`;
          }
          toast.info(message);
        } else {
          toast.error(`Sync failed: ${result.error}`);
        }
        
        // Refresh status
        loadSyncStatus();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to perform sync');
    } finally {
      setSyncing(false);
      setShowSyncDialog(false);
    }
  };

  const getStatusBadge = (connected: boolean, isRunning?: boolean) => {
    if (isRunning) {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    }
    if (connected) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Disconnected</Badge>;
  };

  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      default: return 'text-red-600';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading sync dashboard...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Xero Data Pipeline</h2>
          <p className="text-muted-foreground">
            Manage synchronization of approved timesheets to Xero
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadSyncStatus}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={validateData}
            disabled={validating}
          >
            {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Validate Data
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusBadge(validation?.connection?.connected || false, status?.isRunning)}
              <RotateCw className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{status?.stats?.approved_timesheets || 0}</span>
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{status?.stats?.active_projects || 0}</span>
              <Database className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{status?.stats?.active_clients || 0}</span>
              <Building className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Alert */}
      {status?.lastSync && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Last Sync</AlertTitle>
          <AlertDescription>
            Data was last synchronized on {new Date(status.lastSync).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
          <TabsTrigger value="sync">Sync Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Readiness Score */}
            {validation && (
              <Card>
                <CardHeader>
                  <CardTitle>Data Readiness</CardTitle>
                  <CardDescription>
                    Overall readiness for Xero synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Readiness Score</span>
                    <span className={`text-2xl font-bold ${getReadinessColor(validation.readiness.level)}`}>
                      {validation.readiness.score}%
                    </span>
                  </div>
                  <Progress value={validation.readiness.score} className="w-full" />
                  <Badge className={getReadinessColor(validation.readiness.level)}>
                    {validation.readiness.level.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common synchronization tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={!status?.readyForSync || syncing}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Full Sync
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure Sync Options</DialogTitle>
                      <DialogDescription>
                        Choose what data to synchronize and how to handle conflicts
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="syncContacts"
                            checked={syncOptions.syncContacts}
                            onCheckedChange={(checked) => setSyncOptions({...syncOptions, syncContacts: checked})}
                          />
                          <Label htmlFor="syncContacts">Sync Contacts</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="syncProjects"
                            checked={syncOptions.syncProjects}
                            onCheckedChange={(checked) => setSyncOptions({...syncOptions, syncProjects: checked})}
                          />
                          <Label htmlFor="syncProjects">Sync Projects</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="syncTimeEntries"
                            checked={syncOptions.syncTimeEntries}
                            onCheckedChange={(checked) => setSyncOptions({...syncOptions, syncTimeEntries: checked})}
                          />
                          <Label htmlFor="syncTimeEntries">Sync Time Entries</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="dryRun"
                            checked={syncOptions.dryRun}
                            onCheckedChange={(checked) => setSyncOptions({...syncOptions, dryRun: checked})}
                          />
                          <Label htmlFor="dryRun">Dry Run (Preview)</Label>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="overwriteExisting"
                          checked={syncOptions.overwriteExisting}
                          onCheckedChange={(checked) => setSyncOptions({...syncOptions, overwriteExisting: checked})}
                        />
                        <Label htmlFor="overwriteExisting">Overwrite Existing Records</Label>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={() => performSync('full')} 
                          disabled={syncing}
                          className="flex-1"
                        >
                          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                          {syncOptions.dryRun ? 'Preview Sync' : 'Start Sync'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => performSync('incremental')}
                  disabled={!status?.readyForSync || syncing}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Incremental Sync
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={validateData}
                  disabled={validating}
                >
                  {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Validate Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="validation">
          <div className="space-y-4">
            {!validation ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Validation Results</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Run data validation to check readiness for Xero synchronization
                  </p>
                  <Button onClick={validateData} disabled={validating}>
                    {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Validate Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Recommendations */}
                {validation.readiness.recommendations.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {validation.readiness.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Validation Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Valid:</span>
                          <Badge variant="default">{validation.validation.contacts.valid}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Errors:</span>
                          <Badge variant="destructive">{validation.validation.contacts.errors}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Projects
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Valid:</span>
                          <Badge variant="default">{validation.validation.projects.valid}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Errors:</span>
                          <Badge variant="destructive">{validation.validation.projects.errors}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Time Entries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Valid:</span>
                          <Badge variant="default">{validation.validation.timeEntries.valid}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Errors:</span>
                          <Badge variant="destructive">{validation.validation.timeEntries.errors}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Sync Management</CardTitle>
              <CardDescription>
                Advanced synchronization options and history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4" />
                <p>Advanced sync management features coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
