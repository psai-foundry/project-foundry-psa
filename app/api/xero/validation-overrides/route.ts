
/**
 * Validation Override Management API
 * Phase 2B-7b: API endpoints for managing validation overrides
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AuditService from '@/lib/services/audit-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause: any = {};
    
    if (entityId) whereClause.entityId = entityId;
    if (entityType) whereClause.entityType = entityType;
    if (status) whereClause.status = status;

    const [overrides, total] = await Promise.all([
      prisma.xeroValidationOverride.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.xeroValidationOverride.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      data: overrides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('GET /api/xero/validation-overrides error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validation overrides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      entityId,
      entityType,
      overriddenRules,
      justification,
      overrideType,
      expiresAt,
      requiresApproval = false
    } = body;

    if (!entityId || !entityType || !overriddenRules || !justification) {
      return NextResponse.json(
        { error: 'Missing required fields: entityId, entityType, overriddenRules, justification' },
        { status: 400 }
      );
    }

    // Create validation override
    const override = await prisma.xeroValidationOverride.create({
      data: {
        entityId,
        entityType,
        overriddenRules,
        justification,
        overrideType: overrideType || 'TEMPORARY',
        status: requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdById: session.user.id,
        approvedById: requiresApproval ? null : session.user.id,
        approvedAt: requiresApproval ? null : new Date(),
        metadata: JSON.stringify({
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        })
      },
      include: {
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    // Comprehensive audit logging
    await AuditService.logValidationOverride({
      overrideId: override.id,
      action: 'CREATE',
      entityId,
      entityType,
      overriddenRules,
      justification,
      userId: session.user.id,
      newStatus: requiresApproval ? 'PENDING_APPROVAL' : 'ACTIVE'
    }, request);

    // Legacy audit log (keeping for compatibility)
    await prisma.xeroSyncLog.create({
      data: {
        userId: session.user.id,
        operation: 'VALIDATION_OVERRIDE_CREATED',
        entityType,
        entityId,
        status: 'SUCCESS',
        details: JSON.stringify({
          overrideId: override.id,
          overriddenRules,
          justification,
          overrideType,
          requiresApproval
        }),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: override,
      message: requiresApproval 
        ? 'Validation override created and pending approval'
        : 'Validation override created and activated'
    });

  } catch (error) {
    console.error('POST /api/xero/validation-overrides error:', error);
    return NextResponse.json(
      { error: 'Failed to create validation override' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { overrideId, action, comments } = body;

    if (!overrideId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: overrideId, action' },
        { status: 400 }
      );
    }

    const existingOverride = await prisma.xeroValidationOverride.findUnique({
      where: { id: overrideId }
    });

    if (!existingOverride) {
      return NextResponse.json(
        { error: 'Validation override not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'approve':
        if (existingOverride.status !== 'PENDING_APPROVAL') {
          return NextResponse.json(
            { error: 'Override is not pending approval' },
            { status: 400 }
          );
        }
        updateData = {
          status: 'ACTIVE',
          approvedById: session.user.id,
          approvedAt: new Date(),
          approvalComments: comments
        };
        break;

      case 'reject':
        updateData = {
          status: 'REJECTED',
          approvedById: session.user.id,
          approvedAt: new Date(),
          approvalComments: comments
        };
        break;

      case 'revoke':
        updateData = {
          status: 'REVOKED',
          revokedById: session.user.id,
          revokedAt: new Date(),
          revocationReason: comments
        };
        break;

      case 'extend':
        const { newExpiryDate } = body;
        if (!newExpiryDate) {
          return NextResponse.json(
            { error: 'newExpiryDate is required for extend action' },
            { status: 400 }
          );
        }
        updateData = {
          expiresAt: new Date(newExpiryDate),
          extensionReason: comments,
          extendedAt: new Date(),
          extendedById: session.user.id
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: approve, reject, revoke, or extend' },
          { status: 400 }
        );
    }

    const updatedOverride = await prisma.xeroValidationOverride.update({
      where: { id: overrideId },
      data: updateData,
      include: {
        createdBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } }
      }
    });

    // Create audit log
    const operationMap: Record<string, any> = {
      'approve': 'VALIDATION_OVERRIDE_APPROVED',
      'reject': 'VALIDATION_OVERRIDE_REJECTED',
      'revoke': 'VALIDATION_OVERRIDE_REVOKED',
      'extend': 'VALIDATION_OVERRIDE_EXTENDED'
    };

    await prisma.xeroSyncLog.create({
      data: {
        userId: session.user.id,
        operation: operationMap[action] || 'VALIDATION_OVERRIDE_APPROVED',
        entityType: existingOverride.entityType,
        entityId: existingOverride.entityId,
        status: 'SUCCESS',
        details: JSON.stringify({
          overrideId,
          action,
          comments,
          previousStatus: existingOverride.status
        }),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedOverride,
      message: `Validation override ${action}d successfully`
    });

  } catch (error) {
    console.error('PATCH /api/xero/validation-overrides error:', error);
    return NextResponse.json(
      { error: 'Failed to update validation override' },
      { status: 500 }
    );
  }
}
