/**
 * @file payments.controller.js
 */

'use strict';

const catchAsync     = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');
const paymentModel   = require('../models/payment.model');

const recordPayment = catchAsync(async (req, res) => {
  const payment = await paymentService.recordPayment(req.user.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: { payment } });
});

const getPayments = catchAsync(async (req, res) => {
  const { entityType, entityId, status, fromDate, toDate } = req.query;
  const payments = await paymentModel.getPayments(req.user.tenantId, {
    entityType, entityId, status, fromDate, toDate
  });
  res.status(200).json({ success: true, data: { payments } });
});

const getPaymentById = catchAsync(async (req, res) => {
  const payment = await paymentModel.getPaymentById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { payment } });
});

const verifyCheque = catchAsync(async (req, res) => {
  const payment = await paymentService.verifyCheque(req.user.tenantId, req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, data: { payment } });
});

module.exports = { recordPayment, getPayments, getPaymentById, verifyCheque };
