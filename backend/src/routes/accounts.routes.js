const express = require('express');
const accountsController = require('../controllers/accounts.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const glValidation = require('../validations/gl.validation');

const router = express.Router();

router.use(requireAuth); // Protect all routes

router.get('/', accountsController.getAccounts);
router.post('/', validate(glValidation.createAccountSchema), accountsController.createAccount);
router.patch('/:id', validate(glValidation.updateAccountSchema), accountsController.updateAccount);

module.exports = router;
