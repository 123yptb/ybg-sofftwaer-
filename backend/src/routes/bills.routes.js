const express          = require('express');
const billsController  = require('../controllers/bills.controller');
const { requireAuth }  = require('../middleware/auth.middleware');
const validate         = require('../middleware/validate.middleware');
const apValidation     = require('../validations/ap.validation');

const router = express.Router();
router.use(requireAuth);

router.get('/',      billsController.getBills);
router.post('/',     validate(apValidation.createBillSchema), billsController.createBill);
router.get('/:id',   billsController.getBillById);
router.patch('/:id', validate(apValidation.updateBillSchema), billsController.updateBill);
router.patch('/:id/status', validate(apValidation.updateBillStatusSchema), billsController.updateBillStatus);

module.exports = router;
