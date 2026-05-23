import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess, requireRole } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, WorkflowService, EventBus } from '../../services/index.js';

const router = Router();

// Register fermentation workflow (idempotent — registerWorkflow overwrites)
WorkflowService.registerWorkflow({
  name: 'production_fermentation',
  states: ['planned', 'fermenting', 'ready', 'used', 'discarded'],
  transitions: [
    { from: 'planned',    to: 'fermenting', guard: null },
    { from: 'planned',    to: 'discarded',  guard: null },
    { from: 'fermenting', to: 'ready',      guard: null },
    { from: 'fermenting', to: 'discarded',  guard: null },
    { from: 'ready',      to: 'used',       guard: null },
    { from: 'ready',      to: 'discarded',  guard: null },
  ],
  guards: {},
});

const FIELDS = [
  'batch_code', 'culture_type', 'substrate', 'vessel', 'volume_litres', 'grain_weight_kg',
  'start_date', 'expected_ready_date', 'actual_ready_date', 'target_ph', 'actual_ph',
  'target_ta', 'actual_ta', 'temperature_c', 'status', 'operator_id', 'notes',
];

function userCtx(req) {
  const u = req.session?.user;
  return {
    user: u || {},
    name: u?.display_name || u?.username || '',
    auditCtx: {
      changedBy: { id: u?.id ?? null, username: u?.username || 'system' },
      sessionInfo: { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID },
    },
  };
}

// GET /fermentation — list
router.get('/fermentation', async (req, res) => {
  try {
    const { status, date_from, date_to, culture_type, search } = req.query;
    let query = 'SELECT * FROM production_fermentation WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (culture_type) { query += ' AND culture_type = ?'; params.push(culture_type); }
    if (date_from) { query += ' AND start_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND start_date <= ?'; params.push(date_to); }
    if (search) {
      query += ' AND (batch_code ILIKE ? OR culture_type ILIKE ? OR vessel ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    query += ' ORDER BY start_date DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('fermentation list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /fermentation/:id
router.get('/fermentation/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Fermentation batch not found' });
    res.json(row);
  } catch (err) {
    console.error('fermentation get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /fermentation
router.post('/fermentation', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.batch_code) return res.status(400).json({ error: 'batch_code is required' });
    if (!s.culture_type) return res.status(400).json({ error: 'culture_type is required' });
    if (!s.start_date) return res.status(400).json({ error: 'start_date is required' });

    const existing = await db.get('SELECT id FROM production_fermentation WHERE batch_code = ?', [s.batch_code]);
    if (existing) return res.status(409).json({ error: `batch_code '${s.batch_code}' already exists` });

    const { name } = userCtx(req);
    const status = s.status || 'planned';
    const VALID = ['planned', 'fermenting', 'ready', 'used', 'discarded'];
    if (!VALID.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID.join(', ')}` });

    const info = await db.run(`
      INSERT INTO production_fermentation
        (batch_code, culture_type, substrate, vessel, volume_litres, grain_weight_kg,
         start_date, expected_ready_date, actual_ready_date, target_ph, actual_ph,
         target_ta, actual_ta, temperature_c, status, operator_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      s.batch_code, s.culture_type, s.substrate || null, s.vessel || null,
      s.volume_litres ?? null, s.grain_weight_kg ?? null,
      s.start_date, s.expected_ready_date || null, s.actual_ready_date || null,
      s.target_ph ?? null, s.actual_ph ?? null,
      s.target_ta ?? null, s.actual_ta ?? null, s.temperature_c ?? null,
      status, s.operator_id || null, s.notes || null, name,
    ]);

    const created = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [info.lastInsertRowid]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_fermentation', created.id, 'create', {
      after: created, resourceName: created.batch_code, ...auditCtx,
    });
    await EventBus.emit('production.fermentation.created', { id: created.id, batch_code: created.batch_code });
    broadcast('fermentation_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('fermentation create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /fermentation/:id
router.put('/fermentation/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Fermentation batch not found' });

    const s = sanitizeBody(req.body);
    // status changes must go through /status endpoint
    if (s.status !== undefined && s.status !== existing.status) {
      return res.status(400).json({ error: 'Use PUT /fermentation/:id/status to change status' });
    }

    const updates = [];
    const params = [];
    for (const f of FIELDS) {
      if (f === 'status') continue;
      if (s[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(s[f]);
      }
    }
    const { name, auditCtx } = userCtx(req);
    updates.push('updated_by = ?');
    params.push(name);
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 2) return res.json(existing);

    params.push(req.params.id);
    await db.run(`UPDATE production_fermentation SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_fermentation', updated.id, 'update', {
      before: existing, after: updated, resourceName: updated.batch_code, ...auditCtx,
    });
    broadcast('fermentation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('fermentation update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /fermentation/:id/status — workflow-validated status change
router.put('/fermentation/:id/status', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Fermentation batch not found' });

    const { status: newStatus, reason = '' } = sanitizeBody(req.body) || {};
    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    const check = await WorkflowService.transition('production_fermentation', existing.status, newStatus, { fermentation: existing });
    if (!check.allowed) return res.status(409).json({ error: check.reason });

    const { name, auditCtx } = userCtx(req);

    // If transitioning to 'ready' and actual_ready_date not set, default to now
    const setReady = newStatus === 'ready' && !existing.actual_ready_date;
    await db.run(
      `UPDATE production_fermentation
         SET status = ?,
             actual_ready_date = COALESCE(actual_ready_date, ${setReady ? 'NOW()' : 'actual_ready_date'}),
             updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, name, req.params.id]
    );

    const updated = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_fermentation', updated.id, 'status_change', {
      before: { status: existing.status }, after: { status: newStatus },
      resourceName: updated.batch_code, extraDetails: { reason }, ...auditCtx,
    });
    await EventBus.emit('production.fermentation.status_changed', {
      id: updated.id, batch_code: updated.batch_code, from: existing.status, to: newStatus,
    });
    broadcast('fermentation_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('fermentation status change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /fermentation/:id
router.delete('/fermentation/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_fermentation WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Fermentation batch not found' });

    const linked = await db.get('SELECT COUNT(*) AS c FROM production_orders WHERE fermentation_id = ?', [req.params.id]);
    if (linked && Number(linked.c) > 0) {
      return res.status(409).json({ error: `Cannot delete: ${linked.c} production order(s) reference this fermentation batch` });
    }

    await db.run('DELETE FROM production_fermentation WHERE id = ?', [req.params.id]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_fermentation', existing.id, 'delete', {
      before: existing, resourceName: existing.batch_code, ...auditCtx,
    });
    broadcast('fermentation_deleted', { id: Number(req.params.id), batch_code: existing.batch_code });
    res.json({ success: true });
  } catch (err) {
    console.error('fermentation delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
