
/**
 * Validation Override Dashboard Component
 * Phase 2B-7b: Interface for managing validation overrides
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Eye,
  FileText,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

interface ValidationOverride {
  id: string;
  entityType: string;
  entityId: string;
  overriddenRules: string[];
  justification: string;
  overrideType: 'TEMPORARY' | 'PERMANENT';
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  approvalComments?: string;
}

interface ValidationOverrideDashboardProps {
  timesheetValidationErrors?: Array<{
    timesheetId: string;
    user: string;
    errors: ValidationError[];
  }>;
}

export function ValidationOverrideDashboard({ timesheetValidationErrors = [] }: ValidationOverrideDashboardProps) {
  const [overrides, setOverrides] = useState<ValidationOverride[]>([]);
  const [selectedErrors, setSelectedErrors] = useState<Map<string, ValidationError[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createOverrideData, setCreateOverrideData] = useState({
    entityId: '',
    entityType: 'TimesheetSubmission',
    overriddenRules: [] as string[],
    justification: '',
    overrideType: 'TEMPORARY' as 'TEMPORARY' | 'PERMANENT',
    expiresAt: '',
    requiresApproval: false
  });

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/xero/validation-overrides');
      const data = await response.json();
      
      if (data.success) {
        setOverrides(data.data);
      } else {
        toast.error('Failed to fetch validation overrides');
      }
    } catch (error) {
      toast.error('Failed to fetch validation overrides');
    } finally {
      setLoading(false);
    }
  };

  const createOverride = async () => {
    if (!createOverrideData.entityId || !createOverrideData.justification || createOverrideData.overriddenRules.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/xero/validation-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createOverrideData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowCreateDialog(false);
        setCreateOverrideData({
          entityId: '',
          entityType: 'TimesheetSubmission',
          overriddenRules: [],
          justification: '',
          overrideType: 'TEMPORARY',
          expiresAt: '',
          requiresApproval: false
        });
        fetchOverrides();
      } else {
        toast.error(data.error || 'Failed to create validation override');
      }
    } catch (error) {
      toast.error('Failed to create validation override');
    } finally {
      setLoading(false);
    }
  };

  const updateOverrideStatus = async (overrideId: string, action: string, comments?: string, newExpiryDate?: string) => {
    setLoading(true);
    try {
      const body: any = { overrideId, action };
      if (comments) body.comments = comments;
      if (newExpiryDate) body.newExpiryDate = newExpiryDate;

      const response = await fetch('/api/xero/validation-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchOverrides();
      } else {
        toast.error(data.error || 'Failed to update validation override');
      }
    } catch (error) {
      toast.error('Failed to update validation override');
    } finally {
      setLoading(false);
    }
  };

  const createQuickOverride = (timesheetId: string, errors: ValidationError[]) => {
    setCreateOverrideData({
      ...createOverrideData,
      entityId: timesheetId,
      overriddenRules: errors.map(e => e.field),
      justification: `Quick override for validation errors: ${errors.map(e => e.message).join(', ')}`
    });
    setShowCreateDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'ACTIVE': { color: 'bg-green-500', text: 'Active', icon: ShieldCheck },
      'PENDING_APPROVAL': { color: 'bg-yellow-500', text: 'Pending Approval', icon: Clock },
      'REJECTED': { color: 'bg-red-500', text: 'Rejected', icon: XCircle },
      'REVOKED': { color: 'bg-gray-500', text: 'Revoked', icon: ShieldX },
      'EXPIRED': { color: 'bg-gray-400', text: 'Expired', icon: Clock }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'bg-gray-500', text: status, icon: Shield };
    const IconComponent = statusInfo.icon;

    return (
      <Badge className={`${statusInfo.color} text-white flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {statusInfo.text}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap = {
      'LOW': { color: 'bg-blue-500', text: 'Low' },
      'MEDIUM': { color: 'bg-yellow-500', text: 'Medium' },
      'HIGH': { color: 'bg-orange-500', text: 'High' },
      'CRITICAL': { color: 'bg-red-500', text: 'Critical' }
    };

    const severityInfo = severityMap[severity as keyof typeof severityMap] || { color: 'bg-gray-500', text: severity };

    return (
      <Badge className={`${severityInfo.color} text-white`}>
        {severityInfo.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-500" />
            Validation Override Management
          </CardTitle>
          <CardDescription>
            Manage validation rule overrides for Xero sync operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending-errors" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending-errors">Pending Validation Errors</TabsTrigger>
              <TabsTrigger value="active-overrides">Active Overrides</TabsTrigger>
              <TabsTrigger value="override-history">Override History</TabsTrigger>
            </TabsList>

            {/* Pending Validation Errors Tab */}
            <TabsContent value="pending-errors" className="space-y-4">
              {timesheetValidationErrors.length > 0 ? (
                <div className="space-y-4">
                  {timesheetValidationErrors.map((item, index) => (
                    <Card key={index} className="border-red-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                            Validation Errors - {item.user}
                          </CardTitle>
                          <Button 
                            size="sm" 
                            onClick={() => createQuickOverride(item.timesheetId, item.errors)}
                            className="flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Override
                          </Button>
                        </div>
                        <CardDescription>Timesheet ID: {item.timesheetId}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {item.errors.map((error, errorIndex) => (
                            <Alert key={errorIndex} className="border-red-200">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Field: {error.field}</span>
                                      {getSeverityBadge(error.severity)}
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <strong>Error:</strong> {error.message}
                                  </div>
                                  <div className="text-sm">
                                    <strong>Resolution:</strong> {error.actionableMessage}
                                  </div>
                                  {error.resolutionSteps.length > 0 && (
                                    <div className="text-sm">
                                      <strong>Steps to resolve:</strong>
                                      <ul className="list-disc list-inside ml-4 mt-1">
                                        {error.resolutionSteps.map((step, stepIndex) => (
                                          <li key={stepIndex}>{step}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Pending Validation Errors</h3>
                    <p className="text-muted-foreground">
                      All current timesheet records have passed validation or have active overrides.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Active Overrides Tab */}
            <TabsContent value="active-overrides" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Active Validation Overrides</h3>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      New Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Validation Override</DialogTitle>
                      <DialogDescription>
                        Create a new validation rule override for specific entities
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entityType">Entity Type</Label>
                          <Select 
                            value={createOverrideData.entityType} 
                            onValueChange={(value) => setCreateOverrideData({...createOverrideData, entityType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TimesheetSubmission">Timesheet Submission</SelectItem>
                              <SelectItem value="TimeEntry">Time Entry</SelectItem>
                              <SelectItem value="Project">Project</SelectItem>
                              <SelectItem value="Contact">Contact</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="entityId">Entity ID</Label>
                          <Input
                            id="entityId"
                            value={createOverrideData.entityId}
                            onChange={(e) => setCreateOverrideData({...createOverrideData, entityId: e.target.value})}
                            placeholder="Enter entity ID"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="overriddenRules">Overridden Rules</Label>
                        <Input
                          id="overriddenRules"
                          value={createOverrideData.overriddenRules.join(', ')}
                          onChange={(e) => setCreateOverrideData({
                            ...createOverrideData, 
                            overriddenRules: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                          })}
                          placeholder="Enter validation rules to override (comma-separated)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="justification">Justification</Label>
                        <Textarea
                          id="justification"
                          value={createOverrideData.justification}
                          onChange={(e) => setCreateOverrideData({...createOverrideData, justification: e.target.value})}
                          placeholder="Provide detailed justification for this override"
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="overrideType">Override Type</Label>
                          <Select 
                            value={createOverrideData.overrideType} 
                            onValueChange={(value: any) => setCreateOverrideData({...createOverrideData, overrideType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEMPORARY">Temporary</SelectItem>
                              <SelectItem value="PERMANENT">Permanent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {createOverrideData.overrideType === 'TEMPORARY' && (
                          <div className="space-y-2">
                            <Label htmlFor="expiresAt">Expires At</Label>
                            <Input
                              id="expiresAt"
                              type="datetime-local"
                              value={createOverrideData.expiresAt}
                              onChange={(e) => setCreateOverrideData({...createOverrideData, expiresAt: e.target.value})}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requiresApproval"
                          checked={createOverrideData.requiresApproval}
                          onCheckedChange={(checked) => 
                            setCreateOverrideData({...createOverrideData, requiresApproval: checked as boolean})
                          }
                        />
                        <Label htmlFor="requiresApproval">Requires approval</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCreateDialog(false)}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button onClick={createOverride} disabled={loading}>
                          {loading ? 'Creating...' : 'Create Override'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {overrides.filter(o => o.status === 'ACTIVE').map((override) => (
                  <Card key={override.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center">
                          {getStatusBadge(override.status)}
                          <span className="ml-3">{override.entityType}</span>
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{override.overrideType}</Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateOverrideStatus(override.id, 'revoke', 'Manual revocation')}
                            disabled={loading}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Entity ID: {override.entityId} • Created by {override.createdBy.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <strong>Overridden Rules:</strong>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {override.overriddenRules.map((rule, index) => (
                              <Badge key={index} variant="secondary">{rule}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <strong>Justification:</strong>
                          <p className="text-sm text-muted-foreground mt-1">{override.justification}</p>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Created: {format(new Date(override.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                          {override.expiresAt && (
                            <span>Expires: {format(new Date(override.expiresAt), 'MMM dd, yyyy HH:mm')}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Override History Tab */}
            <TabsContent value="override-history" className="space-y-4">
              <div className="space-y-4">
                {overrides.filter(o => ['REJECTED', 'REVOKED', 'EXPIRED'].includes(o.status)).map((override) => (
                  <Card key={override.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center">
                          {getStatusBadge(override.status)}
                          <span className="ml-3">{override.entityType}</span>
                        </CardTitle>
                        <Badge variant="outline">{override.overrideType}</Badge>
                      </div>
                      <CardDescription>
                        Entity ID: {override.entityId} • Created by {override.createdBy.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <strong>Overridden Rules:</strong>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {override.overriddenRules.map((rule, index) => (
                              <Badge key={index} variant="secondary">{rule}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <strong>Justification:</strong>
                          <p className="text-sm text-muted-foreground mt-1">{override.justification}</p>
                        </div>
                        {override.approvalComments && (
                          <div>
                            <strong>Comments:</strong>
                            <p className="text-sm text-muted-foreground mt-1">{override.approvalComments}</p>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Created: {format(new Date(override.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                          {override.approvedAt && (
                            <span>
                              {override.status === 'REJECTED' ? 'Rejected' : 
                               override.status === 'REVOKED' ? 'Revoked' : 'Approved'}: {format(new Date(override.approvedAt), 'MMM dd, yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ValidationOverrideDashboard;
