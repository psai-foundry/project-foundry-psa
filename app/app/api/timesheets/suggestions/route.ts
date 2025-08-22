
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

// GET /api/timesheets/suggestions - Get AI-powered time entry suggestions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const context = searchParams.get('context'); // 'morning', 'afternoon', 'evening'

    // Get user's AI preferences
    const aiPreferences = await prisma.aIPreference.findUnique({
      where: { userId: session.user.id },
    });

    if (!aiPreferences?.enableSuggestions) {
      return NextResponse.json({ 
        data: { 
          suggestions: [],
          message: 'AI suggestions are disabled' 
        } 
      });
    }

    // Get user's recent patterns
    const patterns = await prisma.timePattern.findMany({
      where: {
        userId: session.user.id,
        confidence: { gt: 0.3 }, // Only confident patterns
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
      orderBy: [
        { confidence: 'desc' },
        { frequency: 'desc' },
        { lastUsed: 'desc' },
      ],
      take: 10,
    });

    // Get recent time entries for context
    const recentEntries = await prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: subDays(new Date(), 30), // Last 30 days
        },
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        task: true,
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    // Get current day of week and time context
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const currentHour = new Date().getHours();
    
    let timeOfDay = context || 'morning';
    if (!context) {
      if (currentHour >= 12 && currentHour < 17) timeOfDay = 'afternoon';
      else if (currentHour >= 17) timeOfDay = 'evening';
    }

    // Generate suggestions based on patterns
    const suggestions = await generateSuggestions(
      patterns,
      recentEntries,
      dayOfWeek,
      timeOfDay,
      session.user.id
    );

    return NextResponse.json({
      data: {
        suggestions,
        patterns: patterns.length,
        recentEntries: recentEntries.length,
        context: {
          date,
          dayOfWeek,
          timeOfDay,
        },
      },
    });
  } catch (error) {
    console.error('Error generating time entry suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate AI suggestions
async function generateSuggestions(
  patterns: any[],
  recentEntries: any[],
  dayOfWeek: number,
  timeOfDay: string,
  userId: string
) {
  const suggestions: any[] = [];

  // Pattern-based suggestions
  for (const pattern of patterns) {
    if (pattern.dayOfWeek === dayOfWeek || pattern.timeOfDay === timeOfDay) {
      suggestions.push({
        type: 'pattern',
        confidence: pattern.confidence,
        project: pattern.project,
        task: pattern.task,
        suggestedDuration: pattern.duration,
        description: `Based on your ${pattern.patternType.toLowerCase()} pattern`,
        metadata: {
          patternType: pattern.patternType,
          frequency: pattern.frequency,
          lastUsed: pattern.lastUsed,
        },
      });
    }
  }

  // Recent project suggestions
  const projectFrequency = recentEntries.reduce((acc, entry) => {
    const key = entry.projectId;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topProjects = Object.entries(projectFrequency)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5);

  for (const [projectId, frequency] of topProjects) {
    const projectEntries = recentEntries.filter(e => e.projectId === projectId);
    const avgDuration = projectEntries.reduce((sum, e) => sum + e.duration, 0) / projectEntries.length;
    const project = projectEntries[0].project;

    suggestions.push({
      type: 'recent_project',
      confidence: Math.min((frequency as number) / 10, 1.0),
      project,
      task: null,
      suggestedDuration: Math.round(avgDuration * 10) / 10,
      description: `Recently worked on this project ${frequency} times`,
      metadata: {
        frequency,
        avgDuration,
        lastEntry: projectEntries[0].date,
      },
    });
  }

  // Task-based suggestions
  const taskFrequency = recentEntries
    .filter(e => e.task)
    .reduce((acc, entry) => {
      const key = `${entry.projectId}-${entry.taskId}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topTasks = Object.entries(taskFrequency)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  for (const [taskKey, frequency] of topTasks) {
    const taskEntries = recentEntries.filter(e => 
      e.task && `${e.projectId}-${e.taskId}` === taskKey
    );
    const avgDuration = taskEntries.reduce((sum, e) => sum + e.duration, 0) / taskEntries.length;
    const entry = taskEntries[0];

    suggestions.push({
      type: 'recent_task',
      confidence: Math.min((frequency as number) / 5, 1.0),
      project: entry.project,
      task: entry.task,
      suggestedDuration: Math.round(avgDuration * 10) / 10,
      description: `Recently worked on this task ${frequency} times`,
      metadata: {
        frequency,
        avgDuration,
        lastEntry: entry.date,
      },
    });
  }

  // Sort suggestions by confidence and limit
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)
    .map((suggestion, index) => ({
      ...suggestion,
      id: `suggestion-${index}`,
      rank: index + 1,
    }));
}
