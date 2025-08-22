

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Resource } from '@/hooks/use-resources';

interface ResourceManagementCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (resourceId: string) => void;
  onClick?: (resource: Resource) => void;
}

const employmentTypeColors = {
  STAFF: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CONTRACTOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  AGENCY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  PROJECT_SERVICES: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
};

export function ResourceManagementCard({ 
  resource, 
  onEdit, 
  onDelete, 
  onClick 
}: ResourceManagementCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick(resource);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(resource);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(resource.id);
    }
  };

  const totalAllocation = (resource.bauAllocationPercentage || 0) + (resource.projectAllocationPercentage || 0);
  const isOverallocated = totalAllocation > 100;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group" 
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={resource.avatar || ''} alt={resource.name} />
              <AvatarFallback>{resource.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{resource.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{resource.function}</p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditClick}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Employment</span>
          <Badge className={employmentTypeColors[resource.employmentType]}>
            {resource.employmentType.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Company:</span>
            <span className="font-medium">{resource.company}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Location:</span>
            <span className="font-medium">{resource.country}</span>
          </div>
          {resource.resourceOwner && (
            <div className="flex justify-between text-sm">
              <span>Owner:</span>
              <span className="font-medium">{resource.resourceOwner.name}</span>
            </div>
          )}
        </div>

        {/* Allocation Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Allocation</span>
            <span className={`text-sm font-semibold ${isOverallocated ? 'text-red-600' : 'text-green-600'}`}>
              {totalAllocation}%
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>BAU: {resource.bauAllocationPercentage || 0}%</span>
              <span>Projects: {resource.projectAllocationPercentage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="flex h-2 rounded-full">
                <div 
                  className="bg-blue-600 h-2" 
                  style={{ width: `${(resource.bauAllocationPercentage || 0)}%` }}
                ></div>
                <div 
                  className="bg-orange-500 h-2" 
                  style={{ width: `${(resource.projectAllocationPercentage || 0)}%` }}
                ></div>
                {isOverallocated && (
                  <div 
                    className="bg-red-500 h-2"
                    style={{ width: `${Math.min(totalAllocation - 100, 20)}%` }}
                  ></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Skills</div>
          <div className="flex flex-wrap gap-1">
            {resource.skills && resource.skills.length > 0 ? (
              resource.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-gray-500">No skills listed</span>
            )}
            {resource.skills && resource.skills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{resource.skills.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Working Days */}
        {resource.workingDaysPerWeek && (
          <div className="flex justify-between text-sm">
            <span>Working Days:</span>
            <span className="font-medium">{resource.workingDaysPerWeek}/week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

