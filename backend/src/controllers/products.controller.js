/**
 * @file products.controller.js
 * @description HTTP boundary for the Product resource and stock adjustments.
 */

'use strict';

const catchAsync       = require('../utils/catchAsync');
const productModel     = require('../models/product.model');
const inventoryService = require('../services/inventory.service');

const createProduct = catchAsync(async (req, res) => {
  const product = await productModel.createProduct(req.user.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: { product } });
});

const getProducts = catchAsync(async (req, res) => {
  const { search, isActive, lowStock } = req.query;
  const products = await productModel.getProducts(req.user.tenantId, {
    search,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    lowStock:  lowStock === 'true',
  });
  res.status(200).json({ success: true, data: { products } });
});

const getProductById = catchAsync(async (req, res) => {
  const product = await productModel.getProductById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { product } });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await productModel.updateProduct(req.user.tenantId, req.params.id, req.body);
  res.status(200).json({ success: true, data: { product } });
});

/**
 * GET /products/:id/movements
 * Returns the full immutable stock movement ledger for a product.
 */
const getStockMovements = catchAsync(async (req, res) => {
  const movements = await productModel.getStockMovements(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { movements } });
});

/**
 * POST /products/adjust
 * Manually adjust stock — PurchaseReceipt, ManualAdjustment, WriteOff, Return.
 * SaleDeduction is system-only and excluded from the Zod enum intentionally.
 */
const adjustStock = catchAsync(async (req, res) => {
  const result = await inventoryService.applyManualAdjustment(
    req.user.tenantId, req.user.id, req.body
  );
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  getStockMovements,
  adjustStock,
};
