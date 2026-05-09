/**
 * @file product.model.js
 * @description Data-access layer for the products table.
 * All queries are strictly scoped by tenant_id.
 * Stock level is NEVER updated here directly — always via stock_movements.
 */

'use strict';

const pool     = require('../config/database');
const ApiError = require('../utils/ApiError');

const createProduct = async (tenantId, userId, payload) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the product row
    const { rows: productRows } = await client.query(`
      INSERT INTO products
        (tenant_id, sku, name, description, category,
         unit_price, cost_price, reorder_level, unit_of_measure, is_tracked)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      tenantId,
      payload.sku,
      payload.name,
      payload.description   || null,
      payload.category      || null,
      payload.unitPrice,
      payload.costPrice     || 0,
      payload.reorderLevel  || 0,
      payload.unitOfMeasure || 'unit',
      payload.isTracked !== undefined ? payload.isTracked : true,
    ]);
    const product = productRows[0];

    // If an initial quantity is provided, seed it as a PurchaseReceipt movement
    if (payload.quantityOnHand > 0) {
      await client.query(`
        INSERT INTO stock_movements
          (tenant_id, product_id, movement_type, quantity_delta, quantity_after, notes, performed_by)
        VALUES ($1, $2, 'PurchaseReceipt', $3, $3, 'Initial stock on creation', $4)
      `, [tenantId, product.id, payload.quantityOnHand, userId]);
    }

    await client.query('COMMIT');

    // Re-fetch to get quantity_on_hand updated by the trigger
    const { rows: refreshed } = await client.query(
      `SELECT * FROM products WHERE id = $1`, [product.id]
    );
    return refreshed[0];
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.constraint === 'uq_product_sku_per_tenant') {
      throw new ApiError(400, `SKU "${payload.sku}" already exists for this tenant.`);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message);
  } finally {
    client.release();
  }
};

const getProducts = async (tenantId, { search, isActive, lowStock } = {}) => {
  let query  = `SELECT * FROM products WHERE tenant_id = $1`;
  const vals = [tenantId];
  let idx = 2;

  if (search) {
    query += ` AND (name ILIKE $${idx} OR sku ILIKE $${idx} OR category ILIKE $${idx})`;
    vals.push(`%${search}%`);
    idx++;
  }
  if (typeof isActive === 'boolean') {
    query += ` AND is_active = $${idx++}`;
    vals.push(isActive);
  }
  if (lowStock === true) {
    // Products at or below reorder level
    query += ` AND is_tracked = TRUE AND quantity_on_hand <= reorder_level`;
  }

  query += ` ORDER BY name ASC`;
  const { rows } = await pool.query(query, vals);
  return rows;
};

const getProductById = async (tenantId, productId) => {
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE id = $1 AND tenant_id = $2`,
    [productId, tenantId]
  );
  if (!rows.length) throw new ApiError(404, 'Product not found');
  return rows[0];
};

const updateProduct = async (tenantId, productId, payload) => {
  await getProductById(tenantId, productId); // ensure exists & belongs to tenant

  const { rows } = await pool.query(`
    UPDATE products SET
      name           = COALESCE($1, name),
      description    = COALESCE($2, description),
      category       = COALESCE($3, category),
      unit_price     = COALESCE($4, unit_price),
      cost_price     = COALESCE($5, cost_price),
      reorder_level  = COALESCE($6, reorder_level),
      unit_of_measure= COALESCE($7, unit_of_measure),
      is_tracked     = COALESCE($8, is_tracked),
      is_active      = COALESCE($9, is_active),
      updated_at     = NOW()
    WHERE id = $10 AND tenant_id = $11
    RETURNING *
  `, [
    payload.name          || null,
    payload.description   || null,
    payload.category      || null,
    payload.unitPrice     !== undefined ? payload.unitPrice    : null,
    payload.costPrice     !== undefined ? payload.costPrice    : null,
    payload.reorderLevel  !== undefined ? payload.reorderLevel : null,
    payload.unitOfMeasure || null,
    payload.isTracked     !== undefined ? payload.isTracked    : null,
    payload.isActive      !== undefined ? payload.isActive     : null,
    productId,
    tenantId,
  ]);
  return rows[0];
};

const getStockMovements = async (tenantId, productId) => {
  // Optionally validate product belongs to tenant
  await getProductById(tenantId, productId);

  const { rows } = await pool.query(`
    SELECT sm.*, u.full_name AS performed_by_name
      FROM stock_movements sm
      JOIN users u ON u.id = sm.performed_by
     WHERE sm.tenant_id = $1 AND sm.product_id = $2
     ORDER BY sm.created_at DESC
  `, [tenantId, productId]);
  return rows;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  getStockMovements,
};
