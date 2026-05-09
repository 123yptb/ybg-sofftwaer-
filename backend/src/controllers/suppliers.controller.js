/**
 * @file suppliers.controller.js
 */
'use strict';

const catchAsync      = require('../utils/catchAsync');
const supplierModel   = require('../models/supplier.model');

const createSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierModel.createSupplier(req.user.tenantId, req.body);
  res.status(201).json({ success: true, data: { supplier } });
});

const getSuppliers = catchAsync(async (req, res) => {
  const { search, isActive } = req.query;
  const suppliers = await supplierModel.getSuppliers(req.user.tenantId, {
    search,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  res.status(200).json({ success: true, data: { suppliers } });
});

const getSupplierById = catchAsync(async (req, res) => {
  const supplier = await supplierModel.getSupplierById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { supplier } });
});

const updateSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierModel.updateSupplier(req.user.tenantId, req.params.id, req.body);
  res.status(200).json({ success: true, data: { supplier } });
});

module.exports = { createSupplier, getSuppliers, getSupplierById, updateSupplier };
