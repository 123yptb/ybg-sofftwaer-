const catchAsync = require('../utils/catchAsync');
const accountModel = require('../models/account.model');

const createAccount = catchAsync(async (req, res) => {
  const account = await accountModel.createAccount(req.user.tenantId, req.body);
  res.status(201).json({ success: true, data: { account } });
});

const getAccounts = catchAsync(async (req, res) => {
  const accounts = await accountModel.getAccounts(req.user.tenantId);
  res.status(200).json({ success: true, data: { accounts } });
});

const updateAccount = catchAsync(async (req, res) => {
  const { id } = req.params;
  const account = await accountModel.updateAccount(req.user.tenantId, id, req.body);
  res.status(200).json({ success: true, data: { account } });
});

module.exports = { createAccount, getAccounts, updateAccount };
