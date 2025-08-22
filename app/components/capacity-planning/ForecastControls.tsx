
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Calendar, Filter, Download, Save } from 'lucide-react';

interface ForecastControlsProps {
  selectedView: 'resource' | 'project';
  onViewChange: (view: 'resource' | 'project') => void;
  timeRange: '3months' | '6months' | '12months';
  onTimeRangeChange: (range: '3months' | '6months' | '12months') => void;
}

export function ForecastControls({ 
  selectedView, 
  onViewChange, 
  timeRange, 
  onTimeRangeChange 
}: ForecastControlsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex rounded-md border border-gray-300 overflow-hidden">
                <Button
                  variant={selectedView === 'resource' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('resource')}
                  className="rounded-none border-none"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Resources
                </Button>
                <Button
                  variant={selectedView === 'project' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('project')}
                  className="rounded-none border-none"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Projects
                </Button>
              </div>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="12months">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Filter className="w-3 h-3 mr-1" />
                All Resources
              </Badge>
              <Badge variant="secondary" className="text-xs">
                All Departments
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => alert('Export functionality coming soon!')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert('Save scenario functionality coming soon!')}>
              <Save className="w-4 h-4 mr-2" />
              Save Scenario
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Forecast Period: </span>
            <span className="text-gray-600">
              {new Date().toLocaleDateString()} - {
                new Date(Date.now() + (
                  timeRange === '3months' ? 90 :
                  timeRange === '6months' ? 180 : 365
                ) * 24 * 60 * 60 * 1000).toLocaleDateString()
              }
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Total Weeks: </span>
            <span className="text-gray-600">
              {timeRange === '3months' ? '12' : timeRange === '6months' ? '24' : '48'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
