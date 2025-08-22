
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  X, 
  Building2, 
  Calendar,
  DollarSign,
  Users,
  Target
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  industry?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  defaultBillRate?: number;
}

interface ProjectFormProps {
  projectId?: string; // For editing existing project
  onSave?: (project: any) => void;
  onCancel?: () => void;
}

export default function ProjectForm({ projectId, onSave, onCancel }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    clientId: '',
    status: 'ACTIVE' as const,
    budget: '',
    startDate: '',
    endDate: '',
    billable: true,
    defaultBillRate: '',
    assignments: [] as Array<{
      userId: string;
      role: string;
      billRate: string;
    }>,
    initialTasks: [] as Array<{
      name: string;
      description: string;
      status: 'OPEN';
      estimatedHours: string;
      billable: boolean;
    }>,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClients();
    fetchUsers();
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100');
      const data = await response.json();
      if (response.ok) {
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (response.ok) {
        const project = data.data;
        setFormData({
          name: project.name,
          code: project.code,
          description: project.description || '',
          clientId: project.clientId,
          status: project.status,
          budget: project.budget?.toString() || '',
          startDate: project.startDate ? project.startDate.split('T')[0] : '',
          endDate: project.endDate ? project.endDate.split('T')[0] : '',
          billable: project.billable,
          defaultBillRate: project.defaultBillRate?.toString() || '',
          assignments: project.assignments?.map((a: any) => ({
            userId: a.user.id,
            role: a.role || '',
            billRate: a.billRate?.toString() || '',
          })) || [],
          initialTasks: project.tasks?.map((t: any) => ({
            name: t.name,
            description: t.description || '',
            status: t.status,
            estimatedHours: t.estimatedHours?.toString() || '',
            billable: t.billable,
          })) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Project code is required';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client selection is required';
    }

    if (formData.budget && isNaN(parseFloat(formData.budget))) {
      newErrors.budget = 'Budget must be a valid number';
    }

    if (formData.defaultBillRate && isNaN(parseFloat(formData.defaultBillRate))) {
      newErrors.defaultBillRate = 'Bill rate must be a valid number';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        defaultBillRate: formData.defaultBillRate ? parseFloat(formData.defaultBillRate) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        assignments: formData.assignments.map(a => ({
          userId: a.userId,
          role: a.role || null,
          billRate: a.billRate ? parseFloat(a.billRate) : null,
        })),
        initialTasks: formData.initialTasks.map(t => ({
          name: t.name,
          description: t.description || null,
          status: t.status,
          estimatedHours: t.estimatedHours ? parseFloat(t.estimatedHours) : null,
          billable: t.billable,
        })),
      };

      const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
      const method = projectId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (onSave) {
          onSave(data.data);
        } else {
          router.push(`/dashboard/projects/${data.data.id}`);
        }
      } else {
        console.error('Error saving project:', data.error);
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error('Error saving project:', error);
      setErrors({ submit: 'An error occurred while saving the project' });
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = () => {
    setFormData({
      ...formData,
      assignments: [...formData.assignments, { userId: '', role: '', billRate: '' }],
    });
  };

  const removeAssignment = (index: number) => {
    setFormData({
      ...formData,
      assignments: formData.assignments.filter((_, i) => i !== index),
    });
  };

  const updateAssignment = (index: number, field: string, value: string) => {
    const updatedAssignments = [...formData.assignments];
    updatedAssignments[index] = { ...updatedAssignments[index], [field]: value };
    
    // Auto-fill bill rate if user is selected
    if (field === 'userId') {
      const selectedUser = users.find(u => u.id === value);
      if (selectedUser?.defaultBillRate) {
        updatedAssignments[index].billRate = selectedUser.defaultBillRate.toString();
      }
    }
    
    setFormData({ ...formData, assignments: updatedAssignments });
  };

  const addTask = () => {
    setFormData({
      ...formData,
      initialTasks: [...formData.initialTasks, { 
        name: '', 
        description: '', 
        status: 'OPEN', 
        estimatedHours: '', 
        billable: true 
      }],
    });
  };

  const removeTask = (index: number) => {
    setFormData({
      ...formData,
      initialTasks: formData.initialTasks.filter((_, i) => i !== index),
    });
  };

  const updateTask = (index: number, field: string, value: any) => {
    const updatedTasks = [...formData.initialTasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setFormData({ ...formData, initialTasks: updatedTasks });
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSelectedUser = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectId ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-gray-600">
              {projectId ? 'Update project details and settings' : 'Set up a new project with team and tasks'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel || (() => router.back())}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : projectId ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </div>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="tasks">Initial Tasks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="code">Project Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., PROJ-001"
                    className={errors.code ? 'border-red-500' : ''}
                  />
                  {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project objectives and scope"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                    <SelectTrigger className={errors.clientId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.industry && <div className="text-sm text-gray-500">{client.industry}</div>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-sm text-red-600 mt-1">{errors.clientId}</p>}
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={errors.endDate ? 'border-red-500' : ''}
                  />
                  {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0.00"
                    className={errors.budget ? 'border-red-500' : ''}
                  />
                  {errors.budget && <p className="text-sm text-red-600 mt-1">{errors.budget}</p>}
                </div>
                <div>
                  <Label htmlFor="defaultBillRate">Default Bill Rate ($/hour)</Label>
                  <Input
                    id="defaultBillRate"
                    type="number"
                    step="0.01"
                    value={formData.defaultBillRate}
                    onChange={(e) => setFormData({ ...formData, defaultBillRate: e.target.value })}
                    placeholder="0.00"
                    className={errors.defaultBillRate ? 'border-red-500' : ''}
                  />
                  {errors.defaultBillRate && <p className="text-sm text-red-600 mt-1">{errors.defaultBillRate}</p>}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable}
                  onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="billable">This is a billable project</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Assignments ({formData.assignments.length})
                </div>
                <Button onClick={addAssignment} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.assignments.map((assignment, index) => {
                const selectedUser = getSelectedUser(assignment.userId);
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-4">
                      {selectedUser && (
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getUserInitials(selectedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Team Member</Label>
                          <Select 
                            value={assignment.userId} 
                            onValueChange={(value) => updateAssignment(index, 'userId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(user => 
                                  !formData.assignments.some((a, i) => i !== index && a.userId === user.id)
                                )
                                .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.role}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Project Role</Label>
                          <Input
                            value={assignment.role}
                            onChange={(e) => updateAssignment(index, 'role', e.target.value)}
                            placeholder="e.g., Project Manager"
                          />
                        </div>
                        <div>
                          <Label>Bill Rate ($/hour)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={assignment.billRate}
                            onChange={(e) => updateAssignment(index, 'billRate', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAssignment(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {formData.assignments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No team members assigned yet</p>
                  <p className="text-sm">Add team members to collaborate on this project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Initial Tasks ({formData.initialTasks.length})
                </div>
                <Button onClick={addTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.initialTasks.map((task, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Task {index + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTask(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Task Name</Label>
                        <Input
                          value={task.name}
                          onChange={(e) => updateTask(index, 'name', e.target.value)}
                          placeholder="Enter task name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={task.description}
                          onChange={(e) => updateTask(index, 'description', e.target.value)}
                          placeholder="Task description"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select 
                          value={task.status} 
                          onValueChange={(value: any) => updateTask(index, 'status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="ON_HOLD">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estimated Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={task.estimatedHours}
                          onChange={(e) => updateTask(index, 'estimatedHours', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center space-x-2 md:col-span-2">
                        <input
                          type="checkbox"
                          id={`task-billable-${index}`}
                          checked={task.billable}
                          onChange={(e) => updateTask(index, 'billable', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`task-billable-${index}`}>Billable task</Label>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {formData.initialTasks.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No initial tasks defined</p>
                  <p className="text-sm">Add tasks to get started with project planning</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Billing Configuration</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="settings-billable"
                      checked={formData.billable}
                      onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="settings-billable">Enable billing for this project</Label>
                  </div>
                  
                  {formData.billable && (
                    <div className="ml-6 space-y-4">
                      <div>
                        <Label htmlFor="settings-rate">Default Hourly Rate ($)</Label>
                        <Input
                          id="settings-rate"
                          type="number"
                          step="0.01"
                          value={formData.defaultBillRate}
                          onChange={(e) => setFormData({ ...formData, defaultBillRate: e.target.value })}
                          placeholder="0.00"
                          className="max-w-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="settings-budget">Project Budget ($)</Label>
                        <Input
                          id="settings-budget"
                          type="number"
                          step="0.01"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          placeholder="0.00"
                          className="max-w-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Project Timeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="settings-start">Project Start Date</Label>
                    <Input
                      id="settings-start"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="settings-end">Project End Date</Label>
                    <Input
                      id="settings-end"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {errors.submit && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{errors.submit}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
