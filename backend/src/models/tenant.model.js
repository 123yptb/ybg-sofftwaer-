const pool = require('../config/database');

const createTenant = async ({ companyName, companyEmail, currencyCode }, client = pool) => {
  const query = `
    INSERT INTO tenants (company_name, company_email, currency_code)
    VALUES ($1, $2, COALESCE($3, 'USD'))
    RETURNING id, company_name, company_email, currency_code, is_active, created_at;
  `;
  const values = [companyName, companyEmail, currencyCode];
  const { rows } = await client.query(query, values);
  return rows[0];
};

const getTenantByEmail = async (companyEmail, client = pool) => {
  const query = `SELECT id FROM tenants WHERE company_email = $1`;
  const { rows } = await client.query(query, [companyEmail]);
  return rows[0];
};

module.exports = { createTenant, getTenantByEmail };
