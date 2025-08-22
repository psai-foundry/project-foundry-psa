
'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/role-guard';
import { Permission } from '@/lib/permissions';
import { Shield, Database, Settings, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminPage() {
  const { data: session } = useSession() || {};

  return (
    <RoleGuard requiredPermission={Permission.SYSTEM_SETTINGS} fallback={
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to access system administration.</p>
      </div>
    }>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Administration</h1>
          <p className="text-muted-foreground mt-1">
            Manage system settings, users, and infrastructure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Management</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">System Users</div>
              <p className="text-xs text-muted-foreground">
                Manage user accounts and roles
              </p>
              <Button className="w-full mt-4" asChild>
                <Link href="/dashboard/team">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Configuration</div>
              <p className="text-xs text-muted-foreground">
                Configure system parameters
              </p>
              <Button className="w-full mt-4" asChild>
                <Link href="/dashboard/settings">System Settings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Health</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Healthy</div>
              <p className="text-xs text-muted-foreground">
                Database status monitoring
              </p>
              <Button className="w-full mt-4" variant="outline" onClick={() => alert('Database details dashboard coming soon!')}>
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                System activity monitoring
              </p>
              <Button className="w-full mt-4" asChild>
                <Link href="/dashboard/audit">View Audit Logs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/settings">Settings</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/team">Users</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/audit">Audit Trail</Link>
              </Button>
              <Button variant="outline" onClick={() => alert('System backup functionality coming soon!')}>
                Backup System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
