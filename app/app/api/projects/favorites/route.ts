
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects/favorites - Get user's favorite projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's time patterns to identify frequently used projects
    const timePatterns = await prisma.timePattern.findMany({
      where: {
        userId: session.user.id,
        frequency: { gt: 2 }, // Used more than twice
      },
      include: {
        project: {
          include: {
            client: true,
            tasks: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS'],
                },
              },
              orderBy: { name: 'asc' },
            },
          },
        },
        task: true,
      },
      orderBy: [
        { frequency: 'desc' },
        { lastUsed: 'desc' },
      ],
    });

    // Get recent projects (last 30 days)
    const recentProjects = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        projectId: true,
        project: {
          include: {
            client: true,
            tasks: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS'],
                },
              },
              orderBy: { name: 'asc' },
            },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Create project frequency map
    const projectFrequency = recentProjects.reduce((acc, entry) => {
      acc[entry.projectId] = (acc[entry.projectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get unique recent projects with frequency
    const uniqueRecentProjects = recentProjects
      .reduce((acc, entry) => {
        if (!acc.find(p => p.projectId === entry.projectId)) {
          acc.push({
            ...entry,
            frequency: projectFrequency[entry.projectId],
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => b.frequency - a.frequency);

    // Combine pattern-based and recent projects
    const favoriteProjects = [];
    const projectIds = new Set();

    // Add pattern-based favorites
    for (const pattern of timePatterns) {
      if (pattern.project && !projectIds.has(pattern.project.id)) {
        favoriteProjects.push({
          ...pattern.project,
          favoriteReason: 'frequent_pattern',
          frequency: pattern.frequency,
          lastUsed: pattern.lastUsed,
          confidence: pattern.confidence,
        });
        projectIds.add(pattern.project.id);
      }
    }

    // Add recent favorites
    for (const recentProject of uniqueRecentProjects.slice(0, 5)) {
      if (!projectIds.has(recentProject.projectId)) {
        favoriteProjects.push({
          ...recentProject.project,
          favoriteReason: 'recent_activity',
          frequency: recentProject.frequency,
          lastUsed: recentProject.createdAt,
          confidence: Math.min(recentProject.frequency / 10, 1.0),
        });
        projectIds.add(recentProject.projectId);
      }
    }

    // Sort by confidence/frequency
    favoriteProjects.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });

    return NextResponse.json({
      data: favoriteProjects.slice(0, 10), // Top 10 favorites
      summary: {
        totalFavorites: favoriteProjects.length,
        patternBased: timePatterns.length,
        recentBased: uniqueRecentProjects.length,
      },
    });
  } catch (error) {
    console.error('Error fetching favorite projects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
