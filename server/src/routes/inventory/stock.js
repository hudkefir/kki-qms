import { Router } from 'express';
import db from '../../database-pg.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';

const router = Router();

// SKU catalog (matches planner SKU definitions)
const SKU_CATALOG = [
  { code: 'SC-CDN', label: 'Small Classic (CDN)', type: 'kefir' },
  { code: 'SC-USA', label: 'Small Classic (USA)', type: 'kefir' },
  { code: 'LC-CDN', label: 'Large Classic (CDN)', type: 'kefir' },
  { code: 'SCM-CDN', label: 'Small Mango (CDN)', type: 'kefir' },
  { code: 'SCM-USA', label: 'Small Mango (USA)', type: 'kefir' },
  { code: 'SCG-CDN', label: 'Small Ginger (CDN)', type: 'kefir' },
  { code: 'SCG-USA', label: 'Small Ginger (USA)', type: 'kefir' },
];

// GET /api/inventory/skus — list available SKUs
router.get('/inventory/skus', async (req, res) => {
  res.json(SKU_CATALOG);
});

// GET /api/inventory/counts — list all counts
router.get('/inventory/counts', async (req, res) => {
  try {
    const { sku, from, to, search, limit = 100 } = req.query;
    let query = 'SELECT * FROM inventory_counts WHERE 1=1';
    const params = [];
    let idx = 0;

    if (sku) {
      params.push(sku);
      query += ` AND sku = $${++idx}`;
    }
    if (from) {
      params.push(from);
      query += ` AND count_date >= $${++idx}`;
    }
    if (to) {
      params.push(to);
      query += ` AND count_date <= $${++idx}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (sku ILIKE $${++idx} OR item_name ILIKE $${idx} OR counted_by ILIKE $${idx} OR location ILIKE $${idx})`;
    }

    query += ' ORDER BY count_date DESC, created_at DESC';
    params.push(parseInt(limit));
    query += ` LIMIT $${++idx}`;

    const counts = await db.all(query, params);
    res.json(counts);
  } catch (err) {
    console.error('Inventory counts list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/counts/:id — get single count
router.get('/inventory/counts/:id', async (req, res) => {
  try {
    const count = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [req.params.id]);
    if (!count) return res.status(404).json({ error: 'Inventory count not found' });
    res.json(count);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/counts — create new count (supports single or batch)
router.post('/inventory/counts', requireWriteAccess, async (req, res) => {
  try {
    const { items, count_date, counted_by, location, notes } = req.body;

    // Support batch creation (array of items for a single count session)
    if (items && Array.isArray(items)) {
      const created = [];
      for (const item of items) {
        const info = await db.run(
          `INSERT INTO inventory_counts (sku, item_name, counted_qty, count_date, counted_by, location, lot_number, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.sku, item.item_name || '', item.counted_qty || 0,
            count_date || item.count_date, counted_by || item.counted_by || req.session.user.username,
            location || item.location || '', item.lot_number || '', notes || item.notes || '',
            req.session.user.username
          ]
        );
        const row = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [info.lastInsertRowid]);
        created.push(row);
      }
      logAudit(req, 'create', 'inventory_count', created[0]?.id, `Batch count (${created.length} items)`, {});
      return res.status(201).json(created);
    }

    // Single item creation
    const { sku, item_name, counted_qty } = req.body;
    if (!sku || !count_date) {
      return res.status(400).json({ error: 'sku and count_date are required' });
    }

    const info = await db.run(
      `INSERT INTO inventory_counts (sku, item_name, counted_qty, count_date, counted_by, location, lot_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [sku, item_name || '', counted_qty || 0, count_date, counted_by || req.session.user.username, location || '', req.body.lot_number || '', notes || '', req.session.user.username]
    );

    const created = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [info.lastInsertRowid]);
    logAudit(req, 'create', 'inventory_count', created.id, `${sku} count`, {});
    res.status(201).json(created);
  } catch (err) {
    console.error('Create inventory count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/counts/:id — update count
router.put('/inventory/counts/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Inventory count not found' });

    const { counted_qty, count_date, counted_by, location, lot_number, notes } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.run(
      `UPDATE inventory_counts SET counted_qty = $1, count_date = $2, counted_by = $3, location = $4, lot_number = $5, notes = $6, updated_by = $7, updated_at = $8 WHERE id = $9`,
      [
        counted_qty ?? existing.counted_qty,
        count_date ?? existing.count_date,
        counted_by ?? existing.counted_by,
        location ?? existing.location,
        lot_number ?? existing.lot_number,
        notes ?? existing.notes,
        req.session.user.username,
        now,
        req.params.id
      ]
    );

    const updated = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [req.params.id]);
    logAudit(req, 'update', 'inventory_count', req.params.id, existing.sku, { old_values: existing, new_values: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inventory/counts/:id — delete count
router.delete('/inventory/counts/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Inventory count not found' });

    await db.run('DELETE FROM inventory_counts WHERE id = $1', [req.params.id]);
    logAudit(req, 'delete', 'inventory_count', req.params.id, existing.sku, {});
    res.json({ message: 'Inventory count deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/counts/:id/print — print-ready data
router.get('/inventory/counts/:id/print', async (req, res) => {
  try {
    const count = await db.get('SELECT * FROM inventory_counts WHERE id = $1', [req.params.id]);
    if (!count) return res.status(404).json({ error: 'Inventory count not found' });
    res.json({ ...count, print: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/summary — summary by count_date (grouped)
router.get('/inventory/summary', async (req, res) => {
  try {
    const summary = await db.all(
      `SELECT count_date, counted_by, COUNT(*) as item_count, SUM(counted_qty) as total_qty
       FROM inventory_counts
       GROUP BY count_date, counted_by
       ORDER BY count_date DESC
       LIMIT 50`
    );
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
