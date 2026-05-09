const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

const createJournalEntry = async (tenantId, userId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create entry
    const entryQuery = `
      INSERT INTO journal_entries (tenant_id, entry_number, description, transaction_date, period, status, created_by, posted_by, posted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const isPosted = payload.status === 'Posted';
    
    let entryRow;
    try {
      const { rows } = await client.query(entryQuery, [
        tenantId,
        payload.entryNumber,
        payload.description,
        payload.transactionDate,
        payload.period,
        payload.status,
        userId,
        isPosted ? userId : null,
        isPosted ? new Date() : null,
      ]);
      entryRow = rows[0];
    } catch (err) {
      if (err.constraint === 'uq_journal_entry_number_per_tenant') {
         throw new ApiError(400, `Journal Entry number ${payload.entryNumber} already exists`);
      }
      throw err;
    }

    // 2. Validate accounts belong to tenant
    const accountIds = payload.lines.map(l => l.accountId);
    const uniqueAccountIds = [...new Set(accountIds)];
    const { rowCount } = await client.query(
      `SELECT id FROM accounts WHERE tenant_id = $1 AND id = ANY($2)`, 
      [tenantId, uniqueAccountIds]
    );
    if (rowCount !== uniqueAccountIds.length) {
      throw new ApiError(400, 'One or more account IDs do not exist or belong to a different tenant.');
    }

    // 3. Create lines
    const lineQuery = `
      INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit_amount, credit_amount, memo, line_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    for (let i = 0; i < payload.lines.length; i++) {
       const line = payload.lines[i];
       await client.query(lineQuery, [
         tenantId,
         entryRow.id,
         line.accountId,
         line.debitAmount,
         line.creditAmount,
         line.memo || null,
         i
       ]);
    }
    // Note: The SQL trigger trg_check_journal_balance will run automatically here for 'Posted' entries

    await client.query('COMMIT');
    return entryRow;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    // Catch the Postgres trigger error and map it to ApiError
    if (error.message.includes('Double-entry imbalance')) {
        throw new ApiError(400, error.message);
    }
    throw new ApiError(500, error.message);
  } finally {
    client.release();
  }
};

const getJournalEntries = async (tenantId, period) => {
  let query = `SELECT * FROM journal_entries WHERE tenant_id = $1`;
  const values = [tenantId];
  if (period) {
     query += ` AND period = $2`;
     values.push(period);
  }
  query += ` ORDER BY transaction_date DESC, created_at DESC`;
  const { rows } = await pool.query(query, values);
  return rows;
};

const getJournalEntryWithLines = async (tenantId, entryId) => {
  const { rows: entries } = await pool.query(`SELECT * FROM journal_entries WHERE id = $1 AND tenant_id = $2`, [entryId, tenantId]);
  if (!entries.length) throw new ApiError(404, 'Journal entry not found');

  const { rows: lines } = await pool.query(`
    SELECT jl.*, a.account_code, a.name as account_name 
    FROM journal_lines jl
    JOIN accounts a ON a.id = jl.account_id
    WHERE jl.journal_entry_id = $1 
    ORDER BY jl.line_order ASC`, [entryId]);
    
  return { ...entries[0], lines };
};

const updateStatus = async (tenantId, entryId, status, userId) => {
   const client = await pool.connect();
   try {
      await client.query('BEGIN');
      const { rows } = await client.query(`SELECT status FROM journal_entries WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, [entryId, tenantId]);
      if (!rows.length) throw new ApiError(404, 'Journal entry not found');
      
      const currentStatus = rows[0].status;
      if (currentStatus === status) {
         throw new ApiError(400, `Entry is already ${status}`);
      }
      if (currentStatus === 'Void') {
         throw new ApiError(400, 'Cannot modify a voided entry');
      }

      let updateQ = `UPDATE journal_entries SET status = $1`;
      let values = [status];
      
      if (status === 'Posted') {
          updateQ += `, posted_by = $2, posted_at = NOW() `;
          values.push(userId);
      } else if (status === 'Void') {
          updateQ += `, voided_by = $2, voided_at = NOW() `;
          values.push(userId);
      }
      
      updateQ += ` WHERE id = $${values.length + 1} AND tenant_id = $${values.length + 2} RETURNING *`;
      values.push(entryId, tenantId);
      
      // If updating to Posted, enforce DB checks manually here or via another method since the trigger fires on lines
      if (status === 'Posted') {
          const { rows: totals } = await client.query(`
            SELECT COALESCE(SUM(debit_amount), 0) as dev, COALESCE(SUM(credit_amount), 0) as crd 
            FROM journal_lines WHERE journal_entry_id = $1`, [entryId]
          );
          if (totals[0].dev !== totals[0].crd) {
             throw new ApiError(400, 'Cannot post unbalanced journal entry.');
          }
      }

      const { rows: updatedRows } = await client.query(updateQ, values);
      
      // If status === 'Void', standard practice might require reversing entries.
      // For this Phase, we limit to the direct state change. Custom balance adjustments can be handled in upper layers.

      await client.query('COMMIT');
      return updatedRows[0];
   } catch (err) {
      await client.query('ROLLBACK');
      throw err;
   } finally {
      client.release();
   }
};

module.exports = { createJournalEntry, getJournalEntries, getJournalEntryWithLines, updateStatus };
