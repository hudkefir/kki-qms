/**
 * Schema verification — confirms every expected table exists in PostgreSQL.
 * Run before deploy or as a CI gate to catch broken migrations early.
 *
 * Usage:
 *   node server/src/verify-schema.js
 *
 * Reads all migration files, extracts CREATE TABLE names, then checks
 * information_schema to confirm each one exists. Exits 1 on any missing table.
 */

import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extract table names from migration SQL files
function getExpectedTables() {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const tables = [];

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const matches = sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/gi);
    for (const m of matches) {
      tables.push({ table: m[1], file });
    }
  }
  return tables;
}

async function verify() {
  const pool = new pg.Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const expected = getExpectedTables();
    const tableNames = expected.map(e => e.table);

    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [tableNames]
    );
    const found = new Set(rows.map(r => r.table_name));

    let passed = 0;
    let failed = 0;

    for (const { table, file } of expected) {
      if (found.has(table)) {
        passed++;
      } else {
        failed++;
        console.error(`  MISSING  ${table}  (defined in ${file})`);
      }
    }

    if (failed > 0) {
      console.error(`\nSchema verification FAILED: ${failed}/${expected.length} tables missing`);
      process.exit(1);
    } else {
      console.log(`Schema verification PASSED: all ${passed} tables present`);
      process.exit(0);
    }
  } finally {
    await pool.end();
  }
}

// Also export for use as a module (e.g. from smoke tests)
export { getExpectedTables };

verify().catch(err => {
  console.error('Schema verification error:', err.message);
  process.exit(1);
});
