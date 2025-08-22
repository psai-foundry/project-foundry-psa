

/**
 * Comprehensive Audit Trail Dashboard
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle,
  Activity,
  Users,
  Calendar,
  Download,
  RefreshCw,
  Clock,
  User,
  FileText,
  TrendingUp
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface AuditStats {
  totalLogs: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  userBreakdown: Array<{ userId: string; userName: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number }>;
  criticalActions: number;
}

export function AuditTrailDashboard() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [criticalActions, setCriticalActions] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch audit logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== 0) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      
      const data = await response.json();
      setLogs(data.data || []);
      setTotalLogs(data.total || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit-logs/stats?days=30');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      toast.error('Failed to load audit statistics');
    }
  };

  // Fetch critical actions (admin only)
  const fetchCriticalActions = async () => {
    if (session?.user?.role !== 'ADMIN') return;
    
    try {
      const response = await fetch('/api/audit-logs/critical?limit=10');
      if (!response.ok) throw new Error('Failed to fetch critical actions');
      
      const data = await response.json();
      setCriticalActions(data.data || []);
    } catch (error) {
      console.error('Error fetching critical actions:', error);
      toast.error('Failed to load critical actions');
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchCriticalActions();
  }, [session, filters]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  // Handle pagination
  const handlePagination = (direction: 'next' | 'prev') => {
    const newOffset = direction === 'next' 
      ? filters.offset + filters.limit
      : Math.max(0, filters.offset - filters.limit);
    
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      userId: '',
      startDate: '',
      endDate: '',
      limit: 50,
      offset: 0,
    });
  };

  // Get action badge color
  const getActionBadgeColor = (action: string) => {
    if (action.includes('OVERRIDE') || action.includes('MANUAL')) return 'destructive';
    if (action.includes('APPROVE')) return 'secondary';
    if (action.includes('CREATE')) return 'default';
    if (action.includes('DELETE') || action.includes('REVOKE')) return 'outline';
    return 'secondary';
  };

  // Format log details for display
  const formatLogDetails = (log: AuditLog) => {
    const details: any = {};
    
    if (log.newValues) {
      Object.entries(log.newValues).forEach(([key, value]) => {
        if (typeof value === 'object') {
          details[key] = JSON.stringify(value, null, 2);
        } else {
          details[key] = value;
        }
      });
    }
    
    return details;
  };

  // Check permissions
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access audit trails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Audit Trail Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive audit trail for all administrative actions and manual interventions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); fetchCriticalActions(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs">
            <FileText className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="w-4 h-4 mr-2" />
            Statistics
          </TabsTrigger>
          {session?.user?.role === 'ADMIN' && (
            <TabsTrigger value="critical">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Critical Actions
            </TabsTrigger>
          )}
          <TabsTrigger value="analysis">
            <Activity className="w-4 h-4 mr-2" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Actions</SelectItem>
                    <SelectItem value="MANUAL_XERO_SYNC">Manual Sync</SelectItem>
                    <SelectItem value="VALIDATION_OVERRIDE">Validation Override</SelectItem>
                    <SelectItem value="BULK_REPROCESS">Bulk Reprocess</SelectItem>
                    <SelectItem value="TIMESHEET_APPROVED">Timesheet Approved</SelectItem>
                    <SelectItem value="TIMESHEET_REJECTED">Timesheet Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Entities</SelectItem>
                    <SelectItem value="TimesheetBatch">Timesheet Batch</SelectItem>
                    <SelectItem value="XeroValidationOverride">Validation Override</SelectItem>
                    <SelectItem value="BulkProcessingJob">Bulk Processing</SelectItem>
                    <SelectItem value="TimesheetSubmission">Timesheet</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  placeholder="Start date"
                />

                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  placeholder="End date"
                />
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalLogs)} of {totalLogs} logs
                </div>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDetails(true);
                      }}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex flex-col">
                          <Badge variant={getActionBadgeColor(log.action)} className="w-fit">
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            {log.entityType}{log.entityId && ` • ${log.entityId.substring(0, 8)}...`}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">
                              {log.user?.name || 'System'}
                            </span>
                            {log.user?.role && (
                              <Badge variant="outline" className="text-xs">
                                {log.user.role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.user?.email}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(parseISO(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                          </span>
                        </div>

                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {logs.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
                      <p className="text-muted-foreground">
                        No logs match your current filters.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => handlePagination('prev')}
                  disabled={filters.offset === 0}
                >
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(totalLogs / filters.limit)}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePagination('next')}
                  disabled={filters.offset + filters.limit >= totalLogs}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.totalLogs.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Logs</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {stats.criticalActions}
                        </div>
                        <div className="text-sm text-muted-foreground">Critical Actions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.userBreakdown.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Active Users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-8 h-8 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(stats.totalLogs / 30)}
                        </div>
                        <div className="text-sm text-muted-foreground">Daily Average</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.actionBreakdown)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {action.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Entity Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.entityBreakdown)
                        .sort(([,a], [,b]) => b - a)
                        .map(([entity, count]) => (
                        <div key={entity} className="flex items-center justify-between">
                          <div className="text-sm">{entity}</div>
                          <div className="text-sm font-medium">{count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.userBreakdown
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10)
                      .map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-muted-foreground">{user.userId}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">{user.count} actions</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {session?.user?.role === 'ADMIN' && (
          <TabsContent value="critical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Critical Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalActions.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <Badge variant="destructive">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>

                        <div className="flex-1">
                          <div className="font-medium">
                            {log.user?.name || 'System'} • {log.user?.role}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.entityType}{log.entityId && ` • ${log.entityId}`}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(log.timestamp), 'MMM dd, HH:mm')}
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {criticalActions.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="font-semibold mb-2">No Critical Actions</h3>
                      <p className="text-muted-foreground text-sm">
                        No critical administrative actions found recently.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics Coming Soon</h3>
              <p className="text-muted-foreground">
                Advanced audit trail analytics, trend analysis, and compliance reporting features will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Audit Log Details</h3>
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Action:</strong> <Badge variant={getActionBadgeColor(selectedLog.action)}>{selectedLog.action}</Badge></div>
                      <div><strong>Entity Type:</strong> {selectedLog.entityType}</div>
                      <div><strong>Entity ID:</strong> {selectedLog.entityId || 'N/A'}</div>
                      <div><strong>Timestamp:</strong> {format(parseISO(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">User Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>User:</strong> {selectedLog.user?.name || 'System'}</div>
                      <div><strong>Email:</strong> {selectedLog.user?.email || 'N/A'}</div>
                      <div><strong>Role:</strong> <Badge variant="outline">{selectedLog.user?.role || 'System'}</Badge></div>
                      <div><strong>IP Address:</strong> {selectedLog.ipAddress || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {selectedLog.newValues && (
                  <div>
                    <h4 className="font-semibold mb-2">Action Details</h4>
                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.oldValues && (
                  <div>
                    <h4 className="font-semibold mb-2">Previous Values</h4>
                    <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditTrailDashboard;

