const catchAsync = require('../utils/catchAsync');
const journalService = require('../services/journal.service');

const createJournalEntry = catchAsync(async (req, res) => {
  const entry = await journalService.createJournalEntry(req.user.tenantId, req.user.id, req.body);
  res.status(201).json({ success: true, data: { entry } });
});

const getJournals = catchAsync(async (req, res) => {
  const { period } = req.query;
  const entries = await journalService.getJournalEntries(req.user.tenantId, period);
  res.status(200).json({ success: true, data: { entries } });
});

const getJournalById = catchAsync(async (req, res) => {
  const entry = await journalService.getJournalEntryWithLines(req.user.tenantId, req.params.id);
  res.status(200).json({ success: true, data: { entry } });
});

const updateJournalStatus = catchAsync(async (req, res) => {
  const entry = await journalService.updateStatus(req.user.tenantId, req.params.id, req.body.status, req.user.id);
  res.status(200).json({ success: true, data: { entry } });
});

module.exports = { createJournalEntry, getJournals, getJournalById, updateJournalStatus };
