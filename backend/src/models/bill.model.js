/**
 * @file bill.model.js
 * @description Data-access layer for bills and bill_items tables.
 * Raw DB operations only — business logic lives in bill.service.js.
 */

'use strict';

const pool     = require('../config/database');
const ApiError = require('../utils/ApiError');

const createBill = async (tenantId, userId, payload, client) => {
  const db = client || pool;

  let bill;
  try {
    const { rows } = await db.query(`
      INSERT INTO bills
        (tenant_id, supplier_id, bill_number, supplier_ref,
         issue_date, due_date, currency_code, notes, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      tenantId,
      payload.supplierId,
      payload.billNumber,
      payload.supplierRef  || null,
      payload.issueDate,
      payload.dueDate,
      payload.currencyCode || 'USD',
      payload.notes        || null,
      payload.status       || 'Draft',
      userId,
    ]);
    bill = rows[0];
  } catch (err) {
    if (err.constraint === 'uq_bill_number_per_tenant') {
      throw new ApiError(400, `Bill number "${payload.billNumber}" already exists.`);
    }
    throw err;
  }

  // Insert line items
  const lineQuery = `
    INSERT INTO bill_items
      (tenant_id, bill_id, product_id, description, quantity, unit_cost, tax_rate, line_order)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `;
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    await db.query(lineQuery, [
      tenantId, bill.id,
      item.productId   || null,
      item.description,
      item.quantity,
      item.unitCost,
      item.taxRate     || 0,
      item.lineOrder !== undefined ? item.lineOrder : i,
    ]);
  }

  return bill;
};

const getBills = async (tenantId, { supplierId, status, fromDate, toDate } = {}) => {
  let query  = `
    SELECT b.*, s.display_name AS supplier_name
      FROM bills b
      JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.tenant_id = $1
  `;
  const vals = [tenantId];
  let idx = 2;

  if (supplierId) { query += ` AND b.supplier_id = $${idx++}`;  vals.push(supplierId); }
  if (status)     { query += ` AND b.status = $${idx++}`;       vals.push(status); }
  if (fromDate)   { query += ` AND b.issue_date >= $${idx++}`;  vals.push(fromDate); }
  if (toDate)     { query += ` AND b.issue_date <= $${idx++}`;  vals.push(toDate); }

  query += ` ORDER BY b.issue_date DESC, b.created_at DESC`;
  const { rows } = await pool.query(query, vals);
  return rows;
};

const getBillById = async (tenantId, billId) => {
  const { rows: billRows } = await pool.query(`
    SELECT b.*, s.display_name AS supplier_name, s.email AS supplier_email,
           s.billing_address AS supplier_billing_address
      FROM bills b
      JOIN suppliers s ON s.id = b.supplier_id
     WHERE b.id = $1 AND b.tenant_id = $2
  `, [billId, tenantId]);
  if (!billRows.length) throw new ApiError(404, 'Bill not found');

  const { rows: items } = await pool.query(
    `SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY line_order ASC`,
    [billId]
  );
  return { ...billRows[0], items };
};

const updateBill = async (tenantId, billId, payload, client) => {
  const db = client || pool;

  const { rows: existing } = await db.query(
    `SELECT status FROM bills WHERE id = $1 AND tenant_id = $2`,
    [billId, tenantId]
  );
  if (!existing.length) throw new ApiError(404, 'Bill not found');
  if (['Paid', 'Void'].includes(existing[0].status)) {
    throw new ApiError(400, `Cannot edit a ${existing[0].status} bill.`);
  }

  await db.query(`
    UPDATE bills SET
      issue_date   = COALESCE($1, issue_date),
      due_date     = COALESCE($2, due_date),
      supplier_ref = COALESCE($3, supplier_ref),
      notes        = COALESCE($4, notes),
      updated_at   = NOW()
    WHERE id = $5 AND tenant_id = $6
  `, [payload.issueDate || null, payload.dueDate || null,
      payload.supplierRef || null, payload.notes || null,
      billId, tenantId]);

  if (payload.items && payload.items.length) {
    await db.query(`DELETE FROM bill_items WHERE bill_id = $1`, [billId]);
    const lineQuery = `
      INSERT INTO bill_items
        (tenant_id, bill_id, product_id, description, quantity, unit_cost, tax_rate, line_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      await db.query(lineQuery, [
        tenantId, billId, item.productId || null,
        item.description, item.quantity, item.unitCost,
        item.taxRate || 0, item.lineOrder !== undefined ? item.lineOrder : i,
      ]);
    }
  }
  return getBillById(tenantId, billId);
};

const getBillStatus = async (tenantId, billId, client) => {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT status, total_amount, journal_entry_id FROM bills WHERE id = $1 AND tenant_id = $2`,
    [billId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Bill not found');
  return rows[0];
};

const setBillStatus = async (tenantId, billId, status, journalEntryId = null, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    UPDATE bills
       SET status           = $1,
           journal_entry_id = COALESCE($2, journal_entry_id),
           updated_at       = NOW()
     WHERE id = $3 AND tenant_id = $4
    RETURNING *
  `, [status, journalEntryId, billId, tenantId]);
  return rows[0];
};

module.exports = { createBill, getBills, getBillById, updateBill, getBillStatus, setBillStatus };
