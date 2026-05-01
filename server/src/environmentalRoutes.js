import { Router } from 'express';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './database-pg.js';
import { requireAuth, requireWriteAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = Router();

// ── DB Schema (auto-create tables) ─────────────────────────────────────────
const initSQL = `
CREATE TABLE IF NOT EXISTS env_sample_points (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  test_frequency TEXT DEFAULT 'per_production_run' CHECK(test_frequency IN ('daily','weekly','monthly','per_production_run','quarterly','annual')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS env_test_records (
  id SERIAL PRIMARY KEY,
  record_number TEXT UNIQUE NOT NULL,
  sample_point_id INTEGER NOT NULL,
  test_date TEXT NOT NULL,
  sampled_by TEXT DEFAULT '',
  linked_lot TEXT DEFAULT '',
  linked_production_date TEXT DEFAULT '',
  lab_name TEXT DEFAULT '',
  lab_report_number TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pass','fail','pending','investigating')),
  notes TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  attachments TEXT DEFAULT '[]',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (sample_point_id) REFERENCES env_sample_points(id)
);

CREATE TABLE IF NOT EXISTS env_test_results (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'microbiological',
  test_name TEXT NOT NULL,
  method TEXT DEFAULT '',
  target_value TEXT DEFAULT '',
  target_min TEXT DEFAULT '',
  target_max TEXT DEFAULT '',
  actual_value TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  pass_fail TEXT DEFAULT 'pending' CHECK(pass_fail IN ('pass','fail','pending','na')),
  notes TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (record_id) REFERENCES env_test_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_env_records_point ON env_test_records(sample_point_id);
CREATE INDEX IF NOT EXISTS idx_env_records_date ON env_test_records(test_date);
CREATE INDEX IF NOT EXISTS idx_env_results_record ON env_test_results(record_id);
`;

db.exec(initSQL);

// Auto-generate record numbers
async function nextRecordNumber() {
  const year = new Date().getFullYear();
  const last = await db.get("SELECT record_number FROM env_test_records WHERE record_number LIKE ? ORDER BY id DESC LIMIT 1", [`KK-ENV-${year}-%`]);
  if (!last) return `KK-ENV-${year}-001`;
  const num = parseInt(last.record_number.split('-').pop()) + 1;
  return `KK-ENV-${year}-${String(num).padStart(3, '0')}`;
}

// ── Sample Points CRUD ─────────────────────────────────────────────────────

// GET /api/environmental/sample-points
router.get('/environmental/sample-points', requireAuth, async (req, res) => {
  try {
    const points = await db.all('SELECT * FROM env_sample_points ORDER BY name');
    res.json(points);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/environmental/sample-points
router.post('/environmental/sample-points', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { name, location, description, test_frequency } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await db.run('INSERT INTO env_sample_points (name, location, description, test_frequency) VALUES (?, ?, ?, ?)', [name, location || '', description || '', test_frequency || 'per_production_run']);
    const point = await db.get('SELECT * FROM env_sample_points WHERE id = ?', [result.lastInsertRowid]);
    logAudit(req, 'create', 'env_sample_point', point.id, point.name, { new_values: req.body });
    res.json(point);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/environmental/sample-points/:id
router.put('/environmental/sample-points/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { name, location, description, test_frequency, active } = req.body;
    await db.run('UPDATE env_sample_points SET name = ?, location = ?, description = ?, test_frequency = ?, active = ?, updated_at = datetime("now") WHERE id = ?',
      [name, location || '', description || '', test_frequency || 'per_production_run', active !== undefined ? active : 1, req.params.id]);
    const point = await db.get('SELECT * FROM env_sample_points WHERE id = ?', [req.params.id]);
    res.json(point);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Test Records CRUD ──────────────────────────────────────────────────────

// GET /api/environmental/records
router.get('/environmental/records', requireAuth, async (req, res) => {
  try {
    const { sample_point_id, status, from, to, limit = 50 } = req.query;
    let query = `SELECT r.*, sp.name as sample_point_name, sp.location as sample_point_location
                 FROM env_test_records r
                 LEFT JOIN env_sample_points sp ON r.sample_point_id = sp.id
                 WHERE 1=1`;
    const params = [];
    if (sample_point_id) { query += ' AND r.sample_point_id = ?'; params.push(sample_point_id); }
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (from) { query += ' AND r.test_date >= ?'; params.push(from); }
    if (to) { query += ' AND r.test_date <= ?'; params.push(to); }
    query += ' ORDER BY r.test_date DESC, r.created_at DESC LIMIT ?';
    params.push(Number(limit));
    const records = await db.all(query, params);
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/environmental/records/:id
router.get('/environmental/records/:id', requireAuth, async (req, res) => {
  try {
    const record = await db.get(`SELECT r.*, sp.name as sample_point_name, sp.location as sample_point_location
                               FROM env_test_records r
                               LEFT JOIN env_sample_points sp ON r.sample_point_id = sp.id
                               WHERE r.id = ?`, [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    record.results = await db.all('SELECT * FROM env_test_results WHERE record_id = ? ORDER BY id', [record.id]);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/environmental/records
router.post('/environmental/records', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { sample_point_id, test_date, sampled_by, linked_lot, linked_production_date, lab_name, lab_report_number, notes, results } = req.body;
    if (!sample_point_id || !test_date) return res.status(400).json({ error: 'Sample point and test date required' });

    const record_number = await nextRecordNumber();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    const result = await db.run(`INSERT INTO env_test_records (record_number, sample_point_id, test_date, sampled_by, linked_lot, linked_production_date, lab_name, lab_report_number, notes, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record_number, sample_point_id, test_date, sampled_by || '', linked_lot || '', linked_production_date || '', lab_name || '', lab_report_number || '', notes || '', username, username]);

    // Insert test results if provided
    if (Array.isArray(results) && results.length > 0) {
      for (const r of results) {
        await db.run(`INSERT INTO env_test_results (record_id, test_type, test_name, method, target_value, target_min, target_max, actual_value, unit, pass_fail, notes, comments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.lastInsertRowid, r.test_type || 'microbiological', r.test_name, r.method || '', r.target_value || '', r.target_min || '', r.target_max || '', r.actual_value || '', r.unit || '', r.pass_fail || 'pending', r.notes || '', r.comments || '']);
      }
    }

    // Auto-calculate status
    const allResults = await db.all('SELECT pass_fail FROM env_test_results WHERE record_id = ?', [result.lastInsertRowid]);
    let status = 'pending';
    if (allResults.length > 0 && allResults.every(r => r.pass_fail === 'pass')) status = 'pass';
    else if (allResults.some(r => r.pass_fail === 'fail')) status = 'fail';
    await db.run('UPDATE env_test_records SET status = ? WHERE id = ?', [status, result.lastInsertRowid]);

    const record = await db.get('SELECT * FROM env_test_records WHERE id = ?', [result.lastInsertRowid]);
    record.results = await db.all('SELECT * FROM env_test_results WHERE record_id = ? ORDER BY id', [record.id]);

    logAudit(req, 'create', 'env_test_record', record.id, record.record_number, { new_values: { sample_point_id, test_date, results_count: (results || []).length } });
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/environmental/records/:id
router.put('/environmental/records/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM env_test_records WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const { sampled_by, linked_lot, linked_production_date, lab_name, lab_report_number, notes, comments, results } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run(`UPDATE env_test_records SET sampled_by = ?, linked_lot = ?, linked_production_date = ?, lab_name = ?, lab_report_number = ?, notes = ?, comments = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [sampled_by || existing.sampled_by, linked_lot || existing.linked_lot, linked_production_date || existing.linked_production_date, lab_name || existing.lab_name, lab_report_number || existing.lab_report_number, notes !== undefined ? notes : existing.notes, comments !== undefined ? comments : existing.comments, username, now, req.params.id]);

    // Update results if provided
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r.id) await db.run('UPDATE env_test_results SET actual_value = ?, pass_fail = ?, notes = ?, comments = ?, target_value = ? WHERE id = ? AND record_id = ?', [r.actual_value || '', r.pass_fail || 'pending', r.notes || '', r.comments || '', r.target_value || '', r.id, req.params.id]);
      }
    }

    // Recalculate status
    const allResults = await db.all('SELECT pass_fail FROM env_test_results WHERE record_id = ?', [req.params.id]);
    let status = 'pending';
    if (allResults.length > 0 && allResults.every(r => r.pass_fail === 'pass')) status = 'pass';
    else if (allResults.some(r => r.pass_fail === 'fail')) status = 'fail';
    await db.run('UPDATE env_test_records SET status = ? WHERE id = ?', [status, req.params.id]);

    const record = await db.get('SELECT * FROM env_test_records WHERE id = ?', [req.params.id]);
    record.results = await db.all('SELECT * FROM env_test_results WHERE record_id = ? ORDER BY id', [record.id]);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/environmental/records/:id
router.delete('/environmental/records/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const record = await db.get('SELECT * FROM env_test_records WHERE id = ?', [req.params.id]);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    await db.run('DELETE FROM env_test_results WHERE record_id = ?', [req.params.id]);
    await db.run('DELETE FROM env_test_records WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete', 'env_test_record', record.id, record.record_number, {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/environmental/records/:id/results/:resultId
router.delete('/environmental/records/:id/results/:resultId', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const result = await db.get('SELECT * FROM env_test_results WHERE id = ? AND record_id = ?', [req.params.resultId, req.params.id]);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    await db.run('DELETE FROM env_test_results WHERE id = ?', [req.params.resultId]);
    res.json({ success: true, deleted: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/environmental/trends/:samplePointId
router.get('/environmental/trends/:samplePointId', requireAuth, async (req, res) => {
  try {
    const { test_name, months = 12 } = req.query;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Number(months));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let query = `SELECT r.test_date, r.record_number, r.status, tr.test_name, tr.actual_value, tr.unit, tr.pass_fail, tr.target_value
                 FROM env_test_records r
                 JOIN env_test_results tr ON tr.record_id = r.id
                 WHERE r.sample_point_id = ? AND r.test_date >= ?`;
    const params = [req.params.samplePointId, cutoffStr];
    if (test_name) { query += ' AND tr.test_name = ?'; params.push(test_name); }
    query += ' ORDER BY r.test_date ASC, tr.test_name';

    const trends = await db.all(query, params);
    res.json(trends);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
