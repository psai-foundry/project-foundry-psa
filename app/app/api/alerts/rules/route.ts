

/**
 * Alert Rules API Routes
 * Phase 2B-8c: Automated Alerting System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { alertEngine } from '@/lib/services/alert-engine';
import { AlertCondition, AlertSeverity } from '@prisma/client';
import { z } from 'zod';

const alertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  metricType: z.string().min(1, 'Metric type is required'),
  condition: z.nativeEnum(AlertCondition),
  threshold: z.number(),
  timeWindow: z.number().min(1, 'Time window must be at least 1 minute'),
  severity: z.nativeEnum(AlertSeverity),
  suppressDuration: z.number().default(60),
  notificationChannels: z.array(z.object({
    type: z.enum(['email', 'webhook', 'in_app', 'slack']),
    config: z.record(z.any())
  })).default([]),
  isActive: z.boolean().default(true)
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    const where = includeInactive ? {} : { isActive: true };

    const rules = await prisma.alertRule.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { alerts: true }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Alert rules API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'MANAGER', 'PARTNER', 'PRINCIPAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = alertRuleSchema.parse(body);

    const alertRule = await prisma.alertRule.create({
      data: {
        ...validatedData,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ rule: alertRule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Alert rules POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}

