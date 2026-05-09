const express             = require('express');
const customersController = require('../controllers/customers.controller');
const { requireAuth }     = require('../middleware/auth.middleware');
const validate            = require('../middleware/validate.middleware');
const arValidation        = require('../validations/ar.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/',     customersController.getCustomers);
router.post('/',    validate(arValidation.createCustomerSchema), customersController.createCustomer);
router.get('/:id',  customersController.getCustomerById);
router.patch('/:id', validate(arValidation.updateCustomerSchema), customersController.updateCustomer);

module.exports = router;
