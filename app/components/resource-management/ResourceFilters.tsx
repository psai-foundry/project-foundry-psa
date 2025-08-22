
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { X, Filter } from 'lucide-react';

interface FilterState {
  departments: string[];
  employmentTypes: string[];
  statuses: string[];
  utilizationRange: [number, number];
  costRange: [number, number];
  skills: string[];
}

interface ResourceFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

export function ResourceFilters({ onFiltersChange }: ResourceFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    departments: [],
    employmentTypes: [],
    statuses: [],
    utilizationRange: [0, 100],
    costRange: [0, 200000],
    skills: []
  });

  const departments = ['Engineering', 'Design', 'Operations', 'Marketing', 'Sales', 'HR', 'Finance'];
  const employmentTypes = ['Full Time', 'Part Time', 'Contract', 'Freelance'];
  const statuses = ['active', 'inactive', 'on-leave'];
  const commonSkills = [
    'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'AWS', 'Docker',
    'Project Management', 'Agile', 'Scrum', 'UI/UX Design', 'Figma',
    'Data Analysis', 'SQL', 'Marketing', 'Sales'
  ];

  const handleMultiSelectChange = (
    field: keyof FilterState,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[field] as string[];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    const newFilters = { ...filters, [field]: newValues };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleRangeChange = (field: 'utilizationRange' | 'costRange', values: number[]) => {
    const newFilters = { ...filters, [field]: values as [number, number] };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      departments: [],
      employmentTypes: [],
      statuses: [],
      utilizationRange: [0, 100],
      costRange: [0, 200000],
      skills: []
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    return (
      filters.departments.length +
      filters.employmentTypes.length +
      filters.statuses.length +
      filters.skills.length +
      (filters.utilizationRange[0] !== 0 || filters.utilizationRange[1] !== 100 ? 1 : 0) +
      (filters.costRange[0] !== 0 || filters.costRange[1] !== 200000 ? 1 : 0)
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          {getActiveFiltersCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Department Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Department</Label>
            <div className="space-y-2">
              {departments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={filters.departments.includes(dept)}
                    onCheckedChange={(checked) =>
                      handleMultiSelectChange('departments', dept, checked as boolean)
                    }
                  />
                  <Label htmlFor={`dept-${dept}`} className="text-sm font-normal">
                    {dept}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Employment Type Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Employment Type</Label>
            <div className="space-y-2">
              {employmentTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-${type}`}
                    checked={filters.employmentTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      handleMultiSelectChange('employmentTypes', type, checked as boolean)
                    }
                  />
                  <Label htmlFor={`emp-${type}`} className="text-sm font-normal">
                    {type}
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
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.statuses.includes(status)}
                    onCheckedChange={(checked) =>
                      handleMultiSelectChange('statuses', status, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal">
                    {status.replace('-', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Skills</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {commonSkills.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={`skill-${skill}`}
                    checked={filters.skills.includes(skill)}
                    onCheckedChange={(checked) =>
                      handleMultiSelectChange('skills', skill, checked as boolean)
                    }
                  />
                  <Label htmlFor={`skill-${skill}`} className="text-sm font-normal">
                    {skill}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          {/* Utilization Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Utilization Range: {filters.utilizationRange[0]}% - {filters.utilizationRange[1]}%
            </Label>
            <Slider
              value={filters.utilizationRange}
              onValueChange={(value) => handleRangeChange('utilizationRange', value)}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          {/* Cost Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Annual Cost: ${filters.costRange[0].toLocaleString()} - ${filters.costRange[1].toLocaleString()}
            </Label>
            <Slider
              value={filters.costRange}
              onValueChange={(value) => handleRangeChange('costRange', value)}
              max={200000}
              min={0}
              step={5000}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
