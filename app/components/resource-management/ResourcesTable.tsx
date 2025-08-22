
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ResourcesTableProps {
  resources: Resource[];
  onResourceUpdate: (id: string, updates: Partial<Resource>) => void;
}

export function ResourcesTable({ resources, onResourceUpdate }: ResourcesTableProps) {
  const [sortField, setSortField] = useState<keyof Resource>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof Resource) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResources = [...resources].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 75) return 'text-orange-600';
    if (utilization >= 50) return 'text-green-600';
    return 'text-blue-600';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Eye className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
        <p className="text-gray-600 mb-6">Get started by adding your first team member.</p>
        <Button>Add Resource</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                Resource
                {sortField === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('role')}
              >
                Role
                {sortField === 'role' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('department')}
              >
                Department
                {sortField === 'department' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Employment</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('utilization')}
              >
                Utilization
                {sortField === 'utilization' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Skills</TableHead>
              <TableHead>Status</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('cost')}
              >
                Annual Cost
                {sortField === 'cost' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedResources.map((resource) => (
              <TableRow key={resource.id} className="hover:bg-gray-50">
                <TableCell className="py-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${resource.name}`} />
                      <AvatarFallback className="text-xs">
                        {getInitials(resource.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">{resource.name}</div>
                      <div className="text-sm text-gray-500">{resource.manager}</div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="font-medium">{resource.role}</div>
                  <div className="text-sm text-gray-500">
                    Since {new Date(resource.startDate).toLocaleDateString()}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {resource.department}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={resource.employmentType === 'Full Time' 
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                    }
                  >
                    {resource.employmentType}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className={`text-sm font-medium ${getUtilizationColor(resource.utilization)}`}>
                      {resource.utilization}%
                    </div>
                    <Progress 
                      value={resource.utilization} 
                      className="w-16 h-1"
                    />
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {resource.skills.slice(0, 2).map((skill) => (
                      <Badge 
                        key={skill}
                        variant="secondary" 
                        className="text-xs bg-gray-100 text-gray-700"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {resource.skills.length > 2 && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                        +{resource.skills.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={getStatusColor(resource.status)}
                  >
                    {resource.status.replace('-', ' ')}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="font-medium text-gray-900">
                    ${resource.cost.toLocaleString()}
                  </div>
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {}}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Resource
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {}}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Resource
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
