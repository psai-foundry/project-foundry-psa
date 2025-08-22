
/**
 * Xero Quarantine Management Dashboard
 * Phase 2B-6: Comprehensive UI for managing quarantined records and error handling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  PlayCircle,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Users,
  Database
} from 'lucide-react';

interface QuarantineRecord {
  id: string;
  entityType: string;
  entityId: string;
  originalData: any;
  transformedData?: any;
  reason: string;
  status: string;
  errors: Array<{
    field: string;
    message: string;
    actionableMessage: string;
    severity: string;
    resolutionSteps: string[];
  }>;
  priority: string;
  quarantinedAt: string;
  quarantinedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolutionNotes?: string;
}

interface QuarantineStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byReason: Record<string, number>;
  avgResolutionTime: number;
  oldestUnresolved?: string;
}

interface ErrorAnalytics {
  summary: {
    totalErrors: number;
    resolutionRate: number;
    avgResolutionTime: number;
  };
  recommendations: string[];
}

export default function XeroQuarantineDashboard() {
  const [records, setRecords] = useState<QuarantineRecord[]>([]);
  const [stats, setStats] = useState<QuarantineStats | null>(null);
  const [analytics, setAnalytics] = useState<ErrorAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    entityType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QuarantineRecord | null>(null);
  const [reviewForm, setReviewForm] = useState({
    status: '',
    resolutionNotes: '',
    correctedData: ''
  });

  useEffect(() => {
    fetchQuarantineData();
    fetchStats();
  }, [filters, currentPage]);

  const fetchQuarantineData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      });

      const response = await fetch(`/api/xero/quarantine?${params}`);
      const data = await response.json();

      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch quarantine data:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/xero/quarantine/stats?${params}`);
      const data = await response.json();

      setStats(data.quarantine);
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleRecordSelection = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(records.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedRecords.size === 0) return;

    try {
      setLoading(true);
      const response = await fetch('/api/xero/quarantine/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordIds: Array.from(selectedRecords),
          updates: { status: action }
        })
      });

      if (response.ok) {
        fetchQuarantineData();
        fetchStats();
        setSelectedRecords(new Set());
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
    setLoading(false);
  };

  const handleReviewRecord = (record: QuarantineRecord) => {
    setSelectedRecord(record);
    setReviewForm({
      status: 'RESOLVED',
      resolutionNotes: '',
      correctedData: record.transformedData ? JSON.stringify(record.transformedData, null, 2) : ''
    });
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!selectedRecord) return;

    try {
      setLoading(true);
      const response = await fetch('/api/xero/quarantine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: selectedRecord.id,
          status: reviewForm.status,
          resolutionNotes: reviewForm.resolutionNotes,
          correctedData: reviewForm.correctedData ? JSON.parse(reviewForm.correctedData) : undefined
        })
      });

      if (response.ok) {
        setReviewDialogOpen(false);
        fetchQuarantineData();
        fetchStats();
      }
    } catch (error) {
      console.error('Review submission failed:', error);
    }
    setLoading(false);
  };

  const runErrorRecovery = async (dryRun = false) => {
    try {
      setLoading(true);
      const response = await fetch('/api/xero/error-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, maxRecords: 50, priorityOnly: true })
      });

      const result = await response.json();
      console.log('Error recovery result:', result);
      
      if (!dryRun) {
        fetchQuarantineData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error recovery failed:', error);
    }
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUARANTINED': return 'destructive';
      case 'UNDER_REVIEW': return 'default';
      case 'RESOLVED': return 'default';
      case 'REJECTED': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUARANTINED': return <AlertTriangle className="h-4 w-4" />;
      case 'UNDER_REVIEW': return <Clock className="h-4 w-4" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quarantined</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.byStatus.QUARANTINED || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.byPriority.CRITICAL || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.summary.resolutionRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {stats.avgResolutionTime.toFixed(1)}h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus.UNDER_REVIEW || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Being reviewed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => runErrorRecovery(true)}
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Test Recovery
          </Button>
          <Button 
            onClick={() => runErrorRecovery(false)}
            variant="default" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Recovery
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {selectedRecords.size > 0 && (
            <>
              <Badge variant="outline">
                {selectedRecords.size} selected
              </Badge>
              <Button 
                onClick={() => handleBulkAction('RESOLVED')}
                size="sm" 
                variant="default"
                disabled={loading}
              >
                Bulk Resolve
              </Button>
              <Button 
                onClick={() => handleBulkAction('REJECTED')}
                size="sm" 
                variant="outline"
                disabled={loading}
              >
                Bulk Reject
              </Button>
            </>
          )}
          <Button 
            onClick={fetchQuarantineData}
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="QUARANTINED">Quarantined</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select 
                value={filters.priority} 
                onValueChange={(value) => setFilters({...filters, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Entity Type</Label>
              <Select 
                value={filters.entityType} 
                onValueChange={(value) => setFilters({...filters, entityType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="timeEntry">Time Entry</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="submission">Submission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date From</Label>
              <Input 
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>

            <div>
              <Label>Date To</Label>
              <Input 
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quarantined Records</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={selectedRecords.size === records.length && records.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label>Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quarantined records found
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {records.map((record) => (
                  <div 
                    key={record.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={(checked) => handleRecordSelection(record.id, !!checked)}
                        />
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          <Badge variant={getStatusColor(record.status) as any}>
                            {record.status}
                          </Badge>
                          <Badge variant={getPriorityColor(record.priority) as any}>
                            {record.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReviewRecord(record)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <Label className="font-medium">Entity</Label>
                        <p>{record.entityType}: {record.entityId}</p>
                      </div>
                      <div>
                        <Label className="font-medium">Quarantined</Label>
                        <p>{new Date(record.quarantinedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="font-medium">Errors</Label>
                        <p>{record.errors.length} validation errors</p>
                      </div>
                    </div>

                    {record.errors.length > 0 && (
                      <div className="space-y-2">
                        <Label className="font-medium">Error Details</Label>
                        {record.errors.slice(0, 3).map((error, index) => (
                          <div key={index} className="bg-muted p-3 rounded text-sm">
                            <p className="font-medium text-destructive">{error.field}: {error.message}</p>
                            <p className="text-muted-foreground mt-1">{error.actionableMessage}</p>
                          </div>
                        ))}
                        {record.errors.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            +{record.errors.length - 3} more errors
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analytics?.recommendations && analytics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review Quarantined Record</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              <Tabs defaultValue="errors" className="w-full">
                <TabsList>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                  <TabsTrigger value="data">Data</TabsTrigger>
                  <TabsTrigger value="resolution">Resolution</TabsTrigger>
                </TabsList>

                <TabsContent value="errors" className="space-y-4">
                  <ScrollArea className="h-60">
                    {selectedRecord.errors.map((error, index) => (
                      <div key={index} className="border-b pb-4 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={getPriorityColor(error.severity) as any}>
                            {error.severity}
                          </Badge>
                          <span className="font-medium">{error.field}</span>
                        </div>
                        <p className="text-sm text-destructive mb-2">{error.message}</p>
                        <p className="text-sm text-muted-foreground mb-3">{error.actionableMessage}</p>
                        <div>
                          <Label className="text-xs font-medium">Resolution Steps:</Label>
                          <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                            {error.resolutionSteps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Original Data</Label>
                      <ScrollArea className="h-60">
                        <pre className="text-xs bg-muted p-3 rounded">
                          {JSON.stringify(selectedRecord.originalData, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                    <div>
                      <Label>Transformed Data</Label>
                      <ScrollArea className="h-60">
                        <pre className="text-xs bg-muted p-3 rounded">
                          {JSON.stringify(selectedRecord.transformedData, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="resolution" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Resolution Status</Label>
                      <Select 
                        value={reviewForm.status} 
                        onValueChange={(value) => setReviewForm({...reviewForm, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Resolution Notes</Label>
                    <Textarea 
                      value={reviewForm.resolutionNotes}
                      onChange={(e) => setReviewForm({...reviewForm, resolutionNotes: e.target.value})}
                      placeholder="Describe the resolution or reason for rejection..."
                      className="min-h-20"
                    />
                  </div>

                  {reviewForm.status === 'RESOLVED' && (
                    <div>
                      <Label>Corrected Data (JSON)</Label>
                      <Textarea 
                        value={reviewForm.correctedData}
                        onChange={(e) => setReviewForm({...reviewForm, correctedData: e.target.value})}
                        placeholder="Optional: Provide corrected data in JSON format..."
                        className="min-h-40 font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={submitReview} disabled={loading || !reviewForm.status || !reviewForm.resolutionNotes}>
                      Submit Review
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
