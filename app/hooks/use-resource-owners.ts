

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types based on our Prisma schema
export interface ResourceOwner {
  id: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UseResourceOwnersResult {
  resourceOwners: ResourceOwner[];
  loading: boolean;
  error: string | null;
  refreshResourceOwners: () => Promise<void>;
  createResourceOwner: (owner: Partial<ResourceOwner>) => Promise<ResourceOwner | null>;
  updateResourceOwner: (id: string, updates: Partial<ResourceOwner>) => Promise<ResourceOwner | null>;
  deleteResourceOwner: (id: string) => Promise<boolean>;
}

export function useResourceOwners(): UseResourceOwnersResult {
  const { data: session } = useSession() || {};
  const [resourceOwners, setResourceOwners] = useState<ResourceOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch resource owners from API
  const fetchResourceOwners = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/resource-owners', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const owners = (data.resourceOwners || []).map((owner: any) => ({
        ...owner,
        createdAt: new Date(owner.createdAt),
        updatedAt: new Date(owner.updatedAt),
      }));

      setResourceOwners(owners);
    } catch (err) {
      console.error('Error fetching resource owners:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resource owners');
      setResourceOwners([]);
    } finally {
      setLoading(false);
    }
  };

  // Create new resource owner
  const createResourceOwner = async (ownerData: Partial<ResourceOwner>): Promise<ResourceOwner | null> => {
    if (!session?.user) return null;

    try {
      const response = await fetch('/api/resource-owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ownerData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { resourceOwner } = await response.json();
      const owner = {
        ...resourceOwner,
        createdAt: new Date(resourceOwner.createdAt),
        updatedAt: new Date(resourceOwner.updatedAt),
      };

      setResourceOwners(prev => [...prev, owner]);
      return owner;
    } catch (err) {
      console.error('Error creating resource owner:', err);
      setError(err instanceof Error ? err.message : 'Failed to create resource owner');
      return null;
    }
  };

  // Update existing resource owner
  const updateResourceOwner = async (id: string, updates: Partial<ResourceOwner>): Promise<ResourceOwner | null> => {
    if (!session?.user) return null;

    try {
      const response = await fetch(`/api/resource-owners/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { resourceOwner } = await response.json();
      const owner = {
        ...resourceOwner,
        createdAt: new Date(resourceOwner.createdAt),
        updatedAt: new Date(resourceOwner.updatedAt),
      };

      setResourceOwners(prev => prev.map(o => o.id === id ? owner : o));
      return owner;
    } catch (err) {
      console.error('Error updating resource owner:', err);
      setError(err instanceof Error ? err.message : 'Failed to update resource owner');
      return null;
    }
  };

  // Delete resource owner
  const deleteResourceOwner = async (id: string): Promise<boolean> => {
    if (!session?.user) return false;

    try {
      const response = await fetch(`/api/resource-owners/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setResourceOwners(prev => prev.filter(o => o.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting resource owner:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete resource owner');
      return false;
    }
  };

  // Refresh resource owners
  const refreshResourceOwners = async () => {
    await fetchResourceOwners();
  };

  // Initial load
  useEffect(() => {
    fetchResourceOwners();
  }, [session?.user]);

  return {
    resourceOwners,
    loading,
    error,
    refreshResourceOwners,
    createResourceOwner,
    updateResourceOwner,
    deleteResourceOwner,
  };
}

