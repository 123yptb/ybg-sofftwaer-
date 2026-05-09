const express            = require('express');
const productsController = require('../controllers/products.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const validate           = require('../middleware/validate.middleware');
const invValidation      = require('../validations/inventory.validation');

const router = express.Router();

router.use(requireAuth);

// ── Products CRUD ─────────────────────────────────────────────────────────────
router.get('/',     productsController.getProducts);
router.post('/',    validate(invValidation.createProductSchema), productsController.createProduct);
router.get('/:id',  productsController.getProductById);
router.patch('/:id', validate(invValidation.updateProductSchema), productsController.updateProduct);

// ── Stock movement ledger (read-only; immutable) ──────────────────────────────
router.get('/:id/movements', productsController.getStockMovements);

// ── Manual stock adjustment ───────────────────────────────────────────────────
// Restricted to TenantAdmin role — employees cannot manually adjust stock.
router.post(
  '/adjust',
  requireRole('TenantAdmin', 'SuperAdmin'),
  validate(invValidation.stockAdjustmentSchema),
  productsController.adjustStock
);

module.exports = router;
