
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Clock, 
  Target, 
  User, 
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  estimatedHours: number | null;
  billable: boolean;
  createdAt: Date;
  stats?: {
    totalHours: number;
    billableHours: number;
    totalEntries: number;
    contributorsCount: number;
    completionPercentage: number | null;
  };
}

interface TaskManagementProps {
  projectId: string;
}

export default function TaskManagement({ projectId }: TaskManagementProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    status: 'OPEN' as const,
    estimatedHours: '',
    billable: true,
  });

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/by-project/${projectId}?includeStats=true`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.data?.tasks || []);
      } else {
        console.error('Error fetching tasks:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          projectId,
          estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : null,
        }),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setNewTask({
          name: '',
          description: '',
          status: 'OPEN',
          estimatedHours: '',
          billable: true,
        });
        fetchTasks();
      } else {
        const data = await response.json();
        console.error('Error creating task:', data.error);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        console.error('Error updating task:', data.error);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        console.error('Error deleting task:', data.error);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusOptions = () => [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'ON_HOLD', label: 'On Hold' },
  ];

  const groupTasksByStatus = (tasks: Task[]) => {
    const groups = {
      OPEN: tasks.filter(t => t.status === 'OPEN'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      COMPLETED: tasks.filter(t => t.status === 'COMPLETED'),
      ON_HOLD: tasks.filter(t => t.status === 'ON_HOLD'),
    };
    return groups;
  };

  const canManageTasks = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const taskGroups = groupTasksByStatus(tasks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Task Management</h2>
        {canManageTasks && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Task Name</Label>
                  <Input
                    id="name"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={newTask.status} onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getStatusOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      step="0.5"
                      value={newTask.estimatedHours}
                      onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={newTask.billable}
                    onChange={(e) => setNewTask({ ...newTask, billable: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="billable">Billable</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateTask} disabled={!newTask.name}>
                    Create Task
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Object.entries(taskGroups).map(([status, statusTasks]) => (
          <Card key={status} className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {status.replace('_', ' ')} ({statusTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusTasks.map((task) => (
                <Card key={task.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {/* Task Header */}
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-900 text-sm leading-5">{task.name}</h4>
                      {canManageTasks && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedTask(task);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                    )}

                    {/* Task Meta */}
                    <div className="space-y-2">
                      <Badge className={getStatusColor(task.status)} variant="secondary">
                        {task.status.replace('_', ' ')}
                      </Badge>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {task.estimatedHours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedHours}h est.
                          </div>
                        )}
                        {task.stats && (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {task.stats.totalHours.toFixed(1)}h logged
                          </div>
                        )}
                      </div>

                      {task.stats?.completionPercentage !== null && (task.stats?.completionPercentage || 0) > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{task.stats?.completionPercentage?.toFixed(0) || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all" 
                              style={{ width: `${Math.min(task.stats?.completionPercentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Status Actions */}
                    {canManageTasks && (
                      <div className="flex gap-1">
                        {getStatusOptions()
                          .filter(option => option.value !== task.status)
                          .slice(0, 2)
                          .map((option) => (
                            <Button
                              key={option.value}
                              variant="outline"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => handleUpdateTask(task.id, { status: option.value as any })}
                            >
                              {option.label}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              
              {statusTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Task Name</Label>
                <Input
                  id="edit-name"
                  value={selectedTask.name}
                  onChange={(e) => setSelectedTask({ ...selectedTask, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedTask.description || ''}
                  onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={selectedTask.status} onValueChange={(value: any) => setSelectedTask({ ...selectedTask, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                  <Input
                    id="edit-estimatedHours"
                    type="number"
                    step="0.5"
                    value={selectedTask.estimatedHours || ''}
                    onChange={(e) => setSelectedTask({ 
                      ...selectedTask, 
                      estimatedHours: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-billable"
                  checked={selectedTask.billable}
                  onChange={(e) => setSelectedTask({ ...selectedTask, billable: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-billable">Billable</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    handleUpdateTask(selectedTask.id, selectedTask);
                    setIsEditDialogOpen(false);
                  }}
                >
                  Update Task
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
