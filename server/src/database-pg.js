import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Connection ───────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/** Convert `?` placeholders to `$1, $2, …` (skips if already using $N) */
function convertPlaceholders(sql) {
  if (!sql.includes('?')) return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Convert SQLite-isms in SQL to PG equivalents */
function convertSql(sql) {
  let s = convertPlaceholders(sql);
  // datetime('now') → CURRENT_TIMESTAMP
  s = s.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  // date('now') → CURRENT_DATE
  s = s.replace(/date\('now'\)/gi, 'CURRENT_DATE');
  // date('now', '+N days') → CURRENT_DATE + INTERVAL 'N days'
  s = s.replace(/date\('now',\s*'([^']+)'\)/gi, (_, interval) => `CURRENT_DATE + INTERVAL '${interval.replace(/^\+/, '')}'`);
  // INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  return s;
}

/** Flatten params — handles both spread args and single-array-arg patterns */
function flattenParams(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  // Handle named-object params (used by seed code) — return empty; DDL should not need params
  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return Object.values(args[0]);
  }
  return args;
}

// ─── DB interface (mirrors better-sqlite3 API, but async) ─────────────────

const db = {
  /**
   * Run a query and return all rows.
   * Accepts SQL with either `?` or `$N` placeholders.
   */
  async all(sql, params = []) {
    const result = await pool.query(convertSql(sql), params);
    return result.rows;
  },

  /**
   * Run a query and return the first row (or null).
   */
  async get(sql, params = []) {
    const result = await pool.query(convertSql(sql), params);
    return result.rows[0] || null;
  },

  /**
   * Run an INSERT / UPDATE / DELETE.
   * For INSERT, auto-appends RETURNING id if not already present.
   * Returns { lastInsertRowid, changes } to match better-sqlite3 interface.
   */
  async run(sql, params = []) {
    let s = convertSql(sql);
    const isInsert = /^\s*INSERT\s/i.test(s);
    // Auto-add RETURNING id for INSERT if not already present
    // Use RETURNING * so tables without an 'id' column don't break
    if (isInsert && !/RETURNING\s/i.test(s)) {
      s = s.replace(/;?\s*$/, ' RETURNING *');
    }
    const result = await pool.query(s, params);
    return {
      lastInsertRowid: result.rows[0]?.id ?? null,
      changes: result.rowCount,
    };
  },

  /**
   * Execute raw SQL (typically DDL). Supports multi-statement strings.
   */
  async exec(sql) {
    await pool.query(convertSql(sql));
  },

  /** No-op — PG doesn't use pragma */
  pragma() {},

  /**
   * Transaction wrapper — returns an async callable.
   * Usage: const doWork = db.transaction(async () => { ... }); await doWork();
   */
  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(...args);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  },

  /** Direct pool access for advanced use */
  pool,
};

// ─── Table creation (from modular migration files) ───────────────────────────
// Each migration file (01-core.sql … 12-chat.sql) is independent.
// A bad edit to one file cannot silently break unrelated tables.
async function initTables() {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    // Split into individual statements so one failure (e.g. index on missing column)
    // doesn't prevent subsequent CREATE TABLEs from running
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Log but continue — legacy tables may have different columns
        console.warn(`[${file}] statement skipped: ${err.message.split('\n')[0]}`);
      }
    }
  }
}

// ─── Initialize on import ────────────────────────────────────────────────────
try {
  await initTables();
  console.log('PostgreSQL connected and tables verified');
} catch (err) {
  console.error('PostgreSQL init error:', err.message);
  // Don't crash — tables likely already exist in Supabase
}

/**
 * Startup health check — verifies PG is reachable and core tables exist.
 * Call this before accepting traffic. Throws on failure.
 */
export async function checkDbHealth() {
  // 1. Basic connectivity
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT 1 AS ok');
    if (!rows[0]?.ok) throw new Error('PG connectivity check returned no result');

    // 2. Verify core tables exist
    const coreTables = ['sops', 'users', 'complaints', 'batch_tests', 'audit_logs'];
    const tableCheck = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [coreTables]
    );
    const found = tableCheck.rows.map(r => r.table_name);
    const missing = coreTables.filter(t => !found.includes(t));
    if (missing.length > 0) {
      throw new Error(`Missing core tables: ${missing.join(', ')}`);
    }

    // 3. Verify read/write with a simple test
    await client.query(`CREATE TABLE IF NOT EXISTS _health_check (checked_at TIMESTAMPTZ)`);
    await client.query(`DELETE FROM _health_check`);
    await client.query(`INSERT INTO _health_check (checked_at) VALUES (CURRENT_TIMESTAMP)`);
    const verify = await client.query(`SELECT checked_at FROM _health_check`);
    if (!verify.rows[0]?.checked_at) throw new Error('PG read/write verification failed');

    console.log(`DB health check passed — ${found.length} core tables verified, read/write OK`);
  } finally {
    client.release();
  }
}

export function getDb() {
  return db;
}

export default db;
