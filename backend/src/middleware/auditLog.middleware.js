/**
 * @file auditLog.middleware.js
 * @description MCA-mandated tamper-evident audit trail middleware.
 *
 * The Ministry of Corporate Affairs (India) requires that accounting software:
 *  1. Log every change made to financial records
 *  2. Record WHO made the change and WHEN
 *  3. Store the state BEFORE and AFTER the change
 *  4. Make these logs immutable (append-only)
 *
 * This middleware is applied as a route-level wrapper on mutating routes.
 * It uses Prisma to write AuditLog entries directly to the SQLite database.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Creates a middleware that logs actions to the AuditLog table.
 *
 * Usage:
 *   router.post('/journals', requireAuth, auditLog('JOURNAL_ENTRY', 'CREATED'), handler);
 *
 * @param {string} entityType - e.g. 'TRANSACTION', 'JOURNAL_ENTRY', 'ACCOUNT'
 * @param {string} action     - e.g. 'CREATED', 'UPDATED', 'CANCELLED', 'POSTED'
 * @returns {Function} Express middleware
 */
const auditLog = (entityType, action) => async (req, res, next) => {
  // Capture the original json() method to intercept the response
  const originalJson = res.json.bind(res);
  const startTime = Date.now();

  res.json = async (body) => {
    // Only log successful mutations (2xx responses)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        // Extract the entity ID from response or request params
        const entityId =
          body?.data?.entry?.id  ||
          body?.data?.invoice?.id ||
          body?.data?.id          ||
          req.params?.id          ||
          'unknown';

        const organizationId = req.user?.tenantId || req.user?.organizationId;

        if (organizationId) {
          await prisma.auditLog.create({
            data: {
              entityType,
              entityId: String(entityId),
              action,
              performedBy: req.user.id || 'system',
              performedAt: new Date(),
              afterState: JSON.stringify(body?.data || null),
              ipAddress: req.ip || req.socket?.remoteAddress || null,
              userAgent: req.headers['user-agent'] || null,
              organizationId,
            },
          }).catch(err => {
            // Audit log failure should NEVER break the main operation
            console.error('[AuditLog] Failed to write audit entry:', err.message);
          });
        }
      } catch (err) {
        console.error('[AuditLog] Unexpected error:', err.message);
      }
    }

    // Call original json() to send response
    return originalJson(body);
  };

  next();
};

/**
 * Writes a manual audit entry directly (for use inside service functions).
 *
 * @param {Object} params
 * @param {string} params.organizationId
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.action
 * @param {string} params.performedBy  - userId
 * @param {any}    [params.before]     - State before change
 * @param {any}    [params.after]      - State after change
 */
const writeAuditEntry = async ({ organizationId, entityType, entityId, action, performedBy, before, after }) => {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId: String(entityId),
        action,
        performedBy: String(performedBy),
        performedAt: new Date(),
        beforeState: before ? JSON.stringify(before) : null,
        afterState:  after  ? JSON.stringify(after)  : null,
        organizationId,
      },
    });
  } catch (err) {
    // Never let audit log failure break business logic
    console.error('[AuditLog] writeAuditEntry failed:', err.message);
  }
};

module.exports = { auditLog, writeAuditEntry };
