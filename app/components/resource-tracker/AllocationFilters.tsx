
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter } from 'lucide-react';

interface AllocationFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export function AllocationFilters({ onFiltersChange }: AllocationFiltersProps) {
  const departments = ['Engineering', 'Design', 'Operations', 'Marketing', 'Sales'];
  const statuses = ['planned', 'active', 'completed', 'overrun'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Department Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Department</Label>
            <div className="space-y-2">
              {departments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox id={`dept-${dept}`} />
                  <Label htmlFor={`dept-${dept}`} className="text-sm font-normal">
                    {dept}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox id={`status-${status}`} />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
