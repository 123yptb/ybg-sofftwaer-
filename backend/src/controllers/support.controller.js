/**
 * @file support.controller.js
 */

const catchAsync = require('../utils/catchAsync');
const supportModel = require('../models/support.model');

// --- Standard User Functions ---

const createTicket = catchAsync(async (req, res) => {
  const ticket = await supportModel.createTicket(req.user.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: { ticket } });
});

const getMyTickets = catchAsync(async (req, res) => {
  const tickets = await supportModel.getTicketsByTenant(req.user.tenantId, { status: req.query.status });
  res.status(200).json({ success: true, data: { tickets } });
});

// --- SuperAdmin Functions ---

const getAllTicketsGlobal = catchAsync(async (req, res) => {
  const tickets = await supportModel.getAllTicketsGlobal({
    status: req.query.status,
    tenantId: req.query.tenantId,
  });
  res.status(200).json({ success: true, data: { tickets } });
});

const updateTicket = catchAsync(async (req, res) => {
  const ticket = await supportModel.updateTicket(req.params.id, req.body);
  res.status(200).json({ success: true, data: { ticket } });
});

const toggleTenantModules = catchAsync(async (req, res) => {
  const { tenantId } = req.params;
  const { modules } = req.body; // e.g. ["core", "ar"]
  const updatedTenant = await supportModel.toggleTenantModules(tenantId, modules);
  res.status(200).json({ success: true, data: { tenant: updatedTenant } });
});

module.exports = {
  createTicket,
  getMyTickets,
  getAllTicketsGlobal,
  updateTicket,
  toggleTenantModules,
};
