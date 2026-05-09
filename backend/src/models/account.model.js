const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

const createAccount = async (tenantId, payload) => {
  const query = `
    INSERT INTO accounts (tenant_id, account_code, name, type, sub_type, description, parent_account_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    tenantId,
    payload.accountCode,
    payload.name,
    payload.type,
    payload.subType || null,
    payload.description || null,
    payload.parentAccountId || null,
  ];
  
  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    if (error.constraint === 'uq_accounts_code_per_tenant') {
      throw new ApiError(400, `Account code ${payload.accountCode} already exists for this tenant.`);
    }
    throw error;
  }
};

const getAccounts = async (tenantId) => {
  const query = `SELECT * FROM accounts WHERE tenant_id = $1 ORDER BY account_code ASC`;
  const { rows } = await pool.query(query, [tenantId]);
  return rows;
};

const updateAccount = async (tenantId, accountId, payload) => {
  const checks = `SELECT is_system_account FROM accounts WHERE id = $1 AND tenant_id = $2`;
  const { rows: checkRows } = await pool.query(checks, [accountId, tenantId]);
  
  if (!checkRows.length) {
    throw new ApiError(404, 'Account not found');
  }

  // System accounts should be generally immutable in name/type to avoid breaking reporting
  if (checkRows[0].is_system_account && payload.name) {
      throw new ApiError(403, 'Cannot rename a core system account.');
  }

  const query = `
    UPDATE accounts 
    SET name = COALESCE($1, name),
        sub_type = COALESCE($2, sub_type),
        description = COALESCE($3, description),
        updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5
    RETURNING *;
  `;
  const values = [payload.name, payload.subType, payload.description, accountId, tenantId];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

module.exports = { createAccount, getAccounts, updateAccount };
