const express = require('express');
const journalsController = require('../controllers/journals.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const glValidation = require('../validations/gl.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', journalsController.getJournals);
router.post('/', validate(glValidation.createJournalEntrySchema), journalsController.createJournalEntry);
router.get('/:id', journalsController.getJournalById);
router.patch('/:id/status', validate(glValidation.updateJournalStatusSchema), journalsController.updateJournalStatus);

module.exports = router;
