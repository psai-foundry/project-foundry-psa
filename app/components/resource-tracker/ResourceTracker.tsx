
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  Calendar,
  Users,
  BarChart3,
  Clock
} from 'lucide-react';
import { ResourceTrackerTable } from './ResourceTrackerTable';
import { AllocationFilters } from './AllocationFilters';
import { WeeklySummary } from './WeeklySummary';
import { useToast } from '@/hooks/use-toast';

interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName: string;
  role: string;
  department: string;
  projectId: string;
  projectName: string;
  allocatedHours: number;
  actualHours: number;
  week: string;
  status: 'planned' | 'active' | 'completed' | 'overrun';
}

export function ResourceTracker() {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [activeView, setActiveView] = useState<'table' | 'summary'>('table');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Mock data generation
  useEffect(() => {
    const generateMockAllocations = (): ResourceAllocation[] => {
      const resources = [
        { id: '1', name: 'John Smith', role: 'Senior Developer', department: 'Engineering' },
        { id: '2', name: 'Emily Davis', role: 'UX Designer', department: 'Design' },
        { id: '3', name: 'Michael Chen', role: 'Project Manager', department: 'Operations' }
      ];

      const projects = [
        { id: '1', name: 'E-commerce Platform' },
        { id: '2', name: 'Mobile App Development' },
        { id: '3', name: 'Data Analytics Dashboard' }
      ];

      const allocations: ResourceAllocation[] = [];
      const weeks: string[] = [];

      // Generate 8 weeks of data
      for (let i = -2; i <= 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i * 7));
        weeks.push(date.toISOString().split('T')[0]);
      }

      resources.forEach(resource => {
        projects.forEach(project => {
          weeks.forEach(week => {
            const allocatedHours = Math.floor(Math.random() * 40) + 5;
            const actualHours = Math.floor(allocatedHours + (Math.random() - 0.5) * 10);
            const variance = actualHours - allocatedHours;
            
            let status: 'planned' | 'active' | 'completed' | 'overrun';
            const weekDate = new Date(week);
            const now = new Date();
            
            if (weekDate > now) {
              status = 'planned';
            } else if (weekDate.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000) {
              status = 'active';
            } else if (Math.abs(variance) <= 2) {
              status = 'completed';
            } else {
              status = 'overrun';
            }

            allocations.push({
              id: `${resource.id}-${project.id}-${week}`,
              resourceId: resource.id,
              resourceName: resource.name,
              role: resource.role,
              department: resource.department,
              projectId: project.id,
              projectName: project.name,
              allocatedHours,
              actualHours: status === 'planned' ? 0 : Math.max(0, actualHours),
              week,
              status
            });
          });
        });
      });

      return allocations;
    };

    setTimeout(() => {
      const mockAllocations = generateMockAllocations();
      setAllocations(mockAllocations);
      
      // Set current week as default
      const now = new Date();
      const currentWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      setSelectedWeek(currentWeek.toISOString().split('T')[0]);
      
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredAllocations = allocations.filter(allocation => {
    const matchesSearch = 
      allocation.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allocation.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      allocation.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWeek = !selectedWeek || allocation.week === selectedWeek;

    return matchesSearch && matchesWeek;
  });

  const stats = {
    totalAllocations: filteredAllocations.length,
    activeProjects: [...new Set(filteredAllocations.map(a => a.projectId))].length,
    totalPlannedHours: filteredAllocations.reduce((acc, a) => acc + a.allocatedHours, 0),
    totalActualHours: filteredAllocations.reduce((acc, a) => acc + a.actualHours, 0),
    overruns: filteredAllocations.filter(a => a.status === 'overrun').length
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Resource allocation data is being exported to CSV.'
    });
  };

  const handleAddAllocation = () => {
    toast({
      title: 'Add Allocation',
      description: 'Opening allocation form...'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resource allocations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resource Tracker</h1>
          <p className="text-gray-600 mt-1">Track and manage resource allocations across projects</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddAllocation}>
            <Plus className="w-4 h-4 mr-2" />
            Add Allocation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAllocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlannedHours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActualHours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overruns</CardTitle>
            <Badge variant="destructive" className="text-xs">
              {stats.overruns}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overruns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by resource, project, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="week"
            value={selectedWeek ? new Date(selectedWeek).toISOString().substring(0, 10) : ''}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-40"
          />
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <AllocationFilters onFiltersChange={() => {}} />
      )}

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant={activeView === 'table' ? 'default' : 'outline'}
            onClick={() => setActiveView('table')}
          >
            Allocation Table
          </Button>
          <Button
            variant={activeView === 'summary' ? 'default' : 'outline'}
            onClick={() => setActiveView('summary')}
          >
            Weekly Summary
          </Button>
        </div>

        {activeView === 'table' && (
          <ResourceTrackerTable 
            allocations={filteredAllocations}
            onAllocationUpdate={(id, updates) => {
              setAllocations(allocations.map(a => 
                a.id === id ? { ...a, ...updates } : a
              ));
            }}
          />
        )}

        {activeView === 'summary' && (
          <WeeklySummary allocations={filteredAllocations} />
        )}
      </div>
    </div>
  );
}
