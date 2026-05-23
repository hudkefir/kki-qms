import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, EventBus } from '../../services/index.js';

const router = Router();

const FIELDS = [
  'production_order_id', 'flavour', 'bins_flavoured', 'flavour_date',
  'operator_id', 'notes',
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

// GET /flavouring — list
router.get('/flavouring', async (req, res) => {
  try {
    const { date_from, date_to, flavour, order_id } = req.query;
    let query = 'SELECT * FROM production_flavouring WHERE 1=1';
    const params = [];
    if (date_from) { query += ' AND flavour_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND flavour_date <= ?'; params.push(date_to); }
    if (flavour) { query += ' AND flavour ILIKE ?'; params.push(`%${flavour}%`); }
    if (order_id) { query += ' AND production_order_id = ?'; params.push(order_id); }
    query += ' ORDER BY flavour_date DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('flavouring list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /flavouring/:id
router.get('/flavouring/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM production_flavouring WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Flavouring record not found' });
    res.json(row);
  } catch (err) {
    console.error('flavouring get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /flavouring
router.post('/flavouring', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.flavour) return res.status(400).json({ error: 'flavour is required' });
    if (!s.flavour_date) return res.status(400).json({ error: 'flavour_date is required' });

    const { name, auditCtx } = userCtx(req);
    const info = await db.run(`
      INSERT INTO production_flavouring
        (production_order_id, flavour, bins_flavoured, flavour_date, operator_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      s.production_order_id || null, s.flavour, s.bins_flavoured ?? null,
      s.flavour_date, s.operator_id || null, s.notes || null, name,
    ]);

    const created = await db.get('SELECT * FROM production_flavouring WHERE id = ?', [info.lastInsertRowid]);
    await AuditService.logMutation('production_flavouring', created.id, 'create', {
      after: created, resourceName: `${created.flavour} (#${created.id})`, ...auditCtx,
    });
    await EventBus.emit('production.flavouring.created', { id: created.id, flavour: created.flavour });
    broadcast('flavouring_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('flavouring create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /flavouring/:id
router.put('/flavouring/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_flavouring WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Flavouring record not found' });

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
    await db.run(`UPDATE production_flavouring SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM production_flavouring WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_flavouring', updated.id, 'update', {
      before: existing, after: updated, resourceName: `${updated.flavour} (#${updated.id})`, ...auditCtx,
    });
    broadcast('flavouring_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('flavouring update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /flavouring/:id
router.delete('/flavouring/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_flavouring WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Flavouring record not found' });

    await db.run('DELETE FROM production_flavouring WHERE id = ?', [req.params.id]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_flavouring', existing.id, 'delete', {
      before: existing, resourceName: `${existing.flavour} (#${existing.id})`, ...auditCtx,
    });
    broadcast('flavouring_deleted', { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('flavouring delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
