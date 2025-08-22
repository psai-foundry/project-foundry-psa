
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  User, 
  Mail, 
  DollarSign, 
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Users
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface ProjectAssignment {
  id: string;
  role: string | null;
  billRate: number | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  defaultBillRate?: number;
}

interface ProjectTeamProps {
  projectId: string;
}

export default function ProjectTeam({ projectId }: ProjectTeamProps) {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectAssignment | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    userId: '',
    role: '',
    billRate: '',
  });

  useEffect(() => {
    fetchTeam();
    fetchAvailableUsers();
  }, [projectId]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/project-assignments?projectId=${projectId}&includeUser=true`);
      const data = await response.json();

      if (response.ok) {
        setAssignments(data.data || []);
      } else {
        console.error('Error fetching team:', data.error);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (response.ok) {
        const currentAssignedUserIds = assignments.map(a => a.user.id);
        setAvailableUsers((data.data || []).filter((user: User) => 
          !currentAssignedUserIds.includes(user.id)
        ));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddAssignment = async () => {
    try {
      const response = await fetch('/api/project-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newAssignment,
          projectId,
          billRate: newAssignment.billRate ? parseFloat(newAssignment.billRate) : null,
        }),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        setNewAssignment({
          userId: '',
          role: '',
          billRate: '',
        });
        fetchTeam();
        fetchAvailableUsers();
      } else {
        const data = await response.json();
        console.error('Error adding team member:', data.error);
      }
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const handleUpdateAssignment = async (assignmentId: string, updates: Partial<ProjectAssignment>) => {
    try {
      const response = await fetch(`/api/project-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchTeam();
      } else {
        const data = await response.json();
        console.error('Error updating assignment:', data.error);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this team member from the project?')) return;

    try {
      const response = await fetch(`/api/project-assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTeam();
        fetchAvailableUsers();
      } else {
        const data = await response.json();
        console.error('Error removing team member:', data.error);
      }
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'project manager':
      case 'lead':
        return 'bg-purple-100 text-purple-800';
      case 'developer':
      case 'engineer':
        return 'bg-blue-100 text-blue-800';
      case 'designer':
        return 'bg-green-100 text-green-800';
      case 'analyst':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canManageTeam = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Project Team ({assignments.length})</h2>
        </div>
        {canManageTeam && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user">Select User</Label>
                  <Select value={newAssignment.userId} onValueChange={(value) => {
                    setNewAssignment({ ...newAssignment, userId: value });
                    const selectedUser = availableUsers.find(u => u.id === value);
                    if (selectedUser?.defaultBillRate) {
                      setNewAssignment({ 
                        ...newAssignment, 
                        userId: value,
                        billRate: selectedUser.defaultBillRate.toString()
                      });
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getUserInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.role}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Project Role</Label>
                  <Input
                    id="role"
                    value={newAssignment.role}
                    onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
                    placeholder="e.g., Project Manager, Developer, Designer"
                  />
                </div>
                <div>
                  <Label htmlFor="billRate">Bill Rate ($/hour)</Label>
                  <Input
                    id="billRate"
                    type="number"
                    step="0.01"
                    value={newAssignment.billRate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, billRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddAssignment} disabled={!newAssignment.userId}>
                    Add to Team
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Member Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getUserInitials(assignment.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-gray-900">{assignment.user.name}</h4>
                      <p className="text-sm text-gray-500">{assignment.user.role}</p>
                    </div>
                  </div>
                  {canManageTeam && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedAssignment(assignment);
                          setIsEditDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Assignment
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Member Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{assignment.user.email}</span>
                  </div>
                  
                  {assignment.user.department && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{assignment.user.department}</span>
                    </div>
                  )}

                  {assignment.role && (
                    <div>
                      <Badge className={getRoleColor(assignment.role)} variant="secondary">
                        {assignment.role}
                      </Badge>
                    </div>
                  )}

                  {assignment.billRate && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">${assignment.billRate}/hour</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      Added {format(new Date(assignment.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members assigned</h3>
              <p className="text-gray-500 mb-4">Add team members to start collaborating on this project.</p>
              {canManageTeam && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  Add First Team Member
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div>
                <Label>Team Member</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {getUserInitials(selectedAssignment.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedAssignment.user.name}</div>
                    <div className="text-sm text-gray-500">{selectedAssignment.user.email}</div>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-role">Project Role</Label>
                <Input
                  id="edit-role"
                  value={selectedAssignment.role || ''}
                  onChange={(e) => setSelectedAssignment({ 
                    ...selectedAssignment, 
                    role: e.target.value 
                  })}
                  placeholder="e.g., Project Manager, Developer, Designer"
                />
              </div>
              <div>
                <Label htmlFor="edit-billRate">Bill Rate ($/hour)</Label>
                <Input
                  id="edit-billRate"
                  type="number"
                  step="0.01"
                  value={selectedAssignment.billRate || ''}
                  onChange={(e) => setSelectedAssignment({ 
                    ...selectedAssignment, 
                    billRate: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    handleUpdateAssignment(selectedAssignment.id, {
                      role: selectedAssignment.role,
                      billRate: selectedAssignment.billRate,
                    });
                    setIsEditDialogOpen(false);
                  }}
                >
                  Update Assignment
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
