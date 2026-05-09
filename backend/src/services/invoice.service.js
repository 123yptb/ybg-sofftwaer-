/**
 * @file invoice.service.js
 * @description Business logic for the AR module.
 *
 * Critical responsibilities:
 *  1. Orchestrate invoice creation inside a DB transaction.
 *  2. Handle invoice status transitions with validation of allowed moves.
 *  3. When an invoice is marked PAID, auto-generate the corresponding
 *     double-entry Journal Entry (Debit AR, Credit Sales Revenue).
 *  4. Deduct stock for all tracked products on the invoice (Phase 5 integration).
 *  5. Verify that customer_id belongs to the same tenant (IDOR prevention).
 *
 * The PAID transition runs three operations inside ONE DB transaction:
 *   Step A — Post the GL journal entry (DR AR / CR Revenue)
 *   Step B — Deduct inventory stock for all tracked line items
 *   Step C — Set invoice.status = 'Paid' + link journal_entry_id
 * Any failure rolls back all three steps atomically.
 */

'use strict';

const pool              = require('../config/database');
const invoiceModel      = require('../models/invoice.model');
const customerModel     = require('../models/customer.model');
const inventoryService  = require('./inventory.service');
const ApiError          = require('../utils/ApiError');

// ── Valid status transition map ───────────────────────────────────────────────
// Key:   current status
// Value: set of statuses that current can legally transition to
const ALLOWED_TRANSITIONS = {
  Draft:   new Set(['Sent', 'Void']),
  Sent:    new Set(['Paid', 'Void']),
  Paid:    new Set([]),          // terminal
  Overdue: new Set(['Paid', 'Void']),
  Void:    new Set([]),          // terminal
};

/**
 * Create a new invoice with line items inside a single DB transaction.
 */
const createInvoice = async (tenantId, userId, payload) => {
  // Validate customer belongs to this tenant
  await customerModel.getCustomerById(tenantId, payload.customerId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoice = await invoiceModel.createInvoice(tenantId, userId, payload, client);
    await client.query('COMMIT');
    // Re-fetch with full joins and computed totals
    return invoiceModel.getInvoiceById(tenantId, invoice.id);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Update invoice header and/or line items (Draft/Sent only).
 */
const updateInvoice = async (tenantId, invoiceId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invoice = await invoiceModel.updateInvoice(tenantId, invoiceId, payload, client);
    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Transition invoice status with full business rule enforcement.
 *
 * PAID transition:
 *  - Automatically creates a balanced Journal Entry:
 *      DEBIT  1100 (Accounts Receivable) = invoice.total_amount
 *      CREDIT 4000 (Sales Revenue)       = invoice.total_amount
 *  - Links the journal_entry_id back to the invoice row.
 *
 * VOID transition:
 *  - Sets status to Void (no further changes allowed).
 */
const transitionInvoiceStatus = async (tenantId, invoiceId, newStatus, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await invoiceModel.getInvoiceStatus(tenantId, invoiceId, client);
    const allowed = ALLOWED_TRANSITIONS[current.status];

    if (!allowed || !allowed.has(newStatus)) {
      throw new ApiError(
        400,
        `Cannot transition invoice from "${current.status}" to "${newStatus}".`
      );
    }

    let journalEntryId = null;

    if (newStatus === 'Paid') {
      // ── Step A: Post the GL journal entry (DR AR / CR Revenue) ───────────
      journalEntryId = await _postPaidJournalEntry(
        tenantId, userId, invoiceId,
        current.total_amount, client
      );

      // ── Step B: Deduct inventory stock for all tracked line items ─────────
      // deductStockForInvoice validates sufficiency BEFORE writing any movements,
      // so if any product is out of stock the whole transaction rolls back cleanly.
      await inventoryService.deductStockForInvoice(tenantId, invoiceId, userId, client);
    }

    // ── Step C: Persist the new status on the invoice ─────────────────────
    const invoice = await invoiceModel.setInvoiceStatus(
      tenantId, invoiceId, newStatus, journalEntryId, client
    );

    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

/**
 * Private helper: creates the GL journal entry for a payment receipt.
 * Looks up system accounts by code (seeded during onboarding for this tenant).
 *
 * Entry:
 *   DR  1100  Accounts Receivable   [total_amount]
 *   CR  4000  Sales Revenue         [total_amount]
 */
const _postPaidJournalEntry = async (tenantId, userId, invoiceId, totalAmount, client) => {
  // Resolve system account IDs for this tenant
  const { rows: accs } = await client.query(
    `SELECT id, account_code FROM accounts
      WHERE tenant_id = $1 AND account_code IN ('1100', '4000')`,
    [tenantId]
  );

  const arAccount  = accs.find(a => a.account_code === '1100');
  const revAccount = accs.find(a => a.account_code === '4000');

  if (!arAccount || !revAccount) {
    throw new ApiError(
      500,
      'Could not locate system GL accounts (1100 / 4000) for this tenant. ' +
      'Please ensure the Chart of Accounts was seeded during onboarding.'
    );
  }

  // Generate a unique entry number
  const entryNumber = `INV-PMT-${invoiceId.slice(0, 8).toUpperCase()}`;
  const today = new Date().toISOString().split('T')[0];
  const period = today.slice(0, 7); // YYYY-MM

  // Insert journal entry header
  const { rows: jeRows } = await client.query(`
    INSERT INTO journal_entries
      (tenant_id, entry_number, description, transaction_date, period, status, created_by, posted_by, posted_at)
    VALUES ($1, $2, $3, $4, $5, 'Posted', $6, $6, NOW())
    RETURNING id
  `, [
    tenantId,
    entryNumber,
    `Payment received for Invoice (${invoiceId})`,
    today,
    period,
    userId,
  ]);
  const jeId = jeRows[0].id;

  // Insert balancing lines
  await client.query(`
    INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
    VALUES
      ($1, $2, $3, $4, 0,  'Accounts Receivable — Invoice payment', 0),
      ($1, $2, $5, 0,  $4, 'Sales Revenue — Invoice payment',        1)
  `, [tenantId, jeId, arAccount.id, totalAmount, revAccount.id]);

  return jeId;
};

module.exports = { createInvoice, updateInvoice, transitionInvoiceStatus };
