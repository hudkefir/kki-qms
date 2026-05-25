import { Router } from 'express';
import db, { checkDbHealth } from '../../database-pg.js';
import { requireRole } from '../../authMiddleware.js';
import { runSmokeTests } from '../../smokeTest.js';

const router = Router();
const SERVER_START_TIME = Date.now();

// All diagnostics routes require admin role
router.use(requireRole('admin'));

// ─── GET /api/admin/diagnostics ─────────────────────────────────────────────
// Returns system health info: DB status, uptime, memory, env, recent errors.
router.get('/admin/diagnostics', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    errors: [],
  };

  // ── Uptime ──
  const uptimeMs = Date.now() - SERVER_START_TIME;
  const uptimeSec = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  diagnostics.uptime = {
    ms: uptimeMs,
    human: `${hours}h ${minutes}m ${seconds}s`,
    started_at: new Date(SERVER_START_TIME).toISOString(),
  };

  // ── Memory ──
  const mem = process.memoryUsage();
  diagnostics.memory = {
    rss_mb: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    external_mb: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    heap_usage_pct: Math.round((mem.heapUsed / mem.heapTotal) * 100),
  };

  // ── Node / environment ──
  diagnostics.environment = {
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3002',
    cloud_run_revision: process.env.K_REVISION || null,
    cloud_run_service: process.env.K_SERVICE || null,
    cloud_run_config: process.env.K_CONFIGURATION || null,
  };

  // ── Database ──
  try {
    const dbStart = Date.now();
    await checkDbHealth();
    const dbLatency = Date.now() - dbStart;

    // Pool stats
    const pool = db.pool;
    diagnostics.database = {
      status: 'connected',
      latency_ms: dbLatency,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };

    // Row counts for core tables
    try {
      const counts = {};
      const tables = ['sops', 'complaints', 'ccrs', 'capas', 'deviation_reports', 'batch_tests', 'users', 'audit_logs', 'equipment', 'suppliers', 'recalls'];
      for (const table of tables) {
        const row = await db.get(`SELECT COUNT(*) AS c FROM ${table}`);
        counts[table] = row?.c ?? 0;
      }
      diagnostics.database.row_counts = counts;
    } catch (countErr) {
      diagnostics.database.row_counts_error = countErr.message;
    }
  } catch (dbErr) {
    diagnostics.status = 'degraded';
    diagnostics.database = { status: 'error', error: dbErr.message };
    diagnostics.errors.push({ source: 'database', message: dbErr.message });
  }

  // ── Recent errors from audit_logs (last 10 error-type entries) ──
  try {
    const recentErrors = await db.all(`
      SELECT id, timestamp, username, action, resource_type, resource_id, details
      FROM audit_logs
      WHERE action LIKE '%error%' OR action LIKE '%fail%'
      ORDER BY id DESC
      LIMIT 10
    `);
    diagnostics.recent_error_logs = recentErrors;
  } catch (errLogErr) {
    diagnostics.recent_error_logs = [];
    diagnostics.errors.push({ source: 'error_log_query', message: errLogErr.message });
  }

  // ── Active sessions count ──
  try {
    const sessionRow = await db.get(`SELECT COUNT(*) AS c FROM sessions WHERE expire > NOW()`);
    diagnostics.active_sessions = sessionRow?.c ?? 0;
  } catch (sessErr) {
    diagnostics.active_sessions = null;
    diagnostics.errors.push({ source: 'sessions', message: sessErr.message });
  }

  res.json(diagnostics);
});

// ─── POST /api/admin/smoke-test ─────────────────────────────────────────────
// Runs smoke tests against the current server from inside the running process.
router.post('/admin/smoke-test', async (req, res) => {
  try {
    // Determine base URL: use the request's own origin, or a provided override
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = req.body.base_url || `${protocol}://${host}`;

    // Forward the caller's session cookie so authed endpoints work
    const cookieHeader = req.headers.cookie || '';

    const result = await runSmokeTests(baseUrl, cookieHeader);
    const httpStatus = result.failed > 0 ? 207 : 200; // 207 Multi-Status if partial failure
    res.status(httpStatus).json(result);
  } catch (err) {
    console.error('Smoke test error:', err);
    res.status(500).json({ error: 'Smoke test failed to run', message: err.message });
  }
});

// ─── GET /api/admin/backup-status ───────────────────────────────────────────
// Returns the latest backup status from the local status file written by backup.py.
// The backup script runs hourly on the Mac mini and writes /tmp/kki-backup-status.json.
// In Cloud Run, this endpoint returns the last known status from GCS metadata instead.
router.get('/admin/backup-status', async (req, res) => {
  try {
    // Try local status file first (works on Mac mini / local dev)
    const fs = await import('fs');
    const statusPath = '/tmp/kki-backup-status.json';

    if (fs.existsSync(statusPath)) {
      const raw = fs.readFileSync(statusPath, 'utf-8');
      const status = JSON.parse(raw);

      // Calculate age
      const backupTime = new Date(status.timestamp);
      const ageMs = Date.now() - backupTime.getTime();
      const ageHours = Math.round(ageMs / (1000 * 60 * 60) * 10) / 10;

      return res.json({
        ...status,
        age_hours: ageHours,
        stale: ageHours > 2, // Flag if backup is older than 2 hours
        source: 'local_status_file',
      });
    }

    // Fallback: check GCS for latest backup (Cloud Run environment)
    // This would require gcloud or Supabase storage — for now return unknown
    res.json({
      success: null,
      message: 'No local backup status file found. Backup runs on the Mac mini.',
      source: 'none',
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Failed to read backup status', message: err.message });
  }
});

export default router;
