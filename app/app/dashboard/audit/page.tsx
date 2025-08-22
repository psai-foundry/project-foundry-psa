
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/role-guard';
import { Permission } from '@/lib/permissions';
import { FileText, Filter, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  category: string;
}

export default function AuditPage() {
  const { data: session } = useSession() || {};
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Simulate loading audit logs
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        action: 'User Login',
        user: session?.user?.email || 'admin@foundry.com',
        timestamp: new Date().toISOString(),
        details: 'Successful login from admin dashboard',
        category: 'AUTH'
      },
      {
        id: '2',
        action: 'Manual Sync Triggered',
        user: session?.user?.email || 'admin@foundry.com',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        details: 'Manual sync operation initiated for 5 timesheets',
        category: 'SYNC'
      },
      {
        id: '3',
        action: 'Validation Override Applied',
        user: session?.user?.email || 'admin@foundry.com',
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
        details: 'Override applied to validation rule VR001',
        category: 'OVERRIDE'
      },
      {
        id: '4',
        action: 'User Role Updated',
        user: session?.user?.email || 'admin@foundry.com',
        timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
        details: 'User role changed from EMPLOYEE to MANAGER',
        category: 'USER_MGMT'
      }
    ];
    
    setTimeout(() => {
      setAuditLogs(mockLogs);
      setLoading(false);
    }, 1000);
  }, [session]);

  const getCategoryColor = (category: string) => {
    const colors = {
      AUTH: 'bg-green-100 text-green-800',
      SYNC: 'bg-blue-100 text-blue-800',
      OVERRIDE: 'bg-yellow-100 text-yellow-800',
      USER_MGMT: 'bg-purple-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.category === filter;
    const matchesSearch = search === '' || 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <RoleGuard requiredPermission={Permission.AUDIT_LOGS} fallback={
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to access audit logs.</p>
      </div>
    }>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
          <p className="text-muted-foreground mt-1">
            Complete audit trail of all system activities and administrative actions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="AUTH">Authentication</SelectItem>
                  <SelectItem value="SYNC">Synchronization</SelectItem>
                  <SelectItem value="OVERRIDE">Overrides</SelectItem>
                  <SelectItem value="USER_MGMT">User Management</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => alert('Date Range filter coming soon!')}>
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Audit Logs ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading audit logs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {log.action}
                          </h3>
                          <Badge className={getCategoryColor(log.category)}>
                            {log.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>User: {log.user}</span>
                          <span>•</span>
                          <span>
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
