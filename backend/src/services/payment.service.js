/**
 * @file payment.service.js
 * @description Logic for Cash & Bank transactions and Cheque Lifecycle.
 */

'use strict';

const pool          = require('../config/database');
const paymentModel  = require('../models/payment.model');
const chequeModel   = require('../models/cheque.model');
const customerModel = require('../models/customer.model');
const supplierModel = require('../models/supplier.model');
const ApiError      = require('../utils/ApiError');

/**
 * Records a new payment or receipt.
 * Handles double-entry posting based on method (Cash vs Cheque).
 */
const recordPayment = async (tenantId, userId, payload) => {
  // 1. Validate entity existence
  if (payload.entityType === 'Customer') {
    await customerModel.getCustomerById(tenantId, payload.entityId);
  } else if (payload.entityType === 'Supplier') {
    await supplierModel.getSupplierById(tenantId, payload.entityId);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Create payment record
    const status = payload.method === 'Cheque' ? 'Pending' : 'Cleared';
    const payment = await paymentModel.createPayment(tenantId, userId, { ...payload, status }, client);

    // 3. Create cheque metadata if needed
    if (payload.method === 'Cheque') {
      await chequeModel.createCheque(tenantId, payment.id, payload.chequeDetails, client);
    }

    // 4. Post initial Journal Entry
    const jeId = await _postInitialJournalEntry(tenantId, userId, payment, payload, client);
    await paymentModel.updatePaymentJournalEntry(tenantId, payment.id, 'journal_entry_id', jeId, client);

    await client.query('COMMIT');
    return paymentModel.getPaymentById(tenantId, payment.id);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'Failed to record payment: ' + err.message);
  } finally {
    client.release();
  }
};

/**
 * Clears (Verifies) a pending cheque.
 * Moves funds from Cheques in Hand to Bank.
 */
const verifyCheque = async (tenantId, userId, paymentId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const payment = await paymentModel.getPaymentById(tenantId, paymentId);
    if (payment.method !== 'Cheque') throw new ApiError(400, 'Only cheque payments can be verified');
    if (payment.status !== 'Pending') throw new ApiError(400, `Cannot verify a ${payment.status} cheque`);

    const cheque = await chequeModel.getChequeByPaymentId(tenantId, paymentId);

    // 1. Update status
    await paymentModel.updatePaymentStatus(tenantId, paymentId, payload.status || 'Cleared', client);
    if (payload.status !== 'Returned') {
       await chequeModel.updateClearingDate(tenantId, paymentId, payload.clearingDate, client);
    }

    // 2. Post Clearance Journal Entry if successful
    if (payload.status === 'Cleared' || !payload.status) {
      const jeId = await _postClearanceJournalEntry(tenantId, userId, payment, cheque, payload, client);
      await paymentModel.updatePaymentJournalEntry(tenantId, payment.id, 'clearance_journal_entry_id', jeId, client);
    }

    await client.query('COMMIT');
    return paymentModel.getPaymentById(tenantId, paymentId);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, 'Failed to verify cheque: ' + err.message);
  } finally {
    client.release();
  }
};

/**
 * Internal: Posts the initial accounting event.
 * 
 * Logic for Receipt (Customer):
 *   DR  [1000 - Bank] OR [1050 - Cheques in Hand]
 *   CR  [1100 - Accounts Receivable]
 */
const _postInitialJournalEntry = async (tenantId, userId, payment, payload, client) => {
  const accountsNeeded = ['1100', '1000', '1050', '2000'];
  const { rows: accs } = await client.query(
    `SELECT id, account_code FROM accounts WHERE tenant_id = $1 AND account_code = ANY($2::varchar[])`,
    [tenantId, accountsNeeded]
  );
  
  const getAccId = code => accs.find(a => a.account_code === code)?.id;
  
  let debitAccId, creditAccId;
  let memo = `${payment.type} via ${payment.method} - Ref: ${payment.reference_no || 'NA'}`;

  if (payment.type === 'Receipt') {
    creditAccId = getAccId('1100'); // AR
    debitAccId  = payment.method === 'Cheque' ? getAccId('1050') : getAccId('1000');
  } else {
    // Payment
    debitAccId  = getAccId('2000'); // AP
    creditAccId = getAccId('1000'); // Bank (Simple direct payment for now)
  }

  if (!debitAccId || !creditAccId) throw new ApiError(500, 'System accounts not found. Ensure CoA is seeded.');

  // Create JE
  const { rows: jeRows } = await client.query(`
    INSERT INTO journal_entries (tenant_id, entry_number, description, transaction_date, period, status, created_by, posted_by, posted_at)
    VALUES ($1, $2, $3, $4, $5, 'Posted', $6, $6, NOW())
    RETURNING id
  `, [
    tenantId,
    `PMT-${payment.id.slice(0,8).toUpperCase()}`,
    memo,
    payment.payment_date,
    payment.payment_date.toISOString().slice(0, 7),
    userId
  ]);
  const jeId = jeRows[0].id;

  await client.query(`
    INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
    VALUES
      ($1, $2, $3, $4, 0,  $5, 0),
      ($1, $2, $6, 0,  $4, $5, 1)
  `, [tenantId, jeId, debitAccId, payment.amount, memo, creditAccId]);

  return jeId;
};

/**
 * Internal: Posts the Clearance event.
 * 
 * Logic:
 *   DR [1000 - Bank]
 *   CR [1050 - Cheques in Hand]
 */
const _postClearanceJournalEntry = async (tenantId, userId, payment, cheque, payload, client) => {
  const { rows: accs } = await client.query(
    `SELECT id, account_code FROM accounts WHERE tenant_id = $1 AND account_code IN ('1000', '1050')`,
    [tenantId]
  );
  
  const bankAccId   = accs.find(a => a.account_code === '1000')?.id;
  const clearingAccId = accs.find(a => a.account_code === '1050')?.id;
  
  if (!bankAccId || !clearingAccId) throw new ApiError(500, 'Bank or Clearing accounts not found.');

  const memo = `Clearance: Cheque #${cheque.cheque_no} - ${cheque.bank_name}`;

  const { rows: jeRows } = await client.query(`
    INSERT INTO journal_entries (tenant_id, entry_number, description, transaction_date, period, status, created_by, posted_by, posted_at)
    VALUES ($1, $2, $3, $4, $5, 'Posted', $6, $6, NOW())
    RETURNING id
  `, [
    tenantId,
    `CLR-${cheque.id.slice(0,8).toUpperCase()}`,
    memo,
    payload.clearingDate,
    payload.clearingDate.slice(0, 7),
    userId
  ]);
  const jeId = jeRows[0].id;

  await client.query(`
    INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
    VALUES
      ($1, $2, $3, $4, 0,  $5, 0),
      ($1, $2, $6, 0,  $4, $5, 1)
  `, [tenantId, jeId, bankAccId, payment.amount, memo, clearingAccId]);

  return jeId;
};

module.exports = { recordPayment, verifyCheque };
