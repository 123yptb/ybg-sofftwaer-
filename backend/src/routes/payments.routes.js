/**
 * @file payments.routes.js
 */

const express            = require('express');
const paymentsController = require('../controllers/payments.controller');
const { requireAuth }    = require('../middleware/auth.middleware');
const validate           = require('../middleware/validate.middleware');
const { createPaymentSchema, verifyChequeSchema } = require('../validations/payment.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/',     paymentsController.getPayments);
router.post('/',    validate(createPaymentSchema), paymentsController.recordPayment);
router.get('/:id',  paymentsController.getPaymentById);
router.patch('/:id/verify', validate(verifyChequeSchema), paymentsController.verifyCheque);

module.exports = router;
