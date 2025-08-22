
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, Download, Upload, Users, DollarSign } from 'lucide-react';
import { ResourcesTable } from './ResourcesTable';
import { AddResourceModal } from './AddResourceModal';
import { ResourceFilters } from './ResourceFilters';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  name: string;
  role: string;
  department: string;
  employmentType: string;
  cost: number;
  utilization: number;
  skills: string[];
  status: 'active' | 'inactive' | 'on-leave';
  startDate: string;
  manager: string;
}

export function ResourceRegistry() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockResources: Resource[] = [
      {
        id: '1',
        name: 'John Smith',
        role: 'Senior Developer',
        department: 'Engineering',
        employmentType: 'Full Time',
        cost: 95000,
        utilization: 85,
        skills: ['React', 'TypeScript', 'Node.js'],
        status: 'active',
        startDate: '2023-01-15',
        manager: 'Sarah Johnson'
      },
      {
        id: '2',
        name: 'Emily Davis',
        role: 'UX Designer',
        department: 'Design',
        employmentType: 'Full Time',
        cost: 75000,
        utilization: 92,
        skills: ['Figma', 'User Research', 'Prototyping'],
        status: 'active',
        startDate: '2023-03-01',
        manager: 'Mike Wilson'
      },
      {
        id: '3',
        name: 'Michael Chen',
        role: 'Project Manager',
        department: 'Operations',
        employmentType: 'Contract',
        cost: 120000,
        utilization: 78,
        skills: ['Agile', 'Scrum', 'Risk Management'],
        status: 'active',
        startDate: '2023-02-15',
        manager: 'Lisa Rodriguez'
      }
    ];

    setTimeout(() => {
      setResources(mockResources);
      setIsLoading(false);
    }, 1000);
  }, []);

  const stats = {
    totalResources: resources.length,
    activeResources: resources.filter(r => r.status === 'active').length,
    avgUtilization: resources.length > 0 ? 
      Math.round(resources.reduce((acc, r) => acc + r.utilization, 0) / resources.length) : 0,
    totalCost: resources.reduce((acc, r) => acc + r.cost, 0)
  };

  const filteredResources = resources.filter(resource =>
    resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddResource = (newResource: Omit<Resource, 'id'>) => {
    const resource: Resource = {
      ...newResource,
      id: Date.now().toString()
    };
    setResources([...resources, resource]);
    setShowAddModal(false);
    toast({
      title: 'Resource Added',
      description: `${resource.name} has been added to the registry.`
    });
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Resource data is being exported to CSV.'
    });
  };

  const handleImport = () => {
    toast({
      title: 'Import Ready',
      description: 'Select a CSV file to import resource data.'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resource Registry</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their allocations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeResources} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <Badge variant={stats.avgUtilization > 80 ? 'destructive' : 'default'}>
              {stats.avgUtilization}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgUtilization}%</div>
            <p className="text-xs text-muted-foreground">
              Across all resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Annual salary cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Badge variant="outline">
              {[...new Set(resources.map(r => r.department))].length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(resources.map(r => r.department))].length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search resources by name, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="whitespace-nowrap"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <ResourceFilters onFiltersChange={() => {}} />
      )}

      {/* Resources Table */}
      <ResourcesTable 
        resources={filteredResources}
        onResourceUpdate={(id, updates) => {
          setResources(resources.map(r => 
            r.id === id ? { ...r, ...updates } : r
          ));
        }}
      />

      {/* Add Resource Modal */}
      <AddResourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddResource}
      />
    </div>
  );
}
