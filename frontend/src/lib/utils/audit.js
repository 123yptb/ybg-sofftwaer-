import prisma from '../prisma';
import { auth } from '@/auth';

/**
 * Logs an activity into the AuditLog table for MCA compliance.
 * @param {Object} params
 * @param {string} params.entityType - TRANSACTION | JOURNAL_ENTRY | ACCOUNT | INVOICE | CONTACT
 * @param {string} params.entityId - Unique ID of the record being changed
 * @param {string} params.action - CREATED | UPDATED | CANCELLED | REVERSED | POSTED
 * @param {Object} [params.beforeState] - Optional snapshot of the record before the change
 * @param {Object} [params.afterState] - Optional snapshot of the record after the change
 * @param {string} [params.organizationId] - Optional organization ID
 * @param {string} [params.userId] - Optional user ID (if omitted, will call auth())
 * @param {Object} [params.tx] - Optional Prisma transaction client
 */
export async function logActivity({ 
  entityType, 
  entityId, 
  action, 
  beforeState, 
  afterState, 
  organizationId,
  userId,
  tx
}) {
  let finalUserId = userId;
  let finalOrgId = organizationId;

  if (!finalUserId || !finalOrgId) {
    const session = await auth();
    finalUserId = finalUserId || session?.user?.id || 'system';
    finalOrgId = finalOrgId || session?.user?.organizationId;
  }

  if (!finalOrgId) {
    console.error('Audit Log failed: No organizationId provided for financial log.');
    return;
  }

  const dbClient = tx || prisma;

  try {
    await dbClient.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        performedBy: finalUserId,
        beforeState: beforeState ? JSON.stringify(beforeState) : null,
        afterState: afterState ? JSON.stringify(afterState) : null,
        organizationId: finalOrgId,
      }
    });
  } catch (error) {
    console.error('Failed to write Audit Log:', error);
    // Don't throw error here to avoid blocking the main transaction if logging fails
  }
}
