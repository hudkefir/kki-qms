import { Router } from 'express';
import db from './database.js';
import { requireAuth, requireWriteAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const router = Router();

// ── Test Profile Templates ──────────────────────────────────────────────────

const ROUTINE_TESTS = [
  { test_type: 'chemical', test_name: 'pH Level', target_value: '4.2-4.6', unit: 'pH', test_category: 'routine', target_min: '4.2', target_max: '4.6' },
  { test_type: 'chemical', test_name: 'Brix / Sugar Content', target_value: '', unit: 'Brix', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Storage Temperature', target_value: '2-4', unit: '°C', test_category: 'routine', target_min: '2', target_max: '4' },
  { test_type: 'physical', test_name: 'Viscosity', target_value: '', unit: 'cP', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Weight Check', target_value: '', unit: 'g', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Seal Integrity', target_value: 'Pass', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'sensory', test_name: 'Organoleptic (Taste/Smell/Appearance)', target_value: 'Acceptable', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'packaging', test_name: 'Label Verification', target_value: 'Correct', unit: '', test_category: 'label', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Allergen Verification', target_value: 'Confirmed', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Foreign Material Check', target_value: 'None detected', unit: '', test_category: 'physical', target_min: '', target_max: '' },
];

const CFIA_MICRO_TESTS = [
  { test_type: 'micro', test_name: 'Coliform', target_value: '<10 CFU/g', unit: 'CFU/g', test_category: 'cfia', target_min: '', target_max: '10' },
  { test_type: 'micro', test_name: 'E. coli', target_value: 'Absent', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Salmonella', target_value: 'Absent/25g', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Listeria monocytogenes', target_value: 'Absent/25g', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Staphylococcus aureus', target_value: '<100 CFU/g', unit: 'CFU/g', test_category: 'cfia', target_min: '', target_max: '100' },
  { test_type: 'micro', test_name: 'Yeast & Mold', target_value: '<1000 CFU/g', unit: 'CFU/g', test_category: 'micro', target_min: '', target_max: '1000' },
];

const FDA_TESTS = [
  { test_type: 'micro', test_name: 'Standard Plate Count (SPC)', target_value: 'Within spec', unit: 'CFU/g', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Coliform / E. coli', target_value: '<10 CFU/g', unit: 'CFU/g', test_category: 'fda', target_min: '', target_max: '10' },
  { test_type: 'micro', test_name: 'Pathogen Screening (Salmonella, Listeria)', target_value: 'Negative', unit: '', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Allergen Verification (coconut = tree nut)', target_value: 'Confirmed', unit: '', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Net Weight Verification', target_value: 'Within spec', unit: 'g', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'packaging', test_name: 'Label Compliance (21 CFR)', target_value: 'Compliant', unit: '', test_category: 'label', target_min: '', target_max: '' },
];

const TEST_PROFILES = {
  routine: { label: 'Routine QC', tests: ROUTINE_TESTS },
  cfia_micro: { label: 'CFIA Microbiological', tests: CFIA_MICRO_TESTS },
  fda: { label: 'FDA Panel', tests: FDA_TESTS },
  full_panel: { label: 'Full Panel (All)', tests: [...ROUTINE_TESTS, ...CFIA_MICRO_TESTS, ...FDA_TESTS] },
};

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /api/batch-tests - list all batch tests
router.get('/batch-tests', requireAuth, (req, res) => {
  try {
    const { status, search, from, to, limit = 50 } = req.query;
    let query = 'SELECT * FROM batch_tests WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (batch_number LIKE ? OR product_sku LIKE ? OR product_name LIKE ? OR tested_by LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (from) {
      query += ' AND test_date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND test_date <= ?';
      params.push(to);
    }

    query += ' ORDER BY test_date DESC, created_at DESC LIMIT ?';
    params.push(Number(limit));

    const tests = db.prepare(query).all(...params);
    res.json(tests);
  } catch (err) {
    console.error('Get batch tests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/batch-tests/templates - get test profile templates
router.get('/batch-tests/templates', requireAuth, (req, res) => {
  res.json({
    profiles: Object.entries(TEST_PROFILES).map(([key, val]) => ({ key, label: val.label, test_count: val.tests.length })),
    tests: TEST_PROFILES,
  });
});

// GET /api/batch-tests/:id - get single batch test with results
router.get('/batch-tests/:id', requireAuth, (req, res) => {
  try {
    const test = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const results = db.prepare('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY id').all(req.params.id);
    res.json({ ...test, results });
  } catch (err) {
    console.error('Get batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/batch-tests/:id/coa - Certificate of Analysis
router.get('/batch-tests/:id/coa', requireAuth, (req, res) => {
  try {
    const test = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const results = db.prepare('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY test_category, test_type, id').all(req.params.id);

    // Group results by category
    const grouped = {};
    for (const r of results) {
      const cat = r.test_category || 'routine';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }

    // Category pass/fail summary
    const categorySummary = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const hasFail = items.some(r => r.pass_fail === 'fail');
      const allDone = items.every(r => r.pass_fail !== 'pending');
      categorySummary[cat] = hasFail ? 'fail' : (allDone ? 'pass' : 'pending');
    }

    res.json({
      batch: test,
      results,
      grouped,
      categorySummary,
      overallStatus: test.status,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Get CoA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/batch-tests - create batch test with results
router.post('/batch-tests', requireAuth, requireWriteAccess, (req, res) => {
  try {
    const { batch_number, product_sku, product_name, test_date, tested_by, notes, results, test_profile, lab_name, lab_report_number, sample_date, report_date } = req.body;
    if (!batch_number || !test_date) {
      return res.status(400).json({ error: 'Batch number and test date are required' });
    }

    const profile = test_profile || 'routine';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    const insertTest = db.prepare(`
      INSERT INTO batch_tests (batch_number, product_sku, product_name, test_date, tested_by, status, notes, test_profile, lab_name, lab_report_number, sample_date, report_date, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = db.prepare(`
      INSERT INTO batch_test_results (batch_test_id, test_type, test_name, target_value, actual_value, unit, pass_fail, notes, test_category, target_min, target_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createBatch = db.transaction(() => {
      const info = insertTest.run(
        batch_number, product_sku || '', product_name || '', test_date,
        tested_by || username, notes || '', profile, lab_name || '',
        lab_report_number || '', sample_date || '', report_date || '',
        username, username, now, now
      );
      const batchId = info.lastInsertRowid;

      const testResults = results && results.length > 0 ? results : (TEST_PROFILES[profile]?.tests || ROUTINE_TESTS);
      for (const r of testResults) {
        insertResult.run(
          batchId, r.test_type, r.test_name, r.target_value || '', r.actual_value || '',
          r.unit || '', r.pass_fail || 'pending', r.notes || '',
          r.test_category || 'routine', r.target_min || '', r.target_max || ''
        );
      }

      return batchId;
    });

    const batchId = createBatch();
    const created = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(batchId);
    const createdResults = db.prepare('SELECT * FROM batch_test_results WHERE batch_test_id = ?').all(batchId);

    logAudit(req, 'create', 'batch_test', batchId, batch_number, { new_values: { batch_number, product_sku, test_date, test_profile: profile } });

    res.json({ ...created, results: createdResults });
  } catch (err) {
    console.error('Create batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/batch-tests/:id - update batch test
router.put('/batch-tests/:id', requireAuth, requireWriteAccess, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { batch_number, product_sku, product_name, test_date, tested_by, status, notes, lab_name, lab_report_number, sample_date, report_date } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    db.prepare(`
      UPDATE batch_tests SET batch_number = ?, product_sku = ?, product_name = ?, test_date = ?, tested_by = ?, status = ?, notes = ?,
        lab_name = ?, lab_report_number = ?, sample_date = ?, report_date = ?, updated_by = ?, updated_at = ?
      WHERE id = ?
    `).run(
      batch_number || existing.batch_number, product_sku ?? existing.product_sku, product_name ?? existing.product_name,
      test_date || existing.test_date, tested_by || existing.tested_by, status || existing.status, notes ?? existing.notes,
      lab_name ?? existing.lab_name, lab_report_number ?? existing.lab_report_number,
      sample_date ?? existing.sample_date, report_date ?? existing.report_date,
      username, now, req.params.id
    );

    logAudit(req, 'update', 'batch_test', req.params.id, batch_number || existing.batch_number, { old_values: existing, new_values: req.body });

    const updated = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    const results = db.prepare('SELECT * FROM batch_test_results WHERE batch_test_id = ?').all(req.params.id);
    res.json({ ...updated, results });
  } catch (err) {
    console.error('Update batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/batch-tests/:id/results - update test results
router.put('/batch-tests/:id/results', requireAuth, requireWriteAccess, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json({ error: 'Results array required' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    const updateResult = db.prepare(`
      UPDATE batch_test_results SET actual_value = ?, pass_fail = ?, notes = ? WHERE id = ? AND batch_test_id = ?
    `);

    const updateAll = db.transaction(() => {
      for (const r of results) {
        if (r.id) {
          updateResult.run(r.actual_value || '', r.pass_fail || 'pending', r.notes || '', r.id, req.params.id);
        }
      }

      // Auto-calculate overall status
      const allResults = db.prepare('SELECT pass_fail FROM batch_test_results WHERE batch_test_id = ?').all(req.params.id);
      const hasFail = allResults.some(r => r.pass_fail === 'fail');
      const allDone = allResults.every(r => r.pass_fail !== 'pending');
      const newStatus = hasFail ? 'fail' : (allDone ? 'pass' : 'pending');

      db.prepare('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(newStatus, username, now, req.params.id);
    });

    updateAll();

    logAudit(req, 'update', 'batch_test_results', req.params.id, existing.batch_number, { new_values: { results_count: results.length } });

    const updated = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    const updatedResults = db.prepare('SELECT * FROM batch_test_results WHERE batch_test_id = ?').all(req.params.id);
    res.json({ ...updated, results: updatedResults });
  } catch (err) {
    console.error('Update batch test results error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/batch-tests/:id
router.delete('/batch-tests/:id', requireAuth, requireWriteAccess, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM batch_tests WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    db.prepare('DELETE FROM batch_test_results WHERE batch_test_id = ?').run(req.params.id);
    db.prepare('DELETE FROM batch_tests WHERE id = ?').run(req.params.id);

    logAudit(req, 'delete', 'batch_test', req.params.id, existing.batch_number, { old_values: existing });

    res.json({ message: 'Batch test deleted' });
  } catch (err) {
    console.error('Delete batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
