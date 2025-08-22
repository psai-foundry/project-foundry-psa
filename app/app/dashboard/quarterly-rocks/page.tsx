
'use client';

import { useState } from 'react';
import { Target, Calendar, TrendingUp, CheckCircle2, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Mock data for quarterly rocks
const mockRocks = [
  {
    id: '1',
    quarter: 'Q1-2024',
    year: 2024,
    title: 'Complete Digital Transformation Initiative',
    description: 'Migrate all legacy systems to cloud-based solutions and implement new CRM platform',
    ownerId: '1',
    ownerName: 'Sarah Johnson',
    status: 'ACTIVE',
    progress: 75,
    priority: 'HIGH',
    dueDate: '2024-03-31',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    quarter: 'Q1-2024',
    year: 2024,
    title: 'Expand Team by 25%',
    description: 'Hire 8 new team members across development, design, and project management',
    ownerId: '2',
    ownerName: 'Mike Chen',
    status: 'ACTIVE',
    progress: 45,
    priority: 'HIGH',
    dueDate: '2024-03-31',
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    quarter: 'Q1-2024',
    year: 2024,
    title: 'Improve Client Satisfaction Score',
    description: 'Achieve 4.5+ average rating across all client feedback surveys',
    ownerId: '1',
    ownerName: 'Sarah Johnson',
    status: 'PLANNING',
    progress: 20,
    priority: 'MEDIUM',
    dueDate: '2024-03-31',
    createdAt: '2024-01-15',
  },
  {
    id: '4',
    quarter: 'Q4-2023',
    year: 2023,
    title: 'Launch New Service Offering',
    description: 'Develop and launch AI consulting services with initial 5 pilot clients',
    ownerId: '2',
    ownerName: 'Mike Chen',
    status: 'COMPLETED',
    progress: 100,
    priority: 'HIGH',
    dueDate: '2023-12-31',
    createdAt: '2023-10-01',
  },
];

const statusColors = {
  PLANNING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
  CRITICAL: 'bg-purple-100 text-purple-800',
};

export default function QuarterlyRocksPage() {
  const [quarterFilter, setQuarterFilter] = useState('Q1-2024');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredRocks = mockRocks.filter(rock => {
    const matchesQuarter = quarterFilter === 'all' || rock.quarter === quarterFilter;
    const matchesStatus = statusFilter === 'all' || rock.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || rock.priority === priorityFilter;
    return matchesQuarter && matchesStatus && matchesPriority;
  });

  const quarters = Array.from(new Set(mockRocks.map(r => r.quarter)));
  const activeRocks = mockRocks.filter(r => r.status === 'ACTIVE').length;
  const completedRocks = mockRocks.filter(r => r.status === 'COMPLETED').length;
  const avgProgress = Math.round(
    mockRocks.filter(r => r.status === 'ACTIVE').reduce((sum, r) => sum + r.progress, 0) / 
    mockRocks.filter(r => r.status === 'ACTIVE').length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quarterly Rocks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage quarterly strategic objectives and key results
          </p>
        </div>
        <Button className="gap-2" onClick={() => console.log('Add Rock clicked')}>
          <Plus className="w-4 h-4" />
          Add Rock
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rocks</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRocks}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRocks}</div>
            <p className="text-xs text-muted-foreground">
              This year
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Active rocks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days to Q1 End</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              Current quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Rocks</CardTitle>
          <CardDescription>
            Filter quarterly rocks by quarter, status, and priority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>
                    {quarter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Target className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rocks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRocks.map((rock) => (
          <Card key={rock.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{rock.quarter}</Badge>
                    <Badge className={statusColors[rock.status as keyof typeof statusColors]}>
                      {rock.status}
                    </Badge>
                    <Badge className={priorityColors[rock.priority as keyof typeof priorityColors]}>
                      {rock.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{rock.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {rock.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{rock.progress}%</span>
                </div>
                <Progress value={rock.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Owner:</span>
                  <div className="font-medium">{rock.ownerName}</div>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <div className="font-medium">
                    {new Date(rock.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => console.log('Update Progress clicked')}>
                  Update Progress
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => console.log('View Details clicked')}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRocks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No rocks found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your filters or add new quarterly rocks.
            </p>
            <Button onClick={() => console.log('Add Rock clicked')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rock
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quarterly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quarterly Summary</CardTitle>
          <CardDescription>
            Overview of rock performance by quarter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quarters.map((quarter) => {
              const quarterRocks = mockRocks.filter(r => r.quarter === quarter);
              const quarterCompleted = quarterRocks.filter(r => r.status === 'COMPLETED').length;
              const quarterActive = quarterRocks.filter(r => r.status === 'ACTIVE').length;
              const quarterPlanning = quarterRocks.filter(r => r.status === 'PLANNING').length;
              const avgQuarterProgress = Math.round(
                quarterRocks.reduce((sum, r) => sum + r.progress, 0) / quarterRocks.length
              );

              return (
                <div key={quarter} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{quarter}</h3>
                      <p className="text-sm text-gray-600">
                        {quarterRocks.length} total rocks
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{avgQuarterProgress}%</div>
                      <div className="text-xs text-gray-600">Avg progress</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{quarterCompleted}</div>
                      <div className="text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{quarterActive}</div>
                      <div className="text-gray-600">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">{quarterPlanning}</div>
                      <div className="text-gray-600">Planning</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
