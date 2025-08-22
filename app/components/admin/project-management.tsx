
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Building, 
  Users, 
  Calendar,
  DollarSign,
  FolderOpen,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  clientId: string;
  client: Client;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  budget?: number;
  startDate?: string;
  endDate?: string;
  billable: boolean;
  defaultBillRate?: number;
  assignments: any[];
  tasks: any[];
  _count: {
    timeEntries: number;
    tasks: number;
  };
  createdAt: string;
  updatedAt: string;
}

const PROJECT_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    clientId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED',
    budget: '',
    startDate: '',
    endDate: '',
    billable: true,
    defaultBillRate: '',
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.clientId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        defaultBillRate: formData.defaultBillRate ? parseFloat(formData.defaultBillRate) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      const response = editingProject
        ? await fetch(`/api/admin/projects/${editingProject.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        toast.success(editingProject ? 'Project updated' : 'Project created');
        setIsDialogOpen(false);
        resetForm();
        fetchProjects();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description || '',
      clientId: project.clientId,
      status: project.status,
      budget: project.budget?.toString() || '',
      startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
      endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
      billable: project.billable,
      defaultBillRate: project.defaultBillRate?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/admin/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Project deleted');
        fetchProjects();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      clientId: '',
      status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED',
      budget: '',
      startDate: '',
      endDate: '',
      billable: true,
      defaultBillRate: '',
    });
    setEditingProject(null);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'ON_HOLD': return <Clock className="w-4 h-4" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {PROJECT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update project details' : 'Add a new project to your organization'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="E-commerce Platform"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Project Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="ECOM-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({...formData, clientId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="50000.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billRate">Default Bill Rate ($/hr)</Label>
                <Input
                  id="billRate"
                  type="number"
                  step="0.01"
                  value={formData.defaultBillRate}
                  onChange={(e) => setFormData({...formData, defaultBillRate: e.target.value})}
                  placeholder="150.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Project description and objectives..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingProject ? 'Update Project' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FolderOpen className="w-5 h-5 mr-2" />
            Projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{project.name}</div>
                            <div className="text-sm text-muted-foreground">{project.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                            {project.client.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig?.color}>
                            <div className="flex items-center">
                              {getStatusIcon(project.status)}
                              <span className="ml-1">{statusConfig?.label}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {project.budget ? (
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                              {project.budget.toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project.startDate && project.endDate ? (
                            <div className="flex items-center text-sm">
                              <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                              {format(new Date(project.startDate), 'MMM dd')} - {format(new Date(project.endDate), 'MMM dd')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                              {project.assignments.length}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                              {project._count.timeEntries}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(project)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(project.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No projects found. Create your first project to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
