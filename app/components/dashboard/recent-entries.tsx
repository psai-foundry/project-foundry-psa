
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Building2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface RecentEntriesProps {
  entries: Array<{
    id: string;
    date: Date;
    duration: number;
    description: string;
    billable: boolean;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    project: {
      name: string;
      client: {
        name: string;
      };
    };
    task?: {
      name: string;
    };
  }>;
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Clock className="w-4 h-4 mr-2" />
          Recent Time Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent entries</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">{entry.project.name}</span>
                      <Badge variant="outline" className={getStatusColor(entry.status)}>
                        {entry.status}
                      </Badge>
                      {entry.billable && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Billable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        {entry.project.client.name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </div>
                    {entry.task && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Task: {entry.task.name}
                      </p>
                    )}
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        "{entry.description}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatDuration(entry.duration)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
