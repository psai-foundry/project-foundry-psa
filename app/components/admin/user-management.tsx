
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Users, 
  Mail,
  Shield,
  DollarSign,
  Building,
  UserCheck,
  UserX,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'PARTNER' | 'PRINCIPAL' | 'MANAGER' | 'PRACTICE_LEAD' | 'SENIOR_CONSULTANT' | 'JUNIOR_CONSULTANT' | 'CONTRACTOR' | 'EMPLOYEE' | 'CLIENT_USER';
  department?: string;
  hourlyRate?: number;
  defaultBillRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projectAssignments: any[];
  timeEntries: any[];
  _count: {
    projectAssignments: number;
    timeEntries: number;
    approvals: number;
  };
}

const USER_ROLES = [
  { value: 'ADMIN', label: 'Administrator', color: 'bg-purple-100 text-purple-800' },
  { value: 'PARTNER', label: 'Partner', color: 'bg-red-100 text-red-800' },
  { value: 'PRINCIPAL', label: 'Principal', color: 'bg-orange-100 text-orange-800' },
  { value: 'MANAGER', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'PRACTICE_LEAD', label: 'Practice Lead', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'SENIOR_CONSULTANT', label: 'Senior Consultant', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'JUNIOR_CONSULTANT', label: 'Junior Consultant', color: 'bg-teal-100 text-teal-800' },
  { value: 'CONTRACTOR', label: 'Contractor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'EMPLOYEE', label: 'Employee', color: 'bg-green-100 text-green-800' },
  { value: 'CLIENT_USER', label: 'Client User', color: 'bg-gray-100 text-gray-800' },
];

const DEPARTMENTS = [
  'Engineering',
  'Design', 
  'Product',
  'Marketing',
  'Sales',
  'Administration',
  'HR',
  'Finance',
  'Operations',
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'PARTNER' | 'PRINCIPAL' | 'MANAGER' | 'PRACTICE_LEAD' | 'SENIOR_CONSULTANT' | 'JUNIOR_CONSULTANT' | 'CONTRACTOR' | 'EMPLOYEE' | 'CLIENT_USER',
    department: '',
    hourlyRate: '',
    defaultBillRate: '',
    isActive: true,
    password: '',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    try {
      const payload = {
        ...formData,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        defaultBillRate: formData.defaultBillRate ? parseFloat(formData.defaultBillRate) : null,
      };

      const response = editingUser
        ? await fetch(`/api/admin/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        toast.success(editingUser ? 'User updated' : 'User created');
        setIsDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name || '',
      role: user.role,
      department: user.department || '',
      hourlyRate: user.hourlyRate?.toString() || '',
      defaultBillRate: user.defaultBillRate?.toString() || '',
      isActive: user.isActive,
      password: '', // Don't populate password for security
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deleted');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'EMPLOYEE' as 'ADMIN' | 'PARTNER' | 'PRINCIPAL' | 'MANAGER' | 'PRACTICE_LEAD' | 'SENIOR_CONSULTANT' | 'JUNIOR_CONSULTANT' | 'CONTRACTOR' | 'EMPLOYEE' | 'CLIENT_USER',
      department: '',
      hourlyRate: '',
      defaultBillRate: '',
      isActive: true,
      password: '',
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && user.isActive) ||
                         (statusFilter === 'INACTIVE' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-4 h-4" />;
      case 'PARTNER': return <Shield className="w-4 h-4" />;
      case 'PRINCIPAL': return <Shield className="w-4 h-4" />;
      case 'MANAGER': return <Users className="w-4 h-4" />;
      case 'PRACTICE_LEAD': return <Users className="w-4 h-4" />;
      case 'SENIOR_CONSULTANT': return <UserCheck className="w-4 h-4" />;
      case 'JUNIOR_CONSULTANT': return <UserCheck className="w-4 h-4" />;
      case 'CONTRACTOR': return <UserCheck className="w-4 h-4" />;
      case 'EMPLOYEE': return <UserCheck className="w-4 h-4" />;
      case 'CLIENT_USER': return <UserCheck className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              {USER_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update user details and permissions' : 'Add a new team member to your organization'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($/hr)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                  placeholder="85.00"
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
                  placeholder="130.00"
                />
              </div>

              {!editingUser && (
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter secure password"
                  />
                </div>
              )}

              <div className="md:col-span-2 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Team Members ({filteredUsers.length})
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
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Rates</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = USER_ROLES.find(r => r.value === user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{user.name}</div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Mail className="w-3 h-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleConfig?.color}>
                            <div className="flex items-center">
                              {getRoleIcon(user.role)}
                              <span className="ml-1">{roleConfig?.label}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.department ? (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                              {user.department}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {user.hourlyRate && (
                              <div className="flex items-center">
                                <DollarSign className="w-3 h-3 mr-1 text-muted-foreground" />
                                {user.hourlyRate}/hr (cost)
                              </div>
                            )}
                            {user.defaultBillRate && (
                              <div className="flex items-center">
                                <DollarSign className="w-3 h-3 mr-1 text-muted-foreground" />
                                {user.defaultBillRate}/hr (bill)
                              </div>
                            )}
                            {!user.hourlyRate && !user.defaultBillRate && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                              {user._count.projectAssignments} projects
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                              {user._count.timeEntries} entries
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <UserX className="w-3 h-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(user.id, !user.isActive)}
                            >
                              {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found. Add your first team member to get started.
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
