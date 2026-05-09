/**
 * @file invoices.controller.js
 * @description HTTP boundary for the Invoice resource.
 * Delegates all business logic to invoice.service.js.
 * Status transitions have their own dedicated endpoint to
 * keep CRUD and state-machine concerns cleanly separated.
 */

const catchAsync        = require('../utils/catchAsync');
const invoiceService    = require('../services/invoice.service');
const invoiceModel      = require('../models/invoice.model');

const createInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.createInvoice(
    req.user.tenantId, req.user.id, req.body
  );
  res.status(201).json({ success: true, data: { invoice } });
});

const getInvoices = catchAsync(async (req, res) => {
  const { customerId, status, fromDate, toDate } = req.query;
  const invoices = await invoiceModel.getInvoices(req.user.tenantId, {
    customerId, status, fromDate, toDate,
  });
  res.status(200).json({ success: true, data: { invoices } });
});

const getInvoiceById = catchAsync(async (req, res) => {
  const invoice = await invoiceModel.getInvoiceById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { invoice } });
});

const updateInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.updateInvoice(
    req.user.tenantId, req.params.id, req.body
  );
  res.status(200).json({ success: true, data: { invoice } });
});

/**
 * PATCH /invoices/:id/status
 * Dedicated endpoint for status transitions. Keeps mutation of
 * content-fields separate from state-machine transitions.
 */
const updateInvoiceStatus = catchAsync(async (req, res) => {
  const invoice = await invoiceService.transitionInvoiceStatus(
    req.user.tenantId, req.params.id, req.body.status, req.user.id
  );
  res.status(200).json({ success: true, data: { invoice } });
});

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus,
};
