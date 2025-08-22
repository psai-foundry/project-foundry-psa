
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  Building2, 
  Users, 
  Clock, 
  DollarSign,
  Eye,
  Edit,
  MoreHorizontal 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  budget: number | null;
  startDate: Date | null;
  endDate: Date | null;
  client: {
    id: string;
    name: string;
    industry?: string;
  };
  tasks?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  assignments?: Array<{
    user: {
      name: string;
    };
  }>;
  createdAt: Date;
}

interface ProjectListProps {
  onProjectSelect?: (project: Project) => void;
  onCreateProject?: () => void;
  viewMode?: 'table' | 'cards';
  showActions?: boolean;
}

export default function ProjectList({ 
  onProjectSelect, 
  onCreateProject, 
  viewMode = 'table',
  showActions = true 
}: ProjectListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [search, statusFilter, clientFilter, page]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        includeClient: 'true',
        includeTasks: 'true',
        includeAssignments: 'true',
      });

      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all-statuses') params.append('status', statusFilter);
      if (clientFilter && clientFilter !== 'all-clients') params.append('clientId', clientFilter);

      const response = await fetch(`/api/projects?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProjects(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        console.error('Error fetching projects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleProjectAction = (action: string, project: Project) => {
    switch (action) {
      case 'view':
        if (onProjectSelect) {
          onProjectSelect(project);
        } else {
          router.push(`/dashboard/projects/${project.id}`);
        }
        break;
      case 'edit':
        router.push(`/dashboard/projects/${project.id}/edit`);
        break;
      case 'tasks':
        router.push(`/dashboard/projects/${project.id}/tasks`);
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTableView = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Projects</CardTitle>
        {showActions && (
          <Button 
            onClick={onCreateProject || (() => router.push('/dashboard/projects/new'))}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-statuses">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-clients">All Clients</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.map((project) => (
                  <TableRow key={project.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">{project.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{project.client?.name}</div>
                          {project.client?.industry && (
                            <div className="text-sm text-gray-500">{project.client.industry}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{project.assignments?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{project.tasks?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.budget ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">${project.budget?.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No budget</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {project.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {format(new Date(project.startDate), 'MMM dd, yyyy')}
                          </div>
                        )}
                        {project.endDate && (
                          <div className="text-gray-500">
                            to {format(new Date(project.endDate), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleProjectAction('view', project)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {(['ADMIN', 'PARTNER', 'PRINCIPAL', 'MANAGER', 'PRACTICE_LEAD'].includes(session?.user?.role || '')) && (
                            <DropdownMenuItem onClick={() => handleProjectAction('edit', project)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Project
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleProjectAction('tasks', project)}>
                            <Clock className="mr-2 h-4 w-4" />
                            Manage Tasks
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return renderTableView();
}
