/**
 * @file customers.controller.js
 * @description HTTP boundary for the Customer resource.
 * All tenant scoping is sourced exclusively from req.user.tenantId (JWT).
 */

const catchAsync      = require('../utils/catchAsync');
const customerModel   = require('../models/customer.model');

const createCustomer = catchAsync(async (req, res) => {
  const customer = await customerModel.createCustomer(req.user.tenantId, req.body);
  res.status(201).json({ success: true, data: { customer } });
});

const getCustomers = catchAsync(async (req, res) => {
  const { search, isActive } = req.query;
  const customers = await customerModel.getCustomers(req.user.tenantId, {
    search,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  res.status(200).json({ success: true, data: { customers } });
});

const getCustomerById = catchAsync(async (req, res) => {
  const customer = await customerModel.getCustomerById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { customer } });
});

const updateCustomer = catchAsync(async (req, res) => {
  const customer = await customerModel.updateCustomer(req.user.tenantId, req.params.id, req.body);
  res.status(200).json({ success: true, data: { customer } });
});

module.exports = { createCustomer, getCustomers, getCustomerById, updateCustomer };
