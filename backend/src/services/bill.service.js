/**
 * @file bill.service.js
 * @description Business logic for the AP module.
 *
 * Key responsibilities:
 *  1. Orchestrate bill creation in a DB transaction.
 *  2. Enforce valid status transitions (state machine).
 *  3. On PAID transition — run three steps in ONE atomic transaction:
 *       Step A: Post GL Journal Entry  DR 5000 (COGS/Expense) / CR 2000 (AP)
 *       Step B: Receipt stock for all tracked bill_items (PurchaseReceipt)
 *       Step C: Set bill.status = 'Paid' and link journal_entry_id
 *  4. IDOR prevention: validate supplier belongs to same tenant.
 */

'use strict';

const pool            = require('../config/database');
const billModel       = require('../models/bill.model');
const supplierModel   = require('../models/supplier.model');
const ApiError        = require('../utils/ApiError');

// ── Valid status transition map ───────────────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  Draft:    new Set(['Received', 'Void']),
  Received: new Set(['Paid', 'Void']),
  Paid:     new Set([]),     // terminal
  Overdue:  new Set(['Paid', 'Void']),
  Void:     new Set([]),     // terminal
};

/**
 * Create a bill with line items inside a single DB transaction.
 */
const createBill = async (tenantId, userId, payload) => {
  // IDOR guard — ensure supplier belongs to this tenant
  await supplierModel.getSupplierById(tenantId, payload.supplierId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bill = await billModel.createBill(tenantId, userId, payload, client);
    await client.query('COMMIT');
    return billModel.getBillById(tenantId, bill.id);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Update bill header and/or items (Draft/Received only).
 */
const updateBill = async (tenantId, billId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bill = await billModel.updateBill(tenantId, billId, payload, client);
    await client.query('COMMIT');
    return bill;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Transition bill status with full business-rule enforcement.
 */
const transitionBillStatus = async (tenantId, billId, newStatus, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await billModel.getBillStatus(tenantId, billId, client);
    const allowed = ALLOWED_TRANSITIONS[current.status];

    if (!allowed || !allowed.has(newStatus)) {
      throw new ApiError(
        400,
        `Cannot transition bill from "${current.status}" to "${newStatus}".`
      );
    }

    let journalEntryId = null;

    if (newStatus === 'Paid') {
      // ── Step A: Post GL Journal Entry  DR Expense / CR Accounts Payable ──
      journalEntryId = await _postPaidJournalEntry(
        tenantId, userId, billId, current.total_amount, client
      );

      // ── Step B: Receipt stock for all tracked bill_items ─────────────────
      await _receiptStockForBill(tenantId, billId, userId, client);
    }

    // ── Step C: Persist new status ────────────────────────────────────────
    const bill = await billModel.setBillStatus(
      tenantId, billId, newStatus, journalEntryId, client
    );

    await client.query('COMMIT');
    return bill;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Private: Post the GL event for paying a supplier bill.
 *
 * Entry:
 *   DR  5000  Cost of Goods Sold / General Expenses  [total_amount]
 *   CR  2000  Accounts Payable                        [total_amount]
 */
const _postPaidJournalEntry = async (tenantId, userId, billId, totalAmount, client) => {
  const { rows: accs } = await client.query(
    `SELECT id, account_code FROM accounts
      WHERE tenant_id = $1 AND account_code IN ('2000', '5000')`,
    [tenantId]
  );

  const apAccount   = accs.find(a => a.account_code === '2000');
  const expAccount  = accs.find(a => a.account_code === '5000');

  if (!apAccount || !expAccount) {
    throw new ApiError(
      500,
      'Could not locate system GL accounts (2000 / 5000). ' +
      'Ensure Chart of Accounts was seeded during onboarding.'
    );
  }

  const entryNumber = `BILL-PMT-${billId.slice(0, 8).toUpperCase()}`;
  const today  = new Date().toISOString().split('T')[0];
  const period = today.slice(0, 7);

  const { rows: jeRows } = await client.query(`
    INSERT INTO journal_entries
      (tenant_id, entry_number, description, transaction_date, period,
       status, created_by, posted_by, posted_at)
    VALUES ($1,$2,$3,$4,$5,'Posted',$6,$6,NOW())
    RETURNING id
  `, [
    tenantId,
    entryNumber,
    `Payment to supplier for Bill (${billId})`,
    today, period, userId,
  ]);
  const jeId = jeRows[0].id;

  // DR Expense, CR Accounts Payable
  await client.query(`
    INSERT INTO journal_lines
      (tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
    VALUES
      ($1, $2, $3, $4, 0,  'Expense — Supplier bill payment', 0),
      ($1, $2, $5, 0,  $4, 'Accounts Payable — Supplier bill payment', 1)
  `, [tenantId, jeId, expAccount.id, totalAmount, apAccount.id]);

  return jeId;
};

/**
 * Private: Add stock for all tracked product bill_items via PurchaseReceipt movements.
 * Runs inside the caller's transaction — no separate BEGIN/COMMIT.
 */
const _receiptStockForBill = async (tenantId, billId, userId, client) => {
  const { rows: items } = await client.query(`
    SELECT bi.id AS bill_item_id,
           bi.quantity,
           bi.product_id,
           p.name         AS product_name,
           p.is_tracked,
           p.is_active
      FROM bill_items bi
      JOIN products p ON p.id = bi.product_id
     WHERE bi.bill_id   = $1
       AND bi.tenant_id = $2
       AND bi.product_id IS NOT NULL
       AND p.is_tracked = TRUE
  `, [billId, tenantId]);

  if (!items.length) return; // no tracked products — nothing to receipt

  for (const item of items) {
    if (!item.is_active) continue; // skip inactive products silently

    await client.query(`
      INSERT INTO stock_movements
        (tenant_id, product_id, movement_type, quantity_delta,
         quantity_after, invoice_id, invoice_item_id, notes, performed_by)
      VALUES ($1, $2, 'PurchaseReceipt', $3, 0, NULL, NULL, $4, $5)
    `, [
      tenantId,
      item.product_id,
      item.quantity,               // positive delta = stock IN
      `Stock receipt — Bill ${billId}`,
      userId,
    ]);
    // Note: invoice_id / invoice_item_id columns reused here for simplicity;
    // they are nullable so this is safe. A dedicated bill_item_id FK can be
    // added in a future migration if tighter linkage is required.
  }
};

module.exports = { createBill, updateBill, transitionBillStatus };
