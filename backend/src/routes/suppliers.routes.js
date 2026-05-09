const express             = require('express');
const suppliersController = require('../controllers/suppliers.controller');
const { requireAuth }     = require('../middleware/auth.middleware');
const validate            = require('../middleware/validate.middleware');
const apValidation        = require('../validations/ap.validation');

const router = express.Router();
router.use(requireAuth);

router.get('/',     suppliersController.getSuppliers);
router.post('/',    validate(apValidation.createSupplierSchema), suppliersController.createSupplier);
router.get('/:id',  suppliersController.getSupplierById);
router.patch('/:id', validate(apValidation.updateSupplierSchema), suppliersController.updateSupplier);

module.exports = router;
