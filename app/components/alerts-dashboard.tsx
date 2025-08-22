

/**
 * Alerts Management Dashboard
 * Phase 2B-8c: Automated Alerting System
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Clock,
  TrendingUp,
  Activity,
  Bell,
  BellRing,
  AlertCircle,
  Info,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metricType: string;
  condition: string;
  threshold: number;
  timeWindow: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suppressDuration: number;
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
  notificationChannels: any[];
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    alerts: number;
  };
}

interface AlertItem {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
  title: string;
  message: string;
  metricValue?: number;
  threshold?: number;
  affectedEntity?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rule: {
    id: string;
    name: string;
    description?: string;
    metricType: string;
    condition: string;
    threshold: number;
  };
}

interface EngineStats {
  activeAlerts: number;
  totalRules: number;
  recentAlerts: number;
}

const AlertsDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [engineStats, setEngineStats] = useState<EngineStats>({ activeAlerts: 0, totalRules: 0, recentAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const [alertsRes, rulesRes, engineRes] = await Promise.all([
        fetch('/api/alerts'),
        fetch('/api/alerts/rules'),
        fetch('/api/alerts/engine')
      ]);

      if (!alertsRes.ok || !rulesRes.ok || !engineRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [alertsData, rulesData, engineData] = await Promise.all([
        alertsRes.json(),
        rulesRes.json(),
        engineRes.json()
      ]);

      setAlerts(alertsData.alerts || []);
      setRules(rulesData.rules || []);
      setEngineStats(engineData.statistics || { activeAlerts: 0, totalRules: 0, recentAlerts: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertId })
      });

      if (!res.ok) throw new Error('Failed to update alert');
      
      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alert');
    }
  };

  const handleCreateDefaultRules = async () => {
    try {
      const res = await fetch('/api/alerts/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_defaults' })
      });

      if (!res.ok) throw new Error('Failed to create default rules');
      
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default rules');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 border-red-200';
      case 'ACKNOWLEDGED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'SUPPRESSED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'HIGH': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'LOW': return <Bell className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alert Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage system alerts and notification rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateDefaultRules} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Create Default Rules
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{engineStats.activeAlerts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engineStats.totalRules}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engineStats.recentAlerts}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="severity-filter">Severity:</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts ({filteredAlerts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No alerts match your criteria</p>
                    </div>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getSeverityIcon(alert.severity)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{alert.title}</h4>
                              <Badge className={getSeverityColor(alert.severity)} variant="outline">
                                {alert.severity}
                              </Badge>
                              <Badge className={getStatusColor(alert.status)} variant="outline">
                                {alert.status}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {alert.message}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{format(new Date(alert.createdAt), 'PPp')}</span>
                              <span>{alert.rule.name}</span>
                              {alert.metricValue !== null && (
                                <span>
                                  Value: {alert.metricValue} / {alert.threshold}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          {alert.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlertAction(alert.id, 'acknowledge');
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          
                          {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAlertAction(alert.id, 'resolve');
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alert Rules ({rules.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4" />
                      <p>No alert rules configured</p>
                      <Button onClick={handleCreateDefaultRules} className="mt-4">
                        Create Default Rules
                      </Button>
                    </div>
                  ) : (
                    rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge className={getSeverityColor(rule.severity)} variant="outline">
                              {rule.severity}
                            </Badge>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {rule.description}
                            </p>
                          )}
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>
                              <strong>Condition:</strong> {rule.metricType} {rule.condition} {rule.threshold}
                            </div>
                            <div>
                              <strong>Time Window:</strong> {rule.timeWindow} minutes
                            </div>
                            <div>
                              <strong>Triggered:</strong> {rule.triggerCount} times
                              {rule.lastTriggered && ` (last: ${format(new Date(rule.lastTriggered), 'PPp')})`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {getSeverityIcon(selectedAlert.severity)}
                <DialogTitle>{selectedAlert.title}</DialogTitle>
                <Badge className={getSeverityColor(selectedAlert.severity)} variant="outline">
                  {selectedAlert.severity}
                </Badge>
                <Badge className={getStatusColor(selectedAlert.status)} variant="outline">
                  {selectedAlert.status}
                </Badge>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm text-muted-foreground">{selectedAlert.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Rule Details</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Rule:</strong> {selectedAlert.rule.name}</div>
                    <div><strong>Metric:</strong> {selectedAlert.rule.metricType}</div>
                    <div>
                      <strong>Condition:</strong> {selectedAlert.rule.condition} {selectedAlert.rule.threshold}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Alert Details</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Created:</strong> {format(new Date(selectedAlert.createdAt), 'PPp')}</div>
                    {selectedAlert.metricValue !== null && (
                      <div><strong>Value:</strong> {selectedAlert.metricValue}</div>
                    )}
                    {selectedAlert.affectedEntity && (
                      <div><strong>Entity:</strong> {selectedAlert.affectedEntity}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                {selectedAlert.status === 'OPEN' && (
                  <Button
                    onClick={() => {
                      handleAlertAction(selectedAlert.id, 'acknowledge');
                      setSelectedAlert(null);
                    }}
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                )}
                
                {(selectedAlert.status === 'OPEN' || selectedAlert.status === 'ACKNOWLEDGED') && (
                  <Button
                    onClick={() => {
                      handleAlertAction(selectedAlert.id, 'resolve');
                      setSelectedAlert(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AlertsDashboard;

