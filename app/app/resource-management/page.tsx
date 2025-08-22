
'use client';

import { useState } from 'react';
import { ResourceRegistry } from '@/components/resource-management/ResourceRegistry';

export default function ResourceManagementPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <ResourceRegistry />
    </div>
  );
}
