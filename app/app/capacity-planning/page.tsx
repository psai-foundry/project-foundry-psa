
'use client';

import { useState } from 'react';
import { ForecastDashboard } from '@/components/capacity-planning/ForecastDashboard';

export default function CapacityPlanningPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <ForecastDashboard />
    </div>
  );
}
