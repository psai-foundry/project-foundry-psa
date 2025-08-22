
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ForecastData {
  resourceId: string;
  resourceName: string;
  role: string;
  department: string;
  weeklyAllocations: { [week: string]: number };
  totalCapacity: number;
  utilization: number;
}

interface ForecastGridProps {
  data: ForecastData[];
  view: 'resource' | 'project';
  onAllocationChange: (resourceId: string, week: string, hours: number) => void;
}

export function ForecastGrid({ data, view, onAllocationChange }: ForecastGridProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Get all weeks from the first resource
  const weeks = data.length > 0 ? Object.keys(data[0].weeklyAllocations).sort() : [];

  const formatWeekHeader = (weekString: string) => {
    const date = new Date(weekString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-600 bg-red-50';
    if (utilization > 90) return 'text-orange-600 bg-orange-50';
    if (utilization > 70) return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getAllocationColor = (hours: number) => {
    const utilization = (hours / 40) * 100;
    if (utilization > 100) return 'bg-red-100 text-red-800 border-red-200';
    if (utilization > 90) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (utilization > 70) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleCellEdit = (resourceId: string, week: string, value: string) => {
    const hours = Math.max(0, Math.min(60, parseFloat(value) || 0)); // Cap at 60 hours per week
    onAllocationChange(resourceId, week, hours);
    setEditingCell(null);
  };

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Resource Capacity Forecast</CardTitle>
          <p className="text-sm text-gray-600">
            Click on any cell to edit allocation hours. Red indicates over-allocation.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header Row */}
              <div className="grid" style={{ gridTemplateColumns: `300px repeat(${weeks.length}, 80px) 100px` }}>
                <div className="p-4 bg-gray-50 border-b border-r border-gray-200 font-medium">
                  Resource
                </div>
                {weeks.map((week) => (
                  <div 
                    key={week}
                    className="p-2 bg-gray-50 border-b border-r border-gray-200 text-center text-xs font-medium"
                  >
                    <div>{formatWeekHeader(week)}</div>
                    <div className="text-gray-500">
                      W{Math.floor(Math.abs(new Date(week).getTime() - Date.parse('2024-01-01')) / (7 * 24 * 60 * 60 * 1000)) % 52 + 1}
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 border-b border-gray-200 font-medium text-center">
                  Utilization
                </div>
              </div>

              {/* Resource Rows */}
              {data.map((resource) => (
                <div 
                  key={resource.resourceId}
                  className="grid hover:bg-gray-50"
                  style={{ gridTemplateColumns: `300px repeat(${weeks.length}, 80px) 100px` }}
                >
                  {/* Resource Info */}
                  <div className="p-4 border-b border-r border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={`https://avatar.vercel.sh/${resource.resourceName}`} />
                        <AvatarFallback className="text-xs">
                          {getInitials(resource.resourceName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{resource.resourceName}</div>
                        <div className="text-xs text-gray-500">{resource.role}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {resource.department}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Allocations */}
                  {weeks.map((week) => {
                    const hours = resource.weeklyAllocations[week] || 0;
                    const cellKey = `${resource.resourceId}-${week}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <div 
                        key={week}
                        className="border-b border-r border-gray-200 p-1"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={hours}
                                onChange={(e) => handleCellEdit(resource.resourceId, week, e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellEdit(resource.resourceId, week, e.currentTarget.value);
                                  } else if (e.key === 'Escape') {
                                    setEditingCell(null);
                                  }
                                }}
                                className="h-8 text-xs text-center p-1"
                                autoFocus
                                min="0"
                                max="60"
                                step="0.5"
                              />
                            ) : (
                              <div
                                className={`h-8 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${getAllocationColor(hours)}`}
                                onClick={() => setEditingCell(cellKey)}
                              >
                                {hours > 0 ? hours.toFixed(1) : '—'}
                              </div>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hours} hours allocated</p>
                            <p>{((hours / 40) * 100).toFixed(1)}% of capacity</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}

                  {/* Utilization */}
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center space-y-2">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getUtilizationColor(resource.utilization)}`}>
                        {resource.utilization}%
                      </div>
                      <Progress 
                        value={Math.min(100, resource.utilization)}
                        className="w-full mt-1 h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Normal (≤70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
                <span>High (71-90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
                <span>Critical (91-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
                <span>Over-allocated (&gt;100%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
