/**
 * @file invoice.model.js
 * @description Data-access layer for invoices and invoice_items tables.
 * Handles raw DB operations only — business logic lives in invoice.service.js.
 */

const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Create invoice header + lines inside an existing DB transaction client.
 */
const createInvoice = async (tenantId, userId, payload, client) => {
  const db = client || pool;

  // Insert header
  const headerQuery = `
    INSERT INTO invoices
      (tenant_id, customer_id, invoice_number, issue_date, due_date,
       currency_code, notes, status, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  let invoice;
  try {
    const { rows } = await db.query(headerQuery, [
      tenantId,
      payload.customerId,
      payload.invoiceNumber,
      payload.issueDate,
      payload.dueDate,
      payload.currencyCode || 'USD',
      payload.notes        || null,
      payload.status       || 'Draft',
      userId,
    ]);
    invoice = rows[0];
  } catch (err) {
    if (err.constraint === 'uq_invoice_number_per_tenant') {
      throw new ApiError(400, `Invoice number "${payload.invoiceNumber}" already exists.`);
    }
    throw err;
  }

  // Insert line items
  const lineQuery = `
    INSERT INTO invoice_items
      (tenant_id, invoice_id, product_id, description, quantity, unit_price, tax_rate, line_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    await db.query(lineQuery, [
      tenantId,
      invoice.id,
      item.productId  || null,
      item.description,
      item.quantity,
      item.unitPrice,
      item.taxRate    || 0,
      item.lineOrder !== undefined ? item.lineOrder : i,
    ]);
  }

  return invoice;
};

/**
 * List invoices for a tenant, with optional filters.
 */
const getInvoices = async (tenantId, { customerId, status, fromDate, toDate } = {}) => {
  let query  = `
    SELECT i.*, c.display_name AS customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
     WHERE i.tenant_id = $1
  `;
  const values = [tenantId];
  let idx = 2;

  if (customerId) { query += ` AND i.customer_id = $${idx++}`;    values.push(customerId); }
  if (status)     { query += ` AND i.status = $${idx++}`;         values.push(status); }
  if (fromDate)   { query += ` AND i.issue_date >= $${idx++}`;    values.push(fromDate); }
  if (toDate)     { query += ` AND i.issue_date <= $${idx++}`;    values.push(toDate); }

  query += ` ORDER BY i.issue_date DESC, i.created_at DESC`;

  const { rows } = await pool.query(query, values);
  return rows;
};

/**
 * Get an invoice with its full line items.
 */
const getInvoiceById = async (tenantId, invoiceId) => {
  const { rows: invoiceRows } = await pool.query(
    `SELECT i.*, c.display_name AS customer_name, c.email AS customer_email,
            c.billing_address AS customer_billing_address
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1 AND i.tenant_id = $2`,
    [invoiceId, tenantId]
  );
  if (!invoiceRows.length) throw new ApiError(404, 'Invoice not found');

  const { rows: items } = await pool.query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_order ASC`,
    [invoiceId]
  );

  return { ...invoiceRows[0], items };
};

/**
 * Update mutable invoice fields (only allowed on Draft/Sent invoices).
 * This replaces line items entirely to keep logic clean.
 */
const updateInvoice = async (tenantId, invoiceId, payload, client) => {
  const db = client || pool;

  const { rows: existing } = await db.query(
    `SELECT status FROM invoices WHERE id = $1 AND tenant_id = $2`,
    [invoiceId, tenantId]
  );
  if (!existing.length) throw new ApiError(404, 'Invoice not found');
  if (['Paid', 'Void'].includes(existing[0].status)) {
    throw new ApiError(400, `Cannot edit a ${existing[0].status} invoice.`);
  }

  // Update header
  await db.query(`
    UPDATE invoices SET
      issue_date = COALESCE($1, issue_date),
      due_date   = COALESCE($2, due_date),
      notes      = COALESCE($3, notes),
      updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
  `, [payload.issueDate || null, payload.dueDate || null, payload.notes || null, invoiceId, tenantId]);

  // If items supplied: delete old lines, insert fresh (totals recomputed by trigger)
  if (payload.items && payload.items.length) {
    await db.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
    const lineQuery = `
      INSERT INTO invoice_items
        (tenant_id, invoice_id, product_id, description, quantity, unit_price, tax_rate, line_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      await db.query(lineQuery, [
        tenantId, invoiceId, item.productId || null, item.description,
        item.quantity, item.unitPrice, item.taxRate || 0,
        item.lineOrder !== undefined ? item.lineOrder : i,
      ]);
    }
  }

  return getInvoiceById(tenantId, invoiceId);
};

/**
 * Return the raw status of an invoice (used internally by service layer).
 */
const getInvoiceStatus = async (tenantId, invoiceId, client) => {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT status, total_amount, journal_entry_id FROM invoices WHERE id = $1 AND tenant_id = $2`,
    [invoiceId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Invoice not found');
  return rows[0];
};

/**
 * Directly update status and optional journal_entry_id (used by service layer).
 */
const setInvoiceStatus = async (tenantId, invoiceId, status, journalEntryId = null, client) => {
  const db = client || pool;
  const { rows } = await db.query(`
    UPDATE invoices
       SET status           = $1,
           journal_entry_id = COALESCE($2, journal_entry_id),
           updated_at       = NOW()
     WHERE id = $3 AND tenant_id = $4
    RETURNING *
  `, [status, journalEntryId, invoiceId, tenantId]);
  return rows[0];
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  getInvoiceStatus,
  setInvoiceStatus,
};
