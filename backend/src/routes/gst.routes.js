/**
 * @file gst.routes.js
 * @description API endpoints for India GST operations.
 *
 * Routes:
 *  POST /api/v1/gst/validate-gstin  — Validate a GSTIN string
 *  GET  /api/v1/gst/states          — List all Indian states with codes
 *  GET  /api/v1/gst/rates           — List org's configured HSN/SAC rates
 *  POST /api/v1/gst/calculate       — Calculate CGST/SGST/IGST for a line item
 */

'use strict';

const express    = require('express');
const { PrismaClient } = require('@prisma/client');
const requireAuth = require('../middleware/auth.middleware');
const gstService  = require('../services/gst.service');

const router  = express.Router();
const prisma  = new PrismaClient();

// ── POST /api/v1/gst/validate-gstin ──────────────────────────────────────────
router.post('/validate-gstin', (req, res) => {
  const { gstin } = req.body;
  const result = gstService.validateGstin(gstin);
  res.status(200).json({ success: true, data: result });
});

// ── GET /api/v1/gst/states ────────────────────────────────────────────────────
router.get('/states', (_req, res) => {
  const states = gstService.getAllStates();
  res.status(200).json({ success: true, data: { states } });
});

// ── GET /api/v1/gst/rates ─────────────────────────────────────────────────────
router.get('/rates', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.tenantId || req.user.organizationId;
    const rates = await prisma.gstRate.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ codeType: 'asc' }, { code: 'asc' }],
    });
    res.status(200).json({ success: true, data: { rates } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/v1/gst/calculate ────────────────────────────────────────────────
// Body: { taxableAmount, gstRatePercent, supplierStateCode, buyerStateCode }
router.post('/calculate', (req, res) => {
  const { taxableAmount, gstRatePercent, supplierStateCode, buyerStateCode } = req.body;

  if (taxableAmount === undefined || gstRatePercent === undefined) {
    return res.status(400).json({ success: false, message: 'taxableAmount and gstRatePercent are required' });
  }

  const supplyType = gstService.getSupplyType(supplierStateCode, buyerStateCode);
  const result = gstService.calculateGst(taxableAmount, gstRatePercent, supplyType);

  res.status(200).json({
    success: true,
    data: { supplyType, ...result },
  });
});

// ── GET /api/v1/gst/rates/:code ───────────────────────────────────────────────
router.get('/rates/:code', requireAuth, async (req, res) => {
  try {
    const orgId = req.user.tenantId || req.user.organizationId;
    const rate = await prisma.gstRate.findFirst({
      where: { organizationId: orgId, code: req.params.code, isActive: true },
    });
    if (!rate) return res.status(404).json({ success: false, message: `No rate found for code ${req.params.code}` });
    res.status(200).json({ success: true, data: { rate } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
