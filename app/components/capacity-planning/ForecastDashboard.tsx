
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  Calendar, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { ForecastGrid } from './ForecastGrid';
import { ForecastControls } from './ForecastControls';
import { CapacityStats } from './CapacityStats';
import { useToast } from '@/hooks/use-toast';

interface ForecastData {
  resourceId: string;
  resourceName: string;
  role: string;
  department: string;
  weeklyAllocations: { [week: string]: number };
  totalCapacity: number;
  utilization: number;
}

export function ForecastDashboard() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [selectedView, setSelectedView] = useState<'resource' | 'project'>('resource');
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '12months'>('3months');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  // Mock data generation
  useEffect(() => {
    const generateMockData = (): ForecastData[] => {
      const resources = [
        { id: '1', name: 'John Smith', role: 'Senior Developer', department: 'Engineering' },
        { id: '2', name: 'Emily Davis', role: 'UX Designer', department: 'Design' },
        { id: '3', name: 'Michael Chen', role: 'Project Manager', department: 'Operations' },
        { id: '4', name: 'Sarah Wilson', role: 'Frontend Developer', department: 'Engineering' },
        { id: '5', name: 'David Brown', role: 'DevOps Engineer', department: 'Engineering' }
      ];

      const weeks: string[] = [];
      for (let i = 0; i < (timeRange === '3months' ? 12 : timeRange === '6months' ? 24 : 48); i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i * 7));
        weeks.push(date.toISOString().split('T')[0]);
      }

      return resources.map(resource => {
        const weeklyAllocations: { [week: string]: number } = {};
        let totalAllocation = 0;

        weeks.forEach(week => {
          // Generate realistic allocation patterns
          const baseAllocation = Math.random() * 40; // 0-40 hours
          const allocation = Math.min(40, Math.max(0, baseAllocation));
          weeklyAllocations[week] = Math.round(allocation * 10) / 10;
          totalAllocation += allocation;
        });

        const avgWeeklyAllocation = totalAllocation / weeks.length;
        const utilization = (avgWeeklyAllocation / 40) * 100;

        return {
          resourceId: resource.id,
          resourceName: resource.name,
          role: resource.role,
          department: resource.department,
          weeklyAllocations,
          totalCapacity: weeks.length * 40,
          utilization: Math.round(utilization)
        };
      });
    };

    setIsLoading(true);
    setTimeout(() => {
      setForecastData(generateMockData());
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  }, [timeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setForecastData(prev => [...prev]); // Trigger re-render
      setIsLoading(false);
      setLastUpdated(new Date());
      toast({
        title: 'Forecast Updated',
        description: 'Capacity forecast has been refreshed with latest data.'
      });
    }, 1000);
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Capacity forecast is being exported to Excel format.'
    });
  };

  const handleGenerateScenario = () => {
    toast({
      title: 'Scenario Generated',
      description: 'New capacity planning scenario has been created.'
    });
  };

  const stats = {
    totalResources: forecastData.length,
    averageUtilization: forecastData.length > 0 ? 
      Math.round(forecastData.reduce((acc, r) => acc + r.utilization, 0) / forecastData.length) : 0,
    overAllocatedResources: forecastData.filter(r => r.utilization > 100).length,
    underUtilizedResources: forecastData.filter(r => r.utilization < 70).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Capacity Planning</h1>
          <p className="text-gray-600 mt-1">
            Forecast resource capacity and optimize project allocations
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Loading...'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleGenerateScenario}>
            <BarChart3 className="w-4 h-4 mr-2" />
            New Scenario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <CapacityStats stats={stats} />

      {/* Controls */}
      <ForecastControls
        selectedView={selectedView}
        onViewChange={setSelectedView}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant={selectedView === 'resource' ? 'default' : 'outline'}
            onClick={() => setSelectedView('resource')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Resource View
          </Button>
          <Button
            variant={selectedView === 'project' ? 'default' : 'outline'}
            onClick={() => setSelectedView('project')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Project View
          </Button>
        </div>

        {selectedView === 'resource' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading capacity forecast...</p>
                </div>
              </div>
            ) : (
              <ForecastGrid
                data={forecastData}
                view="resource"
                onAllocationChange={(resourceId, week, hours) => {
                  setForecastData(prev => 
                    prev.map(resource => 
                      resource.resourceId === resourceId
                        ? {
                            ...resource,
                            weeklyAllocations: {
                              ...resource.weeklyAllocations,
                              [week]: hours
                            }
                          }
                        : resource
                    )
                  );
                }}
              />
            )}
          </>
        )}

        {selectedView === 'project' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading project capacity...</p>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Project Capacity View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Project View Coming Soon
                    </h3>
                    <p className="text-gray-600 mb-6">
                      This view will show capacity allocation by project timeline.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Alert for over-allocated resources */}
      {stats.overAllocatedResources > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-orange-900">
                  Capacity Alert
                </h4>
                <p className="text-sm text-orange-700">
                  {stats.overAllocatedResources} resource(s) are over-allocated. 
                  Consider redistributing workload or hiring additional team members.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
