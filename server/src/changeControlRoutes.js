import { Router } from 'express';
import db from './database-pg.js';
import { broadcast } from './websocket.js';
import { requireWriteAccess, requireRole, requireContentAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { sanitizeBody } from './sanitize.js';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename_cc = fileURLToPath(import.meta.url);
const __dirname_cc = dirname(__filename_cc);

// ── Multer setup for CAPA document uploads ──
const capaUploadsDir = join(__dirname_cc, '..', '..', 'uploads', 'capa-docs');
if (!existsSync(capaUploadsDir)) { mkdirSync(capaUploadsDir, { recursive: true }); }

const capaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, capaUploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, 'capa-' + req.params.id + '-' + uniqueSuffix + '.' + ext);
  }
});

const capaUpload = multer({
  storage: capaStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) { cb(null, true); }
    else { cb(new Error('File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG')); }
  }
});

const router = Router();

// ── Ensure capa_attachments table exists ──
await db.exec(`CREATE TABLE IF NOT EXISTS capa_attachments (
  id SERIAL PRIMARY KEY,
  capa_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (capa_id) REFERENCES capas(id) ON DELETE CASCADE
)`);

// ──── Sequence helper ────
async function nextId(type) {
  const year = new Date().getFullYear();
  const row = await db.prepare('SELECT next_number FROM qms_sequence WHERE type = ? AND year = ?').get(type, year);
  let num;
  if (row) {
    num = row.next_number;
    await db.prepare('UPDATE qms_sequence SET next_number = ? WHERE type = ? AND year = ?').run(num + 1, type, year);
  } else {
    num = 1;
    await db.prepare('INSERT INTO qms_sequence (type, year, next_number) VALUES (?, ?, ?)').run(type, year, 2);
  }
  const prefixes = { change_request: 'CC', deviation: 'DEV', capa: 'CAPA' };
  return `${prefixes[type]}-${year}-${String(num).padStart(3, '0')}`;
}

// ==================== CHANGE REQUESTS ====================

