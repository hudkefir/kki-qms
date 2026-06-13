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
  const failures = [];

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

    // Strip `--` line comments BEFORE splitting on ';'. The previous splitter
    // split the raw file on ';' and only dropped chunks that *started* with
    // '--', so a semicolon inside a comment would corrupt the statement stream.
    // This is a robustness hardening, NOT the cause of the historical wedge.
    // (Limitation: assumes '--' does not appear inside a string literal, which
    //  these schema migrations do not contain. Dollar-quoted bodies ($$…$$)
    //  are likewise not used by any current migration.)
    //
    // ROOT CAUSE of the wedge (verified 2026-06-13 against live DB):
    // 05-daily-ops.sql does `CREATE INDEX ... ON daily_task_completions(date)`
    // and `(daily_task_id)`. That table is owned by the production-dashboard
    // app on the SHARED Supabase DB, which created it first with a different
    // schema (`completion_date`/`task_id`, no `date`/`daily_task_id`). The
    // `CREATE TABLE IF NOT EXISTS` no-op'd against the pre-existing drifted
    // table, then the two index statements threw "column does not exist". The
    // old runner recorded success=false and THREW, halting the chain at 05 —
    // so migrations 06+ never auto-applied. Two fixes: (a) 05 now guards those
    // indexes on column existence; (b) the per-migration isolation below means
    // one drifted migration can never again halt the whole chain.
    const sqlOnly = content
      .split('\n')
      .map(line => {
        const idx = line.indexOf('--');
        return idx >= 0 ? line.slice(0, idx) : line;
      })
      .join('\n');
    const statements = sqlOnly
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

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
      // Per-migration isolation: record the failure and CONTINUE to the next
      // migration rather than halting the entire chain. A single stale/legacy
      // migration (e.g. a drifted-column index against an out-of-band table)
      // must not silently block every subsequent migration from ever applying.
      // The failed row stays success=false so it is retried on the next boot
      // once the underlying migration file is corrected.
      failures.push({ file, message: err.message });
      continue;
    } finally {
      client.release();
    }
  }

  if (failures.length > 0) {
    console.error(`[migrate] ⚠️  ${failures.length} migration(s) FAILED and were skipped (chain NOT halted):`);
    for (const f of failures) {
      console.error(`[migrate]    • ${f.file} — ${f.message}`);
    }
  }

  console.log(`[migrate] Done — ${newCount} applied, ${skippedCount} already up-to-date, ${failures.length} failed (${files.length} total)`);

  // Surface failures to the caller WITHOUT throwing, so init code can log/alert
  // them explicitly instead of swallowing a generic error. The app still boots.
  return { newCount, skippedCount, failures };
}
