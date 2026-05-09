const express            = require('express');
const invoicesController = require('../controllers/invoices.controller');
const { requireAuth }    = require('../middleware/auth.middleware');
const validate           = require('../middleware/validate.middleware');
const arValidation       = require('../validations/ar.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/',      invoicesController.getInvoices);
router.post('/',     validate(arValidation.createInvoiceSchema), invoicesController.createInvoice);
router.get('/:id',   invoicesController.getInvoiceById);
router.patch('/:id', validate(arValidation.updateInvoiceSchema), invoicesController.updateInvoice);

// Status-transition endpoint — deliberately separate from the edit endpoint
router.patch(
  '/:id/status',
  validate(arValidation.updateInvoiceStatusSchema),
  invoicesController.updateInvoiceStatus
);

module.exports = router;
