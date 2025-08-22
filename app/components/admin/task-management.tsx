
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  CheckSquare, 
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  code: string;
  client: {
    name: string;
  };
}

interface Task {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  project: Project;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  estimatedHours?: number;
  billable: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    timeEntries: number;
  };
}

const TASK_STATUSES = [
  { value: 'OPEN', label: 'Open', color: 'bg-gray-100 text-gray-800', icon: CheckSquare },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Play },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
];

export function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    status: 'OPEN' as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD',
    estimatedHours: '',
    billable: true,
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.projectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
      };

      const response = editingTask
        ? await fetch(`/api/admin/tasks/${editingTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        toast.success(editingTask ? 'Task updated' : 'Task created');
        setIsDialogOpen(false);
        resetForm();
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      projectId: task.projectId,
      status: task.status,
      estimatedHours: task.estimatedHours?.toString() || '',
      billable: task.billable,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/admin/tasks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Task deleted');
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      projectId: '',
      status: 'OPEN' as 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD',
      estimatedHours: '',
      billable: true,
    });
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesProject = projectFilter === 'ALL' || task.projectId === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const getStatusConfig = (status: string) => {
    return TASK_STATUSES.find(s => s.value === status);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
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
              {TASK_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Add a new task to a project'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Task Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="UI Design"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData({...formData, projectId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.client.name}</div>
                        </div>
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
                    {TASK_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                  placeholder="40.0"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Task description and requirements..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex items-center space-x-2">
                <Switch
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={(checked) => setFormData({...formData, billable: checked})}
                />
                <Label htmlFor="billable">Billable Task</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {TASK_STATUSES.map(status => {
          const count = tasks.filter(t => t.status === status.value).length;
          const Icon = status.icon;
          return (
            <Card key={status.value}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{status.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" />
            Tasks ({filteredTasks.length})
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
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Estimated Hours</TableHead>
                    <TableHead>Time Logged</TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const statusConfig = getStatusConfig(task.status);
                    const StatusIcon = statusConfig?.icon || CheckSquare;
                    
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{task.name}</div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">{task.project.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{task.project.client.name}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig?.color}>
                            <div className="flex items-center">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              <span>{statusConfig?.label}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.estimatedHours ? (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                              {task.estimatedHours}h
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1 text-muted-foreground" />
                            {task._count.timeEntries} entries
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.billable ? (
                            <Badge className="bg-green-100 text-green-800">Billable</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Non-billable</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(task)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tasks found. Create your first task to get started.
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
