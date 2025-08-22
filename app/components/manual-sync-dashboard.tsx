
/**
 * Phase 2B-7a: Manual Sync Dashboard Component
 * Provides interface for manual synchronization of timesheets to Xero
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  Play,
  Search,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ValidationOverrideDashboard from './validation-override-dashboard';
import BulkReprocessDashboard from './bulk-reprocess-dashboard';

interface TimesheetData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  totalBillable: number;
  status: string;
  submittedAt: string;
  approvedAt: string | null;
  entriesCount: number;
  projects: string[];
}

interface SyncResult {
  timesheetId: string;
  user: string;
  weekStart: string;
  status: 'success' | 'error';
  xeroInvoiceId?: string;
  message?: string;
  error?: string;
  validationErrors?: ValidationError[];
}

interface ValidationError {
  id: string;
  field: string;
  message: string;
  actionableMessage: string;
  value?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  type: 'TRANSIENT' | 'PERMANENT';
  resolutionSteps: string[];
}

export function ManualSyncDashboard() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncType, setSyncType] = useState<'approved-only' | 'all' | 'specific'>('approved-only');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [timesheets, setTimesheets] = useState<TimesheetData[]>([]);
  const [selectedTimesheets, setSelectedTimesheets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{
    timesheetId: string;
    user: string;
    errors: ValidationError[];
  }>>([]);

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setDateFrom(format(thirtyDaysAgo, 'yyyy-MM-dd'));
    setDateTo(format(today, 'yyyy-MM-dd'));
  }, []);

  const fetchTimesheets = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select a date range');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        ...(selectedUserId && { userId: selectedUserId })
      });

      const response = await fetch(`/api/xero/manual-sync?${params}`);
      const data = await response.json();

      if (data.success) {
        setTimesheets(data.data);
        // Extract unique users
        const uniqueUsers = Array.from(
          new Map(data.data.map((ts: TimesheetData) => [ts.user.id, ts.user])).values()
        ) as Array<{ id: string; name: string; email: string }>;
        setUsers(uniqueUsers);
        toast.success(`Found ${data.data.length} timesheets`);
      } else {
        toast.error(data.error || 'Failed to fetch timesheets');
      }
    } catch (error) {
      toast.error('Failed to fetch timesheets');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (dryRun = false) => {
    if (syncType === 'specific' && selectedTimesheets.size === 0) {
      toast.error('Please select timesheets to sync');
      return;
    }

    setSyncing(true);
    setSyncResults([]);

    try {
      const syncData = {
        dateFrom,
        dateTo,
        syncType,
        dryRun,
        ...(selectedUserId && { userId: selectedUserId }),
        ...(syncType === 'specific' && { submissionIds: Array.from(selectedTimesheets) })
      };

      const response = await fetch('/api/xero/manual-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData)
      });

      const data = await response.json();

      if (data.success) {
        if (dryRun) {
          toast.success(data.message);
          setTimesheets(data.data.timesheets || []);
          // Extract validation errors from dry run results
          const errors = data.data.timesheets
            ?.filter((ts: any) => !ts.isValid && ts.errors?.length > 0)
            .map((ts: any) => ({
              timesheetId: ts.timesheetId,
              user: ts.user,
              errors: ts.errors
            })) || [];
          setValidationErrors(errors);
        } else {
          setSyncResults(data.data.results || []);
          toast.success(data.message);
          // Extract validation errors from sync results
          const errors = data.data.results
            ?.filter((result: any) => result.status === 'error' && result.validationErrors)
            .map((result: any) => ({
              timesheetId: result.timesheetId,
              user: result.user,
              errors: result.validationErrors
            })) || [];
          setValidationErrors(errors);
          // Refresh timesheet data after sync
          await fetchTimesheets();
        }
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Sync operation failed');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleTimesheetSelection = (timesheetId: string) => {
    const newSelection = new Set(selectedTimesheets);
    if (newSelection.has(timesheetId)) {
      newSelection.delete(timesheetId);
    } else {
      newSelection.add(timesheetId);
    }
    setSelectedTimesheets(newSelection);
  };

  const selectAllTimesheets = () => {
    setSelectedTimesheets(new Set(timesheets.map(ts => ts.id)));
  };

  const clearSelection = () => {
    setSelectedTimesheets(new Set());
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'PENDING': { color: 'bg-yellow-500', text: 'Pending' },
      'APPROVED': { color: 'bg-green-500', text: 'Approved' },
      'REJECTED': { color: 'bg-red-500', text: 'Rejected' },
      'DRAFT': { color: 'bg-gray-500', text: 'Draft' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-500', text: status };
    
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-500" />
            Manual Xero Sync
          </CardTitle>
          <CardDescription>
            Manually synchronize specific timesheet ranges to Xero with granular control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sync">Manual Sync</TabsTrigger>
              <TabsTrigger value="results">Sync Results</TabsTrigger>
              <TabsTrigger value="validation-overrides">Validation Overrides</TabsTrigger>
              <TabsTrigger value="bulk-reprocess">Bulk Reprocessing</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-6">
              {/* Date Range and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="syncType">Sync Type</Label>
                  <Select value={syncType} onValueChange={(value: any) => setSyncType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved-only">Approved Only</SelectItem>
                      <SelectItem value="all">All Timesheets</SelectItem>
                      <SelectItem value="specific">Specific Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user">Filter by User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Users</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={fetchTimesheets} disabled={loading} className="flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Searching...' : 'Search Timesheets'}
                </Button>
                <Button
                  onClick={() => handleSync(true)}
                  variant="outline"
                  disabled={syncing || timesheets.length === 0}
                  className="flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Dry Run
                </Button>
                <Button
                  onClick={() => handleSync(false)}
                  disabled={syncing || timesheets.length === 0}
                  className="flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {syncing ? 'Syncing...' : 'Start Sync'}
                </Button>
              </div>

              {/* Timesheet Selection */}
              {timesheets.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Found Timesheets ({timesheets.length})
                      </CardTitle>
                      {syncType === 'specific' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={selectAllTimesheets}>
                            Select All
                          </Button>
                          <Button size="sm" variant="outline" onClick={clearSelection}>
                            Clear Selection
                          </Button>
                          <Badge variant="secondary">
                            {selectedTimesheets.size} selected
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {timesheets.map(timesheet => (
                          <div
                            key={timesheet.id}
                            className="flex items-center space-x-4 p-3 border rounded-lg"
                          >
                            {syncType === 'specific' && (
                              <Checkbox
                                checked={selectedTimesheets.has(timesheet.id)}
                                onCheckedChange={() => toggleTimesheetSelection(timesheet.id)}
                              />
                            )}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                              <div>
                                <strong>{timesheet.user.name}</strong>
                                <div className="text-muted-foreground">{timesheet.user.email}</div>
                              </div>
                              <div>
                                <strong>Week:</strong> {format(new Date(timesheet.weekStartDate), 'MMM dd')} - {format(new Date(timesheet.weekEndDate), 'MMM dd')}
                              </div>
                              <div>
                                <strong>Hours:</strong> {timesheet.totalHours}
                                <div className="text-muted-foreground">Billable: {timesheet.totalBillable}</div>
                              </div>
                              <div>
                                {getStatusBadge(timesheet.status)}
                              </div>
                              <div>
                                <strong>Projects:</strong> {timesheet.projects.slice(0, 2).join(', ')}
                                {timesheet.projects.length > 2 && ` (+${timesheet.projects.length - 2})`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {syncResults.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Sync Results</CardTitle>
                    <CardDescription>
                      Results from the last manual sync operation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {syncResults.map((result, index) => (
                          <div
                            key={index}
                            className={`flex items-center space-x-4 p-3 border rounded-lg ${
                              result.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                            }`}
                          >
                            {result.status === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{result.user}</div>
                              <div className="text-sm text-muted-foreground">
                                Week: {format(new Date(result.weekStart), 'MMM dd, yyyy')}
                              </div>
                              {result.status === 'success' && result.xeroInvoiceId && (
                                <div className="text-sm text-green-600">
                                  Xero Invoice ID: {result.xeroInvoiceId}
                                </div>
                              )}
                              {result.status === 'error' && result.error && (
                                <div className="text-sm text-red-600">
                                  Error: {result.error}
                                </div>
                              )}
                              {result.message && (
                                <div className="text-sm text-muted-foreground">
                                  {result.message}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Sync Results</h3>
                    <p className="text-muted-foreground">
                      Sync results will appear here after running a manual sync operation.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="validation-overrides" className="space-y-6">
              <ValidationOverrideDashboard timesheetValidationErrors={validationErrors} />
            </TabsContent>

            <TabsContent value="bulk-reprocess" className="space-y-6">
              <BulkReprocessDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ManualSyncDashboard;
