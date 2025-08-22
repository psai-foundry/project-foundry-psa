

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types based on our Prisma schema
export interface Resource {
  id: string;
  name: string;
  function: string;
  company: string;
  employmentType: 'STAFF' | 'CONTRACTOR' | 'AGENCY' | 'PROJECT_SERVICES';
  region: string;
  country: string;
  skills: string[];
  email?: string;
  phone?: string;
  avatar?: string;
  annualSalary?: number;
  workingDaysPerWeek?: number;
  bauAllocationPercentage?: number;
  projectAllocationPercentage?: number;
  resourceOwner?: {
    id: string;
    name: string;
    email?: string;
    department?: string;
    role?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceFilters {
  searchTerm: string;
  selectedRegion: string;
  selectedFunction: string;
  selectedEmploymentType: string;
  selectedResourceOwner: string;
}

export interface UseResourcesResult {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  filteredResources: Resource[];
  filters: ResourceFilters;
  setFilters: (filters: Partial<ResourceFilters>) => void;
  refreshResources: () => Promise<void>;
  createResource: (resource: Partial<Resource>) => Promise<Resource | null>;
  updateResource: (id: string, updates: Partial<Resource>) => Promise<Resource | null>;
  deleteResource: (id: string) => Promise<boolean>;
}

export function useResources(): UseResourcesResult {
  const { data: session } = useSession() || {};
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ResourceFilters>({
    searchTerm: '',
    selectedRegion: 'all',
    selectedFunction: 'all',
    selectedEmploymentType: 'all',
    selectedResourceOwner: 'all',
  });

  // Fetch resources from API
  const fetchResources = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/resources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResources(data.resources || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter resources based on current filters
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !filters.searchTerm || 
      resource.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      resource.function.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      resource.skills.some(skill => skill.toLowerCase().includes(filters.searchTerm.toLowerCase()));

    const matchesRegion = filters.selectedRegion === 'all' || resource.region === filters.selectedRegion;
    const matchesFunction = filters.selectedFunction === 'all' || resource.function === filters.selectedFunction;
    const matchesEmploymentType = filters.selectedEmploymentType === 'all' || resource.employmentType === filters.selectedEmploymentType;
    const matchesResourceOwner = filters.selectedResourceOwner === 'all' || 
      resource.resourceOwner?.name === filters.selectedResourceOwner;

    return matchesSearch && matchesRegion && matchesFunction && matchesEmploymentType && matchesResourceOwner;
  });

  // Update filters
  const setFilters = (newFilters: Partial<ResourceFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  // Create new resource
  const createResource = async (resourceData: Partial<Resource>): Promise<Resource | null> => {
    if (!session?.user) return null;

    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resourceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { resource } = await response.json();
      setResources(prev => [...prev, resource]);
      return resource;
    } catch (err) {
      console.error('Error creating resource:', err);
      setError(err instanceof Error ? err.message : 'Failed to create resource');
      return null;
    }
  };

  // Update existing resource
  const updateResource = async (id: string, updates: Partial<Resource>): Promise<Resource | null> => {
    if (!session?.user) return null;

    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { resource } = await response.json();
      setResources(prev => prev.map(r => r.id === id ? resource : r));
      return resource;
    } catch (err) {
      console.error('Error updating resource:', err);
      setError(err instanceof Error ? err.message : 'Failed to update resource');
      return null;
    }
  };

  // Delete resource
  const deleteResource = async (id: string): Promise<boolean> => {
    if (!session?.user) return false;

    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setResources(prev => prev.filter(r => r.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
      return false;
    }
  };

  // Refresh resources
  const refreshResources = async () => {
    await fetchResources();
  };

  // Initial load
  useEffect(() => {
    fetchResources();
  }, [session?.user]);

  return {
    resources,
    loading,
    error,
    filteredResources,
    filters,
    setFilters,
    refreshResources,
    createResource,
    updateResource,
    deleteResource,
  };
}

