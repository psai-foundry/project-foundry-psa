

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types based on our Prisma schema
export interface CapacityAllocation {
  id: string;
  resourceId: string;
  projectId?: string;
  weekStartDate: Date;
  allocation: number; // 0-5 scale (days)
  type: 'ACTUAL' | 'FORECAST';
  createdAt: Date;
  updatedAt: Date;
  resource?: {
    id: string;
    name: string;
    function: string;
  };
  project?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface WeekConfig {
  startDate: Date;
  label: string;
  workingDays: number;
}

export interface UseCapacityAllocationsResult {
  capacityAllocations: CapacityAllocation[];
  loading: boolean;
  error: string | null;
  weekConfigs: WeekConfig[];
  refreshCapacityAllocations: () => Promise<void>;
  updateCapacityAllocation: (
    resourceId: string, 
    weekStartDate: Date, 
    allocation: number,
    type?: 'ACTUAL' | 'FORECAST'
  ) => Promise<boolean>;
  getResourceCapacity: (resourceId: string) => CapacityAllocation[];
  getWeekCapacity: (weekStartDate: Date) => CapacityAllocation[];
}

export function useCapacityAllocations(): UseCapacityAllocationsResult {
  const { data: session } = useSession() || {};
  const [capacityAllocations, setCapacityAllocations] = useState<CapacityAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate next 12 weeks
  const generateWeekConfigs = (): WeekConfig[] => {
    const weeks: WeekConfig[] = [];
    const startDate = new Date();
    
    // Find the Monday of the current week
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const currentMonday = new Date(startDate);
    currentMonday.setDate(startDate.getDate() + mondayOffset);

    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() + (i * 7));

      weeks.push({
        startDate: weekStart,
        label: `Week ${i + 1}`,
        workingDays: 5, // Default to 5 working days
      });
    }

    return weeks;
  };

  const weekConfigs = generateWeekConfigs();

  // Fetch capacity allocations from API
  const fetchCapacityAllocations = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/capacity-allocations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const allocations = (data.capacityAllocations || []).map((allocation: any) => ({
        ...allocation,
        weekStartDate: new Date(allocation.weekStartDate),
        createdAt: new Date(allocation.createdAt),
        updatedAt: new Date(allocation.updatedAt),
      }));

      setCapacityAllocations(allocations);
    } catch (err) {
      console.error('Error fetching capacity allocations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch capacity allocations');
      setCapacityAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  // Update capacity allocation
  const updateCapacityAllocation = async (
    resourceId: string,
    weekStartDate: Date,
    allocation: number,
    type: 'ACTUAL' | 'FORECAST' = 'FORECAST'
  ): Promise<boolean> => {
    if (!session?.user) return false;

    try {
      const response = await fetch('/api/capacity-allocations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId,
          weekStartDate: weekStartDate.toISOString(),
          allocation: Math.max(0, Math.min(5, allocation)), // Ensure 0-5 range
          type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { capacityAllocation } = await response.json();
      const updatedAllocation = {
        ...capacityAllocation,
        weekStartDate: new Date(capacityAllocation.weekStartDate),
        createdAt: new Date(capacityAllocation.createdAt),
        updatedAt: new Date(capacityAllocation.updatedAt),
      };

      // Update local state
      setCapacityAllocations(prev => {
        const existing = prev.find(
          ca => ca.resourceId === resourceId && 
          ca.weekStartDate.getTime() === weekStartDate.getTime()
        );

        if (existing) {
          return prev.map(ca => 
            ca.id === existing.id ? updatedAllocation : ca
          );
        } else {
          return [...prev, updatedAllocation];
        }
      });

      return true;
    } catch (err) {
      console.error('Error updating capacity allocation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update capacity allocation');
      return false;
    }
  };

  // Get capacity allocations for a specific resource
  const getResourceCapacity = (resourceId: string): CapacityAllocation[] => {
    return capacityAllocations.filter(ca => ca.resourceId === resourceId);
  };

  // Get capacity allocations for a specific week
  const getWeekCapacity = (weekStartDate: Date): CapacityAllocation[] => {
    return capacityAllocations.filter(ca => 
      ca.weekStartDate.getTime() === weekStartDate.getTime()
    );
  };

  // Refresh capacity allocations
  const refreshCapacityAllocations = async () => {
    await fetchCapacityAllocations();
  };

  // Initial load
  useEffect(() => {
    fetchCapacityAllocations();
  }, [session?.user]);

  return {
    capacityAllocations,
    loading,
    error,
    weekConfigs,
    refreshCapacityAllocations,
    updateCapacityAllocation,
    getResourceCapacity,
    getWeekCapacity,
  };
}

