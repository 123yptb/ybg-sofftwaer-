/**
 * @file env.js
 * @description Centralised loader and validator for all environment variables.
 * Throws a descriptive error at startup if any required variable is missing,
 * rather than failing silently later.
 */

require('dotenv').config();

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[ENV] Missing required environment variables: ${missing.join(', ')}\n` +
    'Please copy .env.example to .env and fill in all values.'
  );
}

module.exports = {
  // ── Server ────────────────────────────────────────────────────────────────
  NODE_ENV:      process.env.NODE_ENV      || 'development',
  PORT:          parseInt(process.env.PORT || '4000', 10),

  // ── Database ──────────────────────────────────────────────────────────────
  DB_HOST:       process.env.DB_HOST,
  DB_PORT:       parseInt(process.env.DB_PORT, 10),
  DB_NAME:       process.env.DB_NAME,
  DB_USER:       process.env.DB_USER,
  DB_PASSWORD:   process.env.DB_PASSWORD,
  DB_POOL_MAX:   parseInt(process.env.DB_POOL_MAX || '20', 10),

  // ── Auth ──────────────────────────────────────────────────────────────────
  JWT_SECRET:     process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  COOKIE_SECRET:  process.env.COOKIE_SECRET  || process.env.JWT_SECRET,
};
