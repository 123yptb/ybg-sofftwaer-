const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { createTenant, getTenantByEmail } = require('../models/tenant.model');
const { createUser, getUserByEmail } = require('../models/user.model');
const ApiError = require('../utils/ApiError');

/**
 * Inserts the default Chart of Accounts for a new tenant.
 */
const insertDefaultChartOfAccounts = async (tenantId, client) => {
  const defaultAccounts = [
    // 1xxx Assets
    { code: '1000', name: 'Cash', type: 'Asset', subType: 'Bank', isSystem: true },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', subType: 'Current Asset', isSystem: true },
    { code: '1050', name: 'Cheques in Hand', type: 'Asset', subType: 'Current Asset', isSystem: true },
    { code: '1200', name: 'Inventory', type: 'Asset', subType: 'Current Asset', isSystem: true },
    // 2xxx Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'Liability', subType: 'Current Liability', isSystem: true },
    { code: '2100', name: 'Sales Tax Payable', type: 'Liability', subType: 'Current Liability', isSystem: true },
    // 3xxx Equity
    { code: '3000', name: 'Owner Equity', type: 'Equity', subType: 'Equity', isSystem: true },
    { code: '3100', name: 'Retained Earnings', type: 'Equity', subType: 'Equity', isSystem: true },
    // 4xxx Revenue
    { code: '4000', name: 'Sales Revenue', type: 'Revenue', subType: 'Income', isSystem: true },
    // 5xxx Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', subType: 'COGS', isSystem: true },
    { code: '5100', name: 'General Expenses', type: 'Expense', subType: 'Operating Expense', isSystem: true },
    { code: '5200', name: 'Payroll Expense', type: 'Expense', subType: 'Operating Expense', isSystem: true },
  ];

  for (const acc of defaultAccounts) {
    await client.query(`
      INSERT INTO accounts (tenant_id, account_code, name, type, sub_type, is_system_account)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, acc.code, acc.name, acc.type, acc.subType, acc.isSystem]);
  }
};

/**
 * Registers a new tenant and sets up the TenantAdmin user
 */
const registerNewTenant = async (data) => {
  // Use a transaction since we are touching multiple tables: tenants, users, accounts
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Uniqueness checks
    const existingTenant = await getTenantByEmail(data.companyEmail, client);
    if (existingTenant) {
      throw new ApiError(400, 'Company email is already registered.');
    }

    const existingUser = await getUserByEmail(data.email, client);
    if (existingUser) {
      throw new ApiError(400, 'User email is already registered.');
    }

    // 2. Create the tenant
    const tenant = await createTenant({
      companyName: data.companyName,
      companyEmail: data.companyEmail,
      currencyCode: data.currencyCode,
    }, client);

    // 3. Hash password and create TenantAdmin user
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);
    
    const user = await createUser({
      tenantId: tenant.id,
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: 'TenantAdmin',
    }, client);

    // 4. Seed default Chart of Accounts
    await insertDefaultChartOfAccounts(tenant.id, client);

    await client.query('COMMIT');

    return { tenant, user };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to register tenant: ' + error.message);
  } finally {
    client.release();
  }
};

module.exports = { registerNewTenant, insertDefaultChartOfAccounts };
