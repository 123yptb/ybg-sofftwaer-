const catchAsync = require('../utils/catchAsync');
const onboardingService = require('../services/onboarding.service');
const authService = require('../services/auth.service');
const env = require('../config/env');

const registerTenant = catchAsync(async (req, res) => {
  const { tenant, user } = await onboardingService.registerNewTenant(req.body);
  
  res.status(201).json({
    success: true,
    message: 'Tenant registered successfully',
    data: { tenant, user }
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUserWithEmailAndPassword(email, password);

  // Set HTTP-only cookie for secure browser clients
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseInt(env.JWT_EXPIRES_IN) || 8 * 60 * 60 * 1000 // default 8h in ms
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    // token returned in body for stateless client apps not using cookies like mobile apps
    data: { user, token }
  });
});

const logout = catchAsync(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = await authService.getUserProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: { user }
  });
});

module.exports = { registerTenant, login, logout, getMe };
