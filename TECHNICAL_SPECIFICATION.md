
# 🛠️ **TECHNICAL SPECIFICATION**
## **Resource & Capacity Management Integration**

---

## **📋 COMPONENT BREAKDOWN & IMPLEMENTATION**

### **🏗️ CORE ARCHITECTURE**

```typescript
// File Structure for Resource Management
/app/
├── api/resources/
│   ├── route.ts                    // CRUD operations
│   ├── [id]/route.ts               // Individual resource
│   ├── allocations/route.ts        // Capacity allocations
│   ├── utilization/route.ts        // Utilization metrics
│   ├── forecasting/route.ts        // Forecasting data
│   └── analytics/route.ts          // Analytics data
├── dashboard/resources/
│   ├── page.tsx                    // Main resource management page
│   ├── [id]/page.tsx              // Individual resource detail
│   ├── allocations/page.tsx       // Capacity allocation page
│   ├── analytics/page.tsx         // Analytics dashboard
│   └── forecasting/page.tsx       // Forecasting dashboard
└── components/resources/
    ├── ResourceRegistry.tsx        // Main registry component
    ├── ResourceTable.tsx          // Table with filtering
    ├── AllocationMatrix.tsx       // Capacity allocation matrix
    ├── AnalyticsDashboard.tsx     // Analytics components
    └── ForecastingEngine.tsx      // Forecasting components
```

---

## **🔧 PHASE 1: FOUNDATION COMPONENTS**

### **1. API Layer Implementation**

```typescript
// /app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Permission } from '@/lib/permissions';
import { hasPermission } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const userRole = session.user.role;
    if (!hasPermission(userRole, Permission.VIEW_ALL_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const function_ = searchParams.get('function') || '';
    const region = searchParams.get('region') || '';
    const employmentType = searchParams.get('employmentType') || '';

    // Build filter conditions
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (function_) where.function = function_;
    if (region) where.region = region;
    if (employmentType) where.employmentType = employmentType;

    const [resources, totalCount] = await Promise.all([
      prisma.resource.findMany({
        where,
        include: {
          resourceOwner: true,
          allocations: {
            where: {
              weekStartDate: {
                gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          },
          projectAllocations: {
            include: {
              project: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.resource.count({ where })
    ]);

    // Calculate utilization for each resource
    const resourcesWithUtilization = resources.map(resource => {
      const currentAllocations = resource.allocations.filter(
        alloc => new Date(alloc.weekStartDate) >= new Date()
      );
      
      const totalAllocated = currentAllocations.reduce((sum, alloc) => sum + alloc.allocation, 0);
      const utilization = Math.round((totalAllocated / 5) * 100); // Assuming 5-day work week

      return {
        ...resource,
        utilization,
        currentProjects: resource.projectAllocations.map(pa => pa.project),
        allocationsCount: currentAllocations.length
      };
    });

    return NextResponse.json({
      resources: resourcesWithUtilization,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (!hasPermission(userRole, Permission.MANAGE_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'function', 'employmentType', 'region'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        email: data.email,
        function: data.function,
        employmentType: data.employmentType,
        region: data.region,
        annualSalary: data.annualSalary ? parseFloat(data.annualSalary) : null,
        skills: data.skills || [],
        resourceOwnerId: data.resourceOwnerId,
        workingDaysPerWeek: data.workingDaysPerWeek || 5,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null
      },
      include: {
        resourceOwner: true,
        allocations: true,
        projectAllocations: true
      }
    });

    return NextResponse.json(resource, { status: 201 });

  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **2. Resource Registry Component**

```typescript
// /app/components/resources/ResourceRegistry.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Permission } from '@/lib/permissions';
import { RoleGuard } from '@/lib/role-guard';

interface Resource {
  id: string;
  name: string;
  email: string;
  function: string;
  employmentType: string;
  region: string;
  annualSalary?: number;
  skills: string[];
  utilization: number;
  currentProjects: any[];
  resourceOwner?: {
    name: string;
  };
}

