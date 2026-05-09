/**
 * @file payment.model.js
 * @description Data-access layer for the payments table.
 */

'use strict';

const pool     = require('../config/database');
const ApiError = require('../utils/ApiError');

const createPayment = async (tenantId, userId, payload, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    INSERT INTO payments
      (tenant_id, entity_type, entity_id, amount, method, type, status,
       payment_date, reference_no, notes, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    tenantId,
    payload.entityType,
    payload.entityId,
    payload.amount,
    payload.method,
    payload.type,
    payload.status || 'Pending',
    payload.paymentDate,
    payload.referenceNo || null,
    payload.notes       || null,
    userId,
  ]);
  return rows[0];
};

const getPayments = async (tenantId, { entityType, entityId, status, fromDate, toDate } = {}) => {
  let query = `SELECT p.* FROM payments p WHERE p.tenant_id = $1`;
  const vals = [tenantId];
  let idx = 2;

  if (entityType) { query += ` AND p.entity_type = $${idx++}`; vals.push(entityType); }
  if (entityId)   { query += ` AND p.entity_id = $${idx++}`;   vals.push(entityId);   }
  if (status)     { query += ` AND p.status = $${idx++}`;      vals.push(status);     }
  if (fromDate)   { query += ` AND p.payment_date >= $${idx++}`; vals.push(fromDate); }
  if (toDate)     { query += ` AND p.payment_date <= $${idx++}`; vals.push(toDate);   }

  query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;
  const { rows } = await pool.query(query, vals);
  return rows;
};

const getPaymentById = async (tenantId, paymentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE id = $1 AND tenant_id = $2`,
    [paymentId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Payment not found');
  return rows[0];
};

const updatePaymentJournalEntry = async (tenantId, paymentId, column, jeId, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    UPDATE payments
       SET ${column} = $1,
           updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `, [jeId, paymentId, tenantId]);
  return rows[0];
};

const updatePaymentStatus = async (tenantId, paymentId, status, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    UPDATE payments
       SET status = $1,
           updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3
    RETURNING *
  `, [status, paymentId, tenantId]);
  return rows[0];
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePaymentJournalEntry,
  updatePaymentStatus,
};
