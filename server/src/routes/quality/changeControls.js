import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess, requireRole, requireContentAccess } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { uploadFile, downloadFile, deleteFile } from '../../supabase.js';

const capaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.test(ext)) { cb(null, true); }
    else { cb(new Error('File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG')); }
  }
});

const deviationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (capa_id) REFERENCES capas(id) ON DELETE CASCADE
)`);

// ── Ensure deviation_attachments table exists ──
await db.exec(`CREATE TABLE IF NOT EXISTS deviation_attachments (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
await db.exec(`CREATE INDEX IF NOT EXISTS idx_deviation_attachments_dev ON deviation_attachments(deviation_id)`);

// ── Ensure deviation_comments table exists ──
await db.exec(`CREATE TABLE IF NOT EXISTS deviation_comments (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_change', 'system')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
await db.exec(`CREATE INDEX IF NOT EXISTS idx_deviation_comments_dev ON deviation_comments(deviation_id)`);

// ── Ensure deviation_approvals table exists ──
await db.exec(`CREATE TABLE IF NOT EXISTS deviation_approvals (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('investigation', 'disposition', 'closure')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  signature_meaning TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);
await db.exec(`CREATE INDEX IF NOT EXISTS idx_deviation_approvals_dev ON deviation_approvals(deviation_id)`);

// ──── Sequence helper ────
async function nextId(type) {
  const year = new Date().getFullYear();
  const row = await db.get('SELECT next_number FROM qms_sequence WHERE type = ? AND year = ?', [type, year]);
  let num;
  if (row) {
    num = row.next_number;
    await db.run('UPDATE qms_sequence SET next_number = ? WHERE type = ? AND year = ?', [num + 1, type, year]);
  } else {
    num = 1;
    await db.run('INSERT INTO qms_sequence (type, year, next_number) VALUES (?, ?, ?)', [type, year, 2]);
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
      query += ' AND (request_id ILIKE ? OR title ILIKE ? OR description ILIKE ? OR initiator ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);

    // Batch-fetch CAPA counts instead of N+1
    let capaCounts = {};
    const crIds = rows.map(r => r.id);
    if (crIds.length > 0) {
      const placeholders = crIds.map((_, i) => `$${i + 1}`).join(',');
      const capaRows = await db.all(
        `SELECT source_id, COUNT(*) as count FROM capas WHERE source_type = 'change_request' AND source_id IN (${placeholders}) GROUP BY source_id`,
        crIds
      );
      for (const row of capaRows) {
        capaCounts[row.source_id] = parseInt(row.count);
      }
    }
    const enriched = rows.map(r => ({ ...r, capaCount: capaCounts[r.id] || 0 }));

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/change-requests/:id
router.get('/change-requests/:id', async (req, res) => {
  try {
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const capas = await db.all("SELECT * FROM capas WHERE source_type = 'change_request' AND source_id = ? ORDER BY id", [cr.id]);

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

    const info = await db.run(`
      INSERT INTO change_requests (request_id, title, description, category, initiator, proposed_effective_date, affected_documents, training_required, is_emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [request_id, title, description, category, initiator, proposed_effective_date, JSON.stringify(affected_documents), training_required ? 1 : 0, is_emergency ? 1 : 0]);

    const created = await db.get('SELECT * FROM change_requests WHERE id = ?', [info.lastInsertRowid]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(cr);

    params.push(req.params.id);
    await db.run(`UPDATE change_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { classification, food_safety_impact } = req.body;
    if (!classification) return res.status(400).json({ error: 'classification is required' });

    await db.run(`UPDATE change_requests SET classification = ?, food_safety_impact = ?, status = 'pending_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [classification, JSON.stringify(food_safety_impact || {}), req.params.id]);

    const updated = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const sessionUser = req.session?.user;
    const approvedBy = sessionUser?.display_name || sessionUser?.username || '';

    await db.run(`UPDATE change_requests SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [approvedBy, req.params.id]);

    const updated = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: 'rejection_reason is required' });

    await db.run(`UPDATE change_requests SET status = 'rejected', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [rejection_reason, req.params.id]);

    const updated = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    const { effectiveness_result, effectiveness_notes } = req.body;
    if (!effectiveness_result) return res.status(400).json({ error: 'effectiveness_result is required' });

    const newStatus = effectiveness_result === 'effective' ? 'closed' : 'implementing';
    const closedAt = effectiveness_result === 'effective' ? "CURRENT_TIMESTAMP" : null;

    await db.run(`UPDATE change_requests SET effectiveness_result = ?, effectiveness_notes = ?, effectiveness_check_date = CURRENT_TIMESTAMP, status = ?, closed_at = ${closedAt ? closedAt : 'closed_at'}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [effectiveness_result, effectiveness_notes || '', newStatus, req.params.id]);

    const updated = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
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
    const cr = await db.get('SELECT * FROM change_requests WHERE id = ?', [req.params.id]);
    if (!cr) return res.status(404).json({ error: 'Change request not found' });

    if (cr.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft change requests can be deleted' });
    }

    await db.run("DELETE FROM capas WHERE source_type = 'change_request' AND source_id = ?", [cr.id]);
    await db.run('DELETE FROM change_requests WHERE id = ?', [cr.id]);

    logAudit(req, 'delete_change_request', 'change_requests', cr.id, cr.request_id, { old_values: cr });
    broadcast('change_request_deleted', { id: cr.id, request_id: cr.request_id });
    res.json({ success: true, message: 'Change request ' + cr.request_id + ' deleted' });
  } catch (err) {
    console.error('Delete change request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DEVIATION REPORTS ====================

// GET /api/deviations/:id/audit-trail
router.get('/deviations/:id/audit-trail', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const logs = await db.all(
      "SELECT * FROM audit_logs WHERE resource_type = 'deviation_reports' AND resource_id = ? ORDER BY timestamp DESC",
      [String(req.params.id)]
    );
    res.json(logs);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

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
      query += ' AND (report_id ILIKE ? OR title ILIKE ? OR description ILIKE ? OR discovered_by ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);

    const deviationIds = rows.map(r => r.id);
    let capaCounts = {};
    if (deviationIds.length > 0) {
      const placeholders = deviationIds.map((_, i) => `$${i + 1}`).join(',');
      const capaRows = await db.all(
        `SELECT source_id, COUNT(*) as count FROM capas WHERE source_type = 'deviation' AND source_id IN (${placeholders}) GROUP BY source_id`,
        deviationIds
      );
      for (const row of capaRows) {
        capaCounts[row.source_id] = parseInt(row.count);
      }
    }
    const enriched = rows.map(r => ({ ...r, capaCount: capaCounts[r.id] || 0 }));

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/deviations/:id
router.get('/deviations/:id', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const capas = await db.all("SELECT * FROM capas WHERE source_type = 'deviation' AND source_id = ? ORDER BY id", [dev.id]);

    // Parse linked IDs and fetch full records
    const linkedComplaintIds = JSON.parse(dev.linked_complaints_json || '[]');
    const linkedComplaints = linkedComplaintIds.length > 0
      ? await db.all(`SELECT id, complaint_number, reporter, issue_type, date_received, status FROM complaints WHERE id IN (${linkedComplaintIds.map(() => '?').join(',')})`, linkedComplaintIds)
      : [];

    const linkedSopIds = JSON.parse(dev.linked_sops_json || '[]');
    const linkedSops = linkedSopIds.length > 0
      ? await db.all(`SELECT id, sop_number, title, status FROM sops WHERE id IN (${linkedSopIds.map(() => '?').join(',')})`, linkedSopIds)
      : [];

    const linkedBatchTestIds = JSON.parse(dev.linked_batch_tests_json || '[]');
    const linkedBatchTests = linkedBatchTestIds.length > 0
      ? await db.all(`SELECT id, batch_number, test_date, status FROM batch_tests WHERE id IN (${linkedBatchTestIds.map(() => '?').join(',')})`, linkedBatchTestIds)
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

    const info = await db.run(`
      INSERT INTO deviation_reports (report_id, title, description, category, discovered_by, discovered_at, location, immediate_action, is_ccp_deviation, process_stopped, product_on_hold, affected_batches, affected_products, investigation_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [report_id, title, description, category, discovered_by, discovered_at, location, immediate_action, is_ccp_deviation ? 1 : 0, process_stopped ? 1 : 0, product_on_hold ? 1 : 0, JSON.stringify(affected_batches), JSON.stringify(affected_products), investigation_due_date]);

    const created = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [info.lastInsertRowid]);
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
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
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

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(dev);

    params.push(req.params.id);
    await db.run(`UPDATE deviation_reports SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    // Build old_values from fields that changed
    const old_values = {};
    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== dev[field]) {
        old_values[field] = dev[field];
      }
    }
    logAudit(req, 'update_deviation', 'deviation_reports', req.params.id, dev.report_id, { old_values, new_values: sanitized });
    // System comment for status changes
    if (sanitized.status && sanitized.status !== dev.status) {
      addDeviationSystemComment(req.params.id, `Status changed from ${dev.status} to ${sanitized.status} by ${req.session?.user?.display_name || req.session?.user?.username || 'Unknown'}`);
    }
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/deviations/:id
router.delete('/deviations/:id', requireRole('admin'), async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    await db.run('DELETE FROM deviation_reports WHERE id = ?', [req.params.id]);
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
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { classification } = req.body;
    if (!classification) return res.status(400).json({ error: 'classification is required' });

    await db.run(`UPDATE deviation_reports SET classification = ?, status = 'under_investigation', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [classification, req.params.id]);

    const updated = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    logAudit(req, 'classify_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { classification } });
    addDeviationSystemComment(req.params.id, `Classification set to ${classification} by ${req.session?.user?.display_name || req.session?.user?.username || 'Unknown'}`);
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations/:id/investigate
router.post('/deviations/:id/investigate', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { root_cause_method, root_cause, scope_assessment } = req.body;

    await db.run(`UPDATE deviation_reports SET root_cause_method = ?, root_cause = ?, scope_assessment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [root_cause_method || null, root_cause || '', scope_assessment || '', req.params.id]);

    const updated = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    logAudit(req, 'investigate_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { root_cause_method, root_cause } });
    addDeviationSystemComment(req.params.id, `Investigation recorded by ${req.session?.user?.display_name || req.session?.user?.username || 'Unknown'}. Method: ${root_cause_method || 'N/A'}`);
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/deviations/:id/disposition
router.post('/deviations/:id/disposition', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { product_disposition, disposition_rationale } = req.body;
    if (!product_disposition) return res.status(400).json({ error: 'product_disposition is required' });

    await db.run(`UPDATE deviation_reports SET product_disposition = ?, disposition_rationale = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [product_disposition, disposition_rationale || '', req.params.id]);

    const updated = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    logAudit(req, 'disposition_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { product_disposition } });
    addDeviationSystemComment(req.params.id, `Product disposition set to ${product_disposition} by ${req.session?.user?.display_name || req.session?.user?.username || 'Unknown'}`);
    broadcast('deviation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helper: add a system comment to a deviation ──
async function addDeviationSystemComment(deviationId, content) {
  try {
    await db.run('INSERT INTO deviation_comments (deviation_id, author, content, comment_type) VALUES (?, ?, ?, ?)',
      [deviationId, 'System', content, 'system']);
  } catch(e) { console.error('System comment error:', e.message); }
}

// ==================== DEVIATION ATTACHMENTS ====================

// GET /api/deviations/:id/attachments
router.get('/deviations/:id/attachments', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    const rows = await db.all('SELECT * FROM deviation_attachments WHERE deviation_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/deviations/:id/attachments
router.post('/deviations/:id/attachments', requireWriteAccess, deviationUpload.single('file'), async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = req.file.originalname.split('.').pop();
    const storageFilename = 'dev-' + req.params.id + '-' + uniqueSuffix + '.' + ext;
    const storagePath = `deviation-attachments/${req.params.id}/${storageFilename}`;
    await uploadFile(storagePath, req.file.buffer, req.file.mimetype);

    const uploader = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const description = req.body.description || '';
    const result = await db.run(
      'INSERT INTO deviation_attachments (deviation_id, filename, original_name, file_size, mime_type, uploaded_by, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, storagePath, req.file.originalname, req.file.size, req.file.mimetype, uploader, description]
    );

    const attachment = await db.get('SELECT * FROM deviation_attachments WHERE id = ?', [result.lastInsertRowid]);
    logAudit(req, 'upload_deviation_attachment', 'deviation_reports', req.params.id, dev.report_id, { filename: req.file.originalname });
    addDeviationSystemComment(req.params.id, `${uploader} uploaded file: ${req.file.originalname}`);
    res.status(201).json(attachment);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /api/deviations/:id/attachments/:attachmentId/download
router.get('/deviations/:id/attachments/:attachmentId/download', async (req, res) => {
  try {
    const attachment = await db.get('SELECT * FROM deviation_attachments WHERE id = ? AND deviation_id = ?', [req.params.attachmentId, req.params.id]);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    const buffer = await downloadFile(attachment.filename);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
    res.send(buffer);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// DELETE /api/deviations/:id/attachments/:attachmentId
router.delete('/deviations/:id/attachments/:attachmentId', requireWriteAccess, async (req, res) => {
  try {
    const attachment = await db.get('SELECT * FROM deviation_attachments WHERE id = ? AND deviation_id = ?', [req.params.attachmentId, req.params.id]);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await db.run('DELETE FROM deviation_attachments WHERE id = ?', [req.params.attachmentId]);
    try { await deleteFile(attachment.filename); } catch(e) { console.warn('Storage delete error:', e.message); }

    logAudit(req, 'delete_deviation_attachment', 'deviation_reports', req.params.id, null, { filename: attachment.original_name });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==================== DEVIATION COMMENTS ====================

// GET /api/deviations/:id/comments
router.get('/deviations/:id/comments', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    const rows = await db.all('SELECT * FROM deviation_comments WHERE deviation_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/deviations/:id/comments
router.post('/deviations/:id/comments', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

    const author = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = await db.run(
      'INSERT INTO deviation_comments (deviation_id, author, content, comment_type) VALUES (?, ?, ?, ?)',
      [req.params.id, author, content.trim(), 'comment']
    );
    const comment = await db.get('SELECT * FROM deviation_comments WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(comment);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ==================== DEVIATION APPROVALS ====================

// GET /api/deviations/:id/approvals
router.get('/deviations/:id/approvals', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });
    const rows = await db.all('SELECT * FROM deviation_approvals WHERE deviation_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/deviations/:id/approvals — request approval
router.post('/deviations/:id/approvals', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const { approval_type } = req.body;
    if (!['investigation', 'disposition', 'closure'].includes(approval_type)) {
      return res.status(400).json({ error: 'approval_type must be investigation, disposition, or closure' });
    }

    const requestedBy = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = await db.run(
      'INSERT INTO deviation_approvals (deviation_id, approval_type, requested_by) VALUES (?, ?, ?)',
      [req.params.id, approval_type, requestedBy]
    );
    const approval = await db.get('SELECT * FROM deviation_approvals WHERE id = ?', [result.lastInsertRowid]);

    addDeviationSystemComment(req.params.id, `${requestedBy} requested ${approval_type} approval`);
    logAudit(req, 'request_deviation_approval', 'deviation_reports', req.params.id, dev.report_id, { new_values: { approval_type } });
    res.status(201).json(approval);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/deviations/:id/approvals/:approvalId — approve/reject with e-signature
router.put('/deviations/:id/approvals/:approvalId', requireWriteAccess, async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const approval = await db.get('SELECT * FROM deviation_approvals WHERE id = ? AND deviation_id = ?', [req.params.approvalId, req.params.id]);
    if (!approval) return res.status(404).json({ error: 'Approval not found' });
    if (approval.status !== 'pending') return res.status(400).json({ error: 'Approval already processed' });

    const { status, rejection_reason, password, signature_meaning } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });
    if (!password) return res.status(400).json({ error: 'Password required for e-signature' });

    // Verify password (e-signature)
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password — e-signature verification failed' });

    const approvedBy = req.session?.user?.display_name || req.session?.user?.username || '';

    await db.run(
      'UPDATE deviation_approvals SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?, signature_meaning = ? WHERE id = ?',
      [status, approvedBy, rejection_reason || null, signature_meaning || '', req.params.approvalId]
    );

    // Auto-advance deviation status on approval
    if (status === 'approved') {
      if (approval.approval_type === 'investigation') {
        await db.run("UPDATE deviation_reports SET status = 'pending_disposition', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        addDeviationSystemComment(req.params.id, `Investigation approved by ${approvedBy}. Status advanced to Pending Disposition.`);
      } else if (approval.approval_type === 'disposition') {
        await db.run("UPDATE deviation_reports SET status = 'pending_closure', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        addDeviationSystemComment(req.params.id, `Disposition approved by ${approvedBy}. Status advanced to Pending Closure.`);
      } else if (approval.approval_type === 'closure') {
        await db.run("UPDATE deviation_reports SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
        addDeviationSystemComment(req.params.id, `Closure approved by ${approvedBy}. Deviation closed.`);
      }
    } else {
      addDeviationSystemComment(req.params.id, `${approval.approval_type} rejected by ${approvedBy}: ${rejection_reason || ''}`);
    }

    logAudit(req, status === 'approved' ? 'approve_deviation' : 'reject_deviation', 'deviation_reports', req.params.id, dev.report_id, { new_values: { approval_type: approval.approval_type, status } });
    const updated = await db.get('SELECT * FROM deviation_approvals WHERE id = ?', [req.params.approvalId]);
    broadcast('deviation_updated', await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]));
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ==================== SIMILAR DEVIATIONS (Feature 5) ====================

// GET /api/deviations/:id/similar
router.get('/deviations/:id/similar', async (req, res) => {
  try {
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = ?', [req.params.id]);
    if (!dev) return res.status(404).json({ error: 'Deviation not found' });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoff = ninetyDaysAgo.toISOString();

    // Get all recent deviations except the current one
    const candidates = await db.all(
      'SELECT * FROM deviation_reports WHERE id != ? AND created_at >= ? ORDER BY created_at DESC',
      [req.params.id, cutoff]
    );

    // Parse current deviation's data
    const devProducts = (() => { try { return JSON.parse(dev.affected_products || '[]'); } catch(e) { return []; } })();
    const devBatches = (() => { try { return JSON.parse(dev.affected_batches || '[]'); } catch(e) { return []; } })();

    // Extract keywords from title and description
    const extractKeywords = (text) => {
      if (!text) return [];
      return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    };
    const devKeywords = [...new Set([...extractKeywords(dev.title), ...extractKeywords(dev.description)])];

    const results = [];
    for (const c of candidates) {
      const reasons = [];
      let score = 0;

      // Category match
      if (dev.category && c.category === dev.category) {
        reasons.push(`Same category: ${c.category}`);
        score += 5;
      }

      // Product overlap
      const cProducts = (() => { try { return JSON.parse(c.affected_products || '[]'); } catch(e) { return []; } })();
      const productOverlap = devProducts.filter(p => cProducts.includes(p));
      if (productOverlap.length > 0) {
        reasons.push(`Same product: ${productOverlap.join(', ')}`);
        score += 4;
      }

      // Location match
      if (dev.location && c.location && dev.location.toLowerCase() === c.location.toLowerCase()) {
        reasons.push(`Same location: ${c.location}`);
        score += 2;
      }

      // Keyword overlap in title/description
      const cKeywords = [...new Set([...extractKeywords(c.title), ...extractKeywords(c.description)])];
      const kwOverlap = devKeywords.filter(kw => cKeywords.includes(kw));
      if (kwOverlap.length >= 2) {
        reasons.push(`Keyword match: ${kwOverlap.slice(0, 3).join(', ')}`);
        score += Math.min(kwOverlap.length, 5);
      }

      if (score >= 3 && reasons.length > 0) {
        results.push({
          id: c.id,
          report_id: c.report_id,
          title: c.title,
          status: c.status,
          category: c.category,
          classification: c.classification,
          discovered_at: c.discovered_at,
          created_at: c.created_at,
          similarity_reasons: reasons,
          score
        });
      }
    }

    // Sort by score descending, limit to 10
    results.sort((a, b) => b.score - a.score);
    res.json(results.slice(0, 10));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
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
      query += " AND status NOT IN ('completed','closed') AND target_date < CURRENT_DATE";
    }
    if (search) {
      query += ' AND (capa_id ILIKE ? OR corrective_action ILIKE ? OR preventive_action ILIKE ? OR responsible_person ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);

    // Batch-fetch source references instead of N+1
    const crIds = [...new Set(rows.filter(r => r.source_type === 'change_request').map(r => r.source_id))];
    const devIds = [...new Set(rows.filter(r => r.source_type === 'deviation').map(r => r.source_id))];

    const crRefMap = {};
    if (crIds.length > 0) {
      const ph = crIds.map((_, i) => `$${i + 1}`).join(',');
      const crRows = await db.all(`SELECT id, request_id FROM change_requests WHERE id IN (${ph})`, crIds);
      for (const cr of crRows) { crRefMap[cr.id] = cr.request_id; }
    }

    const devRefMap = {};
    if (devIds.length > 0) {
      const ph = devIds.map((_, i) => `$${i + 1}`).join(',');
      const devRows = await db.all(`SELECT id, report_id FROM deviation_reports WHERE id IN (${ph})`, devIds);
      for (const d of devRows) { devRefMap[d.id] = d.report_id; }
    }

    const enriched = rows.map(r => {
      let source_ref = '';
      if (r.source_type === 'change_request') source_ref = crRefMap[r.source_id] || '';
      else if (r.source_type === 'deviation') source_ref = devRefMap[r.source_id] || '';
      const isOverdue = !['completed', 'closed'].includes(r.status) && r.target_date && new Date(r.target_date) < new Date();
      return { ...r, source_ref, isOverdue };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/capas/:id
router.get('/capas/:id', async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    // Get activity log
    capa.updates = await db.all('SELECT * FROM capa_updates WHERE capa_id = ? ORDER BY created_at DESC', [capa.id]);

    // Get linked batch tests
    let linkedTests = [];
    try {
      const testIds = JSON.parse(capa.linked_batch_tests || '[]');
      if (testIds.length > 0) {
        const placeholders = testIds.map(() => '?').join(',');
        linkedTests = await db.all(`SELECT id, batch_number, product_name, test_date, status, linked_retest_of, retest_reason FROM batch_tests WHERE batch_number IN (${placeholders})`, testIds);
      }
    } catch(e) {}
    capa.linked_tests = linkedTests;

    // Get linked complaints (via change request OR direct JSON linkage)
    let linkedComplaints = [];
    try {
      if (capa.source_type === 'change_request' && capa.source_id) {
        linkedComplaints = await db.all('SELECT c.* FROM complaints c JOIN ccr_complaints cc ON c.id = cc.complaint_id JOIN ccrs ccr ON cc.ccr_id = ccr.id WHERE ccr.change_request_id = ?', [capa.source_id]);
      }
    } catch(e) {}
    // Also get directly linked complaints
    try {
      const directIds = JSON.parse(capa.linked_complaints_json || '[]');
      if (directIds.length > 0) {
        const placeholders = directIds.map(() => '?').join(',');
        const directComplaints = await db.all('SELECT * FROM complaints WHERE id IN (' + placeholders + ')', directIds);
        // Merge without duplicates
        const existingIds = new Set(linkedComplaints.map(c => c.id));
        for (const dc of directComplaints) {
          if (!existingIds.has(dc.id)) linkedComplaints.push(dc);
        }
      }
    } catch(e) {}
    capa.linked_complaints = linkedComplaints;

    // Get action items
    capa.action_items = await db.all('SELECT * FROM capa_action_items WHERE capa_id = ? ORDER BY created_at ASC', [capa.id]);

    // Enrich source deviation info for bidirectional link
    if (capa.source_type === 'deviation' && capa.source_id) {
      try {
        const srcDev = await db.get('SELECT report_id, title FROM deviation_reports WHERE id = ?', [capa.source_id]);
        if (srcDev) {
          capa.source_deviation_report_id = srcDev.report_id;
          capa.source_deviation_title = srcDev.title;
        }
      } catch(e) {}
    }

    res.json(capa);
  } catch (err) {
    console.error('Get CAPA error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/capas', requireWriteAccess, async (req, res) => {
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

    // Coerce constrained fields to valid values or null
    const validClassifications = ['minor', 'major', 'critical'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const validRiskAssessments = ['low', 'medium', 'high', 'critical'];
    const safeClassification = validClassifications.includes(classification) ? classification : null;
    const safePriority = validPriorities.includes(priority) ? priority : 'medium';
    const safeRiskAssessment = validRiskAssessments.includes(risk_assessment) ? risk_assessment : null;

    const capa_id = await nextId('capa');
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const info = await db.run(`
      INSERT INTO capas (capa_id, source_type, source_id, corrective_action, preventive_action,
        responsible_person, target_date, linked_change_request_id,
        title, description, classification, root_cause_analysis, risk_assessment,
        investigation_details, verification_method, priority, initiated_by, department, category,
        linked_complaints_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [capa_id, source_type, source_id, corrective_action, preventive_action,
      responsible_person, target_date, linked_change_request_id,
      title, description, safeClassification, root_cause_analysis, safeRiskAssessment,
      investigation_details, verification_method, safePriority, initiated_by, department, category,
      linked_complaints_json, now, now]);

    const created = await db.get('SELECT * FROM capas WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_capa', 'capas', created.id, capa_id, { new_values: { capa_id, title, source_type, source_id, responsible_person } });
    // Add system comment to the source deviation if applicable
    if (source_type === 'deviation' && source_id) {
      addDeviationSystemComment(source_id, `CAPA ${capa_id} created from this deviation by ${req.session?.user?.display_name || req.session?.user?.username || 'Unknown'}`);
    }
    broadcast('capa_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/capas/:id
// DEBUG LOG
router.put('/capas/:id', requireContentAccess, async (req, res) => { console.log('[CAPA PUT] id=' + req.params.id + ' body=' + JSON.stringify(req.body));
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const sanitized = sanitizeBody(req.body);
    const isAdmin = req.session.user.role === 'admin';
    // Content fields - operators can edit these
    const contentFields = [
      'corrective_action', 'preventive_action', 'description',
      'root_cause_analysis', 'investigation_details', 'containment_action',
      'root_cause_method', 'verification_method', 'effectiveness_notes', 'risk_assessment',
      'root_cause_structured'
    ];
    // Admin-only fields
    const adminFields = [
      'source_type', 'source_id', 'responsible_person',
      'target_date', 'actual_completion_date', 'status', 'linked_change_request_id',
      'effectiveness_check_date', 'effectiveness_result',
      'title', 'classification', 'priority', 'initiated_by',
      'department', 'category', 'linked_complaints_json'
    ];
    const fields = isAdmin ? [...contentFields, ...adminFields] : contentFields;

    // Coerce constrained fields to valid values or null before update
    const constrainedValues = {
      classification: ['minor', 'major', 'critical'],
      priority: ['low', 'medium', 'high', 'critical'],
      risk_assessment: ['low', 'medium', 'high', 'critical'],
    };
    for (const [field, allowed] of Object.entries(constrainedValues)) {
      if (sanitized[field] !== undefined && !allowed.includes(sanitized[field])) {
        sanitized[field] = null;
      }
    }

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        // JSONB fields must be stringified for pg parameterized queries
        params.push(field === 'root_cause_structured' && typeof sanitized[field] === 'object'
          ? JSON.stringify(sanitized[field])
          : sanitized[field]);
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(capa);

    params.push(req.params.id);
    await db.run(`UPDATE capas SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_capa', 'capas', req.params.id, capa.capa_id, { old_values: {}, new_values: sanitized });
    broadcast('capa_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/capas/:id/effectiveness
// POST /capas/:id/updates - Add an update/note to a CAPA
router.post('/capas/:id/updates', requireContentAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { content, update_type } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const result = await db.run('INSERT INTO capa_updates (capa_id, update_type, content, created_by) VALUES (?, ?, ?, ?)',
      [capa.id, update_type || 'note', content, req.session.user.username]);
    const update = await db.get('SELECT * FROM capa_updates WHERE id = ?', [result.lastInsertRowid]);
    await db.run("UPDATE capas SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [capa.id]);
    res.json(update);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/suggest-links - AI-suggest related batches and complaints
router.get('/capas/:id/suggest-links', async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    // Extract keywords from CAPA text
    const capaText = (capa.corrective_action + ' ' + capa.preventive_action + ' ' + (capa.effectiveness_notes || '')).toLowerCase();

    // Find matching batch tests by keyword overlap
    const allBatches = await db.all('SELECT id, batch_number, product_name, test_date, status, notes FROM batch_tests ORDER BY test_date DESC LIMIT 100');
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
    const allComplaints = await db.all('SELECT id, complaint_number, issue_type, product_name, description, status FROM complaints ORDER BY id DESC LIMIT 100');
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
router.put('/capas/:id/link-complaint', requireWriteAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { complaint_id } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id required' });

    // Store in a linking table or JSON field
    let linked = [];
    try { linked = JSON.parse(capa.linked_complaints_json || '[]'); } catch(e) {}
    if (!linked.includes(Number(complaint_id))) linked.push(Number(complaint_id));
    await db.run("UPDATE capas SET linked_complaints_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(linked), capa.id]);
    
    res.json({ success: true, linked_complaints: linked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/capas/:id (admin only)
router.delete('/capas/:id', requireRole('admin'), async (req, res) => {
  try {
    const paramId = parseInt(req.params.id);
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [paramId]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    await db.run('DELETE FROM capa_updates WHERE capa_id = ?', [paramId]);
    await db.run('DELETE FROM capas WHERE id = ?', [paramId]);
    logAudit(req, 'delete_capa', 'capas', paramId, capa.capa_id, { old_values: capa });
    broadcast('capa_deleted', { id: paramId });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete CAPA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /capas/:id/link-complaint/:complaintId - Unlink a complaint
router.delete('/capas/:id/link-complaint/:complaintId', requireWriteAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    let linked = [];
    try { linked = JSON.parse(capa.linked_complaints_json || '[]'); } catch(e) {}
    linked = linked.filter(id => id !== Number(req.params.complaintId));
    await db.run("UPDATE capas SET linked_complaints_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(linked), capa.id]);
    res.json({ success: true, linked_complaints: linked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/available-complaints - Get complaints available to link
router.get('/capas/:id/available-complaints', async (req, res) => {
  try {
    const complaints = await db.all('SELECT id, complaint_number, issue_type, product_name, status, date_received FROM complaints ORDER BY id DESC LIMIT 50');
    res.json(complaints);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /capas/:id/available-batches - Get batch tests available to link
router.get('/capas/:id/available-batches', async (req, res) => {
  try {
    const batches = await db.all('SELECT id, batch_number, product_name, test_date, status FROM batch_tests ORDER BY test_date DESC LIMIT 50');
    res.json(batches);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /capas/:id/link-batch - Link a batch test to a CAPA
router.put('/capas/:id/link-batch', requireWriteAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const { batch_id, batch_number } = req.body;

    // Support both batch_id (number) and batch_number (string)
    let batchRef = batch_number;
    if (batch_id && !batch_number) {
      const batch = await db.get('SELECT batch_number FROM batch_tests WHERE id = ?', [batch_id]);
      batchRef = batch ? batch.batch_number : String(batch_id);
    }

    let linked = [];
    try { linked = JSON.parse(capa.linked_batch_tests || '[]'); } catch(e) {}
    if (!linked.includes(batchRef)) linked.push(batchRef);
    await db.run("UPDATE capas SET linked_batch_tests = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(linked), capa.id]);

    // Also update the batch test record
    if (batch_id) {
      await db.run('UPDATE batch_tests SET linked_capa_id = ? WHERE id = ?', [capa.capa_id, batch_id]);
    } else if (batchRef) {
      await db.run('UPDATE batch_tests SET linked_capa_id = ? WHERE batch_number = ?', [capa.capa_id, batchRef]);
    }
    
    logAudit(req, 'link_batch_to_capa', 'capas', capa.id, capa.capa_id, { batch_id, batch_number: batchRef });
    res.json({ success: true, linked_batch_tests: linked });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.post('/capas/:id/effectiveness', requireWriteAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { effectiveness_result, effectiveness_notes } = req.body;
    if (!effectiveness_result) return res.status(400).json({ error: 'effectiveness_result is required' });

    const newStatus = effectiveness_result === 'effective' ? 'closed' : 'in_progress';

    await db.run(`UPDATE capas SET effectiveness_result = ?, effectiveness_notes = ?, effectiveness_check_date = CURRENT_TIMESTAMP, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [effectiveness_result, effectiveness_notes || '', newStatus, req.params.id]);

    const updated = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    logAudit(req, 'effectiveness_capa', 'capas', req.params.id, capa.capa_id, { new_values: { effectiveness_result } });
    broadcast('capa_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// ==================== CAPA SECTION COMMENTS ====================

// GET /capas/:id/comments - Get all comments for a CAPA (optionally filtered by section)
router.get('/capas/:id/comments', async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { section } = req.query;
    let comments;
    if (section) {
      comments = await db.all('SELECT * FROM capa_comments WHERE capa_id = ? AND section = ? ORDER BY created_at ASC', [req.params.id, section]);
    } else {
      comments = await db.all('SELECT * FROM capa_comments WHERE capa_id = ? ORDER BY created_at ASC', [req.params.id]);
    }
    res.json(comments);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /capas/:id/comments - Add a section comment
router.post('/capas/:id/comments', requireContentAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { section, comment } = req.body;
    if (!section || !comment) return res.status(400).json({ error: 'section and comment are required' });

    const author = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = await db.run('INSERT INTO capa_comments (capa_id, section, author, comment) VALUES (?, ?, ?, ?)', [req.params.id, section, author, comment]);
    const newComment = await db.get('SELECT * FROM capa_comments WHERE id = ?', [result.lastInsertRowid]);

    logAudit(req, 'add_capa_comment', 'capa_comments', newComment.id, capa.capa_id, { section, comment: comment.substring(0, 100) });
    res.status(201).json(newComment);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==================== CAPA ATTACHMENTS ====================

// GET /capas/:id/attachments - List all attachments for a CAPA
router.get('/capas/:id/attachments', async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const attachments = await db.all('SELECT * FROM capa_attachments WHERE capa_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(attachments);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /capas/:id/attachments - Upload a file attachment
router.post('/capas/:id/attachments', requireContentAccess, capaUpload.single('file'), async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Upload to Supabase Storage
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = req.file.originalname.split('.').pop();
    const storageFilename = 'capa-' + req.params.id + '-' + uniqueSuffix + '.' + ext;
    const storagePath = `capa-docs/${req.params.id}/${storageFilename}`;
    await uploadFile(storagePath, req.file.buffer, req.file.mimetype);

    const uploader = req.session?.user?.display_name || req.session?.user?.username || 'Unknown';
    const result = await db.run('INSERT INTO capa_attachments (capa_id, filename, original_name, file_size, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, storagePath, req.file.originalname, req.file.size, req.file.mimetype, uploader]);

    const attachment = await db.get('SELECT * FROM capa_attachments WHERE id = ?', [result.lastInsertRowid]);
    logAudit(req, 'upload_capa_attachment', 'capa_attachments', attachment.id, capa.capa_id, { filename: req.file.originalname });
    res.status(201).json(attachment);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// DELETE /capas/:id/attachments/:attachmentId - Delete an attachment (admin only)
router.delete('/capas/:id/attachments/:attachmentId', requireRole('admin'), async (req, res) => {
  try {
    const attachment = await db.get('SELECT * FROM capa_attachments WHERE id = ? AND capa_id = ?', [req.params.attachmentId, req.params.id]);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await db.run('DELETE FROM capa_attachments WHERE id = ?', [req.params.attachmentId]);
    // Delete from Supabase Storage
    try {
      await deleteFile(attachment.filename);
    } catch (e) { console.warn('Could not delete file from storage:', e.message); }

    logAudit(req, 'delete_capa_attachment', 'capa_attachments', req.params.attachmentId, null, { filename: attachment.original_name });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ==================== DASHBOARD ====================

// GET /api/change-control/dashboard
router.get('/change-control/dashboard', async (req, res) => {
  try {
    const openCCs = (await db.get("SELECT COUNT(*) as count FROM change_requests WHERE status NOT IN ('closed','rejected')")).count;
    const openDEVs = (await db.get("SELECT COUNT(*) as count FROM deviation_reports WHERE status != 'closed'")).count;
    const overdueCAPAs = (await db.get("SELECT COUNT(*) as count FROM capas WHERE status NOT IN ('completed','closed') AND target_date < CURRENT_DATE")).count;

    const countsByClassification = {
      change_requests: await db.all("SELECT classification, COUNT(*) as count FROM change_requests WHERE classification IS NOT NULL GROUP BY classification"),
      deviations: await db.all("SELECT classification, COUNT(*) as count FROM deviation_reports WHERE classification IS NOT NULL GROUP BY classification"),
    };

    const recentActivity = [
      ...(await db.all("SELECT id, request_id as ref_id, title, 'change_request' as type, status, created_at FROM change_requests ORDER BY created_at DESC LIMIT 5")),
      ...(await db.all("SELECT id, report_id as ref_id, title, 'deviation' as type, status, created_at FROM deviation_reports ORDER BY created_at DESC LIMIT 5")),
      ...(await db.all("SELECT id, capa_id as ref_id, corrective_action as title, 'capa' as type, status, created_at FROM capas ORDER BY created_at DESC LIMIT 5")),
    ].sort((a, b) => b.created_at?.localeCompare(a.created_at)).slice(0, 10);

    res.json({ openCCs, openDEVs, overdueCAPAs, recentActivity, countsByClassification });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CAPA ACTION ITEMS ====================

// GET /api/capas/:id/action-items
router.get('/capas/:id/action-items', async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });
    const items = await db.all('SELECT * FROM capa_action_items WHERE capa_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(items);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/capas/:id/action-items
router.post('/capas/:id/action-items', requireWriteAccess, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const { title, description, assigned_to, due_date } = req.body;
    if (!title || !assigned_to) return res.status(400).json({ error: 'title and assigned_to are required' });

    const info = await db.run(
      `INSERT INTO capa_action_items (capa_id, title, description, assigned_to, due_date) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, title, description || null, assigned_to, due_date || null]
    );

    const created = await db.get('SELECT * FROM capa_action_items WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_capa_action_item', 'capa_action_items', created.id, capa.capa_id, { new_values: { title, assigned_to, due_date } });
    broadcast('capa_action_item_created', { ...created, capa_id: Number(req.params.id) });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/capas/:id/action-items/:itemId
router.put('/capas/:id/action-items/:itemId', requireWriteAccess, async (req, res) => {
  try {
    const item = await db.get('SELECT * FROM capa_action_items WHERE id = ? AND capa_id = ?', [req.params.itemId, req.params.id]);
    if (!item) return res.status(404).json({ error: 'Action item not found' });

    const fields = ['title', 'description', 'assigned_to', 'due_date', 'status'];
    const updates = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    // Set completed_at when status changes to completed
    if (req.body.status === 'completed' && item.status !== 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    } else if (req.body.status && req.body.status !== 'completed') {
      updates.push('completed_at = NULL');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    if (updates.length === 1) return res.json(item);

    params.push(req.params.itemId);
    await db.run(`UPDATE capa_action_items SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM capa_action_items WHERE id = ?', [req.params.itemId]);
    const capa = await db.get('SELECT capa_id FROM capas WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_capa_action_item', 'capa_action_items', req.params.itemId, capa?.capa_id, { old_values: { status: item.status }, new_values: req.body });
    broadcast('capa_action_item_updated', { ...updated, capa_id: Number(req.params.id) });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/capas/:id/action-items/:itemId
router.delete('/capas/:id/action-items/:itemId', requireWriteAccess, async (req, res) => {
  try {
    const item = await db.get('SELECT * FROM capa_action_items WHERE id = ? AND capa_id = ?', [req.params.itemId, req.params.id]);
    if (!item) return res.status(404).json({ error: 'Action item not found' });

    await db.run('DELETE FROM capa_action_items WHERE id = ?', [req.params.itemId]);
    const capa = await db.get('SELECT capa_id FROM capas WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete_capa_action_item', 'capa_action_items', req.params.itemId, capa?.capa_id, { deleted: item.title });
    broadcast('capa_action_item_deleted', { id: Number(req.params.itemId), capa_id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
