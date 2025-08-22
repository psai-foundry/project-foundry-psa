
'use client';

import { useState } from 'react';
import { Calendar, TrendingUp, Users, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResources } from '@/hooks/use-resources';
import { useCapacityAllocations } from '@/hooks/use-capacity-allocations';

export default function CapacityPlanningPage() {
  const { resources, loading: resourcesLoading, error: resourcesError } = useResources();
  const { 
    capacityAllocations, 
    loading: capacityLoading, 
    error: capacityError,
    weekConfigs,
    updateCapacityAllocation 
  } = useCapacityAllocations();

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [viewMode, setViewMode] = useState('team'); // team, individual, project

  const loading = resourcesLoading || capacityLoading;
  const error = resourcesError || capacityError;

  // Get current week data
  const selectedWeek = weekConfigs[selectedWeekIndex];
  
  // Calculate stats for current week
  const currentWeekCapacity = capacityAllocations.filter(
    ca => ca.weekStartDate.getTime() === selectedWeek?.startDate.getTime()
  );
  
  const totalPlannedHours = resources.length * 40; // Assume 40 hours per week per resource
  const totalAllocatedDays = currentWeekCapacity.reduce((sum, ca) => sum + ca.allocation, 0);
  const totalAllocatedHours = totalAllocatedDays * 8; // Convert days to hours
  const utilizationRate = totalPlannedHours > 0 ? Math.round((totalAllocatedHours / totalPlannedHours) * 100) : 0;

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capacity Planning</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and plan resource capacity allocation
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading capacity data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capacity Planning</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and plan resource capacity allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Team View</SelectItem>
              <SelectItem value="individual">Individual View</SelectItem>
              <SelectItem value="project">Project View</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              Current week average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned Hours</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlannedHours}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated Hours</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAllocatedHours}</div>
            <p className="text-xs text-muted-foreground">
              Currently allocated
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Resources</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
            <p className="text-xs text-muted-foreground">
              Active this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Week Selection</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeekIndex(Math.max(0, selectedWeekIndex - 1))}
                disabled={selectedWeekIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select 
                value={selectedWeekIndex.toString()} 
                onValueChange={(value) => setSelectedWeekIndex(parseInt(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekConfigs.map((week, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {week.label} ({week.startDate.toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeekIndex(Math.min(weekConfigs.length - 1, selectedWeekIndex + 1))}
                disabled={selectedWeekIndex === weekConfigs.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Capacity Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Overview</CardTitle>
          <CardDescription>
            Resource capacity for {selectedWeek?.startDate.toLocaleDateString()} - Week {selectedWeekIndex + 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {resources.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No resources available yet.</p>
              </div>
            ) : (
              resources.map((resource) => {
                const resourceCapacity = currentWeekCapacity.filter(ca => ca.resourceId === resource.id);
                const totalAllocatedDays = resourceCapacity.reduce((sum, ca) => sum + ca.allocation, 0);
                const totalAllocatedHours = totalAllocatedDays * 8;
                const plannedCapacity = (resource.workingDaysPerWeek || 5) * 8; // Convert days to hours
                const utilizationPercentage = plannedCapacity > 0 ? Math.round((totalAllocatedHours / plannedCapacity) * 100) : 0;
                const isOverallocated = utilizationPercentage > 100;

                return (
                  <div key={resource.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{resource.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{resource.function}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {totalAllocatedDays}d / {resource.workingDaysPerWeek || 5}d
                        </div>
                        <Badge 
                          variant={isOverallocated ? "destructive" : "default"}
                          className="mt-1"
                        >
                          {utilizationPercentage}%
                        </Badge>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Capacity Allocation</span>
                        <span>{resource.workingDaysPerWeek || 5} working days available</span>
                      </div>
                      <div className="relative">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                          {totalAllocatedDays > 0 && (
                            <div
                              className={`h-6 flex items-center justify-center text-xs text-white font-medium ${
                                isOverallocated ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                              style={{
                                width: `${Math.min(utilizationPercentage, 100)}%`
                              }}
                            >
                              {totalAllocatedDays}d
                            </div>
                          )}
                          {isOverallocated && (
                            <div
                              className="bg-red-600 h-6 absolute top-0 right-0 flex items-center justify-center text-xs text-white font-medium"
                              style={{
                                width: `${Math.min(utilizationPercentage - 100, 20)}%`
                              }}
                            >
                              +{totalAllocatedDays - (resource.workingDaysPerWeek || 5)}d
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Allocation Details */}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {totalAllocatedDays > 0 ? (
                          <>
                            <div className="flex items-center gap-1">
                              <div className={`w-3 h-3 rounded ${isOverallocated ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                              <span>Allocated: {totalAllocatedDays} days</span>
                            </div>
                            {!isOverallocated && (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-gray-300"></div>
                                <span>Available: {(resource.workingDaysPerWeek || 5) - totalAllocatedDays} days</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-600">
                            <div className="w-3 h-3 rounded bg-gray-300"></div>
                            <span>No allocations this week</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacity Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Forecast</CardTitle>
          <CardDescription>
            Projected capacity allocation for the next 4 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-center text-sm font-medium text-gray-600">
              <div></div> {/* Empty cell for resource names */}
              {weekConfigs.slice(0, 4).map((week, index) => (
                <div key={index} className="p-2">
                  {week.label}
                  <div className="text-xs font-normal">{week.startDate.toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            
            {resources.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                No resources available for forecast
              </div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="grid grid-cols-5 gap-4 items-center">
                  <div className="font-medium">
                    <div>{resource.name}</div>
                    <div className="text-xs text-gray-600">{resource.function}</div>
                  </div>
                  {weekConfigs.slice(0, 4).map((week, index) => {
                    const weekCapacity = capacityAllocations.filter(
                      ca => ca.resourceId === resource.id && 
                      ca.weekStartDate.getTime() === week.startDate.getTime()
                    );
                    const totalDays = weekCapacity.reduce((sum, ca) => sum + ca.allocation, 0);
                    const workingDays = resource.workingDaysPerWeek || 5;
                    const utilization = workingDays > 0 ? Math.round((totalDays / workingDays) * 100) : 0;

                    return (
                      <div key={index} className="text-center">
                        <div 
                          className={`rounded-lg p-2 ${
                            utilization > 100 ? 'bg-red-100 dark:bg-red-900/20' :
                            utilization > 80 ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                            utilization > 0 ? 'bg-green-100 dark:bg-green-900/20' :
                            'bg-gray-100 dark:bg-gray-800'
                          }`}
                        >
                          <div className="text-sm font-semibold">{totalDays}d</div>
                          <div className="text-xs text-gray-600">{utilization}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
