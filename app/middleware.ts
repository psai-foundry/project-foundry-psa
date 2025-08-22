
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

// Define route access rules
const routeAccess: Record<string, UserRole[]> = {
  '/dashboard': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE, 
    UserRole.JUNIOR_CONSULTANT, UserRole.CONTRACTOR, UserRole.CLIENT_USER
  ],
  '/projects': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE,
    UserRole.JUNIOR_CONSULTANT, UserRole.CONTRACTOR, UserRole.CLIENT_USER
  ],
  '/clients': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE
  ],
  '/time': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE,
    UserRole.JUNIOR_CONSULTANT, UserRole.CONTRACTOR
  ],
  '/timesheets': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE
  ],
  '/reports': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE,
    UserRole.JUNIOR_CONSULTANT, UserRole.CONTRACTOR, UserRole.CLIENT_USER
  ],
  '/users': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER
  ],
  '/settings': [
    UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL, UserRole.PRACTICE_LEAD,
    UserRole.MANAGER, UserRole.SENIOR_CONSULTANT, UserRole.EMPLOYEE,
    UserRole.JUNIOR_CONSULTANT, UserRole.CONTRACTOR, UserRole.CLIENT_USER
  ],
  // Admin-only routes
  '/settings/system': [UserRole.ADMIN],
  '/settings/xero': [UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL],
  '/settings/users': [UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL],
  '/api/admin': [UserRole.ADMIN],
  '/api/xero/manual-sync': [UserRole.ADMIN, UserRole.PARTNER, UserRole.PRINCIPAL],
};

function hasRouteAccess(pathname: string, userRole: string): boolean {
  // Check exact path match first
  if (routeAccess[pathname]) {
    return routeAccess[pathname].includes(userRole as UserRole);
  }

  // Check for parent path matches (for nested routes)
  const pathSegments = pathname.split('/').filter(Boolean);
  for (let i = pathSegments.length; i > 0; i--) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/');
    if (routeAccess[parentPath]) {
      return routeAccess[parentPath].includes(userRole as UserRole);
    }
  }

  // Default: allow access to authenticated users for unlisted routes
  return true;
}

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Allow access to auth pages and API routes without restrictions
    if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // Redirect to signin if no token
    if (!token && pathname !== '/') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Redirect authenticated users away from auth pages
    if (token && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Check role-based access for protected routes
    if (token && token.role) {
      if (!hasRouteAccess(pathname, token.role as string)) {
        // Redirect to unauthorized page or dashboard
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to public pages
        if (pathname === '/' || pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
          return true;
        }
        
        // Require token for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
