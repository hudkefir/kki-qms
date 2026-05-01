import { Router } from 'express';
import db from './database-pg.js';
import { broadcast } from './websocket.js';
import { requireWriteAccess, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { sanitizeBody } from './sanitize.js';

const router = Router();

// ──── Sequence helpers ────
async function nextRecallId() {
  const year = new Date().getFullYear();
  const row = await db.get('SELECT next_number FROM recall_sequence WHERE year = ?', [year]);
  let num;
  if (row) {
    num = row.next_number;
    await db.run('UPDATE recall_sequence SET next_number = ? WHERE year = ?', [num + 1, year]);
  } else {
    num = 1;
    await db.run('INSERT INTO recall_sequence (year, next_number) VALUES (?, ?)', [year, 2]);
  }
  return `RC-${year}-${String(num).padStart(3, '0')}`;
}

async function nextExerciseId() {
  const year = new Date().getFullYear();
  const row = await db.get('SELECT next_number FROM exercise_sequence WHERE year = ?', [year]);
  let num;
  if (row) {
    num = row.next_number;
    await db.run('UPDATE exercise_sequence SET next_number = ? WHERE year = ?', [num + 1, year]);
  } else {
    num = 1;
    await db.run('INSERT INTO exercise_sequence (year, next_number) VALUES (?, ?)', [year, 2]);
  }
  return `TE-${year}-${String(num).padStart(3, '0')}`;
}

async function nextCrisisId() {
  const year = new Date().getFullYear();
  const row = await db.get('SELECT next_number FROM crisis_sequence WHERE year = ?', [year]);
  let num;
  if (row) {
    num = row.next_number;
    await db.run('UPDATE crisis_sequence SET next_number = ? WHERE year = ?', [num + 1, year]);
  } else {
    num = 1;
    await db.run('INSERT INTO crisis_sequence (year, next_number) VALUES (?, ?)', [year, 2]);
  }
  return `CE-${year}-${String(num).padStart(3, '0')}`;
}

// ==================== RECALLS ====================

// GET /api/recalls
router.get('/recalls', async (req, res) => {
  try {
    const { status, classification, type, search } = req.query;
    let query = 'SELECT * FROM recalls WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (classification) { query += ' AND classification = ?'; params.push(classification); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (search) {
      query += ' AND (recall_id LIKE ? OR title LIKE ? OR trigger_description LIKE ? OR initiated_by LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);

    const enriched = [];
    for (const r of rows) {
      const distRow = await db.get('SELECT COUNT(*) as count FROM recall_distribution WHERE recall_id = ?', [r.id]);
      enriched.push({ ...r, distCount: distRow.count });
    }

    res.json(enriched);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recalls/:id
router.get('/recalls/:id', async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const distribution = await db.all('SELECT * FROM recall_distribution WHERE recall_id = ? ORDER BY id', [recall.id]);

    res.json({
      ...recall,
      affected_products: JSON.parse(recall.affected_products || '[]'),
      affected_lot_codes: JSON.parse(recall.affected_lot_codes || '[]'),
      affected_batch_ids: JSON.parse(recall.affected_batch_ids || '[]'),
      distribution,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls
router.post('/recalls', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      title, type, trigger_type, trigger_description, initiated_by,
      classification = null, affected_products = [], affected_lot_codes = [],
      affected_batch_ids = [], risk_assessment = null
    } = sanitized;

    if (!title || !type || !trigger_type || !trigger_description || !initiated_by) {
      return res.status(400).json({ error: 'title, type, trigger_type, trigger_description, and initiated_by are required' });
    }

    const recall_id = await nextRecallId();

    const info = await db.run(`
      INSERT INTO recalls (recall_id, title, type, classification, trigger_type, trigger_description, affected_products, affected_lot_codes, affected_batch_ids, risk_assessment, initiated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [recall_id, title, type, classification, trigger_type, trigger_description, JSON.stringify(affected_products), JSON.stringify(affected_lot_codes), JSON.stringify(affected_batch_ids), risk_assessment, initiated_by]);

    const created = await db.get('SELECT * FROM recalls WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_recall', 'recalls', created.id, recall_id, { new_values: { recall_id, title, type, trigger_type, initiated_by } });
    broadcast('recall_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/recalls/:id
router.put('/recalls/:id', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'title', 'type', 'classification', 'status', 'trigger_type', 'trigger_description',
      'root_cause', 'risk_assessment',
      'total_quantity_produced', 'total_quantity_shipped', 'total_quantity_onsite', 'total_quantity_accounted',
      'cfia_contact_name', 'cfia_reference_number',
      'product_disposition', 'disposition_date', 'disposition_witnessed_by',
      'linked_capa_id', 'initiated_by'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    for (const jsonField of ['affected_products', 'affected_lot_codes', 'affected_batch_ids']) {
      if (sanitized[jsonField] !== undefined) {
        updates.push(`${jsonField} = ?`);
        params.push(typeof sanitized[jsonField] === 'string' ? sanitized[jsonField] : JSON.stringify(sanitized[jsonField]));
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(recall);

    params.push(req.params.id);
    await db.run(`UPDATE recalls SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_recall', 'recalls', req.params.id, recall.recall_id, { old_values: {}, new_values: sanitized });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/hold
router.post('/recalls/:id/hold', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    await db.run(`UPDATE recalls SET status = 'hold_segregate', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'hold_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { status: 'hold_segregate' } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/notify-cfia
router.post('/recalls/:id/notify-cfia', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const { cfia_contact_name, cfia_reference_number } = req.body;

    await db.run(`UPDATE recalls SET status = 'cfia_notified', cfia_notified = 1, cfia_notified_at = CURRENT_TIMESTAMP, cfia_contact_name = ?, cfia_reference_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [cfia_contact_name || '', cfia_reference_number || '', req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'notify_cfia_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { cfia_contact_name, cfia_reference_number } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/notify-customers
router.post('/recalls/:id/notify-customers', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    await db.run(`UPDATE recalls SET status = 'customers_notified', customers_notified = 1, recall_notice_sent = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'notify_customers_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { customers_notified: 1 } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/effectiveness
router.post('/recalls/:id/effectiveness', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const { total_quantity_accounted } = req.body;

    await db.run(`UPDATE recalls SET status = 'effectiveness_check', total_quantity_accounted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [total_quantity_accounted || 0, req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'effectiveness_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { total_quantity_accounted } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/disposition
router.post('/recalls/:id/disposition', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const { product_disposition, disposition_witnessed_by } = req.body;
    if (!product_disposition) return res.status(400).json({ error: 'product_disposition is required' });

    await db.run(`UPDATE recalls SET product_disposition = ?, disposition_date = CURRENT_TIMESTAMP, disposition_witnessed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [product_disposition, disposition_witnessed_by || '', req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'disposition_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { product_disposition } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/close
router.post('/recalls/:id/close', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    await db.run(`UPDATE recalls SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]);

    const updated = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    logAudit(req, 'close_recall', 'recalls', req.params.id, recall.recall_id, { new_values: { status: 'closed' } });
    broadcast('recall_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== RECALL DISTRIBUTION ====================

// GET /api/recalls/:id/distribution
router.get('/recalls/:id/distribution', async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const rows = await db.all('SELECT * FROM recall_distribution WHERE recall_id = ? ORDER BY id', [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/recalls/:id/distribution
router.post('/recalls/:id/distribution', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const sanitized = sanitizeBody(req.body);
    const {
      customer_name, customer_address = '', contact_name = '', contact_phone = '',
      contact_email = '', customer_type = null, lot_codes_shipped = [],
      quantity_shipped = 0, notes = ''
    } = sanitized;

    if (!customer_name) return res.status(400).json({ error: 'customer_name is required' });

    const info = await db.run(`
      INSERT INTO recall_distribution (recall_id, customer_name, customer_address, contact_name, contact_phone, contact_email, customer_type, lot_codes_shipped, quantity_shipped, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, customer_name, customer_address, contact_name, contact_phone, contact_email, customer_type, JSON.stringify(lot_codes_shipped), quantity_shipped, notes]);

    const created = await db.get('SELECT * FROM recall_distribution WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'add_recall_distribution', 'recall_distribution', created.id, recall.recall_id, { new_values: { customer_name, quantity_shipped } });
    broadcast('recall_updated', { id: recall.id });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/recalls/:id/distribution/:distId
router.put('/recalls/:id/distribution/:distId', requireWriteAccess, async (req, res) => {
  try {
    const recall = await db.get('SELECT * FROM recalls WHERE id = ?', [req.params.id]);
    if (!recall) return res.status(404).json({ error: 'Recall not found' });

    const dist = await db.get('SELECT * FROM recall_distribution WHERE id = ? AND recall_id = ?', [req.params.distId, req.params.id]);
    if (!dist) return res.status(404).json({ error: 'Distribution record not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'customer_name', 'customer_address', 'contact_name', 'contact_phone',
      'contact_email', 'customer_type', 'quantity_shipped', 'quantity_accounted',
      'notified', 'notified_at', 'notified_method', 'action_taken',
      'receipt_confirmed', 'effective', 'notes'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    if (sanitized.lot_codes_shipped !== undefined) {
      updates.push('lot_codes_shipped = ?');
      params.push(typeof sanitized.lot_codes_shipped === 'string' ? sanitized.lot_codes_shipped : JSON.stringify(sanitized.lot_codes_shipped));
    }

    if (updates.length === 0) return res.json(dist);

    params.push(req.params.distId);
    await db.run(`UPDATE recall_distribution SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM recall_distribution WHERE id = ?', [req.params.distId]);
    logAudit(req, 'update_recall_distribution', 'recall_distribution', req.params.distId, recall.recall_id, { old_values: {}, new_values: sanitized });
    broadcast('recall_updated', { id: recall.id });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TRACEABILITY EXERCISES ====================

// GET /api/traceability-exercises
router.get('/traceability-exercises', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = 'SELECT * FROM traceability_exercises WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (search) {
      query += ' AND (exercise_id LIKE ? OR target_lot LIKE ? OR target_description LIKE ? OR conducted_by LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/traceability-exercises/:id
router.get('/traceability-exercises/:id', async (req, res) => {
  try {
    const exercise = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [req.params.id]);
    if (!exercise) return res.status(404).json({ error: 'Traceability exercise not found' });

    res.json({
      ...exercise,
      backward_trace: JSON.parse(exercise.backward_trace || '{}'),
      forward_trace: JSON.parse(exercise.forward_trace || '{}'),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/traceability-exercises
router.post('/traceability-exercises', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      type, target_lot, target_description = '', conducted_by,
      start_time = new Date().toISOString()
    } = sanitized;

    if (!type || !target_lot || !conducted_by) {
      return res.status(400).json({ error: 'type, target_lot, and conducted_by are required' });
    }

    const exercise_id = await nextExerciseId();

    const info = await db.run(`
      INSERT INTO traceability_exercises (exercise_id, type, target_lot, target_description, conducted_by, start_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [exercise_id, type, target_lot, target_description, conducted_by, start_time]);

    const created = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_traceability_exercise', 'traceability_exercises', created.id, exercise_id, { new_values: { exercise_id, type, target_lot, conducted_by } });
    broadcast('traceability_exercise_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/traceability-exercises/:id
router.put('/traceability-exercises/:id', requireWriteAccess, async (req, res) => {
  try {
    const exercise = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [req.params.id]);
    if (!exercise) return res.status(404).json({ error: 'Traceability exercise not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'type', 'status', 'target_lot', 'target_description', 'conducted_by',
      'total_produced', 'total_shipped', 'total_onsite', 'total_adjustments',
      'reconciliation_percent', 'reconciled',
      'team_reachable_1hr', 'evidence_complete',
      'gaps_identified', 'corrective_action', 'corrective_action_due', 'retest_date', 'notes'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    for (const jsonField of ['backward_trace', 'forward_trace']) {
      if (sanitized[jsonField] !== undefined) {
        updates.push(`${jsonField} = ?`);
        params.push(typeof sanitized[jsonField] === 'string' ? sanitized[jsonField] : JSON.stringify(sanitized[jsonField]));
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(exercise);

    params.push(req.params.id);
    await db.run(`UPDATE traceability_exercises SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_traceability_exercise', 'traceability_exercises', req.params.id, exercise.exercise_id, { old_values: {}, new_values: sanitized });
    broadcast('traceability_exercise_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/traceability-exercises/:id/complete
router.post('/traceability-exercises/:id/complete', requireWriteAccess, async (req, res) => {
  try {
    const exercise = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [req.params.id]);
    if (!exercise) return res.status(404).json({ error: 'Traceability exercise not found' });

    const sanitized = sanitizeBody(req.body);
    const {
      status = 'passed',
      total_produced = 0, total_shipped = 0, total_onsite = 0, total_adjustments = 0,
      team_reachable_1hr = 0, evidence_complete = 0,
      backward_trace, forward_trace,
      gaps_identified = '', corrective_action = '', corrective_action_due = null, notes = ''
    } = sanitized;

    const end_time = new Date().toISOString();
    const start = new Date(exercise.start_time);
    const end = new Date(end_time);
    const elapsed_minutes = Math.round((end - start) / 60000);

    const totalAccounted = total_shipped + total_onsite + total_adjustments;
    const reconciliation_percent = total_produced > 0 ? Math.round((totalAccounted / total_produced) * 10000) / 100 : 0;
    const reconciled = reconciliation_percent >= 100 ? 1 : 0;

    await db.run(`UPDATE traceability_exercises SET
      status = ?, end_time = ?, elapsed_minutes = ?,
      total_produced = ?, total_shipped = ?, total_onsite = ?, total_adjustments = ?,
      reconciliation_percent = ?, reconciled = ?,
      team_reachable_1hr = ?, evidence_complete = ?,
      backward_trace = ?, forward_trace = ?,
      gaps_identified = ?, corrective_action = ?, corrective_action_due = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
      status, end_time, elapsed_minutes,
      total_produced, total_shipped, total_onsite, total_adjustments,
      reconciliation_percent, reconciled,
      team_reachable_1hr ? 1 : 0, evidence_complete ? 1 : 0,
      backward_trace ? (typeof backward_trace === 'string' ? backward_trace : JSON.stringify(backward_trace)) : exercise.backward_trace,
      forward_trace ? (typeof forward_trace === 'string' ? forward_trace : JSON.stringify(forward_trace)) : exercise.forward_trace,
      gaps_identified, corrective_action, corrective_action_due, notes,
      req.params.id
    ]);

    const updated = await db.get('SELECT * FROM traceability_exercises WHERE id = ?', [req.params.id]);
    logAudit(req, 'complete_traceability_exercise', 'traceability_exercises', req.params.id, exercise.exercise_id, { new_values: { status, elapsed_minutes, reconciliation_percent } });
    broadcast('traceability_exercise_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CRISIS EVENTS ====================

// GET /api/crisis-events
router.get('/crisis-events', async (req, res) => {
  try {
    const { status, type, severity, search } = req.query;
    let query = 'SELECT * FROM crisis_events WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (type) { query += ' AND type = ?'; params.push(type); }
    if (severity) { query += ' AND severity = ?'; params.push(severity); }
    if (search) {
      query += ' AND (event_id LIKE ? OR title LIKE ? OR description LIKE ? OR reported_by LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/crisis-events/:id
router.get('/crisis-events/:id', async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Crisis event not found' });

    res.json({
      ...event,
      affected_areas: JSON.parse(event.affected_areas || '[]'),
      affected_products: JSON.parse(event.affected_products || '[]'),
      notifications_sent: JSON.parse(event.notifications_sent || '[]'),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/crisis-events
router.post('/crisis-events', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      type, title, description, severity = 'moderate', reported_by,
      reported_at = new Date().toISOString(),
      production_stopped = 0, product_held = 0,
      affected_areas = [], affected_products = [],
      food_safety_impact = 0, food_safety_assessment = ''
    } = sanitized;

    if (!type || !title || !description || !reported_by) {
      return res.status(400).json({ error: 'type, title, description, and reported_by are required' });
    }

    const event_id = await nextCrisisId();

    const info = await db.run(`
      INSERT INTO crisis_events (event_id, type, title, description, severity, reported_by, reported_at, production_stopped, product_held, affected_areas, affected_products, food_safety_impact, food_safety_assessment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [event_id, type, title, description, severity, reported_by, reported_at, production_stopped ? 1 : 0, product_held ? 1 : 0, JSON.stringify(affected_areas), JSON.stringify(affected_products), food_safety_impact ? 1 : 0, food_safety_assessment]);

    const created = await db.get('SELECT * FROM crisis_events WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_crisis_event', 'crisis_events', created.id, event_id, { new_values: { event_id, type, title, severity, reported_by } });
    broadcast('crisis_event_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/crisis-events/:id
router.put('/crisis-events/:id', requireWriteAccess, async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Crisis event not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'type', 'status', 'title', 'description', 'severity', 'reported_by', 'reported_at',
      'production_stopped', 'product_held',
      'food_safety_impact', 'food_safety_assessment',
      'recall_triggered', 'linked_recall_id',
      'product_disposition', 'disposition_rationale',
      'resolution'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    for (const jsonField of ['affected_areas', 'affected_products', 'notifications_sent']) {
      if (sanitized[jsonField] !== undefined) {
        updates.push(`${jsonField} = ?`);
        params.push(typeof sanitized[jsonField] === 'string' ? sanitized[jsonField] : JSON.stringify(sanitized[jsonField]));
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(event);

    params.push(req.params.id);
    await db.run(`UPDATE crisis_events SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_crisis_event', 'crisis_events', req.params.id, event.event_id, { old_values: {}, new_values: sanitized });
    broadcast('crisis_event_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/crisis-events/:id/resolve
router.post('/crisis-events/:id/resolve', requireWriteAccess, async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Crisis event not found' });

    const { resolution } = req.body;
    if (!resolution) return res.status(400).json({ error: 'resolution is required' });

    await db.run(`UPDATE crisis_events SET status = 'resolved', resolution = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [resolution, req.params.id]);

    const updated = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    logAudit(req, 'resolve_crisis_event', 'crisis_events', req.params.id, event.event_id, { new_values: { resolution } });
    broadcast('crisis_event_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/crisis-events/:id/close
router.post('/crisis-events/:id/close', requireWriteAccess, async (req, res) => {
  try {
    const event = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Crisis event not found' });

    await db.run(`UPDATE crisis_events SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.params.id]);

    const updated = await db.get('SELECT * FROM crisis_events WHERE id = ?', [req.params.id]);
    logAudit(req, 'close_crisis_event', 'crisis_events', req.params.id, event.event_id, { new_values: { status: 'closed' } });
    broadcast('crisis_event_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DASHBOARD ====================

// GET /api/recall/dashboard
router.get('/recall/dashboard', async (req, res) => {
  try {
    const activeRecalls = (await db.get("SELECT COUNT(*) as count FROM recalls WHERE status NOT IN ('closed')")).count;
    const openCrises = (await db.get("SELECT COUNT(*) as count FROM crisis_events WHERE status NOT IN ('closed','resolved')")).count;

    const currentYear = new Date().getFullYear();
    const exercisesThisYear = (await db.get("SELECT COUNT(*) as count FROM traceability_exercises WHERE strftime('%Y', created_at) = ?", [String(currentYear)])).count;

    const lastExercise = await db.get('SELECT * FROM traceability_exercises ORDER BY created_at DESC LIMIT 1');
    const lastExerciseResult = lastExercise ? lastExercise.status : null;

    // Next exercise due: if < 2 this year, flag as due
    const nextExerciseDue = exercisesThisYear < 2 ? 'due' : 'on_track';

    const recentRecalls = await db.all("SELECT id, recall_id, title, type, classification, status, created_at FROM recalls ORDER BY created_at DESC LIMIT 5");
    const recentCrises = await db.all("SELECT id, event_id, title, type, severity, status, created_at FROM crisis_events ORDER BY created_at DESC LIMIT 5");
    const recentExercises = await db.all("SELECT id, exercise_id, type, status, target_lot, elapsed_minutes, reconciliation_percent, created_at FROM traceability_exercises ORDER BY created_at DESC LIMIT 5");

    res.json({
      activeRecalls, openCrises, exercisesThisYear, nextExerciseDue, lastExerciseResult,
      recentRecalls, recentCrises, recentExercises,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/recall-team
router.get('/recall-team', async (req, res) => {
  try {
    const team = await db.all('SELECT * FROM recall_team WHERE is_active = 1 ORDER BY notification_priority ASC, name ASC');
    res.json(team);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/recall-team
router.post('/recall-team', requireWriteAccess, async (req, res) => {
  try {
    const { name, role, title, phone, email, alternate_phone, responsibility, notification_priority, notes } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'name and role are required' });
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const info = await db.run(
      'INSERT INTO recall_team (name, role, title, phone, email, alternate_phone, responsibility, notification_priority, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, role, title || '', phone || '', email || '', alternate_phone || '', responsibility || '', notification_priority || 5, notes || '', now, now]
    );
    res.status(201).json(await db.get('SELECT * FROM recall_team WHERE id = ?', [info.lastInsertRowid]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/recall-team/:id
router.put('/recall-team/:id', requireWriteAccess, async (req, res) => {
  try {
    const member = await db.get('SELECT * FROM recall_team WHERE id = ?', [req.params.id]);
    if (!member) return res.status(404).json({ error: 'Team member not found' });
    const fields = ['name', 'role', 'title', 'phone', 'email', 'alternate_phone', 'responsibility', 'notification_priority', 'notes', 'is_active'];
    const updates = []; const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(f + ' = ?'); params.push(req.body[f]); }
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(req.params.id);
    await db.run('UPDATE recall_team SET ' + updates.join(', ') + ' WHERE id = ?', params);
    res.json(await db.get('SELECT * FROM recall_team WHERE id = ?', [req.params.id]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE /api/recall-team/:id
router.delete('/recall-team/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM recall_team WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
