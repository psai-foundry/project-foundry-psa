

/**
 * Alert Rule Management API Routes
 * Phase 2B-8c: Automated Alerting System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { AlertCondition, AlertSeverity } from '@prisma/client';

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metricType: z.string().min(1).optional(),
  condition: z.nativeEnum(AlertCondition).optional(),
  threshold: z.number().optional(),
  timeWindow: z.number().min(1).optional(),
  severity: z.nativeEnum(AlertSeverity).optional(),
  suppressDuration: z.number().optional(),
  notificationChannels: z.array(z.object({
    type: z.enum(['email', 'webhook', 'in_app', 'slack']),
    config: z.record(z.any())
  })).optional(),
  isActive: z.boolean().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rule = await prisma.alertRule.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        alerts: {
          select: {
            id: true,
            severity: true,
            status: true,
            title: true,
            createdAt: true,
            metricValue: true,
            threshold: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!rule) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Alert rule GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rule' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateRuleSchema.parse(body);

    const rule = await prisma.alertRule.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Alert rule PUT API error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || !['ADMIN', 'PARTNER', 'PRINCIPAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await prisma.alertRule.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alert rule DELETE API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}

