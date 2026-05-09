/**
 * @file database.js
 * @description PostgreSQL connection pool configuration.
 * Uses the `pg` library. All credentials are loaded from environment variables
 * to keep secrets out of source control.
 */

const { Pool } = require('pg');

/**
 * A single shared connection pool for the entire application.
 * Connection pooling is critical for performance under multi-tenant load.
 */
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'saas_erp',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Maximum number of clients in the pool
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  // Milliseconds a client must sit idle before being closed
  idleTimeoutMillis: 30000,
  // Milliseconds to wait for a connection before throwing an error
  connectionTimeoutMillis: 2000,
  // Enable SSL in production environments
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,
});

// Log successful connections (useful for debugging startup issues)
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[DB] New client connected to PostgreSQL pool.');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = pool;
