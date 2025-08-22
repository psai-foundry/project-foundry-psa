
'use client';

import { useState } from 'react';
import { Plus, Search, Filter, UserCheck, Building2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useResources } from '@/hooks/use-resources';
import { useResourceOwners } from '@/hooks/use-resource-owners';
import { ResourceManagementCard } from '@/components/resource-management/ResourceManagementCard';
import { Loader2 } from 'lucide-react';

export default function ResourcesPage() {
  const { 
    resources, 
    loading, 
    error, 
    filteredResources, 
    filters, 
    setFilters,
    deleteResource 
  } = useResources();
  
  const { resourceOwners, loading: ownersLoading } = useResourceOwners();

  // Get unique values for filter dropdowns from actual data
  const regions = Array.from(new Set(resources.map(r => r.region).filter(Boolean)));
  const functions = Array.from(new Set(resources.map(r => r.function).filter(Boolean)));
  const employmentTypes = ['STAFF', 'CONTRACTOR', 'AGENCY', 'PROJECT_SERVICES'];

  const handleEditResource = (resource: any) => {
    console.log('Edit resource:', resource);
    // TODO: Implement edit modal
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      const success = await deleteResource(resourceId);
      if (!success) {
        alert('Failed to delete resource. It may have existing allocations.');
      }
    }
  };

  const handleAddResource = () => {
    console.log('Add Resource clicked');
    // TODO: Implement add resource modal
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your team resources and their allocations
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading resources...</span>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalResources = resources.length;
  const uniqueCompanies = new Set(resources.map(r => r.company)).size;
  const avgUtilization = resources.length > 0 
    ? Math.round(
        resources.reduce((sum, r) => sum + (r.bauAllocationPercentage || 0) + (r.projectAllocationPercentage || 0), 0) / resources.length
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resources</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your team resources and their allocations
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddResource}>
          <Plus className="w-4 h-4" />
          Add Resource
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <UserCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCompanies}</div>
            <p className="text-xs text-muted-foreground">
              Partner organizations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <p className="text-xs text-muted-foreground">
              Current allocation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Directory</CardTitle>
          <CardDescription>
            Search and filter your team resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources by name, role, or skills..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filters.selectedRegion} onValueChange={(value) => setFilters({ selectedRegion: value })}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.selectedFunction} onValueChange={(value) => setFilters({ selectedFunction: value })}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Function" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Functions</SelectItem>
                  {functions.map((func) => (
                    <SelectItem key={func} value={func}>
                      {func}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.selectedEmploymentType} onValueChange={(value) => setFilters({ selectedEmploymentType: value })}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Employment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!ownersLoading && resourceOwners.length > 0 && (
                <Select value={filters.selectedResourceOwner} onValueChange={(value) => setFilters({ selectedResourceOwner: value })}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {resourceOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.name}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <ResourceManagementCard
            key={resource.id}
            resource={resource}
            onEdit={handleEditResource}
            onDelete={handleDeleteResource}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {resources.length === 0 
                ? 'Get started by adding your first team resource.'
                : 'Try adjusting your search criteria or clearing filters.'
              }
            </p>
            <div className="flex gap-2 justify-center">
              {resources.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setFilters({ 
                    searchTerm: '', 
                    selectedRegion: 'all', 
                    selectedFunction: 'all', 
                    selectedEmploymentType: 'all',
                    selectedResourceOwner: 'all'
                  })}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={handleAddResource}>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
