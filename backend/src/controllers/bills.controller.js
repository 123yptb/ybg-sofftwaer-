/**
 * @file bills.controller.js
 */
'use strict';

const catchAsync  = require('../utils/catchAsync');
const billService = require('../services/bill.service');
const billModel   = require('../models/bill.model');

const createBill = catchAsync(async (req, res) => {
  const bill = await billService.createBill(req.user.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: { bill } });
});

const getBills = catchAsync(async (req, res) => {
  const { supplierId, status, fromDate, toDate } = req.query;
  const bills = await billModel.getBills(req.user.tenantId, {
    supplierId, status, fromDate, toDate,
  });
  res.status(200).json({ success: true, data: { bills } });
});

const getBillById = catchAsync(async (req, res) => {
  const bill = await billModel.getBillById(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { bill } });
});

const updateBill = catchAsync(async (req, res) => {
  const bill = await billService.updateBill(req.user.tenantId, req.params.id, req.body);
  res.status(200).json({ success: true, data: { bill } });
});

const updateBillStatus = catchAsync(async (req, res) => {
  const bill = await billService.transitionBillStatus(
    req.user.tenantId, req.params.id, req.body.status, req.user.id
  );
  res.status(200).json({ success: true, data: { bill } });
});

module.exports = { createBill, getBills, getBillById, updateBill, updateBillStatus };
