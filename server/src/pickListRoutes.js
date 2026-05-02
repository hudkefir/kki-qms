import { Router } from 'express';
import { readFileSync } from 'fs';
import db from './database-pg.js';
import { requireWriteAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const router = Router();

// SOS Inventory helpers (reuse same config as sosRoutes.js)
function getSOSConfig() {
  if (process.env.SOS_API_KEY) {
    return { apiKey: process.env.SOS_API_KEY };
  }
  try {
    const raw = readFileSync('/Users/kefirbot/.openclaw/secrets/sos-inventory.json', 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load SOS credentials:', err.message);
    return null;
  }
}

async function sosApiFetch(path, token) {
  const res = await fetch(`https://api.sosinventory.com${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SOS API ${res.status}: ${text}`);
  }
  return res.json();
}

// GET /api/picklists — list all pick lists
router.get('/picklists', async (req, res) => {
  try {
    const { status, search, from, to, limit = 100 } = req.query;
    let query = 'SELECT * FROM pick_lists WHERE 1=1';
    const params = [];
    let idx = 0;

    if (status) {
      params.push(status);
      query += ` AND status = $${++idx}`;
    }
    if (from) {
      params.push(from);
      query += ` AND pick_date >= $${++idx}`;
    }
    if (to) {
      params.push(to);
      query += ` AND pick_date <= $${++idx}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (sales_order_number ILIKE $${++idx} OR customer_name ILIKE $${idx} OR customer_po ILIKE $${idx} OR picked_by ILIKE $${idx})`;
    }

    query += ' ORDER BY pick_date DESC, created_at DESC';
    params.push(parseInt(limit));
    query += ` LIMIT $${++idx}`;

    const lists = await db.all(query, params);
    res.json(lists);
  } catch (err) {
    console.error('Pick lists error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/picklists/:id — get single pick list with items
router.get('/picklists/:id', async (req, res) => {
  try {
    const pickList = await db.get('SELECT * FROM pick_lists WHERE id = $1', [req.params.id]);
    if (!pickList) return res.status(404).json({ error: 'Pick list not found' });

    const items = await db.all(
      'SELECT * FROM pick_list_items WHERE pick_list_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({ ...pickList, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/picklists — create new pick list
router.post('/picklists', requireWriteAccess, async (req, res) => {
  try {
    const { sales_order_number, customer_name, customer_po, pick_date, picked_by, notes, items } = req.body;

    if (!sales_order_number || !pick_date) {
      return res.status(400).json({ error: 'sales_order_number and pick_date are required' });
    }

    const info = await db.run(
      `INSERT INTO pick_lists (sales_order_number, customer_name, customer_po, pick_date, picked_by, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sales_order_number, customer_name || '', customer_po || '', pick_date, picked_by || req.session.user.username, notes || '', req.session.user.username]
    );

    const pickListId = info.lastInsertRowid;

    // Insert line items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.run(
          `INSERT INTO pick_list_items (pick_list_id, sku, item_name, ordered_qty, picked_qty, uom, bin_location, lot_number, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [pickListId, item.sku || '', item.item_name || '', item.ordered_qty || 0, item.picked_qty || 0, item.uom || 'cases', item.bin_location || '', item.lot_number || '', item.notes || '']
        );
      }
    }

    const created = await db.get('SELECT * FROM pick_lists WHERE id = $1', [pickListId]);
    const createdItems = await db.all('SELECT * FROM pick_list_items WHERE pick_list_id = $1', [pickListId]);

    logAudit(req, 'create', 'pick_list', pickListId, sales_order_number, {});
    res.status(201).json({ ...created, items: createdItems });
  } catch (err) {
    console.error('Create pick list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/picklists/:id — update pick list
router.put('/picklists/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM pick_lists WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pick list not found' });

    const { customer_name, customer_po, pick_date, picked_by, status, notes, items } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.run(
      `UPDATE pick_lists SET customer_name = $1, customer_po = $2, pick_date = $3, picked_by = $4, status = $5, notes = $6, updated_by = $7, updated_at = $8 WHERE id = $9`,
      [
        customer_name ?? existing.customer_name,
        customer_po ?? existing.customer_po,
        pick_date ?? existing.pick_date,
        picked_by ?? existing.picked_by,
        status ?? existing.status,
        notes ?? existing.notes,
        req.session.user.username,
        now,
        req.params.id
      ]
    );

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete old items and re-insert
      await db.run('DELETE FROM pick_list_items WHERE pick_list_id = $1', [req.params.id]);
      for (const item of items) {
        await db.run(
          `INSERT INTO pick_list_items (pick_list_id, sku, item_name, ordered_qty, picked_qty, uom, bin_location, lot_number, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [req.params.id, item.sku || '', item.item_name || '', item.ordered_qty || 0, item.picked_qty || 0, item.uom || 'cases', item.bin_location || '', item.lot_number || '', item.notes || '']
        );
      }
    }

    const updated = await db.get('SELECT * FROM pick_lists WHERE id = $1', [req.params.id]);
    const updatedItems = await db.all('SELECT * FROM pick_list_items WHERE pick_list_id = $1', [req.params.id]);

    logAudit(req, 'update', 'pick_list', req.params.id, existing.sales_order_number, { old_values: existing, new_values: updated });
    res.json({ ...updated, items: updatedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/picklists/:id — delete pick list
router.delete('/picklists/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM pick_lists WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Pick list not found' });

    await db.run('DELETE FROM pick_list_items WHERE pick_list_id = $1', [req.params.id]);
    await db.run('DELETE FROM pick_lists WHERE id = $1', [req.params.id]);

    logAudit(req, 'delete', 'pick_list', req.params.id, existing.sales_order_number, {});
    res.json({ message: 'Pick list deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/picklists/:id/print — print-ready data
router.get('/picklists/:id/print', async (req, res) => {
  try {
    const pickList = await db.get('SELECT * FROM pick_lists WHERE id = $1', [req.params.id]);
    if (!pickList) return res.status(404).json({ error: 'Pick list not found' });

    const items = await db.all(
      'SELECT * FROM pick_list_items WHERE pick_list_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({ ...pickList, items, print: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/picklists/sos/salesorders — pull sales orders from SOS Inventory
router.get('/picklists/sos/salesorders', async (req, res) => {
  try {
    const config = getSOSConfig();
    if (!config || !config.access_token) {
      return res.status(503).json({ error: 'SOS Inventory credentials not configured' });
    }

    const result = await sosApiFetch('/api/v2/salesorder?status=20', config.access_token);
    const orders = result.data || result || [];

    // Map to simplified format
    const mapped = orders.map(o => ({
      id: o.id,
      number: o.number || o.documentNumber || '',
      customer: o.customer?.name || o.customerName || '',
      po: o.poNumber || o.customerPO || '',
      date: o.date || o.documentDate || '',
      shipDate: o.shipDate || '',
      items: (o.lines || o.items || []).map(line => ({
        sku: line.item?.sku || line.sku || '',
        item_name: line.item?.name || line.itemName || line.description || '',
        ordered_qty: line.quantity || 0,
        uom: line.uom?.name || line.unitOfMeasure || 'cases',
      })),
    }));

    res.json(mapped);
  } catch (err) {
    console.error('SOS sales orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
