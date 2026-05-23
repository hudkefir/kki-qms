import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, EventBus } from '../../services/index.js';

const router = Router();

const FIELDS = [
  'production_order_id', 'fermentation_id', 'sku_id', 'pour_date',
  'jar_size', 'bins_poured', 'cases_produced', 'operator_id', 'notes',
];

function userCtx(req) {
  const u = req.session?.user;
  return {
    name: u?.display_name || u?.username || '',
    auditCtx: {
      changedBy: { id: u?.id ?? null, username: u?.username || 'system' },
      sessionInfo: { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID },
    },
  };
}

// GET /pours — list
router.get('/pours', async (req, res) => {
  try {
    const { date_from, date_to, sku_id, order_id, fermentation_id } = req.query;
    let query = 'SELECT * FROM production_pours WHERE 1=1';
    const params = [];
    if (date_from) { query += ' AND pour_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND pour_date <= ?'; params.push(date_to); }
    if (sku_id) { query += ' AND sku_id = ?'; params.push(sku_id); }
    if (order_id) { query += ' AND production_order_id = ?'; params.push(order_id); }
    if (fermentation_id) { query += ' AND fermentation_id = ?'; params.push(fermentation_id); }
    query += ' ORDER BY pour_date DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('pours list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pours/:id
router.get('/pours/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM production_pours WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Pour record not found' });
    res.json(row);
  } catch (err) {
    console.error('pours get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pours
router.post('/pours', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.pour_date) return res.status(400).json({ error: 'pour_date is required' });

    const { name, auditCtx } = userCtx(req);
    const info = await db.run(`
      INSERT INTO production_pours
        (production_order_id, fermentation_id, sku_id, pour_date, jar_size,
         bins_poured, cases_produced, operator_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      s.production_order_id || null, s.fermentation_id || null, s.sku_id || null,
      s.pour_date, s.jar_size || null, s.bins_poured ?? null, s.cases_produced ?? null,
      s.operator_id || null, s.notes || null, name,
    ]);

    const created = await db.get('SELECT * FROM production_pours WHERE id = ?', [info.lastInsertRowid]);
    await AuditService.logMutation('production_pours', created.id, 'create', {
      after: created, resourceName: `Pour #${created.id}`, ...auditCtx,
    });
    await EventBus.emit('production.pour.created', { id: created.id, order_id: created.production_order_id });
    broadcast('pour_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('pours create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /pours/:id
router.put('/pours/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_pours WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pour record not found' });

    const s = sanitizeBody(req.body);
    const updates = [];
    const params = [];
    for (const f of FIELDS) {
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
    await db.run(`UPDATE production_pours SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM production_pours WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_pours', updated.id, 'update', {
      before: existing, after: updated, resourceName: `Pour #${updated.id}`, ...auditCtx,
    });
    broadcast('pour_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('pours update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /pours/:id
router.delete('/pours/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_pours WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pour record not found' });

    await db.run('DELETE FROM production_pours WHERE id = ?', [req.params.id]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_pours', existing.id, 'delete', {
      before: existing, resourceName: `Pour #${existing.id}`, ...auditCtx,
    });
    broadcast('pour_deleted', { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('pours delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
