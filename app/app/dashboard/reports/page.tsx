
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive reporting and data analytics
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Reports & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Reports Module Coming Soon</h3>
            <p className="text-muted-foreground mb-6">
              The reports module will include comprehensive analytics, 
              customizable dashboards, and export capabilities.
            </p>
            <div className="flex justify-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                <span>Time Reports</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <PieChart className="w-4 h-4" />
                <span>Project Analytics</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>Export Reports</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
