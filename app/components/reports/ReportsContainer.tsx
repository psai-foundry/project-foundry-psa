
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Download,
  RefreshCw,
  Calendar,
  PieChart
} from 'lucide-react';
import { ReportsFilters } from './ReportsFilters';
import { CapacityReports } from './CapacityReports';
import { ResourceReports } from './ResourceReports';
import { ProjectReports } from './ProjectReports';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  capacityUtilization: number;
  totalResources: number;
  activeProjects: number;
  totalRevenue: number;
  utilizationTrend: number[];
  departmentBreakdown: { department: string; utilization: number; resources: number }[];
  projectHealth: { healthy: number; atRisk: number; critical: number };
}

export function ReportsContainer() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeReport, setActiveReport] = useState<'capacity' | 'resource' | 'project'>('capacity');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const { toast } = useToast();

  // Mock data generation
  useEffect(() => {
    const generateMockData = (): ReportData => {
      return {
        capacityUtilization: 78,
        totalResources: 25,
        activeProjects: 12,
        totalRevenue: 2450000,
        utilizationTrend: [72, 75, 78, 80, 82, 79, 78],
        departmentBreakdown: [
          { department: 'Engineering', utilization: 85, resources: 12 },
          { department: 'Design', utilization: 72, resources: 5 },
          { department: 'Operations', utilization: 68, resources: 4 },
          { department: 'Marketing', utilization: 65, resources: 4 }
        ],
        projectHealth: {
          healthy: 8,
          atRisk: 3,
          critical: 1
        }
      };
    };

    setIsLoading(true);
    setTimeout(() => {
      setReportData(generateMockData());
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  }, [dateRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setReportData(prev => prev ? { ...prev } : null);
      setIsLoading(false);
      setLastUpdated(new Date());
      toast({
        title: 'Reports Updated',
        description: 'All report data has been refreshed.'
      });
    }, 1000);
  };

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Reports are being exported to PDF format.'
    });
  };

  if (isLoading || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into resource utilization and project performance
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.capacityUtilization}%</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+2.4% from last period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalResources}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.activeProjects}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {reportData.projectHealth.healthy} Healthy
              </Badge>
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                {reportData.projectHealth.atRisk} At Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(reportData.totalRevenue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">Projected annual revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ReportsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Report Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeReport === 'capacity' ? 'default' : 'outline'}
          onClick={() => setActiveReport('capacity')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Capacity Reports
        </Button>
        <Button
          variant={activeReport === 'resource' ? 'default' : 'outline'}
          onClick={() => setActiveReport('resource')}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Resource Reports
        </Button>
        <Button
          variant={activeReport === 'project' ? 'default' : 'outline'}
          onClick={() => setActiveReport('project')}
          className="flex items-center gap-2"
        >
          <PieChart className="w-4 h-4" />
          Project Reports
        </Button>
      </div>

      {/* Report Content */}
      {activeReport === 'capacity' && (
        <CapacityReports data={reportData} />
      )}

      {activeReport === 'resource' && (
        <ResourceReports data={reportData} />
      )}

      {activeReport === 'project' && (
        <ProjectReports data={reportData} />
      )}
    </div>
  );
}
