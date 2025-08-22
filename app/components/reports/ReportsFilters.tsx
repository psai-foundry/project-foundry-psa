
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Filter } from 'lucide-react';

interface ReportsFiltersProps {
  dateRange: '7d' | '30d' | '90d' | '1y';
  onDateRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

export function ReportsFilters({ dateRange, onDateRangeChange }: ReportsFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <Select value={dateRange} onValueChange={onDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Filter className="w-3 h-3 mr-1" />
                All Departments
              </Badge>
              <Badge variant="secondary" className="text-xs">
                All Projects
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => alert('Advanced filters coming soon!')}>
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => alert('Save view functionality coming soon!')}>
              Save View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
