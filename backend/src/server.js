/**
 * @file server.js
 * @description Express application entry point.
 *
 * Responsibilities:
 *  - Load and validate all environment variables first
 *  - Apply global security middleware (helmet, cors, cookie-parser)
 *  - Mount all versioned API routers
 *  - Register a global error handler
 *  - Start the HTTP server
 */

// Must be the very first import so all subsequent modules have access to env vars
require('./config/env');

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');

const { PORT, NODE_ENV, COOKIE_SECRET } = require('./config/env');

// ── Future route imports (added phase-by-phase) ───────────────────────────────
const authRouter      = require('./routes/auth.routes');
const accountRouter   = require('./routes/accounts.routes');
const journalRouter   = require('./routes/journals.routes');
const customerRouter  = require('./routes/customers.routes');
const invoiceRouter   = require('./routes/invoices.routes');
const productRouter   = require('./routes/products.routes');
const supplierRouter  = require('./routes/suppliers.routes');
const billRouter      = require('./routes/bills.routes');
const reportsRouter   = require('./routes/reports.routes');
const paymentRouter   = require('./routes/payments.routes');
const supportRouter   = require('./routes/support.routes');

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production, lock this down to your actual frontend domain
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,   // required for HTTP-only cookie auth
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Request Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// ── HTTP Request Logger ───────────────────────────────────────────────────────
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       NODE_ENV,
  });
});

// ── API Routes (mounted phase-by-phase) ──────────────────────────────────────
app.use('/api/v1/auth',      authRouter);
app.use('/api/v1/accounts',  accountRouter);
app.use('/api/v1/journals',  journalRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/invoices',  invoiceRouter);
app.use('/api/v1/products',  productRouter);
app.use('/api/v1/suppliers', supplierRouter);
app.use('/api/v1/bills',     billRouter);
app.use('/api/v1/payments',  paymentRouter);
app.use('/api/v1/reports',   reportsRouter);
app.use('/api/v1/support',   supportRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';

  // Never leak stack traces in production
  const payload = { success: false, message };
  if (NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  console.error(`[ERROR] ${statusCode} — ${message}`);
  res.status(statusCode).json(payload);
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  ERP API Server running in [${NODE_ENV}] mode on port ${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/health\n`);
});

module.exports = app; // export for testing
