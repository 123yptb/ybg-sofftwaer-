const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (userId, tenantId, role) => {
  const payload = { sub: userId, tenantId, role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