export function ResourceRegistry() {
  const { data: session } = useSession() || {};
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Fetch resources with filters
  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedFunction && { function: selectedFunction }),
        ...(selectedRegion && { region: selectedRegion }),
        ...(selectedEmploymentType && { employmentType: selectedEmploymentType })
      });

      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      
      const data = await response.json();
      setResources(data.resources);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch resources. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [page, searchTerm, selectedFunction, selectedRegion, selectedEmploymentType]);

  // Get unique values for filters
  const uniqueFunctions = [...new Set(resources.map(r => r.function))].filter(Boolean);
  const uniqueRegions = [...new Set(resources.map(r => r.region))].filter(Boolean);
  const uniqueEmploymentTypes = [...new Set(resources.map(r => r.employmentType))].filter(Boolean);

  const getUtilizationBadgeVariant = (utilization: number) => {
    if (utilization >= 90) return 'destructive';
    if (utilization >= 70) return 'default';
    if (utilization >= 50) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Resource Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team resources, allocations, and capacity planning
          </p>
        </div>
        <div className="flex space-x-3">
          <RoleGuard requiredPermission={Permission.MANAGE_USERS}>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </Button>
          </RoleGuard>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedFunction} onValueChange={setSelectedFunction}>
              <SelectTrigger>
                <SelectValue placeholder="Function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Functions</SelectItem>
                {uniqueFunctions.map(func => (
                  <SelectItem key={func} value={func}>{func}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedEmploymentType} onValueChange={setSelectedEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {uniqueEmploymentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resources ({resources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Loading resources...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No resources found matching your criteria.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{resource.name}</div>
                          <div className="text-sm text-muted-foreground">{resource.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{resource.function}</TableCell>
                      <TableCell>{resource.region}</TableCell>
                      <TableCell>{resource.employmentType}</TableCell>
                      <TableCell>
                        <Badge variant={getUtilizationBadgeVariant(resource.utilization)}>
                          {resource.utilization}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {resource.skills.slice(0, 2).map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {resource.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{resource.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{resource.resourceOwner?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            Allocate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Resource Modal */}
      <AddResourceModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchResources}
      />
    </div>
  );
}
```

### **3. Capacity Allocation Matrix**

```typescript
// /app/components/resources/AllocationMatrix.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, addWeeks, startOfWeek } from 'date-fns';

interface AllocationData {
  resourceId: string;
  resourceName: string;
  projectId: string;
  projectName: string;
  allocation: number;
  weekStartDate: string;
}

interface AllocationMatrixProps {
  resources: any[];
  projects: any[];
  onSave: (allocations: AllocationData[]) => Promise<void>;
}

export function AllocationMatrix({ resources, projects, onSave }: AllocationMatrixProps) {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Generate allocation key
  const getAllocationKey = (resourceId: string, projectId: string) => 
    `${resourceId}-${projectId}`;

  // Fetch existing allocations for the selected week
  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/resources/allocations?weekStart=${selectedWeek.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch allocations');
      
      const data = await response.json();
      const allocationsMap = new Map();
      
      data.allocations.forEach((alloc: AllocationData) => {
        const key = getAllocationKey(alloc.resourceId, alloc.projectId);
        allocationsMap.set(key, alloc.allocation);
      });
      
      setAllocations(allocationsMap);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch allocation data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [selectedWeek]);

  // Handle allocation change
  const handleAllocationChange = (resourceId: string, projectId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const key = getAllocationKey(resourceId, projectId);
    
    setAllocations(prev => new Map(prev.set(key, numValue)));
    setHasChanges(true);
  };

  // Calculate resource utilization
  const getResourceUtilization = (resourceId: string) => {
    let totalAllocated = 0;
    const resource = resources.find(r => r.id === resourceId);
    const workingDays = resource?.workingDaysPerWeek || 5;

    projects.forEach(project => {
      const key = getAllocationKey(resourceId, project.id);
      totalAllocated += allocations.get(key) || 0;
    });

    return Math.round((totalAllocated / workingDays) * 100);
  };

  // Calculate project allocation total
  const getProjectTotal = (projectId: string) => {
    let total = 0;
    resources.forEach(resource => {
      const key = getAllocationKey(resource.id, projectId);
      total += allocations.get(key) || 0;
    });
    return total;
  };

  // Save allocations
  const handleSave = async () => {
    try {
      setLoading(true);
      const allocationData: AllocationData[] = [];

      allocations.forEach((allocation, key) => {
        if (allocation > 0) {
          const [resourceId, projectId] = key.split('-');
          const resource = resources.find(r => r.id === resourceId);
          const project = projects.find(p => p.id === projectId);

          allocationData.push({
            resourceId,
            resourceName: resource?.name || '',
            projectId,
            projectName: project?.name || '',
            allocation,
            weekStartDate: selectedWeek.toISOString()
          });
        }
      });

      await onSave(allocationData);
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Allocations saved successfully.',
      });
    } catch (error) {
      console.error('Error saving allocations:', error);
      toast({
        title: 'Error',
        description: 'Failed to save allocations.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    fetchAllocations();
  };

  const getUtilizationBadgeVariant = (utilization: number) => {
    if (utilization > 100) return 'destructive';
    if (utilization >= 90) return 'default';
    if (utilization >= 70) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Capacity Allocation Matrix
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Week of:</label>
                <Input
                  type="date"
                  value={format(selectedWeek, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedWeek(startOfWeek(new Date(e.target.value)))}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeek(startOfWeek(addWeeks(selectedWeek, -1)))}
              >
                Previous Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeek(startOfWeek(addWeeks(selectedWeek, 1)))}
              >
                Next Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Week starting {format(selectedWeek, 'MMM dd, yyyy')}
            </div>
            <div className="flex space-x-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button onClick={handleSave} disabled={!hasChanges || loading} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation Matrix */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Resource</th>
                  {projects.map(project => (
                    <th key={project.id} className="p-3 text-center font-medium min-w-24">
                      <div className="truncate" title={project.name}>
                        {project.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getProjectTotal(project.id)} days
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-medium">
                    Utilization
                  </th>
                </tr>
              </thead>
              <tbody>
                {resources.map(resource => {
                  const utilization = getResourceUtilization(resource.id);
                  return (
                    <tr key={resource.id} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{resource.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {resource.function} • {resource.region}
                          </div>
                        </div>
                      </td>
                      {projects.map(project => {
                        const key = getAllocationKey(resource.id, project.id);
                        const value = allocations.get(key) || 0;
                        return (
                          <td key={project.id} className="p-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="5"
                              step="0.5"
                              value={value || ''}
                              onChange={(e) => handleAllocationChange(resource.id, project.id, e.target.value)}
                              className="w-16 h-8 text-center"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <Badge variant={getUtilizationBadgeVariant(utilization)}>
                          {utilization}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(resources.reduce((sum, r) => sum + getResourceUtilization(r.id), 0) / resources.length)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Over-allocated Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {resources.filter(r => getResourceUtilization(r.id) > 100).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## **📊 ADVANCED FEATURES SPECIFICATION**

### **4. Analytics Dashboard**

```typescript
// /app/components/resources/AnalyticsDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, AlertTriangle } from 'lucide-react';

interface AnalyticsData {
  utilizationTrend: any[];
  resourceBreakdown: any[];
  projectAllocation: any[];
  costAnalysis: any[];
  forecastData: any[];
  kpis: {
    averageUtilization: number;
    totalCostAllocated: number;
    resourceEfficiency: number;
    projectDeliveryRate: number;
  };
}

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('3m');
  const [viewType, setViewType] = useState('utilization');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/resources/analytics?timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resource Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into resource utilization and capacity planning
          </p>
        </div>
        <div className="flex space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utilization">Utilization</SelectItem>
              <SelectItem value="cost">Cost Analysis</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="forecast">Forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.kpis.averageUtilization}%</div>
            <Badge variant="secondary" className="mt-2">
              +5% from last period
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analyticsData.kpis.totalCostAllocated / 1000).toFixed(0)}K
            </div>
            <Badge variant="secondary" className="mt-2">
              +12% from last period
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.kpis.resourceEfficiency}%</div>
            <Badge variant="secondary" className="mt-2">
              +3% from last period
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.kpis.projectDeliveryRate}%</div>
            <Badge variant="destructive" className="mt-2">
              -2% from last period
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Utilization Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.utilizationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Breakdown by Function</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.resourceBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {analyticsData.resourceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Project Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Project Resource Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.projectAllocation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="project" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="allocated" fill="#3b82f6" />
                <Bar dataKey="utilized" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.costAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="allocated" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="budget" stroke="#ef4444" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## **🎯 TESTING STRATEGY**

### **Unit Testing Examples**

```typescript
// __tests__/resources/ResourceRegistry.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceRegistry } from '@/components/resources/ResourceRegistry';

const mockResources = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    function: 'Software Engineer',
    employmentType: 'FULL_TIME',
    region: 'North America',
    utilization: 85,
    skills: ['React', 'TypeScript']
  }
];

describe('ResourceRegistry', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    // Mock API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders resource table with data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resources: mockResources,
        pagination: { page: 1, totalPages: 1, total: 1 }
      })
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ResourceRegistry />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@company.com')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });

  test('filters resources by search term', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resources: mockResources,
          pagination: { page: 1, totalPages: 1, total: 1 }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resources: [],
          pagination: { page: 1, totalPages: 1, total: 0 }
        })
      });

    render(
      <QueryClientProvider client={queryClient}>
        <ResourceRegistry />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search resources...');
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(screen.getByText('No resources found matching your criteria.')).toBeInTheDocument();
    });
  });
});
```

### **Integration Testing Examples**

```typescript
// __tests__/api/resources.test.ts
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/resources/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    resource: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn()
    }
  }
}));

describe('/api/resources', () => {
  test('GET returns paginated resources', async () => {
    const mockResources = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@company.com',
        function: 'Engineer',
        employmentType: 'FULL_TIME',
        region: 'US',
        utilization: 85
      }
    ];

    (prisma.resource.findMany as jest.Mock).mockResolvedValue(mockResources);
    (prisma.resource.count as jest.Mock).mockResolvedValue(1);

    const { req } = createMocks({
      method: 'GET',
      url: '/api/resources?page=1&limit=50'
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resources).toEqual(mockResources);
    expect(data.pagination).toMatchObject({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1
    });
  });

  test('POST creates new resource', async () => {
    const newResource = {
      name: 'Jane Smith',
      email: 'jane@company.com',
      function: 'Designer',
      employmentType: 'FULL_TIME',
      region: 'EU'
    };

    (prisma.resource.create as jest.Mock).mockResolvedValue({
      id: '2',
      ...newResource
    });

    const { req } = createMocks({
      method: 'POST',
      body: newResource
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe(newResource.name);
    expect(data.email).toBe(newResource.email);
  });
});
```

---

## **🚀 DEPLOYMENT CHECKLIST**

### **Pre-Deployment Verification**

```bash
# 1. Database Migration Check
yarn prisma generate
yarn prisma db push --preview-feature
yarn prisma db seed

# 2. Type Safety Check
yarn tsc --noEmit

# 3. Lint and Format
yarn lint
yarn prettier --check .

# 4. Test Suite
yarn test
yarn test:integration
yarn test:e2e

# 5. Build Verification
yarn build
yarn start

# 6. Performance Testing
yarn lighthouse
yarn bundle-analyzer
```

### **Environment Variables**

```bash
# Required for Resource Management
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Optional: Redis for caching
REDIS_URL="redis://..."

# Analytics & Monitoring
SENTRY_DSN="..."
GOOGLE_ANALYTICS_ID="..."
```

---

## **📈 MONITORING & OBSERVABILITY**

### **Key Metrics to Track**

```typescript
// /lib/monitoring/resource-metrics.ts
export const trackResourceMetrics = {
  // Performance Metrics
  pageLoadTime: (page: string, duration: number) => {
    analytics.track('Resource Page Load', {
      page,
      duration,
      timestamp: new Date().toISOString()
    });
  },

  // Business Metrics
  resourceUtilization: (utilization: number) => {
    analytics.track('Resource Utilization', {
      utilization,
      timestamp: new Date().toISOString()
    });
  },

  // User Actions
  allocationUpdate: (resourceId: string, projectId: string, allocation: number) => {
    analytics.track('Allocation Updated', {
      resourceId,
      projectId,
      allocation,
      timestamp: new Date().toISOString()
    });
  }
};
```

This comprehensive technical specification provides the foundation for implementing the resource and capacity management system. Each component is designed with production-ready standards including error handling, performance optimization, and comprehensive testing strategies.
