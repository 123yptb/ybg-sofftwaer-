/**
 * @file customer.model.js
 * @description Data-access layer for the customers table.
 * Every query is strictly scoped to the calling tenant_id.
 */

const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * Create a new customer for a tenant.
 */
const createCustomer = async (tenantId, payload) => {
  const query = `
    INSERT INTO customers
      (tenant_id, display_name, company_name, email, phone,
       billing_address, shipping_address, currency_code, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    tenantId,
    payload.displayName,
    payload.companyName    || null,
    payload.email          || null,
    payload.phone          || null,
    payload.billingAddress  ? JSON.stringify(payload.billingAddress)  : null,
    payload.shippingAddress ? JSON.stringify(payload.shippingAddress) : null,
    payload.currencyCode   || null,
    payload.notes          || null,
  ]);
  return rows[0];
};

/**
 * List all active customers for a tenant, with optional search by name/email.
 */
const getCustomers = async (tenantId, { search, isActive } = {}) => {
  let query  = `SELECT * FROM customers WHERE tenant_id = $1`;
  const values = [tenantId];
  let idx = 2;

  if (search) {
    query += ` AND (display_name ILIKE $${idx} OR email ILIKE $${idx} OR company_name ILIKE $${idx})`;
    values.push(`%${search}%`);
    idx++;
  }
  if (typeof isActive === 'boolean') {
    query += ` AND is_active = $${idx}`;
    values.push(isActive);
    idx++;
  }
  query += ` ORDER BY display_name ASC`;

  const { rows } = await pool.query(query, values);
  return rows;
};

/**
 * Get a single customer by ID, scoped to the tenant.
 */
const getCustomerById = async (tenantId, customerId) => {
  const { rows } = await pool.query(
    `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2`,
    [customerId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Customer not found');
  return rows[0];
};

/**
 * Update mutable customer fields.
 */
const updateCustomer = async (tenantId, customerId, payload) => {
  const existing = await getCustomerById(tenantId, customerId);
  const query = `
    UPDATE customers SET
      display_name     = COALESCE($1, display_name),
      company_name     = COALESCE($2, company_name),
      email            = COALESCE($3, email),
      phone            = COALESCE($4, phone),
      billing_address  = COALESCE($5::jsonb, billing_address),
      shipping_address = COALESCE($6::jsonb, shipping_address),
      notes            = COALESCE($7, notes),
      is_active        = COALESCE($8, is_active),
      updated_at       = NOW()
    WHERE id = $9 AND tenant_id = $10
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    payload.displayName     || null,
    payload.companyName     || null,
    payload.email           || null,
    payload.phone           || null,
    payload.billingAddress  ? JSON.stringify(payload.billingAddress)  : null,
    payload.shippingAddress ? JSON.stringify(payload.shippingAddress) : null,
    payload.notes           || null,
    payload.isActive        !== undefined ? payload.isActive : null,
    customerId,
    tenantId,
  ]);
  return rows[0];
};

module.exports = { createCustomer, getCustomers, getCustomerById, updateCustomer };
