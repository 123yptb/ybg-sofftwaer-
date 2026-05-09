/**
 * @file reports.service.js
 * @description Financial reporting engine.
 *
 * All reports are strictly tenant-scoped via the tenantId parameter.
 * These are read-only analytical queries — no data is mutated.
 *
 * Reports:
 *  1. Trial Balance            — all accounts, period-filtered GL activity
 *  2. Profit & Loss            — Revenue vs Expenses for a date range
 *  3. Balance Sheet            — Assets / Liabilities / Equity at a point in time
 *  4. AR Aging                 — Outstanding invoices bucketed by overdue days
 *  5. AP Aging                 — Outstanding bills bucketed by overdue days
 *  6. General Ledger Detail    — Every posted journal line per account
 *  7. Low Stock                — Products at or below their reorder level
 */

'use strict';

const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRIAL BALANCE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns every account with:
 *   - opening_debit / opening_credit  (journal lines BEFORE fromDate)
 *   - period_debit  / period_credit   (journal lines within the date range)
 *   - closing balance computed per standard accounting convention
 *
 * @param {string} tenantId
 * @param {string} fromDate  - YYYY-MM-DD (start of reporting period)
 * @param {string} toDate    - YYYY-MM-DD (end of reporting period)
 */
const getTrialBalance = async (tenantId, fromDate, toDate) => {
  const { rows } = await pool.query(`
    WITH period_activity AS (
      SELECT
        jl.account_id,
        SUM(jl.debit_amount)  FILTER (WHERE je.transaction_date >= $2 AND je.transaction_date <= $3) AS period_debit,
        SUM(jl.credit_amount) FILTER (WHERE je.transaction_date >= $2 AND je.transaction_date <= $3) AS period_credit,
        SUM(jl.debit_amount)  FILTER (WHERE je.transaction_date < $2)  AS opening_debit,
        SUM(jl.credit_amount) FILTER (WHERE je.transaction_date < $2)  AS opening_credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE jl.tenant_id = $1
        AND je.tenant_id = $1
        AND je.status    = 'Posted'
        AND je.transaction_date <= $3
      GROUP BY jl.account_id
    )
    SELECT
      a.id                                         AS account_id,
      a.account_code,
      a.name                                       AS account_name,
      a.type                                       AS account_type,
      a.sub_type,
      COALESCE(pa.opening_debit,  0)               AS opening_debit,
      COALESCE(pa.opening_credit, 0)               AS opening_credit,
      COALESCE(pa.period_debit,   0)               AS period_debit,
      COALESCE(pa.period_credit,  0)               AS period_credit,
      -- Closing balance follows normal-balance convention:
      -- Assets/Expenses: DR increases balance → closing = openingDR - openingCR + periodDR - periodCR
      -- Liabilities/Equity/Revenue: CR increases balance → closing = openingCR - openingDR + periodCR - periodDR
      CASE WHEN a.type IN ('Asset', 'Expense') THEN
        (COALESCE(pa.opening_debit, 0) - COALESCE(pa.opening_credit, 0))
        + (COALESCE(pa.period_debit, 0) - COALESCE(pa.period_credit, 0))
      ELSE
        (COALESCE(pa.opening_credit, 0) - COALESCE(pa.opening_debit, 0))
        + (COALESCE(pa.period_credit, 0) - COALESCE(pa.period_debit, 0))
      END                                          AS closing_balance
    FROM accounts a
    LEFT JOIN period_activity pa ON pa.account_id = a.id
    WHERE a.tenant_id = $1
      AND a.is_active = TRUE
    ORDER BY a.account_code ASC
  `, [tenantId, fromDate, toDate]);

  // Compute report-level totals for the response footer
  const totals = rows.reduce((acc, r) => {
    acc.totalPeriodDebit  += Number(r.period_debit);
    acc.totalPeriodCredit += Number(r.period_credit);
    return acc;
  }, { totalPeriodDebit: 0, totalPeriodCredit: 0 });

  return {
    fromDate, toDate,
    accounts: rows,
    totals: {
      totalPeriodDebit:  totals.totalPeriodDebit.toFixed(4),
      totalPeriodCredit: totals.totalPeriodCredit.toFixed(4),
      isBalanced: totals.totalPeriodDebit.toFixed(4) === totals.totalPeriodCredit.toFixed(4),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROFIT & LOSS (Income Statement)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Aggregates Revenue and Expense accounts for the period.
 * Net Profit = Total Revenue − Total Expenses
 */
const getProfitAndLoss = async (tenantId, fromDate, toDate) => {
  const { rows } = await pool.query(`
    SELECT
      a.account_code,
      a.name        AS account_name,
      a.type        AS account_type,
      a.sub_type,
      -- Revenue accounts: CR increases balance
      -- Expense accounts: DR increases balance
      CASE WHEN a.type = 'Revenue' THEN
        SUM(jl.credit_amount) - SUM(jl.debit_amount)
      ELSE
        SUM(jl.debit_amount)  - SUM(jl.credit_amount)
      END           AS amount
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a         ON a.id  = jl.account_id
    WHERE jl.tenant_id = $1
      AND je.tenant_id = $1
      AND je.status    = 'Posted'
      AND a.type      IN ('Revenue', 'Expense')
      AND je.transaction_date BETWEEN $2 AND $3
    GROUP BY a.id, a.account_code, a.name, a.type, a.sub_type
    ORDER BY a.type DESC, a.account_code ASC
  `, [tenantId, fromDate, toDate]);

  const revenue  = rows.filter(r => r.account_type === 'Revenue');
  const expenses = rows.filter(r => r.account_type === 'Expense');

  const totalRevenue  = revenue.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);

  return {
    fromDate, toDate,
    revenue:  { accounts: revenue,  total: totalRevenue.toFixed(4) },
    expenses: { accounts: expenses, total: totalExpenses.toFixed(4) },
    netProfit: (totalRevenue - totalExpenses).toFixed(4),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. BALANCE SHEET
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Snapshot of Assets, Liabilities, and Equity as of asOfDate.
 * The fundamental equation: Assets = Liabilities + Equity
 */
const getBalanceSheet = async (tenantId, asOfDate) => {
  const { rows } = await pool.query(`
    SELECT
      a.account_code,
      a.name      AS account_name,
      a.type      AS account_type,
      a.sub_type,
      CASE WHEN a.type = 'Asset' THEN
        SUM(jl.debit_amount)  - SUM(jl.credit_amount)
      ELSE
        SUM(jl.credit_amount) - SUM(jl.debit_amount)
      END         AS balance
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a         ON a.id  = jl.account_id
    WHERE jl.tenant_id = $1
      AND je.tenant_id = $1
      AND je.status    = 'Posted'
      AND a.type      IN ('Asset', 'Liability', 'Equity')
      AND je.transaction_date <= $2
    GROUP BY a.id, a.account_code, a.name, a.type, a.sub_type
    ORDER BY a.type ASC, a.account_code ASC
  `, [tenantId, asOfDate]);

  const grouped = { Asset: [], Liability: [], Equity: [] };
  for (const row of rows) grouped[row.account_type]?.push(row);

  const totalAssets      = grouped.Asset.reduce((s, r) => s + Number(r.balance), 0);
  const totalLiabilities = grouped.Liability.reduce((s, r) => s + Number(r.balance), 0);
  const totalEquity      = grouped.Equity.reduce((s, r) => s + Number(r.balance), 0);

  return {
    asOfDate,
    assets:      { accounts: grouped.Asset,     total: totalAssets.toFixed(4) },
    liabilities: { accounts: grouped.Liability, total: totalLiabilities.toFixed(4) },
    equity:      { accounts: grouped.Equity,    total: totalEquity.toFixed(4) },
    check: {
      // Must be 0 — if not, there is an unbalanced journal entry somewhere
      difference: (totalAssets - totalLiabilities - totalEquity).toFixed(4),
      isBalanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. AR AGING REPORT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Groups outstanding invoices into age buckets based on how many days
 * past due they are relative to asOfDate.
 *
 * Buckets:  Current (not yet due)
 *           1–30 days overdue
 *           31–60 days overdue
 *           61–90 days overdue
 *           90+  days overdue
 */
const getArAging = async (tenantId, asOfDate) => {
  const { rows } = await pool.query(`
    SELECT
      i.id                                                      AS invoice_id,
      i.invoice_number,
      i.issue_date,
      i.due_date,
      i.total_amount,
      i.amount_due,
      i.currency_code,
      c.display_name                                            AS customer_name,
      ($1::date - i.due_date)                                   AS days_overdue,
      CASE
        WHEN ($1::date - i.due_date) <= 0   THEN 'Current'
        WHEN ($1::date - i.due_date) <= 30  THEN '1-30 Days'
        WHEN ($1::date - i.due_date) <= 60  THEN '31-60 Days'
        WHEN ($1::date - i.due_date) <= 90  THEN '61-90 Days'
        ELSE '90+ Days'
      END                                                       AS aging_bucket
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.tenant_id = $2
      AND i.status NOT IN ('Paid', 'Void')
      AND i.amount_due > 0
    ORDER BY days_overdue DESC, c.display_name ASC
  `, [asOfDate, tenantId]);

  // Aggregate by bucket
  const buckets = {};
  for (const row of rows) {
    if (!buckets[row.aging_bucket]) {
      buckets[row.aging_bucket] = { invoices: [], total: 0 };
    }
    buckets[row.aging_bucket].invoices.push(row);
    buckets[row.aging_bucket].total += Number(row.amount_due);
  }
  // Format totals
  for (const b of Object.values(buckets)) {
    b.total = b.total.toFixed(4);
  }

  const grandTotal = rows.reduce((s, r) => s + Number(r.amount_due), 0);
  return { asOfDate, buckets, grandTotal: grandTotal.toFixed(4) };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. AP AGING REPORT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Same structure as AR Aging but for outstanding supplier bills.
 */
const getApAging = async (tenantId, asOfDate) => {
  const { rows } = await pool.query(`
    SELECT
      b.id                                                      AS bill_id,
      b.bill_number,
      b.issue_date,
      b.due_date,
      b.total_amount,
      b.amount_due,
      b.currency_code,
      s.display_name                                            AS supplier_name,
      ($1::date - b.due_date)                                   AS days_overdue,
      CASE
        WHEN ($1::date - b.due_date) <= 0   THEN 'Current'
        WHEN ($1::date - b.due_date) <= 30  THEN '1-30 Days'
        WHEN ($1::date - b.due_date) <= 60  THEN '31-60 Days'
        WHEN ($1::date - b.due_date) <= 90  THEN '61-90 Days'
        ELSE '90+ Days'
      END                                                       AS aging_bucket
    FROM bills b
    JOIN suppliers s ON s.id = b.supplier_id
    WHERE b.tenant_id = $2
      AND b.status NOT IN ('Paid', 'Void')
      AND b.amount_due > 0
    ORDER BY days_overdue DESC, s.display_name ASC
  `, [asOfDate, tenantId]);

  const buckets = {};
  for (const row of rows) {
    if (!buckets[row.aging_bucket]) {
      buckets[row.aging_bucket] = { bills: [], total: 0 };
    }
    buckets[row.aging_bucket].bills.push(row);
    buckets[row.aging_bucket].total += Number(row.amount_due);
  }
  for (const b of Object.values(buckets)) {
    b.total = b.total.toFixed(4);
  }

  const grandTotal = rows.reduce((s, r) => s + Number(r.amount_due), 0);
  return { asOfDate, buckets, grandTotal: grandTotal.toFixed(4) };
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. GENERAL LEDGER DETAIL (Account Ledger / T-Account)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns every posted journal line for a specific account within a date range,
 * with a running balance column — effectively a bank statement / ledger card.
 */
const getGeneralLedgerDetail = async (tenantId, accountId, fromDate, toDate) => {
  // Opening balance: sum of all posted lines BEFORE fromDate
  const { rows: openingRows } = await pool.query(`
    SELECT
      a.type,
      COALESCE(SUM(jl.debit_amount), 0)  AS total_debit,
      COALESCE(SUM(jl.credit_amount), 0) AS total_credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a         ON a.id  = jl.account_id
    WHERE jl.tenant_id   = $1
      AND jl.account_id  = $2
      AND je.status      = 'Posted'
      AND je.transaction_date < $3
    GROUP BY a.type
  `, [tenantId, accountId, fromDate]);

  let openingBalance = 0;
  if (openingRows.length) {
    const { type, total_debit, total_credit } = openingRows[0];
    openingBalance = ['Asset', 'Expense'].includes(type)
      ? Number(total_debit) - Number(total_credit)
      : Number(total_credit) - Number(total_debit);
  }

  // Period lines
  const { rows: lines } = await pool.query(`
    SELECT
      je.transaction_date,
      je.entry_number,
      je.description        AS entry_description,
      jl.memo,
      jl.debit_amount,
      jl.credit_amount
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.tenant_id  = $1
      AND jl.account_id = $2
      AND je.status     = 'Posted'
      AND je.transaction_date BETWEEN $3 AND $4
    ORDER BY je.transaction_date ASC, je.created_at ASC
  `, [tenantId, accountId, fromDate, toDate]);

  // Compute running balance for each line
  let runningBalance = openingBalance;
  const linesWithBalance = lines.map(line => {
    // Direction depends on account type (resolved from opening query)
    const accountType = openingRows[0]?.type;
    if (['Asset', 'Expense'].includes(accountType)) {
      runningBalance += Number(line.debit_amount) - Number(line.credit_amount);
    } else {
      runningBalance += Number(line.credit_amount) - Number(line.debit_amount);
    }
    return { ...line, running_balance: runningBalance.toFixed(4) };
  });

  return {
    fromDate,
    toDate,
    accountId,
    openingBalance: openingBalance.toFixed(4),
    lines: linesWithBalance,
    closingBalance: runningBalance.toFixed(4),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. LOW STOCK REPORT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns all tracked active products where quantity_on_hand <= reorder_level.
 * Sorted by urgency (most deficit first).
 */
const getLowStockReport = async (tenantId) => {
  const { rows } = await pool.query(`
    SELECT
      id,
      sku,
      name,
      category,
      unit_of_measure,
      quantity_on_hand,
      reorder_level,
      unit_price,
      (reorder_level - quantity_on_hand) AS stock_deficit
    FROM products
    WHERE tenant_id  = $1
      AND is_tracked = TRUE
      AND is_active  = TRUE
      AND quantity_on_hand <= reorder_level
    ORDER BY stock_deficit DESC, name ASC
  `, [tenantId]);

  return {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    products: rows,
  };
};

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getArAging,
  getApAging,
  getGeneralLedgerDetail,
  getLowStockReport,
};
