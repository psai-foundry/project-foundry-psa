
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';

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

interface ResourceTrackerTableProps {
  allocations: ResourceAllocation[];
  onAllocationUpdate: (id: string, updates: Partial<ResourceAllocation>) => void;
}

export function ResourceTrackerTable({ allocations, onAllocationUpdate }: ResourceTrackerTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overrun':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 2) return 'text-red-600';
    if (variance < -2) return 'text-green-600';
    return 'text-gray-600';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatWeek = (weekString: string) => {
    const date = new Date(weekString);
    return `Week of ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
  };

  if (allocations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No allocations found</h3>
        <p className="text-gray-600 mb-6">Try adjusting your search criteria or date range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Resource</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Planned Hours</TableHead>
              <TableHead>Actual Hours</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => {
              const variance = allocation.actualHours - allocation.allocatedHours;
              const utilization = (allocation.actualHours / allocation.allocatedHours) * 100;

              return (
                <TableRow key={allocation.id} className="hover:bg-gray-50">
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={`https://avatar.vercel.sh/${allocation.resourceName}`} />
                        <AvatarFallback className="text-xs">
                          {getInitials(allocation.resourceName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{allocation.resourceName}</div>
                        <div className="text-sm text-gray-500">{allocation.role}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {allocation.department}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{allocation.projectName}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">{formatWeek(allocation.week)}</div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{allocation.allocatedHours}h</div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">
                      {allocation.status === 'planned' ? '—' : `${allocation.actualHours}h`}
                    </div>
                  </TableCell>

                  <TableCell>
                    {allocation.status === 'planned' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className={`font-medium ${getVarianceColor(variance)}`}>
                        {variance > 0 ? `+${variance}h` : `${variance}h`}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {allocation.status === 'planned' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {Math.round(utilization)}%
                        </div>
                        <Progress 
                          value={Math.min(150, utilization)}
                          className="w-16 h-1"
                        />
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={getStatusColor(allocation.status)}
                    >
                      {allocation.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
