/**
 * @file inventory.service.js
 * @description Business logic for the Inventory module.
 *
 * Stock Deduction (SaleDeduction):
 *   This is the critical integration point between AR and Inventory.
 *   Called by invoice.service.js when an invoice transitions to 'Paid'.
 *   For each invoice_item that references a tracked product:
 *     1. Validate we have sufficient quantity_on_hand.
 *     2. Insert a signed (-quantity) stock_movements row.
 *     3. The DB trigger fn_apply_stock_movement atomically decrements
 *        products.quantity_on_hand and writes the post-move snapshot.
 *
 * Manual Adjustment:
 *   TenantAdmin or Employee inserts a signed movement for corrections,
 *   write-offs, purchase receipts, and returns.
 */

'use strict';

const pool         = require('../config/database');
const productModel = require('../models/product.model');
const ApiError     = require('../utils/ApiError');

/**
 * Deducts stock for all tracked invoice_items when an invoice is paid.
 * Must be called INSIDE an existing DB transaction (pass the client).
 *
 * @param {string} tenantId
 * @param {string} invoiceId
 * @param {string} userId         - the user triggering the payment
 * @param {object} client         - pg transaction client
 */
const deductStockForInvoice = async (tenantId, invoiceId, userId, client) => {
  // Fetch all invoice items that have a linked tracked product
  const { rows: items } = await client.query(`
    SELECT ii.id AS invoice_item_id,
           ii.quantity,
           ii.product_id,
           p.name AS product_name,
           p.quantity_on_hand,
           p.is_tracked
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
     WHERE ii.invoice_id = $1
       AND ii.tenant_id  = $2
       AND ii.product_id IS NOT NULL
       AND p.is_tracked  = TRUE
  `, [invoiceId, tenantId]);

  if (!items.length) return; // no tracked products on this invoice — nothing to do

  // ── Phase 1: validate stock sufficiency for the entire invoice ────────────
  // Collect in-memory so we can give a helpful error without partial deductions
  const insufficientItems = items.filter(
    item => item.quantity_on_hand < item.quantity
  );
  if (insufficientItems.length > 0) {
    const details = insufficientItems
      .map(i => `"${i.product_name}" (need ${i.quantity}, have ${i.quantity_on_hand})`)
      .join('; ');
    throw new ApiError(
      400,
      `Insufficient stock to mark invoice as Paid. Stock shortfall: ${details}`
    );
  }

  // ── Phase 2: insert movement rows (trigger handles the actual decrement) ──
  const movementQuery = `
    INSERT INTO stock_movements
      (tenant_id, product_id, movement_type, quantity_delta,
       quantity_after, invoice_id, invoice_item_id, notes, performed_by)
    VALUES ($1, $2, 'SaleDeduction', $3, 0, $4, $5, $6, $7)
  `;
  // quantity_after is set to 0 here as a placeholder; the trigger overwrites it
  // with the real post-move value immediately after INSERT.

  for (const item of items) {
    await client.query(movementQuery, [
      tenantId,
      item.product_id,
      -item.quantity,                          // negative = stock out
      invoiceId,
      item.invoice_item_id,
      `Sale deduction — Invoice ${invoiceId}`,
      userId,
    ]);
  }
};

/**
 * Manual stock adjustment — validates product ownership then inserts movement.
 */
const applyManualAdjustment = async (tenantId, userId, payload) => {
  // Verify product belongs to tenant
  const product = await productModel.getProductById(tenantId, payload.productId);

  if (!product.is_active) {
    throw new ApiError(400, 'Cannot adjust stock on an inactive product.');
  }
  if (!product.is_tracked) {
    throw new ApiError(400, 'This product is not tracked. Enable stock tracking first.');
  }

  // Validate the resulting qty won't go negative (DB constraint covers this too,
  // but we provide a user-friendly message here)
  const resultingQty = Number(product.quantity_on_hand) + Number(payload.quantityDelta);
  if (resultingQty < 0) {
    throw new ApiError(
      400,
      `Adjustment would result in negative stock `  +
      `(current: ${product.quantity_on_hand}, delta: ${payload.quantityDelta}).`
    );
  }

  const { rows } = await pool.query(`
    INSERT INTO stock_movements
      (tenant_id, product_id, movement_type, quantity_delta, quantity_after, notes, performed_by)
    VALUES ($1, $2, $3, $4, 0, $5, $6)
    RETURNING *
  `, [
    tenantId,
    payload.productId,
    payload.movementType,
    payload.quantityDelta,
    payload.notes || null,
    userId,
  ]);

  // Return the updated product so the caller sees the new quantity immediately
  const updatedProduct = await productModel.getProductById(tenantId, payload.productId);
  return { movement: rows[0], product: updatedProduct };
};

module.exports = { deductStockForInvoice, applyManualAdjustment };
