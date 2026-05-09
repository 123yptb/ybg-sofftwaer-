/**
 * @file reports.controller.js
 * @description HTTP boundary for all financial reports.
 *
 * Every handler:
 *  - Reads tenantId exclusively from req.user.tenantId (JWT).
 *  - Validates date parameters via the validate middleware before reaching here.
 *  - Returns a consistent JSON envelope: { success, report: <name>, data: {...} }
 *  - Sets Cache-Control headers to prevent browsers caching financial reports.
 */

'use strict';

const catchAsync     = require('../utils/catchAsync');
const reportsService = require('../services/reports.service');

// Prevent financial reports from being cached in browsers or CDNs
const NO_CACHE = 'no-store, no-cache, must-revalidate, private';

const getTrialBalance = catchAsync(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const data = await reportsService.getTrialBalance(req.user.tenantId, fromDate, toDate);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'trial_balance', data });
});

const getProfitAndLoss = catchAsync(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const data = await reportsService.getProfitAndLoss(req.user.tenantId, fromDate, toDate);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'profit_and_loss', data });
});

const getBalanceSheet = catchAsync(async (req, res) => {
  const { asOfDate } = req.query;
  const data = await reportsService.getBalanceSheet(req.user.tenantId, asOfDate);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'balance_sheet', data });
});

const getArAging = catchAsync(async (req, res) => {
  const asOfDate = req.query.asOfDate || new Date().toISOString().split('T')[0];
  const data = await reportsService.getArAging(req.user.tenantId, asOfDate);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'ar_aging', data });
});

const getApAging = catchAsync(async (req, res) => {
  const asOfDate = req.query.asOfDate || new Date().toISOString().split('T')[0];
  const data = await reportsService.getApAging(req.user.tenantId, asOfDate);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'ap_aging', data });
});

const getGeneralLedgerDetail = catchAsync(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const { accountId } = req.params;
  const data = await reportsService.getGeneralLedgerDetail(
    req.user.tenantId, accountId, fromDate, toDate
  );
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'gl_detail', data });
});

const getLowStockReport = catchAsync(async (req, res) => {
  const data = await reportsService.getLowStockReport(req.user.tenantId);
  res.set('Cache-Control', NO_CACHE);
  res.status(200).json({ success: true, report: 'low_stock', data });
});

module.exports = {
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getArAging,
  getApAging,
  getGeneralLedgerDetail,
  getLowStockReport,
};
