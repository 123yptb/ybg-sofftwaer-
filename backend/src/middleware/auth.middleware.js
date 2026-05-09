const jwtUtils = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const requireAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Please authenticate.');
  }

  try {
    const payload = jwtUtils.verifyToken(token);
    // Inject the decoded payload into the request object.
    // Every protected route inherently trusts these values (including tenantId).
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token.');
  }
});

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden. Insufficient permissions.');
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
