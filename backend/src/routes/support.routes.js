/**
 * @file support.routes.js
 */

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

router.use(requireAuth);

// --- SuperAdmin Only Routes ---
router.get('/admin/all', requireRole('SuperAdmin'), supportController.getAllTicketsGlobal);
router.patch('/admin/:id', requireRole('SuperAdmin'), supportController.updateTicket);
router.patch('/admin/tenant/:tenantId/modules', requireRole('SuperAdmin'), supportController.toggleTenantModules);

// --- Tenant Routes ---
router.post('/', supportController.createTicket);
router.get('/', supportController.getMyTickets);

module.exports = router;
