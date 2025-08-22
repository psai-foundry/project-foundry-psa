'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Clock, TrendingUp, AlertCircle, Filter } from 'lucide-react';

interface Allocation {
  id: string;
  resourceName: string;
  projectName: string;
  clientName: string;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  utilizedHours: number;
  utilizationRate: number;
  status: 'active' | 'upcoming' | 'completed' | 'overallocated';
  priority: 'high' | 'medium' | 'low';
}

const mockAllocations: Allocation[] = [
  {
    id: '1',
    resourceName: 'Sarah Connor',
    projectName: 'ERP Implementation',
    clientName: 'Tech Corp',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    allocatedHours: 160,
    utilizedHours: 145,
    utilizationRate: 90.6,
    status: 'active',
    priority: 'high'
  },
  {
    id: '2',
    resourceName: 'John Smith',
    projectName: 'Website Redesign',
    clientName: 'Design Co',
    startDate: '2024-08-15',
    endDate: '2024-09-15',
    allocatedHours: 120,
    utilizedHours: 98,
    utilizationRate: 81.7,
    status: 'active',
    priority: 'medium'
  },
  {
    id: '3',
    resourceName: 'Emily Johnson',
    projectName: 'Data Migration',
    clientName: 'Finance Inc',
    startDate: '2024-09-01',
    endDate: '2024-09-30',
    allocatedHours: 140,
    utilizedHours: 0,
    utilizationRate: 0,
    status: 'upcoming',
    priority: 'high'
  },
  {
    id: '4',
    resourceName: 'Michael Davis',
    projectName: 'Security Audit',
    clientName: 'Health Systems',
    startDate: '2024-07-01',
    endDate: '2024-07-31',
    allocatedHours: 100,
    utilizedHours: 105,
    utilizationRate: 105,
    status: 'overallocated',
    priority: 'high'
  }
];

export default function AllocationsPage() {
  const [allocations] = useState<Allocation[]>(mockAllocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredAllocations = allocations.filter(allocation => {
    const matchesSearch = allocation.resourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         allocation.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         allocation.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || allocation.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || allocation.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overallocated': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalAllocatedHours = allocations.reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
  const totalUtilizedHours = allocations.reduce((sum, allocation) => sum + allocation.utilizedHours, 0);
  const overallUtilization = totalAllocatedHours > 0 ? (totalUtilizedHours / totalAllocatedHours) * 100 : 0;
  const overallocatedCount = allocations.filter(a => a.utilizationRate > 100).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Allocations</h1>
          <p className="text-gray-600 mt-1">Monitor and manage resource assignments across projects</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => console.log('Create new allocation - functionality to be implemented')}
        >
          + New Allocation
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Allocations</p>
                <p className="text-2xl font-bold text-gray-900">{allocations.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Allocated Hours</p>
                <p className="text-2xl font-bold text-gray-900">{totalAllocatedHours.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{overallUtilization.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overallocated</p>
                <p className="text-2xl font-bold text-red-600">{overallocatedCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by resource, project, or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overallocated">Overallocated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Allocations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocations ({filteredAllocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Resource</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Project</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Utilization</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((allocation) => (
                  <tr key={allocation.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{allocation.resourceName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900">{allocation.projectName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-600">{allocation.clientName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(allocation.startDate).toLocaleDateString()} - {new Date(allocation.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900">
                        <span className="font-medium">{allocation.utilizedHours}</span>
                        <span className="text-gray-500">/{allocation.allocatedHours}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        allocation.utilizationRate > 100 ? 'bg-red-100 text-red-800' :
                        allocation.utilizationRate > 80 ? 'bg-green-100 text-green-800' :
                        allocation.utilizationRate > 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {allocation.utilizationRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getPriorityColor(allocation.priority)}>
                        {allocation.priority}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getStatusColor(allocation.status)}>
                        {allocation.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => console.log('Edit allocation', allocation.id)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => console.log('View details', allocation.id)}>
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAllocations.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No allocations found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or create a new allocation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}