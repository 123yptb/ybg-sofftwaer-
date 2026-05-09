/**
 * @file cheque.model.js
 * @description Data-access layer for the cheques table.
 */

'use strict';

const pool     = require('../config/database');
const ApiError = require('../utils/ApiError');

const createCheque = async (tenantId, paymentId, payload, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    INSERT INTO cheques
      (tenant_id, payment_id, cheque_no, bank_name, branch, cheque_date, maturity_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    tenantId,
    paymentId,
    payload.chequeNo,
    payload.bankName,
    payload.branch || null,
    payload.chequeDate,
    payload.maturityDate,
  ]);
  return rows[0];
};

const getCheques = async (tenantId, { status, fromMaturity, toMaturity } = {}) => {
  // Join with payments to get amount and entity details
  let query = `
    SELECT c.*, p.amount, p.entity_type, p.entity_id, p.status as payment_status
      FROM cheques c
      JOIN payments p ON p.id = c.payment_id
     WHERE c.tenant_id = $1
  `;
  const vals = [tenantId];
  let idx = 2;

  if (status)       { query += ` AND p.status = $${idx++}`;       vals.push(status);       }
  if (fromMaturity) { query += ` AND c.maturity_date >= $${idx++}`; vals.push(fromMaturity); }
  if (toMaturity)   { query += ` AND c.maturity_date <= $${idx++}`; vals.push(toMaturity);   }

  query += ` ORDER BY c.maturity_date ASC`;
  const { rows } = await pool.query(query, vals);
  return rows;
};

const getChequeByPaymentId = async (tenantId, paymentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM cheques WHERE payment_id = $1 AND tenant_id = $2`,
    [paymentId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Cheque metadata not found for this payment');
  return rows[0];
};

const updateClearingDate = async (tenantId, paymentId, clearingDate, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    UPDATE cheques
       SET clearing_date = $1,
           updated_at    = NOW()
     WHERE payment_id = $2 AND tenant_id = $3
    RETURNING *
  `, [clearingDate, paymentId, tenantId]);
  return rows[0];
};

module.exports = {
  createCheque,
  getCheques,
  getChequeByPaymentId,
  updateClearingDate,
};
