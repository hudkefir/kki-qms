import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, EventBus } from '../../services/index.js';

const router = Router();

const BOM_FIELDS = ['sku_id', 'version', 'name', 'effective_date', 'status', 'notes'];
const LINE_FIELDS = ['item_name', 'item_type', 'quantity', 'unit', 'notes', 'sort_order'];
const VALID_STATUSES = ['draft', 'active', 'superseded'];

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

// GET /boms — list (join with SKU info)
router.get('/boms', async (req, res) => {
  try {
    const { sku_id, status } = req.query;
    let query = `
      SELECT b.*, s.sku_code, s.market, s.jar_size, s.description AS sku_description
      FROM bom_versions b
      LEFT JOIN skus s ON b.sku_id = s.id
      WHERE 1=1`;
    const params = [];
    if (sku_id) { query += ' AND b.sku_id = ?'; params.push(sku_id); }
    if (status) { query += ' AND b.status = ?'; params.push(status); }
    query += ' ORDER BY b.sku_id, b.version DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('boms list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /boms/:id — with all lines
router.get('/boms/:id', async (req, res) => {
  try {
    const bom = await db.get(`
      SELECT b.*, s.sku_code, s.market, s.jar_size, s.description AS sku_description
      FROM bom_versions b
      LEFT JOIN skus s ON b.sku_id = s.id
      WHERE b.id = ?`, [req.params.id]);
    if (!bom) return res.status(404).json({ error: 'BOM not found' });

    const lines = await db.all('SELECT * FROM bom_lines WHERE bom_id = ? ORDER BY sort_order ASC, id ASC', [req.params.id]);
    res.json({ ...bom, lines });
  } catch (err) {
    console.error('boms get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /boms — create new BOM version
router.post('/boms', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.sku_id) return res.status(400).json({ error: 'sku_id is required' });

    const status = s.status || 'draft';
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    let version = s.version;
    if (!version) {
      const lastRow = await db.get(
        'SELECT MAX(version) AS max_v FROM bom_versions WHERE sku_id = ?',
        [s.sku_id]
      );
      version = (lastRow?.max_v ? Number(lastRow.max_v) : 0) + 1;
    }

    const { name: createdBy, auditCtx } = userCtx(req);
    const info = await db.run(`
      INSERT INTO bom_versions (sku_id, version, name, effective_date, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [s.sku_id, version, s.name || null, s.effective_date || null, status, s.notes || null, createdBy]);

    const created = await db.get('SELECT * FROM bom_versions WHERE id = ?', [info.lastInsertRowid]);
    await AuditService.logMutation('bom_versions', created.id, 'create', {
      after: created, resourceName: `BOM ${created.sku_id} v${created.version}`, ...auditCtx,
    });
    await EventBus.emit('production.bom.created', { id: created.id, sku_id: created.sku_id, version: created.version });
    broadcast('bom_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('boms create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /boms/:id — update BOM header
router.put('/boms/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM bom_versions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'BOM not found' });

    const s = sanitizeBody(req.body);
    if (s.status !== undefined && !VALID_STATUSES.includes(s.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updates = [];
    const params = [];
    for (const f of BOM_FIELDS) {
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
    await db.run(`UPDATE bom_versions SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM bom_versions WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('bom_versions', updated.id, 'update', {
      before: existing, after: updated, resourceName: `BOM ${updated.sku_id} v${updated.version}`, ...auditCtx,
    });
    broadcast('bom_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('boms update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /boms/:id/activate — set status to 'active', supersede previous active version
router.put('/boms/:id/activate', requireWriteAccess, async (req, res) => {
  try {
    const bom = await db.get('SELECT * FROM bom_versions WHERE id = ?', [req.params.id]);
    if (!bom) return res.status(404).json({ error: 'BOM not found' });
    if (bom.status === 'active') return res.json(bom);

    const { name, auditCtx } = userCtx(req);

    const doActivate = db.transaction(async () => {
      // Mark previously active versions for this SKU as superseded
      await db.run(
        `UPDATE bom_versions
            SET status = 'superseded', updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE sku_id = ? AND status = 'active' AND id != ?`,
        [name, bom.sku_id, req.params.id]
      );
      await db.run(
        `UPDATE bom_versions
            SET status = 'active', updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [name, req.params.id]
      );
    });
    await doActivate();

    const updated = await db.get('SELECT * FROM bom_versions WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('bom_versions', updated.id, 'activate', {
      before: { status: bom.status }, after: { status: 'active' },
      resourceName: `BOM ${updated.sku_id} v${updated.version}`, ...auditCtx,
    });
    await EventBus.emit('production.bom.activated', { id: updated.id, sku_id: updated.sku_id, version: updated.version });
    broadcast('bom_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('boms activate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /boms/:id/lines — add line item
router.post('/boms/:id/lines', requireWriteAccess, async (req, res) => {
  try {
    const bom = await db.get('SELECT * FROM bom_versions WHERE id = ?', [req.params.id]);
    if (!bom) return res.status(404).json({ error: 'BOM not found' });

    const s = sanitizeBody(req.body);
    if (!s.item_name) return res.status(400).json({ error: 'item_name is required' });
    if (s.quantity === undefined || s.quantity === null) return res.status(400).json({ error: 'quantity is required' });
    if (!s.unit) return res.status(400).json({ error: 'unit is required' });

    const info = await db.run(`
      INSERT INTO bom_lines (bom_id, item_name, item_type, quantity, unit, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, s.item_name, s.item_type || null, s.quantity, s.unit, s.notes || null, s.sort_order ?? 0]);

    const created = await db.get('SELECT * FROM bom_lines WHERE id = ?', [info.lastInsertRowid]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('bom_lines', created.id, 'create', {
      after: created, resourceName: `${bom.sku_id} v${bom.version} / ${created.item_name}`,
      extraDetails: { bom_id: bom.id }, ...auditCtx,
    });
    broadcast('bom_line_created', { ...created, bom_id: bom.id });
    res.status(201).json(created);
  } catch (err) {
    console.error('boms line create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /boms/:id/lines/:lineId
router.put('/boms/:id/lines/:lineId', requireWriteAccess, async (req, res) => {
  try {
    const line = await db.get('SELECT * FROM bom_lines WHERE id = ? AND bom_id = ?', [req.params.lineId, req.params.id]);
    if (!line) return res.status(404).json({ error: 'BOM line not found' });

    const s = sanitizeBody(req.body);
    const updates = [];
    const params = [];
    for (const f of LINE_FIELDS) {
      if (s[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(s[f]);
      }
    }
    if (updates.length === 0) return res.json(line);

    params.push(req.params.lineId);
    await db.run(`UPDATE bom_lines SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM bom_lines WHERE id = ?', [req.params.lineId]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('bom_lines', updated.id, 'update', {
      before: line, after: updated, resourceName: updated.item_name,
      extraDetails: { bom_id: Number(req.params.id) }, ...auditCtx,
    });
    broadcast('bom_line_updated', { ...updated, bom_id: Number(req.params.id) });
    res.json(updated);
  } catch (err) {
    console.error('boms line update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /boms/:id/lines/:lineId
router.delete('/boms/:id/lines/:lineId', requireWriteAccess, async (req, res) => {
  try {
    const line = await db.get('SELECT * FROM bom_lines WHERE id = ? AND bom_id = ?', [req.params.lineId, req.params.id]);
    if (!line) return res.status(404).json({ error: 'BOM line not found' });

    await db.run('DELETE FROM bom_lines WHERE id = ?', [req.params.lineId]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('bom_lines', line.id, 'delete', {
      before: line, resourceName: line.item_name,
      extraDetails: { bom_id: Number(req.params.id) }, ...auditCtx,
    });
    broadcast('bom_line_deleted', { id: Number(req.params.lineId), bom_id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('boms line delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
