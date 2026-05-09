/**
 * @file runner.js
 * @description Simple migration runner for applying SQL migration files in order.
 *
 * Usage:
 *   node migrations/runner.js
 *
 * How it works:
 *   1. Creates a `schema_migrations` table if it doesn't exist.
 *   2. Reads all *.sql files from this directory, sorted by filename.
 *   3. Skips any migration whose filename is already recorded in the table.
 *   4. Executes each new migration inside a transaction.
 *   5. Records the migrated filename and timestamp on success.
 */

'use strict';

require('../src/config/env');

const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Direct pool — not the app pool, since server may not be running
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

const MIGRATIONS_DIR = __dirname;

async function run() {
  const client = await pool.connect();

  try {
    // Ensure the migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL      PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Collect all .sql files (excluding this runner) sorted lexicographically
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if already applied
      const { rows } = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`  ✓ [SKIP]    ${file} — already applied.`);
        continue;
      }

      // Read and execute the migration inside a transaction
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        console.log(`  ⟳ [RUNNING] ${file} ...`);
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✓ [DONE]    ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration "${file}" failed: ${err.message}`);
      }
    }

    console.log('\n🎉  All migrations applied successfully.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('\n❌  Migration runner error:', err.message);
  process.exit(1);
});
