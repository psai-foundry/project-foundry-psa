
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaskManagement } from '@/components/admin/task-management';

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  // Only allow admins and managers to access task management
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
        <p className="text-muted-foreground">
          Manage tasks, assignments, and track progress across all projects.
        </p>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }>
        <TaskManagement />
      </Suspense>
    </div>
  );
}
