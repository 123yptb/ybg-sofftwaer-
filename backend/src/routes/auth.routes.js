const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.registerTenant);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
