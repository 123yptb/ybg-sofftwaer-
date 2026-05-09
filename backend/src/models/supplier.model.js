/**
 * @file supplier.model.js
 * @description Data-access layer for the suppliers table.
 * Strictly tenant-scoped on every query.
 */

'use strict';

const pool     = require('../config/database');
const ApiError = require('../utils/ApiError');

const createSupplier = async (tenantId, payload) => {
  const { rows } = await pool.query(`
    INSERT INTO suppliers
      (tenant_id, display_name, company_name, email, phone,
       billing_address, currency_code, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `, [
    tenantId,
    payload.displayName,
    payload.companyName    || null,
    payload.email          || null,
    payload.phone          || null,
    payload.billingAddress ? JSON.stringify(payload.billingAddress) : null,
    payload.currencyCode   || null,
    payload.notes          || null,
  ]);
  return rows[0];
};

const getSuppliers = async (tenantId, { search, isActive } = {}) => {
  let query  = `SELECT * FROM suppliers WHERE tenant_id = $1`;
  const vals = [tenantId];
  let idx = 2;

  if (search) {
    query += ` AND (display_name ILIKE $${idx} OR email ILIKE $${idx} OR company_name ILIKE $${idx})`;
    vals.push(`%${search}%`); idx++;
  }
  if (typeof isActive === 'boolean') {
    query += ` AND is_active = $${idx++}`;
    vals.push(isActive);
  }
  query += ` ORDER BY display_name ASC`;
  const { rows } = await pool.query(query, vals);
  return rows;
};

const getSupplierById = async (tenantId, supplierId) => {
  const { rows } = await pool.query(
    `SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2`,
    [supplierId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Supplier not found');
  return rows[0];
};

const updateSupplier = async (tenantId, supplierId, payload) => {
  await getSupplierById(tenantId, supplierId);
  const { rows } = await pool.query(`
    UPDATE suppliers SET
      display_name    = COALESCE($1, display_name),
      company_name    = COALESCE($2, company_name),
      email           = COALESCE($3, email),
      phone           = COALESCE($4, phone),
      billing_address = COALESCE($5::jsonb, billing_address),
      notes           = COALESCE($6, notes),
      is_active       = COALESCE($7, is_active),
      updated_at      = NOW()
    WHERE id = $8 AND tenant_id = $9
    RETURNING *
  `, [
    payload.displayName    || null,
    payload.companyName    || null,
    payload.email          || null,
    payload.phone          || null,
    payload.billingAddress ? JSON.stringify(payload.billingAddress) : null,
    payload.notes          || null,
    payload.isActive       !== undefined ? payload.isActive : null,
    supplierId,
    tenantId,
  ]);
  return rows[0];
};

module.exports = { createSupplier, getSuppliers, getSupplierById, updateSupplier };