// GET /api/change-requests
router.get('/change-requests', async (req, res) => {
  try {
    const { status, classification, category, search } = req.query;
    let query = 'SELECT * FROM change_requests WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (classification) { query += ' AND classification = ?'; params.push(classification); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search) {
      query += ' AND (request_id LIKE ? OR title LIKE ? OR description LIKE ? OR initiator LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.prepare(query).all(...params);

    // Enrich with CAPA counts
    const enriched = [];
    for (const r of rows) {
      const capaRow = await db.prepare("SELECT COUNT(*) as count FROM capas WHERE source_type = 'change_request' AND source_id = ?").get(r.id);
      enriched.push({ ...r, capaCount: capaRow.count });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/change-requests/:id
router.get('/change-requests/:id', async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const capas = await db.prepare("SELECT * FROM capas WHERE source_type = 'change_request' AND source_id = ? ORDER BY id").all(cr.id);

    res.json({
      ...cr,
      food_safety_impact: JSON.parse(cr.food_safety_impact || '{}'),
      affected_documents: JSON.parse(cr.affected_documents || '[]'),
      capas,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-requests
router.post('/change-requests', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      title, description, category, initiator,
      proposed_effective_date = null, affected_documents = [],
      training_required = 0, is_emergency = 0
    } = sanitized;

    if (!title || !description || !category || !initiator) {
      return res.status(400).json({ error: 'title, description, category, and initiator are required' });
    }

    const request_id = await nextId('change_request');

    const info = await db.prepare(`
      INSERT INTO change_requests (request_id, title, description, category, initiator, proposed_effective_date, affected_documents, training_required, is_emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(request_id, title, description, category, initiator, proposed_effective_date, JSON.stringify(affected_documents), training_required ? 1 : 0, is_emergency ? 1 : 0);

    const created = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(info.lastInsertRowid);
    logAudit(req, 'create_change_request', 'change_requests', created.id, request_id, { new_values: { request_id, title, category, initiator } });
    broadcast('change_request_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/change-requests/:id
router.put('/change-requests/:id', requireWriteAccess, async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'title', 'description', 'category', 'status', 'initiator', 'risk_assessment', 'justification', 'impact_analysis', 'affected_sops',
      'proposed_effective_date', 'actual_effective_date', 'training_required',
      'is_emergency', 'monitoring_end_date', 'rejection_reason'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    // Handle JSON fields
    if (sanitized.food_safety_impact !== undefined) {
      updates.push('food_safety_impact = ?');
      params.push(typeof sanitized.food_safety_impact === 'string' ? sanitized.food_safety_impact : JSON.stringify(sanitized.food_safety_impact));
    }
    if (sanitized.affected_documents !== undefined) {
      updates.push('affected_documents = ?');
      params.push(typeof sanitized.affected_documents === 'string' ? sanitized.affected_documents : JSON.stringify(sanitized.affected_documents));
    }

    updates.push("updated_at = datetime('now')");
    if (updates.length === 1) return res.json(cr);

    params.push(req.params.id);
    await db.prepare(`UPDATE change_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    logAudit(req, 'update_change_request', 'change_requests', req.params.id, cr.request_id, { old_values: {}, new_values: sanitized });
    broadcast('change_request_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-requests/:id/classify
router.post('/change-requests/:id/classify', requireWriteAccess, async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { classification, food_safety_impact } = req.body;
    if (!classification) return res.status(400).json({ error: 'classification is required' });

    await db.prepare(`UPDATE change_requests SET classification = ?, food_safety_impact = ?, status = 'pending_review', updated_at = datetime('now') WHERE id = ?`)
      .run(classification, JSON.stringify(food_safety_impact || {}), req.params.id);

    const updated = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    logAudit(req, 'classify_change_request', 'change_requests', req.params.id, cr.request_id, { new_values: { classification } });
    broadcast('change_request_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-requests/:id/approve
router.post('/change-requests/:id/approve', requireWriteAccess, async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const sessionUser = req.session?.user;
    const approvedBy = sessionUser?.display_name || sessionUser?.username || '';

    await db.prepare(`UPDATE change_requests SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .run(approvedBy, req.params.id);

    const updated = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    logAudit(req, 'approve_change_request', 'change_requests', req.params.id, cr.request_id, { new_values: { approved_by: approvedBy } });
    broadcast('change_request_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-requests/:id/reject
router.post('/change-requests/:id/reject', requireWriteAccess, async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: 'rejection_reason is required' });

    await db.prepare(`UPDATE change_requests SET status = 'rejected', rejection_reason = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(rejection_reason, req.params.id);

    const updated = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    logAudit(req, 'reject_change_request', 'change_requests', req.params.id, cr.request_id, { new_values: { rejection_reason } });
    broadcast('change_request_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/change-requests/:id/effectiveness
router.post('/change-requests/:id/effectiveness', requireWriteAccess, async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { effectiveness_result, effectiveness_notes } = req.body;
    if (!effectiveness_result) return res.status(400).json({ error: 'effectiveness_result is required' });

    const newStatus = effectiveness_result === 'effective' ? 'closed' : 'implementing';
    const closedAt = effectiveness_result === 'effective' ? "datetime('now')" : null;

    await db.prepare(`UPDATE change_requests SET effectiveness_result = ?, effectiveness_notes = ?, effectiveness_check_date = datetime('now'), status = ?, closed_at = ${closedAt ? closedAt : 'closed_at'}, updated_at = datetime('now') WHERE id = ?`)
      .run(effectiveness_result, effectiveness_notes || '', newStatus, req.params.id);

    const updated = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    logAudit(req, 'effectiveness_change_request', 'change_requests', req.params.id, cr.request_id, { new_values: { effectiveness_result } });
    broadcast('change_request_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// DELETE /api/change-requests/:id (admin only, draft status only)
router.delete('/change-requests/:id', requireRole('admin'), async (req, res) => {
  try {
    const cr = await db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    if (cr.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft change requests can be deleted' });
    }

    await db.prepare("DELETE FROM capas WHERE source_type = 'change_request' AND source_id = ?").run(cr.id);
    await db.prepare('DELETE FROM change_requests WHERE id = ?').run(cr.id);

    logAudit(req, 'delete_change_request', 'change_requests', cr.id, cr.request_id, { old_values: cr });
    broadcast('change_request_deleted', { id: cr.id, request_id: cr.request_id });
    res.json({ success: true, message: 'Change request ' + cr.request_id + ' deleted' });
  } catch (err) {
    console.error('Delete change request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DEVIATION REPORTS ====================

// GET /api/deviations
router.get('/deviations', async (req, res) => {
  try {
    const { status, classification, category, search } = req.query;
    let query = 'SELECT * FROM deviation_reports WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (classification) { query += ' AND classification = ?'; params.push(classification); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search) {
      query += ' AND (report_id LIKE ? OR title LIKE ? OR description LIKE ? OR discovered_by LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.prepare(query).all(...params);

    const enriched = [];
    for (const r of rows) {
      const capaRow = await db.prepare("SELECT COUNT(*) as count FROM capas WHERE source_type = 'deviation' AND source_id = ?").get(r.id);
      enriched.push({ ...r, capaCount: capaRow.count });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deviations/:id
router.get('/deviations/:id', async (req, res) => {
  try {
    const dev = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const capas = await db.prepare("SELECT * FROM capas WHERE source_type = 'deviation' AND source_id = ? ORDER BY id").all(dev.id);

    // Parse linked IDs and fetch full records
    const linkedComplaintIds = JSON.parse(dev.linked_complaints_json || '[]');
    const linkedComplaints = linkedComplaintIds.length > 0
      ? await db.prepare(`SELECT id, complaint_number, reporter, issue_type, date_received, status FROM complaints WHERE id IN (${linkedComplaintIds.map(() => '?').join(',')})`).all(...linkedComplaintIds)
      : [];

    const linkedSopIds = JSON.parse(dev.linked_sops_json || '[]');
    const linkedSops = linkedSopIds.length > 0
      ? await db.prepare(`SELECT id, sop_number, title, status FROM sops WHERE id IN (${linkedSopIds.map(() => '?').join(',')})`).all(...linkedSopIds)
      : [];

    const linkedBatchTestIds = JSON.parse(dev.linked_batch_tests_json || '[]');
    const linkedBatchTests = linkedBatchTestIds.length > 0
      ? await db.prepare(`SELECT id, batch_number, test_date, status FROM batch_tests WHERE id IN (${linkedBatchTestIds.map(() => '?').join(',')})`).all(...linkedBatchTestIds)
      : [];

    res.json({
      ...dev,
      affected_batches: JSON.parse(dev.affected_batches || '[]'),
      affected_products: JSON.parse(dev.affected_products || '[]'),
      capas,
      linked_complaints: linkedComplaints,
      linked_sops: linkedSops,
      linked_batch_tests: linkedBatchTests,
      linked_complaints_json: dev.linked_complaints_json || '[]',
      linked_sops_json: dev.linked_sops_json || '[]',
      linked_batch_tests_json: dev.linked_batch_tests_json || '[]',
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations
router.post('/deviations', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      title, description, category, discovered_by, discovered_at,
      location = '', immediate_action = '',
      is_ccp_deviation = 0, process_stopped = 0, product_on_hold = 0,
      affected_batches = [], affected_products = [],
      investigation_due_date = null
    } = sanitized;

    if (!title || !description || !category || !discovered_by || !discovered_at) {
      return res.status(400).json({ error: 'title, description, category, discovered_by, and discovered_at are required' });
    }

    const report_id = await nextId('deviation');

    const info = await db.prepare(`
      INSERT INTO deviation_reports (report_id, title, description, category, discovered_by, discovered_at, location, immediate_action, is_ccp_deviation, process_stopped, product_on_hold, affected_batches, affected_products, investigation_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(report_id, title, description, category, discovered_by, discovered_at, location, immediate_action, is_ccp_deviation ? 1 : 0, process_stopped ? 1 : 0, product_on_hold ? 1 : 0, JSON.stringify(affected_batches), JSON.stringify(affected_products), investigation_due_date);

    const created = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(info.lastInsertRowid);
    logAudit(req, 'create_deviation', 'deviation_reports', created.id, report_id, { new_values: { report_id, title, category, discovered_by } });
    broadcast('deviation_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/deviations/:id
router.put('/deviations/:id', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'title', 'description', 'category', 'status', 'discovered_by', 'discovered_at',
      'location', 'immediate_action', 'is_ccp_deviation', 'process_stopped', 'product_on_hold',
      'root_cause_method', 'root_cause', 'scope_assessment',
      'product_disposition', 'disposition_rationale', 'investigation_due_date',
      'escalated_from_minor', 'linked_complaints_json', 'linked_sops_json', 'linked_batch_tests_json'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    if (sanitized.affected_batches !== undefined) {
      updates.push('affected_batches = ?');
      params.push(typeof sanitized.affected_batches === 'string' ? sanitized.affected_batches : JSON.stringify(sanitized.affected_batches));
    }
    if (sanitized.affected_products !== undefined) {
      updates.push('affected_products = ?');
      params.push(typeof sanitized.affected_products === 'string' ? sanitized.affected_products : JSON.stringify(sanitized.affected_products));
    }

    updates.push("updated_at = datetime('now')");
    if (updates.length === 1) return res.json(dev);

    params.push(req.params.id);
    await db.prepare(`UPDATE deviation_reports SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    // Build old_values from fields that changed
    const old_values = {};
    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== dev[field]) {
        old_values[field] = dev[field];
      }
    }
    logAudit(req, 'update_deviation', 'deviation_reports', req.params.id, dev.report_id, { old_values, new_values: sanitized });
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/deviations/:id
router.delete('/deviations/:id', requireRole('admin'), async (req, res) => {
  try {
    const dev = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    await db.prepare('DELETE FROM deviation_reports WHERE id = ?').run(req.params.id);
    logAudit(req, 'delete_deviation', 'deviation_reports', req.params.id, dev.report_id, { deleted: dev.title });
    broadcast('deviation_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations/:id/classify
router.post('/deviations/:id/classify', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { classification } = req.body;
    if (!classification) return res.status(400).json({ error: 'classification is required' });

    await db.prepare(`UPDATE deviation_reports SET classification = ?, status = 'under_investigation', updated_at = datetime('now') WHERE id = ?`)
      .run(classification, req.params.id);

    const updated = await db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    logAudit(req, 'classify_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { classification } });
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations/:id/investigate
router.post('/deviations/:id/investigate', requireWriteAccess, (req, res) => {
  try {
    const dev = db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { root_cause_method, root_cause, scope_assessment } = req.body;

    db.prepare(`UPDATE deviation_reports SET root_cause_method = ?, root_cause = ?, scope_assessment = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(root_cause_method || null, root_cause || '', scope_assessment || '', req.params.id);

    const updated = db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    logAudit(req, 'investigate_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { root_cause_method, root_cause } });
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations/:id/disposition
router.post('/deviations/:id/disposition', requireWriteAccess, (req, res) => {
  try {
    const dev = db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { product_disposition, disposition_rationale } = req.body;
    if (!product_disposition) return res.status(400).json({ error: 'product_disposition is required' });

    db.prepare(`UPDATE deviation_reports SET product_disposition = ?, disposition_rationale = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(product_disposition, disposition_rationale || '', req.params.id);

    const updated = db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(req.params.id);
    logAudit(req, 'disposition_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { product_disposition } });
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CAPAs ====================

// GET /api/capas
router.get('/capas', async (req, res) => {
  try {
    const { status, source_type, overdue, search } = req.query;
    let query = 'SELECT * FROM capas WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (source_type) { query += ' AND source_type = ?'; params.push(source_type); }
    if (overdue === 'true') {
      query += " AND status NOT IN ('completed','closed') AND target_date < date('now')";
    }
    if (search) {
      query += ' AND (capa_id LIKE ? OR corrective_action LIKE ? OR preventive_action LIKE ? OR responsible_person LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.prepare(query).all(...params);

    // Enrich with source reference
    const enriched = rows.map(r => {
      let source_ref = '';
      if (r.source_type === 'change_request') {
        const cr = db.prepare('SELECT request_id, title FROM change_requests WHERE id = ?').get(r.source_id);
        source_ref = cr ? cr.request_id : '';
      } else if (r.source_type === 'deviation') {
        const dev = db.prepare('SELECT report_id, title FROM deviation_reports WHERE id = ?').get(r.source_id);
        source_ref = dev ? dev.report_id : '';
      }
      const isOverdue = !['completed', 'closed'].includes(r.status) && r.target_date && new Date(r.target_date) < new Date();
      return { ...r, source_ref, isOverdue };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/capas/:id
router.get('/capas/:id', (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    // Get activity log
    capa.updates = db.prepare('SELECT * FROM capa_updates WHERE capa_id = ? ORDER BY created_at DESC').all(capa.id);

    // Get linked batch tests
    let linkedTests = [];
    try {
      const testIds = JSON.parse(capa.linked_batch_tests || '[]');
      if (testIds.length > 0) {
        const placeholders = testIds.map(() => '?').join(',');
        linkedTests = db.prepare(`SELECT id, batch_number, product_name, test_date, status, linked_retest_of, retest_reason FROM batch_tests WHERE batch_number IN (${placeholders})`).all(...testIds);
      }
    } catch(e) {}
    capa.linked_tests = linkedTests;

    // Get linked complaints (via change request OR direct JSON linkage)
    let linkedComplaints = [];
    try {
      if (capa.source_type === 'change_request' && capa.source_id) {
        linkedComplaints = db.prepare('SELECT c.* FROM complaints c JOIN ccr_complaints cc ON c.id = cc.complaint_id JOIN ccrs ccr ON cc.ccr_id = ccr.id WHERE ccr.change_request_id = ?').all(capa.source_id);
      }
    } catch(e) {}
    // Also get directly linked complaints
    try {
      const directIds = JSON.parse(capa.linked_complaints_json || '[]');
      if (directIds.length > 0) {
        const placeholders = directIds.map(() => '?').join(',');
        const directComplaints = db.prepare('SELECT * FROM complaints WHERE id IN (' + placeholders + ')').all(...directIds);
        // Merge without duplicates
        const existingIds = new Set(linkedComplaints.map(c => c.id));
        for (const dc of directComplaints) {
          if (!existingIds.has(dc.id)) linkedComplaints.push(dc);
        }
      }
    } catch(e) {}
    capa.linked_complaints = linkedComplaints;

    res.json(capa);
  } catch (err) {
    console.error('Get CAPA error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/capas', requireWriteAccess, (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      source_type = 'deviation', source_id = null, corrective_action = '', preventive_action = '',
      responsible_person, target_date, linked_change_request_id = null,
      title = '', description = '', classification = 'major', root_cause_analysis = '',
      risk_assessment = 'medium', investigation_details = '', verification_method = '',
      priority = 'medium', initiated_by = '', department = '', category = '',
      linked_complaints_json = '[]'
    } = sanitized;

    if (!responsible_person || !target_date) {
      return res.status(400).json({ error: 'responsible_person and target_date are required' });
    }

    const capa_id = nextId('capa');
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const info = db.prepare(`
      INSERT INTO capas (capa_id, source_type, source_id, corrective_action, preventive_action,
        responsible_person, target_date, linked_change_request_id,
        title, description, classification, root_cause_analysis, risk_assessment,
        investigation_details, verification_method, priority, initiated_by, department, category,
        linked_complaints_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(capa_id, source_type, source_id, corrective_action, preventive_action,
      responsible_person, target_date, linked_change_request_id,
      title, description, classification, root_cause_analysis, risk_assessment,
      investigation_details, verification_method, priority, initiated_by, department, category,
      linked_complaints_json, now, now);

    const created = db.prepare('SELECT * FROM capas WHERE id = ?').get(info.lastInsertRowid);
    logAudit(req, 'create_capa', 'capas', created.id, capa_id, { new_values: { capa_id, title, source_type, source_id, responsible_person } });
    broadcast('capa_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/capas/:id
// DEBUG LOG
router.put('/capas/:id', requireContentAccess, (req, res) => { console.log('[CAPA PUT] id=' + req.params.id + ' body=' + JSON.stringify(req.body));
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const sanitized = sanitizeBody(req.body);
    const isAdmin = req.session.user.role === 'admin';
    // Content fields - operators can edit these
    const contentFields = [
      'corrective_action', 'preventive_action', 'description',
      'root_cause_analysis', 'investigation_details', 'containment_action',
      'root_cause_method', 'verification_method', 'effectiveness_notes', 'risk_assessment'
    ];
    // Admin-only fields
    const adminFields = [
      'capa_id', 'source_type', 'source_id', 'responsible_person',
      'target_date', 'actual_completion_date', 'status', 'linked_change_request_id',
      'effectiveness_check_date', 'effectiveness_result',
      'title', 'classification', 'priority', 'initiated_by',
      'department', 'category', 'linked_complaints_json'
    ];
    const fields = isAdmin ? [...contentFields, ...adminFields] : contentFields;

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    updates.push("updated_at = datetime('now')");
    if (updates.length === 1) return res.json(capa);

    params.push(req.params.id);
    db.prepare(`UPDATE capas SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    logAudit(req, 'update_capa', 'capas', req.params.id, capa.capa_id, { old_values: {}, new_values: sanitized });
    broadcast('capa_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/capas/:id/effectiveness
// POST /capas/:id/updates - Add an update/note to a CAPA
router.post('/capas/:id/updates', requireContentAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { content, update_type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const result = db.prepare('INSERT INTO capa_updates (capa_id, update_type, content, created_by) VALUES (?, ?, ?, ?)').run(
      capa.id, update_type || 'note', content, req.session.user.username
    );
    const update = db.prepare('SELECT * FROM capa_updates WHERE id = ?').get(result.lastInsertRowid);
    db.prepare("UPDATE capas SET updated_at = datetime('now') WHERE id = ?").run(capa.id);
    res.json(update);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/suggest-links - AI-suggest related batches and complaints
router.get('/capas/:id/suggest-links', (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    
    // Extract keywords from CAPA text
    const capaText = (capa.corrective_action + ' ' + capa.preventive_action + ' ' + (capa.effectiveness_notes || '')).toLowerCase();
    
    // Find matching batch tests by keyword overlap
    const allBatches = db.prepare('SELECT id, batch_number, product_name, test_date, status, notes FROM batch_tests ORDER BY test_date DESC LIMIT 100').all();
    const suggestedBatchIds = [];
    
    for (const bt of allBatches) {
      let score = 0;
      const btText = ((bt.batch_number || '') + ' ' + (bt.product_name || '') + ' ' + (bt.notes || '')).toLowerCase();
      
      // Check for lot number mentions
      if (capaText.includes(bt.batch_number.toLowerCase())) score += 10;
      
      // Check for product name overlap
      if (bt.product_name && capaText.includes(bt.product_name.toLowerCase())) score += 3;
      
      // Check for keyword matches
      const keywords = ['fail', 'enterobacteriaceae', 'leak', 'seal', 'odour', 'spoilage', 'mold', 'contamination', 'retest'];
      for (const kw of keywords) {
        if (capaText.includes(kw) && btText.includes(kw)) score += 2;
      }
      
      // Failed batch tests are more relevant
      if (bt.status === 'fail') score += 5;
      
      if (score >= 3) suggestedBatchIds.push(bt.id);
    }
    
    // Find matching complaints
    const allComplaints = db.prepare('SELECT id, complaint_number, issue_type, product_name, description, status FROM complaints ORDER BY id DESC LIMIT 100').all();
    const suggestedComplaintIds = [];
    
    for (const c of allComplaints) {
      let score = 0;
      const cText = ((c.issue_type || '') + ' ' + (c.product_name || '') + ' ' + (c.description || '')).toLowerCase();
      
      // Keyword matching
      const issueKeywords = {
        'leak': ['leak', 'seal', 'packaging'],
        'odour': ['odour', 'smell', 'sulfur', 'spoilage'],
        'seal': ['seal', 'lid', 'leak', 'packaging'],
        'mold': ['mold', 'mould', 'fungal'],
        'fermentation': ['ferment', 'bloat', 'gas', 'pressure', 'explosion'],
        'illness': ['illness', 'adverse', 'sick'],
      };
      
      for (const [capaKw, complaintKws] of Object.entries(issueKeywords)) {
        if (capaText.includes(capaKw)) {
          for (const ckw of complaintKws) {
            if (cText.includes(ckw)) { score += 3; break; }
          }
        }
      }
      
      // Product name overlap
      if (c.product_name && capaText.includes(c.product_name.toLowerCase())) score += 2;
      
      // Open complaints more relevant
      if (c.status === 'investigating' || c.status === 'open') score += 1;
      
      if (score >= 3) suggestedComplaintIds.push(c.id);
    }
    
    res.json({ suggestedBatchIds, suggestedComplaintIds });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /capas/:id/link-complaint - Link a complaint to a CAPA
router.put('/capas/:id/link-complaint', requireWriteAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { complaint_id } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id required' });
    
    // Store in a linking table or JSON field
    let linked = [];
    try { linked = JSON.parse(capa.linked_complaints_json || '[]'); } catch(e) {}
    if (!linked.includes(Number(complaint_id))) linked.push(Number(complaint_id));
    db.prepare("UPDATE capas SET linked_complaints_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(linked), capa.id);
    
    res.json({ success: true, linked_complaints: linked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/capas/:id (admin only)
router.delete('/capas/:id', requireRole('admin'), (req, res) => {
  try {
    const paramId = parseInt(req.params.id);
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(paramId);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    db.prepare('DELETE FROM capa_updates WHERE capa_id = ?').run(paramId);
    db.prepare('DELETE FROM capas WHERE id = ?').run(paramId);
    logAudit(req, 'delete_capa', 'capas', paramId, capa.capa_id, { old_values: capa });
    broadcast('capa_deleted', { id: paramId });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /capas/:id/link-complaint/:complaintId - Unlink a complaint
router.delete('/capas/:id/link-complaint/:complaintId', requireWriteAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    let linked = [];
    try { linked = JSON.parse(capa.linked_complaints_json || '[]'); } catch(e) {}
    linked = linked.filter(id => id !== Number(req.params.complaintId));
    db.prepare("UPDATE capas SET linked_complaints_json = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(linked), capa.id);
    res.json({ success: true, linked_complaints: linked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/available-complaints - Get complaints available to link
router.get('/capas/:id/available-complaints', (req, res) => {
  try {
    const complaints = db.prepare('SELECT id, complaint_number, issue_type, product_name, status, date_received FROM complaints ORDER BY id DESC LIMIT 50').all();
    res.json(complaints);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/available-batches - Get batch tests available to link
router.get('/capas/:id/available-batches', (req, res) => {
  try {
    const batches = db.prepare('SELECT id, batch_number, product_name, test_date, status FROM batch_tests ORDER BY test_date DESC LIMIT 50').all();
    res.json(batches);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /capas/:id/link-batch - Link a batch test to a CAPA
router.put('/capas/:id/link-batch', requireWriteAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { batch_id, batch_number } = req.body;
    
    // Support both batch_id (number) and batch_number (string)
    let batchRef = batch_number;
    if (batch_id && !batch_number) {
      const batch = db.prepare('SELECT batch_number FROM batch_tests WHERE id = ?').get(batch_id);
      batchRef = batch ? batch.batch_number : String(batch_id);
    }
    
    let linked = [];
    try { linked = JSON.parse(capa.linked_batch_tests || '[]'); } catch(e) {}
    if (!linked.includes(batchRef)) linked.push(batchRef);
    db.prepare("UPDATE capas SET linked_batch_tests = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(linked), capa.id);
    
    // Also update the batch test record
    if (batch_id) {
      db.prepare('UPDATE batch_tests SET linked_capa_id = ? WHERE id = ?').run(capa.capa_id, batch_id);
    } else if (batchRef) {
      db.prepare('UPDATE batch_tests SET linked_capa_id = ? WHERE batch_number = ?').run(capa.capa_id, batchRef);
    }
    
    logAudit(req, 'link_batch_to_capa', 'capas', capa.id, capa.capa_id, { batch_id, batch_number: batchRef });
    res.json({ success: true, linked_batch_tests: linked });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/capas/:id/effectiveness', requireWriteAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { effectiveness_result, effectiveness_notes } = req.body;
    if (!effectiveness_result) return res.status(400).json({ error: 'effectiveness_result is required' });

    const newStatus = effectiveness_result === 'effective' ? 'closed' : 'in_progress';

    db.prepare(`UPDATE capas SET effectiveness_result = ?, effectiveness_notes = ?, effectiveness_check_date = datetime('now'), status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(effectiveness_result, effectiveness_notes || '', newStatus, req.params.id);

    const updated = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    logAudit(req, 'effectiveness_capa', 'capas', req.params.id, capa.capa_id, { new_values: { effectiveness_result } });
    broadcast('capa_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// ==================== CAPA SECTION COMMENTS ====================

// GET /capas/:id/comments - Get all comments for a CAPA (optionally filtered by section)
router.get('/capas/:id/comments', (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { section } = req.query;
    let comments;
    if (section) {
      comments = db.prepare('SELECT * FROM capa_comments WHERE capa_id = ? AND section = ? ORDER BY created_at ASC').all(req.params.id, section);
    } else {
      comments = db.prepare('SELECT * FROM capa_comments WHERE capa_id = ? ORDER BY created_at ASC').all(req.params.id);
    }
    res.json(comments);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /capas/:id/comments - Add a section comment
router.post('/capas/:id/comments', requireContentAccess, (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { section, comment } = req.body;
    if (!section || !comment) return res.status(400).json({ error: 'section and comment are required' });

    const author = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = db.prepare('INSERT INTO capa_comments (capa_id, section, author, comment) VALUES (?, ?, ?, ?)').run(req.params.id, section, author, comment);
    const newComment = db.prepare('SELECT * FROM capa_comments WHERE id = ?').get(result.lastInsertRowid);

    logAudit(req, 'add_capa_comment', 'capa_comments', newComment.id, capa.capa_id, { section, comment: comment.substring(0, 100) });
    res.status(201).json(newComment);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==================== CAPA ATTACHMENTS ====================

// GET /capas/:id/attachments - List all attachments for a CAPA
router.get('/capas/:id/attachments', (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const attachments = db.prepare('SELECT * FROM capa_attachments WHERE capa_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(attachments);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /capas/:id/attachments - Upload a file attachment
router.post('/capas/:id/attachments', requireContentAccess, capaUpload.single('file'), (req, res) => {
  try {
    const capa = db.prepare('SELECT * FROM capas WHERE id = ?').get(req.params.id);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const uploader = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = db.prepare('INSERT INTO capa_attachments (capa_id, filename, original_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, uploader);

    const attachment = db.prepare('SELECT * FROM capa_attachments WHERE id = ?').get(result.lastInsertRowid);
    logAudit(req, 'upload_capa_attachment', 'capa_attachments', attachment.id, capa.capa_id, { filename: req.file.originalname });
    res.status(201).json(attachment);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// DELETE /capas/:id/attachments/:attachmentId - Delete an attachment (admin only)
router.delete('/capas/:id/attachments/:attachmentId', requireRole('admin'), async (req, res) => {
  try {
    const attachment = db.prepare('SELECT * FROM capa_attachments WHERE id = ? AND capa_id = ?').get(req.params.attachmentId, req.params.id);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    db.prepare('DELETE FROM capa_attachments WHERE id = ?').run(req.params.attachmentId);
    // Try to delete the physical file
    try {
      const { unlinkSync } = await import('fs');
      const fpath = join(capaUploadsDir, attachment.filename);
      if (existsSync(fpath)) unlinkSync(fpath);
    } catch (e) { console.warn('Could not delete file:', e.message); }

    logAudit(req, 'delete_capa_attachment', 'capa_attachments', req.params.attachmentId, null, { filename: attachment.original_name });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==================== DASHBOARD ====================

// GET /api/change-control/dashboard
router.get('/change-control/dashboard', (req, res) => {
  try {
    const openCCs = db.prepare("SELECT COUNT(*) as count FROM change_requests WHERE status NOT IN ('closed','rejected')").get().count;
    const openDEVs = db.prepare("SELECT COUNT(*) as count FROM deviation_reports WHERE status != 'closed'").get().count;
    const overdueCAPAs = db.prepare("SELECT COUNT(*) as count FROM capas WHERE status NOT IN ('completed','closed') AND target_date < date('now')").get().count;

    const countsByClassification = {
      change_requests: db.prepare("SELECT classification, COUNT(*) as count FROM change_requests WHERE classification IS NOT NULL GROUP BY classification").all(),
      deviations: db.prepare("SELECT classification, COUNT(*) as count FROM deviation_reports WHERE classification IS NOT NULL GROUP BY classification").all(),
    };

    const recentActivity = [
      ...db.prepare("SELECT id, request_id as ref_id, title, 'change_request' as type, status, created_at FROM change_requests ORDER BY created_at DESC LIMIT 5").all(),
      ...db.prepare("SELECT id, report_id as ref_id, title, 'deviation' as type, status, created_at FROM deviation_reports ORDER BY created_at DESC LIMIT 5").all(),
      ...db.prepare("SELECT id, capa_id as ref_id, corrective_action as title, 'capa' as type, status, created_at FROM capas ORDER BY created_at DESC LIMIT 5").all(),
    ].sort((a, b) => b.created_at?.localeCompare(a.created_at)).slice(0, 10);

    res.json({ openCCs, openDEVs, overdueCAPAs, recentActivity, countsByClassification });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
