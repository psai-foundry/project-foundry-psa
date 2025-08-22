

/**
 * Audit Summary Widget for Dashboard
 * Phase 2B-7e: Comprehensive Audit Trail Integration
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  ExternalLink,
  Clock,
  User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface CriticalAction {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function AuditSummaryWidget() {
  const { data: session } = useSession();
  const [criticalActions, setCriticalActions] = useState<CriticalAction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCriticalActions = async () => {
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/audit-logs/critical?limit=5');
      if (!response.ok) throw new Error('Failed to fetch critical actions');
      
      const data = await response.json();
      setCriticalActions(data.data || []);
    } catch (error) {
      console.error('Error fetching critical actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriticalActions();
  }, [session]);

  // Get action badge color
  const getActionBadgeColor = (action: string) => {
    if (action.includes('OVERRIDE') || action.includes('MANUAL')) return 'destructive';
    if (action.includes('APPROVE')) return 'secondary';
    if (action.includes('CREATE')) return 'default';
    if (action.includes('DELETE') || action.includes('REVOKE')) return 'outline';
    return 'secondary';
  };

  // Don't show for employees
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Recent Critical Actions
        </CardTitle>
        <Link href="/dashboard/settings?tab=audit">
          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : criticalActions.length > 0 ? (
            criticalActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3 flex-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getActionBadgeColor(action.action)} className="text-xs">
                        {action.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                      <User className="w-3 h-3" />
                      <span>{action.user?.name || 'System'}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{format(parseISO(action.timestamp), 'MMM dd, HH:mm')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <Shield className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <div className="text-sm text-muted-foreground">No critical actions</div>
            </div>
          )}

          {criticalActions.length > 0 && (
            <Link href="/dashboard/settings?tab=audit">
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                View All Audit Logs
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AuditSummaryWidget;

