

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from '@/lib/permissions';

// GET /api/projects/hierarchical - Get projects in hierarchical structure with proper role-based access
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = searchParams.get('search');

    const userRole = session.user.role as UserRole;

    // Build where clause based on user role and permissions
    const where: any = {};
    
    if (!includeInactive) {
      where.status = 'ACTIVE';
    }

    // **FIX #1: Proper role-based project access based on permissions, not just assignments**
    const projectAccessFilter = (() => {
      // Full access roles (can see all projects)
      if (hasPermission(userRole, Permission.VIEW_ALL_PROJECTS)) {
        return {}; // No restrictions - can see all projects
      }
      
      // Assigned project access roles (can see assigned projects)
      if (hasPermission(userRole, Permission.VIEW_ASSIGNED_PROJECTS)) {
        return {
          OR: [
            // Projects user is assigned to
            {
              assignments: {
                some: {
                  userId: session.user.id,
                },
              },
            },
            // Projects where user is a team member (broader access)
            {
              client: {
                projects: {
                  some: {
                    assignments: {
                      some: {
                        userId: session.user.id,
                      },
                    },
                  },
                },
              },
            },
            // **FIX #2: Allow consultants to see active projects they can potentially work on**
            ...(userRole === UserRole.SENIOR_CONSULTANT || userRole === UserRole.JUNIOR_CONSULTANT || userRole === UserRole.CONTRACTOR ? [{
              status: 'ACTIVE',
              // Additional criteria for consultant access could be added here
            }] : []),
          ],
        };
      }

      // Client users - can only see their organization's projects
      if (userRole === UserRole.CLIENT_USER) {
        return {
          client: {
            // Assuming client users are linked to specific clients
            users: {
              some: {
                id: session.user.id,
              },
            },
          },
        };
      }

      // Default: no access
      return { id: 'never-match' };
    })();

    // Merge access filter with existing where clause
    Object.assign(where, projectAccessFilter);

    // Add search filter if provided
    if (search) {
      const searchConditions = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };

      if (where.OR) {
        // If we already have OR conditions from access control, wrap them
        where.AND = [
          { OR: where.OR },
          searchConditions,
        ];
        delete where.OR;
      } else {
        Object.assign(where, searchConditions);
      }
    }

    // Get all portfolios with proper access control
    const portfolios = await prisma.portfolio.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        programs: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            projects: {
              where,
              include: {
                client: true,
                assignments: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                      },
                    },
                  },
                },
                tasks: {
                  where: {
                    status: {
                      in: ['OPEN', 'IN_PROGRESS'],
                    },
                  },
                  orderBy: { name: 'asc' },
                },
                _count: {
                  select: {
                    timeEntries: true,
                    tasks: true,
                  },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        projects: {
          where: {
            ...where,
            programId: null, // Projects directly under portfolio
          },
          include: {
            client: true,
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
            tasks: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS'],
                },
              },
              orderBy: { name: 'asc' },
            },
            _count: {
              select: {
                timeEntries: true,
                tasks: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get projects not assigned to any portfolio
    const orphanProjects = await prisma.project.findMany({
      where: {
        ...where,
        portfolioId: null,
      },
      include: {
        client: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS'],
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            timeEntries: true,
            tasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Structure the hierarchical data
    const hierarchicalStructure = {
      portfolios: portfolios.map(portfolio => ({
        ...portfolio,
        type: 'portfolio',
        programs: portfolio.programs.map(program => ({
          ...program,
          type: 'program',
          projects: program.projects.map(project => ({
            ...project,
            type: 'project',
          })),
        })),
        projects: portfolio.projects.map(project => ({
          ...project,
          type: 'project',
        })),
      })),
      orphanProjects: orphanProjects.map(project => ({
        ...project,
        type: 'project',
      })),
    };

    // Get summary statistics
    const allProjects = [
      ...portfolios.flatMap(p => [...p.projects, ...p.programs.flatMap(pr => pr.projects)]),
      ...orphanProjects,
    ];

    const summary = {
      totalPortfolios: portfolios.length,
      totalPrograms: portfolios.reduce((sum, p) => sum + p.programs.length, 0),
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === 'ACTIVE').length,
      totalTasks: allProjects.reduce((sum, p) => sum + p._count.tasks, 0),
      totalTimeEntries: allProjects.reduce((sum, p) => sum + p._count.timeEntries, 0),
      userRole: userRole,
      hasFullAccess: hasPermission(userRole, Permission.VIEW_ALL_PROJECTS),
    };

    return NextResponse.json({
      data: hierarchicalStructure,
      summary,
    });
  } catch (error) {
    console.error('Error fetching hierarchical projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

