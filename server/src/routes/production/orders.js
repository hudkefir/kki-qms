import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, WorkflowService, EventBus } from '../../services/index.js';

const router = Router();

// Register production_order workflow
WorkflowService.registerWorkflow({
  name: 'production_order',
  states: ['planned', 'in_progress', 'flavouring', 'pouring', 'packing', 'qa_hold', 'released', 'shipped', 'cancelled'],
  transitions: [
    { from: 'planned',     to: 'in_progress', guard: null },
    { from: 'planned',     to: 'cancelled',   guard: null },
    { from: 'in_progress', to: 'flavouring',  guard: null },
    { from: 'in_progress', to: 'pouring',     guard: null },
    { from: 'in_progress', to: 'qa_hold',     guard: null },
    { from: 'in_progress', to: 'cancelled',   guard: null },
    { from: 'flavouring',  to: 'pouring',     guard: null },
    { from: 'flavouring',  to: 'qa_hold',     guard: null },
    { from: 'pouring',     to: 'packing',     guard: null },
    { from: 'pouring',     to: 'qa_hold',     guard: null },
    { from: 'packing',     to: 'qa_hold',     guard: null },
    { from: 'packing',     to: 'released',    guard: null },
    { from: 'qa_hold',     to: 'released',    guard: null },
    { from: 'released',    to: 'shipped',     guard: null },
  ],
  guards: {},
});

const FIELDS = [
  'sku_id', 'fermentation_id', 'planned_date', 'actual_start', 'actual_end',
  'target_quantity', 'actual_quantity', 'bins_used', 'operator_id', 'notes',
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

async function nextOrderNumber() {
  const year = new Date().getFullYear();
  return await db.transaction(async () => {
    const row = await db.get('SELECT next_number FROM production_order_seq WHERE year = ?', [year]);
    let seq;
    if (row) {
      seq = row.next_number;
      await db.run('UPDATE production_order_seq SET next_number = ? WHERE year = ?', [seq + 1, year]);
    } else {
      const maxRow = await db.get(
        "SELECT order_number FROM production_orders WHERE order_number ILIKE ? ORDER BY order_number DESC LIMIT 1",
        [`PO-${year}-%`]
      );
      if (maxRow) {
        const parts = maxRow.order_number.split('-');
        seq = parseInt(parts[2], 10) + 1;
      } else {
        seq = 1;
      }
      await db.run('INSERT INTO production_order_seq (year, next_number) VALUES (?, ?)', [year, seq + 1]);
    }
    return `PO-${year}-${String(seq).padStart(4, '0')}`;
  })();
}

// GET /orders — list
router.get('/orders', async (req, res) => {
  try {
    const { status, sku_id, date_from, date_to, search } = req.query;
    let query = `
      SELECT po.*, f.batch_code AS fermentation_batch_code
      FROM production_orders po
      LEFT JOIN production_fermentation f ON po.fermentation_id = f.id
      WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND po.status = ?'; params.push(status); }
    if (sku_id) { query += ' AND po.sku_id = ?'; params.push(sku_id); }
    if (date_from) { query += ' AND po.planned_date >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND po.planned_date <= ?'; params.push(date_to); }
    if (search) {
      query += ' AND (po.order_number ILIKE ? OR po.notes ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }
    query += ' ORDER BY po.planned_date DESC NULLS LAST, po.id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('orders list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /orders/:id — with related pours and flavouring
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await db.get(`
      SELECT po.*, f.batch_code AS fermentation_batch_code
      FROM production_orders po
      LEFT JOIN production_fermentation f ON po.fermentation_id = f.id
      WHERE po.id = ?`, [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Production order not found' });

    const pours = await db.all('SELECT * FROM production_pours WHERE production_order_id = ? ORDER BY pour_date DESC, id DESC', [req.params.id]);
    const flavouring = await db.all('SELECT * FROM production_flavouring WHERE production_order_id = ? ORDER BY flavour_date DESC, id DESC', [req.params.id]);

    res.json({ ...order, pours, flavouring });
  } catch (err) {
    console.error('orders get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /orders
router.post('/orders', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.sku_id) return res.status(400).json({ error: 'sku_id is required' });

    const { name, auditCtx } = userCtx(req);
    const order_number = await nextOrderNumber();
    const status = s.status || 'planned';

    const info = await db.run(`
      INSERT INTO production_orders
        (order_number, sku_id, fermentation_id, status, planned_date, actual_start, actual_end,
         target_quantity, actual_quantity, bins_used, operator_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      order_number, s.sku_id, s.fermentation_id || null, status,
      s.planned_date || null, s.actual_start || null, s.actual_end || null,
      s.target_quantity ?? null, s.actual_quantity ?? null, s.bins_used ?? null,
      s.operator_id || null, s.notes || null, name,
    ]);

    const created = await db.get('SELECT * FROM production_orders WHERE id = ?', [info.lastInsertRowid]);
    await AuditService.logMutation('production_orders', created.id, 'create', {
      after: created, resourceName: created.order_number, ...auditCtx,
    });
    await EventBus.emit('production.order.created', { id: created.id, order_number: created.order_number });
    broadcast('production_order_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('orders create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /orders/:id
router.put('/orders/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Production order not found' });

    const s = sanitizeBody(req.body);
    if (s.status !== undefined && s.status !== existing.status) {
      return res.status(400).json({ error: 'Use PUT /orders/:id/status to change status' });
    }

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
    await db.run(`UPDATE production_orders SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_orders', updated.id, 'update', {
      before: existing, after: updated, resourceName: updated.order_number, ...auditCtx,
    });
    broadcast('production_order_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('orders update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /orders/:id/status
router.put('/orders/:id/status', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Production order not found' });

    const { status: newStatus, reason = '' } = sanitizeBody(req.body) || {};
    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    const check = await WorkflowService.transition('production_order', existing.status, newStatus, { order: existing });
    if (!check.allowed) return res.status(409).json({ error: check.reason });

    const { name, auditCtx } = userCtx(req);

    // Auto-fill actual_start when moving from planned → in_progress
    const setStart = existing.status === 'planned' && newStatus === 'in_progress' && !existing.actual_start;
    // Auto-fill actual_end when moving to shipped
    const setEnd = newStatus === 'shipped' && !existing.actual_end;

    await db.run(
      `UPDATE production_orders
         SET status = ?,
             actual_start = COALESCE(actual_start, ${setStart ? 'NOW()' : 'actual_start'}),
             actual_end   = COALESCE(actual_end,   ${setEnd   ? 'NOW()' : 'actual_end'}),
             updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, name, req.params.id]
    );

    const updated = await db.get('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_orders', updated.id, 'status_change', {
      before: { status: existing.status }, after: { status: newStatus },
      resourceName: updated.order_number, extraDetails: { reason }, ...auditCtx,
    });
    await EventBus.emit('production.order.status_changed', {
      id: updated.id, order_number: updated.order_number, from: existing.status, to: newStatus,
    });
    broadcast('production_order_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('orders status change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /orders/:id — only allowed when status is 'planned'
router.delete('/orders/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Production order not found' });
    if (existing.status !== 'planned') {
      return res.status(409).json({ error: `Cannot delete order in status '${existing.status}'. Only 'planned' orders can be deleted; consider transitioning to 'cancelled' instead.` });
    }

    await db.run('DELETE FROM production_orders WHERE id = ?', [req.params.id]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_orders', existing.id, 'delete', {
      before: existing, resourceName: existing.order_number, ...auditCtx,
    });
    broadcast('production_order_deleted', { id: Number(req.params.id), order_number: existing.order_number });
    res.json({ success: true });
  } catch (err) {
    console.error('orders delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
