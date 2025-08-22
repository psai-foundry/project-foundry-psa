
'use client';

import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';
import { Permission, hasPermission, hasAnyPermission } from '@/lib/permissions';
import { ReactNode } from 'react';

interface RoleGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ 
  children, 
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  requiredRole,
  requiredRoles,
  fallback = null 
}: RoleGuardProps) {
  const { data: session, status } = useSession() || {};

  if (status === 'loading') {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!session?.user?.role) {
    return <>{fallback}</>;
  }

  const userRole = session.user.role as UserRole;

  // Check role-based access
  if (requiredRole && userRole !== requiredRole) {
    return <>{fallback}</>;
  }

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
    return <>{fallback}</>;
  }

  if (requiredPermissions) {
    const hasAccess = requireAll 
      ? requiredPermissions.every(permission => hasPermission(userRole, permission))
      : hasAnyPermission(userRole, requiredPermissions);
    
    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Hook for permission checking
export function usePermissions() {
  const { data: session } = useSession() || {};
  const userRole = session?.user?.role as UserRole;

  return {
    hasPermission: (permission: Permission) => userRole ? hasPermission(userRole, permission) : false,
    hasAnyPermission: (permissions: Permission[]) => userRole ? hasAnyPermission(userRole, permissions) : false,
    hasRole: (role: UserRole) => userRole === role,
    hasAnyRole: (roles: UserRole[]) => userRole ? roles.includes(userRole) : false,
    userRole,
    isAuthenticated: !!session?.user
  };
}
