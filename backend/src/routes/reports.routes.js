/**
 * @file reports.routes.js
 * @description Read-only reporting endpoints.
 *
 * All routes:
 *  - Require authentication (requireAuth).
 *  - TenantAdmin and Employee can view all reports.
 *  - SuperAdmin does NOT have access here (uses their own admin panel later).
 *
 * Endpoints:
 *  GET /reports/trial-balance?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 *  GET /reports/profit-and-loss?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 *  GET /reports/balance-sheet?asOfDate=YYYY-MM-DD
 *  GET /reports/ar-aging?asOfDate=YYYY-MM-DD         (defaults to today)
 *  GET /reports/ap-aging?asOfDate=YYYY-MM-DD         (defaults to today)
 *  GET /reports/gl/:accountId?fromDate=...&toDate=...
 *  GET /reports/low-stock
 */

const express            = require('express');
const reportsController  = require('../controllers/reports.controller');
const { requireAuth }    = require('../middleware/auth.middleware');
const validate           = require('../middleware/validate.middleware');
const {
  dateRangeSchema,
  asOfDateSchema,
  glDetailSchema,
} = require('../validations/reports.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/trial-balance',   validate(dateRangeSchema), reportsController.getTrialBalance);
router.get('/profit-and-loss', validate(dateRangeSchema), reportsController.getProfitAndLoss);
router.get('/balance-sheet',   validate(asOfDateSchema),  reportsController.getBalanceSheet);
router.get('/ar-aging',        reportsController.getArAging);    // asOfDate optional, defaults to today
router.get('/ap-aging',        reportsController.getApAging);    // asOfDate optional, defaults to today
router.get('/gl/:accountId',   validate(glDetailSchema),  reportsController.getGeneralLedgerDetail);
router.get('/low-stock',                                   reportsController.getLowStockReport);

module.exports = router;
