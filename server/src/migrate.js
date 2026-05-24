import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compute SHA-256 checksum of file contents.
 */
function checksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Run all pending migrations in order.
 * Tracks applied migrations in `schema_migrations` table.
 * Fails closed — throws on any migration error.
 *
 * @param {import('pg').Pool} pool - Postgres connection pool
 */
export async function runMigrations(pool) {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No migration files found');
    return;
  }

  // Step 1: Ensure schema_migrations table exists (bootstrap)
  // This runs the 00-migration-tracking.sql content inline so we can
  // track everything else, including itself.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT,
      success BOOLEAN DEFAULT true
    );
  `);

  // Step 2: Load already-applied migrations
  const { rows: applied } = await pool.query(
    'SELECT filename, checksum FROM schema_migrations WHERE success = true'
  );
  const appliedMap = new Map(applied.map(r => [r.filename, r.checksum]));

  let newCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), 'utf-8');
    const hash = checksum(content);

    // Already applied?
    if (appliedMap.has(file)) {
      const prevHash = appliedMap.get(file);
      if (prevHash && prevHash !== hash) {
        console.warn(`[migrate] ⚠️  DRIFT DETECTED: ${file} checksum changed (was ${prevHash.slice(0, 8)}…, now ${hash.slice(0, 8)}…). Not re-running.`);
      }
      skippedCount++;
      continue;
    }

    // Run the migration
    console.log(`[migrate] Applying: ${file}`);

    // Split into individual statements so one CREATE TABLE doesn't
    // block the next if it has a minor issue
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const stmt of statements) {
        await client.query(stmt);
      }

      // Record successful migration
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum, success) VALUES ($1, $2, true) ON CONFLICT (filename) DO UPDATE SET checksum = $2, applied_at = CURRENT_TIMESTAMP, success = true',
        [file, hash]
      );

      await client.query('COMMIT');
      newCount++;
    } catch (err) {
      await client.query('ROLLBACK');

      // Record failed migration
      try {
        await pool.query(
          'INSERT INTO schema_migrations (filename, checksum, success) VALUES ($1, $2, false) ON CONFLICT (filename) DO UPDATE SET checksum = $2, applied_at = CURRENT_TIMESTAMP, success = false',
          [file, hash]
        );
      } catch {
        // Don't mask the original error
      }

      console.error(`[migrate] ❌ FAILED: ${file}`);
      console.error(`[migrate] Error: ${err.message}`);
      throw new Error(`Migration failed: ${file} — ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log(`[migrate] Done — ${newCount} applied, ${skippedCount} already up-to-date (${files.length} total)`);
}
