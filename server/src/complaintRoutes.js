import { Router } from 'express';
import db from './database-pg.js';
import { broadcast } from './websocket.js';
import { requireWriteAccess, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { sanitizeBody } from './sanitize.js';

const router = Router();

// Ensure status history table exists
await db.exec(`
  CREATE TABLE IF NOT EXISTS complaint_status_history (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  )
`);

// ==================== COMPLAINTS ====================

// GET /api/complaints
router.get('/complaints', async (req, res) => {
  try {
    const { status, severity, product_sku, source, lot_number, search, date_from, date_to, issue_type, include_archived } = req.query;
    let query = 'SELECT * FROM complaints WHERE 1=1';
    if (include_archived !== 'true') { query += ' AND (archived = 0 OR archived IS NULL)'; }
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (severity) { query += ' AND severity = ?'; params.push(severity); }
    if (product_sku) { query += ' AND product_sku = ?'; params.push(product_sku); }
    if (source) { query += ' AND source LIKE ?'; params.push(`%${source}%`); }
    if (issue_type) { query += ' AND issue_type = ?'; params.push(issue_type); }
    if (lot_number) { query += ' AND lot_number = ?'; params.push(lot_number); }
    if (date_from) { query += ' AND date_received >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND date_received <= ?'; params.push(date_to); }
    if (search) {
      query += ' AND (complaint_number LIKE ? OR description LIKE ? OR reporter LIKE ? OR store_location LIKE ? OR lot_number LIKE ? OR product_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ' ORDER BY date_received DESC, id DESC';
    const complaints = await db.all(query, params);
    res.json(complaints);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/complaints/analytics
router.get('/complaints/analytics', async (req, res) => {
  try {
    const byProduct = await db.all(`
      SELECT product_name, product_sku, COUNT(*) as count
      FROM complaints GROUP BY product_sku ORDER BY count DESC
    `);

    const byIssueType = await db.all(`
      SELECT issue_type, COUNT(*) as count
      FROM complaints GROUP BY issue_type ORDER BY count DESC
    `);

    const bySource = await db.all(`
      SELECT source, COUNT(*) as count
      FROM complaints GROUP BY source ORDER BY count DESC
    `);

    const bySeverity = await db.all(`
      SELECT severity, COUNT(*) as count
      FROM complaints GROUP BY severity ORDER BY count DESC
    `);

    const byStatus = await db.all(`
      SELECT status, COUNT(*) as count
      FROM complaints GROUP BY status ORDER BY count DESC
    `);

    const byMonth = await db.all(`
      SELECT strftime('%Y-%m', date_received) as month, COUNT(*) as count
      FROM complaints GROUP BY month ORDER BY month
    `);

    const byLot = await db.all(`
      SELECT lot_number, product_name, product_sku, COUNT(*) as count, GROUP_CONCAT(complaint_number) as complaint_numbers
      FROM complaints WHERE lot_number != '' GROUP BY lot_number ORDER BY count DESC
    `);

    const totalOpenRow = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('resolved','closed')");
    const totalOpen = totalOpenRow.count;
    const totalAllRow = await db.get('SELECT COUNT(*) as count FROM complaints');
    const totalAll = totalAllRow.count;
    const totalResolvedRow = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status IN ('resolved','closed')");
    const totalResolved = totalResolvedRow.count;

    // Average resolution time (for resolved/closed complaints)
    const avgResolution = await db.get(`
      SELECT AVG(julianday(updated_at) - julianday(date_received)) as avg_days
      FROM complaints WHERE status IN ('resolved','closed')
    `);

    res.json({
      byProduct, byIssueType, bySource, bySeverity, byStatus, byMonth, byLot,
      totalOpen, totalAll, totalResolved,
      avgResolutionDays: avgResolution?.avg_days ? Math.round(avgResolution.avg_days) : null,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/complaints/by-lot/:lot
router.get('/complaints/by-lot/:lot', async (req, res) => {
  try {
    const complaints = await db.all('SELECT * FROM complaints WHERE lot_number = ? ORDER BY date_received DESC', [req.params.lot]);
    res.json(complaints);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/complaints/:id
router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Get linked CCR info if exists
    let linkedCCR = null;
    if (complaint.linked_ccr_id) {
      linkedCCR = await db.get('SELECT id, ccr_number, title, status FROM ccrs WHERE id = ?', [complaint.linked_ccr_id]);
    }

    // Get comments
    const comments = await db.all('SELECT * FROM complaint_comments WHERE complaint_id = ? ORDER BY created_at ASC', [req.params.id]);

    res.json({ ...complaint, linkedCCR, comments });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/complaints
router.post('/complaints', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      date_received, source = '', reporter = '', store_location = '',
      product_sku = '', product_name = '', lot_number = '', best_before = '',
      quantity_affected = 0, issue_type = '', severity = 'low',
      description = '', status = 'open', assigned_to = ''
    } = sanitized;

    if (!date_received) return res.status(400).json({ error: 'date_received is required' });

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` });
    }

    // Generate complaint number
    const year = new Date(date_received).getFullYear();
    const lastInYear = await db.get(
      "SELECT complaint_number FROM complaints WHERE complaint_number LIKE ? ORDER BY complaint_number DESC LIMIT 1", [`KK-CMP-${year}-%`]
    );

    let seq = 1;
    if (lastInYear) {
      const parts = lastInYear.complaint_number.split('-');
      seq = parseInt(parts[3], 10) + 1;
    }
    const complaint_number = `KK-CMP-${year}-${String(seq).padStart(3, '0')}`;

    const sessionUser = req.session?.user;
    const createdBy = sessionUser?.display_name || sessionUser?.username || '';

    const info = await db.run(`
      INSERT INTO complaints (complaint_number, date_received, source, reporter, store_location, product_sku, product_name, lot_number, best_before, quantity_affected, issue_type, severity, description, status, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [complaint_number, date_received, source, reporter, store_location, product_sku, product_name, lot_number, best_before, quantity_affected, issue_type, severity, description, status, assigned_to, createdBy]);

    const created = await db.get('SELECT * FROM complaints WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_complaints', 'complaints', created.id, complaint_number, { new_values: { complaint_number, date_received, source, reporter, product_name, lot_number, severity, status, assigned_to } });
    broadcast('complaint_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/complaints/:id
router.put('/complaints/:id', requireWriteAccess, async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'date_received', 'source', 'reporter', 'store_location', 'product_sku',
      'product_name', 'lot_number', 'best_before', 'quantity_affected',
      'issue_type', 'severity', 'description', 'status', 'linked_ccr_id', 'assigned_to'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    // User attribution
    const sessionUser = req.session?.user;
    updates.push('updated_by = ?');
    params.push(sessionUser?.display_name || sessionUser?.username || '');

    updates.push("updated_at = datetime('now')");

    if (updates.length === 2) return res.json(complaint); // only updated_by + updated_at = no real change

    params.push(req.params.id);
    await db.run(`UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);

    // Audit log with old/new values
    const oldVals = {};
    const newVals = {};
    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== complaint[field]) {
        oldVals[field] = complaint[field];
        newVals[field] = sanitized[field];
      }
    }
    if (Object.keys(oldVals).length > 0) {
      logAudit(req, 'update_complaints', 'complaints', req.params.id, complaint.complaint_number, { old_values: oldVals, new_values: newVals });
    }

    // If status changed via edit form, record in status history
    if (sanitized.status !== undefined && sanitized.status !== complaint.status) {
      await db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason) VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, complaint.status, sanitized.status, sessionUser?.display_name || sessionUser?.username || '', 'Updated via edit form']);
    }

    broadcast('complaint_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/complaints/:id (admin only)

// PATCH /api/complaints/:id/archive
router.patch('/complaints/:id/archive', requireWriteAccess, async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (complaint.archived === 1) return res.json({ message: 'Already archived', complaint });

    const sessionUser = req.session?.user;
    const updatedBy = sessionUser?.display_name || sessionUser?.username || '';
    await db.run("UPDATE complaints SET archived = 1, updated_by = ?, updated_at = datetime('now') WHERE id = ?", [updatedBy, req.params.id]);
    const updated = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);

    logAudit(req, 'archive_complaint', 'complaints', updated.id, updated.complaint_number, { old_values: { archived: 0 }, new_values: { archived: 1 } });
    broadcast({ type: 'complaint_archived', complaint: updated });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/complaints/:id/unarchive
router.patch('/complaints/:id/unarchive', requireWriteAccess, async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (!complaint.archived) return res.json({ message: 'Not archived', complaint });

    const sessionUser = req.session?.user;
    const updatedBy = sessionUser?.display_name || sessionUser?.username || '';
    await db.run("UPDATE complaints SET archived = 0, updated_by = ?, updated_at = datetime('now') WHERE id = ?", [updatedBy, req.params.id]);
    const updated = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);

    logAudit(req, 'unarchive_complaint', 'complaints', updated.id, updated.complaint_number, { old_values: { archived: 1 }, new_values: { archived: 0 } });
    broadcast({ type: 'complaint_unarchived', complaint: updated });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/complaints/:id', requireRole('admin'), async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    await db.run('DELETE FROM ccr_complaints WHERE complaint_id = ?', [req.params.id]);
    await db.run('DELETE FROM complaints WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete_complaints', 'complaints', req.params.id, complaint.complaint_number, { old_values: complaint });
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// ==================== COMPLAINT COMMENTS ====================

// GET /api/complaints/:id/comments
router.get('/complaints/:id/comments', async (req, res) => {
  try {
    const complaint = await db.get('SELECT id FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const comments = await db.all('SELECT * FROM complaint_comments WHERE complaint_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(comments);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/complaints/:id/comments
router.post('/complaints/:id/comments', requireWriteAccess, async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const sanitized = sanitizeBody(req.body);
    const { comment = '', attachment_path = '', email_ref = '' } = sanitized;
    if (!comment.trim()) return res.status(400).json({ error: 'comment is required' });

    const sessionUser = req.session?.user;
    const author = sessionUser?.display_name || sessionUser?.username || '';

    const info = await db.run(
      "INSERT INTO complaint_comments (complaint_id, author, comment, attachment_path, email_ref) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, author, comment.trim(), attachment_path, email_ref]);

    const created = await db.get('SELECT * FROM complaint_comments WHERE id = ?', [info.lastInsertRowid]);

    // Update complaint updated_at
    await db.run("UPDATE complaints SET updated_at = datetime('now') WHERE id = ?", [req.params.id]);

    logAudit(req, 'add_comment', 'complaints', req.params.id, complaint.complaint_number, { new_values: { comment: comment.trim(), author } });
    broadcast('complaint_comment_added', { complaint_id: req.params.id, complaint_number: complaint.complaint_number, comment: created });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/complaints/:id/comments/:commentId (admin only)
router.delete('/complaints/:id/comments/:commentId', requireRole('admin'), async (req, res) => {
  try {
    const comment = await db.get('SELECT * FROM complaint_comments WHERE id = ? AND complaint_id = ?', [req.params.commentId, req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    await db.run('DELETE FROM complaint_comments WHERE id = ?', [req.params.commentId]);

    const complaint = await db.get('SELECT complaint_number FROM complaints WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete_comment', 'complaints', req.params.id, complaint?.complaint_number, { old_values: { comment: comment.comment, author: comment.author } });
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMPLAINT STATUS HISTORY ====================

// GET /api/complaints/:id/status-history
router.get('/complaints/:id/status-history', async (req, res) => {
  try {
    const complaint = await db.get('SELECT id FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const history = await db.all('SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(history);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/complaints/:id/timeline
router.get('/complaints/:id/timeline', async (req, res) => {
  try {
    const complaint = await db.get('SELECT id FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const statusChangesRaw = await db.all(
      'SELECT id, "status_change" as type, old_status, new_status, changed_by as actor, reason, created_at FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC',
      [req.params.id]);
    const statusChanges = statusChangesRaw.map(r => ({ ...r, type: 'status_change' }));

    const commentsRaw = await db.all(
      'SELECT id, "comment" as type, author as actor, comment, created_at FROM complaint_comments WHERE complaint_id = ? ORDER BY created_at ASC',
      [req.params.id]);
    const comments = commentsRaw.map(r => ({ ...r, type: 'comment' }));

    const fieldEditsRaw = await db.all(
      "SELECT id, 'field_edit' as type, username as actor, old_values, new_values, timestamp as created_at FROM audit_logs WHERE resource_type = 'complaints' AND resource_id = ? AND action = 'update_complaints' ORDER BY timestamp ASC",
      [String(req.params.id)]);
    const fieldEdits = fieldEditsRaw.map(r => ({ ...r, type: 'field_edit' }));

    const timeline = [...statusChanges, ...comments, ...fieldEdits].sort((a, b) => {
      return new Date(a.created_at) - new Date(b.created_at);
    });

    res.json(timeline);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/complaints/:id/status
router.post('/complaints/:id/status', requireWriteAccess, async (req, res) => {
  try {
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const sanitized = sanitizeBody(req.body);
    const { status, reason = '' } = sanitized;

    const VALID_STATUSES = ['open', 'investigating', 'corrective_action', 'resolved', 'closed'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const sessionUser = req.session?.user;
    const changedBy = sessionUser?.display_name || sessionUser?.username || '';
    const oldStatus = complaint.status;

    await db.run("UPDATE complaints SET status = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?",
      [status, changedBy, req.params.id]);

    await db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, reason) VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, oldStatus, status, changedBy, reason]);

    const updated = await db.get('SELECT * FROM complaints WHERE id = ?', [req.params.id]);

    logAudit(req, 'status_change', 'complaints', req.params.id, complaint.complaint_number, {
      old_values: { status: oldStatus },
      new_values: { status, reason },
    });
    broadcast('complaint_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CCRs ====================

// GET /api/ccrs
router.get('/ccrs', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM ccrs WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (ccr_number LIKE ? OR title LIKE ? OR recipient_company LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY date_created DESC';
    const ccrs = await db.all(query, params);

    // Enrich with complaint count and action stats
    const enriched = [];
    for (const ccr of ccrs) {
      const complaintCountRow = await db.get('SELECT COUNT(*) as count FROM ccr_complaints WHERE ccr_id = ?', [ccr.id]);
      const complaintCount = complaintCountRow.count;
      const actions = await db.all('SELECT * FROM corrective_actions WHERE ccr_id = ?', [ccr.id]);
      const totalActions = actions.length;
      const completedActions = actions.filter(a => a.status === 'completed').length;
      const overdueActions = actions.filter(a => a.status === 'overdue' || (a.target_date && a.status !== 'completed' && new Date(a.target_date) < new Date())).length;

      enriched.push({ ...ccr, complaintCount, totalActions, completedActions, overdueActions });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ccrs/:id
router.get('/ccrs/:id', async (req, res) => {
  try {
    const ccr = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!ccr) return res.status(404).json({ error: 'CCR not found' });

    const complaints = await db.all(`
      SELECT c.* FROM complaints c
      JOIN ccr_complaints cc ON c.id = cc.complaint_id
      WHERE cc.ccr_id = ?
      ORDER BY c.date_received DESC
    `, [req.params.id]);

    const actions = await db.all('SELECT * FROM corrective_actions WHERE ccr_id = ? ORDER BY id', [req.params.id]);

    res.json({
      ...ccr,
      root_causes: JSON.parse(ccr.root_causes || '[]'),
      preventive_measures: JSON.parse(ccr.preventive_measures || '[]'),
      complaints,
      actions,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ccrs
router.post('/ccrs', requireWriteAccess, async (req, res) => {
  try {
    const {
      title, date_created, status = 'draft',
      recipient_company = '', recipient_contact = '', recipient_email = '',
      root_causes = [], preventive_measures = [],
      target_resolution_date = null, notes = '', complaint_ids = []
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const year = new Date(date_created || Date.now()).getFullYear();
    const lastInYear = await db.get(
      "SELECT ccr_number FROM ccrs WHERE ccr_number LIKE ? ORDER BY ccr_number DESC LIMIT 1", [`KK-CCR-${year}-%`]
    );

    let seq = 1;
    if (lastInYear) {
      const parts = lastInYear.ccr_number.split('-');
      seq = parseInt(parts[3], 10) + 1;
    }
    const ccr_number = `KK-CCR-${year}-${String(seq).padStart(3, '0')}`;

    const sessionUser = req.session?.user;
    const createdBy = sessionUser?.display_name || sessionUser?.username || '';

    const info = await db.run(`
      INSERT INTO ccrs (ccr_number, title, date_created, status, recipient_company, recipient_contact, recipient_email, root_causes, preventive_measures, target_resolution_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ccr_number, title, date_created || new Date().toISOString().slice(0, 10), status, recipient_company, recipient_contact, recipient_email, JSON.stringify(root_causes), JSON.stringify(preventive_measures), target_resolution_date, notes, createdBy]);

    const ccrId = info.lastInsertRowid;

    // Link complaints
    for (const cId of complaint_ids) {
      await db.run('INSERT INTO ccr_complaints (ccr_id, complaint_id) VALUES (?, ?)', [ccrId, cId]);
      await db.run('UPDATE complaints SET linked_ccr_id = ? WHERE id = ?', [ccrId, cId]);
    }

    const created = await db.get('SELECT * FROM ccrs WHERE id = ?', [ccrId]);
    logAudit(req, 'create_ccrs', 'ccrs', ccrId, ccr_number, { new_values: { ccr_number, title, status, recipient_company, complaint_ids } });
    broadcast('ccr_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/ccrs/:id
router.put('/ccrs/:id', requireWriteAccess, async (req, res) => {
  try {
    const ccr = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!ccr) return res.status(404).json({ error: 'CCR not found' });

    const fields = [
      'title', 'date_created', 'status', 'recipient_company', 'recipient_contact',
      'recipient_email', 'target_resolution_date', 'actual_resolution_date', 'notes'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    // Handle JSON fields
    if (req.body.root_causes !== undefined) {
      updates.push('root_causes = ?');
      params.push(JSON.stringify(req.body.root_causes));
    }
    if (req.body.preventive_measures !== undefined) {
      updates.push('preventive_measures = ?');
      params.push(JSON.stringify(req.body.preventive_measures));
    }

    // User attribution
    const sessionUser = req.session?.user;
    updates.push('updated_by = ?');
    params.push(sessionUser?.display_name || sessionUser?.username || '');

    updates.push("updated_at = datetime('now')");
    if (updates.length === 2) return res.json(ccr); // only updated_by + updated_at = no real change

    params.push(req.params.id);
    await db.run(`UPDATE ccrs SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);

    // Audit log with old/new values
    const ccrOld = {};
    const ccrNew = {};
    for (const field of fields) {
      if (req.body[field] !== undefined && req.body[field] !== ccr[field]) {
        ccrOld[field] = ccr[field];
        ccrNew[field] = req.body[field];
      }
    }
    if (req.body.root_causes !== undefined) { ccrOld.root_causes = ccr.root_causes; ccrNew.root_causes = JSON.stringify(req.body.root_causes); }
    if (req.body.preventive_measures !== undefined) { ccrOld.preventive_measures = ccr.preventive_measures; ccrNew.preventive_measures = JSON.stringify(req.body.preventive_measures); }
    if (Object.keys(ccrOld).length > 0) {
      logAudit(req, 'update_ccrs', 'ccrs', req.params.id, ccr.ccr_number, { old_values: ccrOld, new_values: ccrNew });
    }

    broadcast('ccr_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ccrs/:id/complaints - link complaints to CCR
router.post('/ccrs/:id/complaints', requireWriteAccess, async (req, res) => {
  try {
    const ccr = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!ccr) return res.status(404).json({ error: 'CCR not found' });

    const { complaint_ids = [] } = req.body;

    for (const cId of complaint_ids) {
      await db.run('INSERT OR IGNORE INTO ccr_complaints (ccr_id, complaint_id) VALUES (?, ?)', [req.params.id, cId]);
      await db.run('UPDATE complaints SET linked_ccr_id = ? WHERE id = ?', [req.params.id, cId]);
    }

    const complaints = await db.all(`
      SELECT c.* FROM complaints c JOIN ccr_complaints cc ON c.id = cc.complaint_id WHERE cc.ccr_id = ?
    `, [req.params.id]);

    logAudit(req, 'link_complaints', 'ccrs', req.params.id, ccr.ccr_number, { new_values: { linked_complaint_ids: complaint_ids } });
    res.json(complaints);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ccrs/:id/actions
router.get('/ccrs/:id/actions', async (req, res) => {
  try {
    const actions = await db.all('SELECT * FROM corrective_actions WHERE ccr_id = ? ORDER BY id', [req.params.id]);
    res.json(actions);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/ccrs/:id/actions
router.post('/ccrs/:id/actions', requireWriteAccess, async (req, res) => {
  try {
    const ccr = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!ccr) return res.status(404).json({ error: 'CCR not found' });

    const { description, responsible = '', target_date = null, status = 'pending', notes = '' } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const sessionUser = req.session?.user;
    const createdBy = sessionUser?.display_name || sessionUser?.username || '';

    const info = await db.run(`
      INSERT INTO corrective_actions (ccr_id, description, responsible, target_date, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, description, responsible, target_date, status, notes, createdBy]);

    const created = await db.get('SELECT * FROM corrective_actions WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_action', 'corrective_actions', created.id, ccr.ccr_number, { new_values: { ccr_id: req.params.id, description, responsible, target_date, status } });
    broadcast('action_created', { ...created, ccr_number: ccr.ccr_number });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/ccrs/:id/actions/:actionId
router.put('/ccrs/:id/actions/:actionId', requireWriteAccess, async (req, res) => {
  try {
    const action = await db.get('SELECT * FROM corrective_actions WHERE id = ? AND ccr_id = ?', [req.params.actionId, req.params.id]);
    if (!action) return res.status(404).json({ error: 'Action not found' });

    const fields = ['description', 'responsible', 'target_date', 'completion_date', 'status', 'notes'];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    // User attribution
    const sessionUser = req.session?.user;
    updates.push('updated_by = ?');
    params.push(sessionUser?.display_name || sessionUser?.username || '');

    updates.push("updated_at = datetime('now')");
    if (updates.length === 2) return res.json(action); // only updated_by + updated_at = no real change

    params.push(req.params.actionId);
    await db.run(`UPDATE corrective_actions SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM corrective_actions WHERE id = ?', [req.params.actionId]);

    // Audit log with old/new values
    const actOld = {};
    const actNew = {};
    for (const field of fields) {
      if (req.body[field] !== undefined && req.body[field] !== action[field]) {
        actOld[field] = action[field];
        actNew[field] = req.body[field];
      }
    }
    if (Object.keys(actOld).length > 0) {
      logAudit(req, 'update_action', 'corrective_actions', req.params.actionId, action.description?.slice(0, 60), { old_values: actOld, new_values: actNew });
    }

    broadcast('action_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ccrs/:id (admin only)
router.delete('/ccrs/:id', requireRole('admin'), async (req, res) => {
  try {
    const ccr = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!ccr) return res.status(404).json({ error: 'CCR not found' });

    await db.run('UPDATE complaints SET linked_ccr_id = NULL WHERE linked_ccr_id = ?', [req.params.id]);
    await db.run('DELETE FROM ccr_complaints WHERE ccr_id = ?', [req.params.id]);
    await db.run('DELETE FROM corrective_actions WHERE ccr_id = ?', [req.params.id]);
    await db.run('DELETE FROM ccrs WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete_ccrs', 'ccrs', req.params.id, ccr.ccr_number, { old_values: ccr });
    res.json({ success: true, message: `CCR ${ccr.ccr_number} deleted` });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/ccrs/:id/actions/:actionId (admin only)
router.delete('/ccrs/:id/actions/:actionId', requireRole('admin'), async (req, res) => {
  try {
    const action = await db.get('SELECT * FROM corrective_actions WHERE id = ? AND ccr_id = ?', [req.params.actionId, req.params.id]);
    if (!action) return res.status(404).json({ error: 'Action not found' });

    await db.run('DELETE FROM corrective_actions WHERE id = ?', [req.params.actionId]);
    logAudit(req, 'delete_action', 'corrective_actions', req.params.actionId, action.description?.slice(0, 60), { old_values: action });
    res.json({ success: true, message: 'Corrective action deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== QA DASHBOARD ====================

// GET /api/qa-dashboard
router.get('/qa-dashboard', async (req, res) => {
  try {
    // Complaint stats
    const totalComplaints = (await db.get('SELECT COUNT(*) as count FROM complaints')).count;
    const openComplaints = (await db.get("SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('resolved','closed')")).count;

    const complaintsBySeverity = await db.all(`
      SELECT severity, COUNT(*) as count FROM complaints GROUP BY severity
    `);

    const complaintsByProduct = await db.all(`
      SELECT product_name, product_sku, COUNT(*) as count FROM complaints GROUP BY product_sku ORDER BY count DESC
    `);

    // Trend data - last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const complaintTrend = await db.all(`
      SELECT strftime('%Y-%m', date_received) as month, COUNT(*) as count
      FROM complaints WHERE date_received >= ?
      GROUP BY month ORDER BY month
    `, [sixMonthsAgo.toISOString().slice(0, 10)]);

    // CCR stats
    const totalCCRs = (await db.get('SELECT COUNT(*) as count FROM ccrs')).count;
    const openCCRs = (await db.get("SELECT COUNT(*) as count FROM ccrs WHERE status NOT IN ('closed')")).count;

    const overdueActions = (await db.get(`
      SELECT COUNT(*) as count FROM corrective_actions
      WHERE status NOT IN ('completed') AND target_date < date('now')
    `)).count;

    const totalActions = (await db.get('SELECT COUNT(*) as count FROM corrective_actions')).count;
    const completedActions = (await db.get("SELECT COUNT(*) as count FROM corrective_actions WHERE status = 'completed'")).count;

    // Top affected lots
    const topLots = await db.all(`
      SELECT lot_number, product_name, COUNT(*) as count
      FROM complaints WHERE lot_number != ''
      GROUP BY lot_number ORDER BY count DESC LIMIT 5
    `);

    // Recent activity
    const recentComplaints = await db.all(`
      SELECT id, complaint_number, date_received, product_name, issue_type, severity, status, created_at
      FROM complaints ORDER BY created_at DESC LIMIT 5
    `);

    const recentCCRUpdates = await db.all(`
      SELECT id, ccr_number, title, status, updated_at
      FROM ccrs ORDER BY updated_at DESC LIMIT 5
    `);

    res.json({
      complaints: { total: totalComplaints, open: openComplaints, bySeverity: complaintsBySeverity, byProduct: complaintsByProduct, trend: complaintTrend },
      ccrs: { total: totalCCRs, open: openCCRs, overdueActions, totalActions, completedActions, resolutionRate: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0 },
      topLots,
      recentComplaints,
      recentCCRUpdates,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
