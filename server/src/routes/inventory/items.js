/**
 * routes/inventory/items.js
 * ERP Phase 1.1 — Item Master CRUD
 *
 * Endpoints:
 *   GET    /items             — list with optional filters
 *   GET    /items/:id         — get by id (with default supplier info)
 *   POST   /items             — create item
 *   PUT    /items/:id         — update item
 *   DELETE /items/:id         — soft-delete (sets deleted_at)
 */

import { Router } from 'express';
import db from '../../database-pg.js';
import { requireAuth, requireWriteAccess } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';

const router = Router();

// All item routes require auth
router.use(requireAuth);

// ─── helpers ──────────────────────────────────────────────────────────────────

function userCtx(req) {
  const u = req.session?.user;
  return {
    username: u?.display_name || u?.username || 'system',
    userId: u?.id ?? null,
  };
}

const VALID_ITEM_TYPES = [
  'raw_material',
  'packaging',
  'intermediate',
  'finished_good',
  'consumable',
];

const MUTABLE_FIELDS = [
  'item_code', 'name', 'description',
  'item_type', 'category', 'sub_category',
  'base_uom', 'purchase_uom', 'purchase_uom_factor',
  'default_supplier_id',
  'shelf_life_days', 'storage_conditions',
  'allergens',
  'kosher', 'organic', 'gmo_free',
  'lot_tracking_required',
  'reorder_point', 'reorder_qty', 'safety_stock',
  'active',
];


// ─── GET /items ───────────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const { item_type, category, active, search, limit = 200, offset = 0 } = req.query;

    let query = `
      SELECT
        i.*,
        s.name AS default_supplier_name
      FROM items i
      LEFT JOIN suppliers s ON i.default_supplier_id = s.id
      WHERE i.deleted_at IS NULL
    `;
    const params = [];
    let idx = 0;

    if (item_type) {
      query += ` AND (i.item_type = $${++idx} OR i.type = $${idx})`;
      params.push(item_type);
    }
    if (category) {
      query += ` AND i.category = $${++idx}`;
      params.push(category);
    }
    if (active !== undefined) {
      query += ` AND i.active = $${++idx}`;
      params.push(active === 'true' || active === '1');
    }
    if (search) {
      query += ` AND (
        i.item_code    ILIKE $${++idx} OR
        i.name         ILIKE $${idx}   OR
        i.description  ILIKE $${idx}   OR
        i.category     ILIKE $${idx}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY i.item_code ASC LIMIT $${++idx} OFFSET $${++idx}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('items list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── GET /items/:id ───────────────────────────────────────────────────────────

router.get('/items/:id', async (req, res) => {
  try {
    const item = await db.get(
      `SELECT i.*, s.name AS default_supplier_name
       FROM items i
       LEFT JOIN suppliers s ON i.default_supplier_id = s.id
       WHERE i.id = $1 AND i.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('items get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── POST /items ──────────────────────────────────────────────────────────────

router.post('/items', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    const { username } = userCtx(req);

    if (!s.item_code) return res.status(400).json({ error: 'item_code is required' });
    if (!s.name)      return res.status(400).json({ error: 'name is required' });

    const itemType = s.item_type || s.type;
    if (itemType && !VALID_ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({
        error: `Invalid item_type. Must be one of: ${VALID_ITEM_TYPES.join(', ')}`,
      });
    }

    const baseUom = s.base_uom || s.unit_of_measure;
    if (!baseUom) return res.status(400).json({ error: 'base_uom (or unit_of_measure) is required' });

    // Allergens: accept array or comma-separated string
    let allergens = null;
    if (s.allergens) {
      allergens = Array.isArray(s.allergens)
        ? s.allergens
        : s.allergens.split(',').map(a => a.trim()).filter(Boolean);
    }

    const info = await db.run(
      `INSERT INTO items (
        item_code, name, description,
        item_type, type,
        category, sub_category,
        base_uom, unit_of_measure,
        purchase_uom, purchase_uom_factor,
        default_supplier_id,
        shelf_life_days, storage_conditions,
        allergens, kosher, organic, gmo_free,
        lot_tracking_required,
        reorder_point, reorder_qty, safety_stock,
        active, created_by, updated_by
      ) VALUES (
        $1, $2, $3,
        $4, $4,
        $5, $6,
        $7, $7,
        $8, $9,
        $10,
        $11, $12,
        $13, $14, $15, $16,
        $17,
        $18, $19, $20,
        $21, $22, $22
      )`,
      [
        s.item_code, s.name, s.description || null,
        itemType || null,
        s.category || null, s.sub_category || null,
        baseUom,
        s.purchase_uom || null, s.purchase_uom_factor ? parseFloat(s.purchase_uom_factor) : null,
        s.default_supplier_id ? parseInt(s.default_supplier_id, 10) : null,
        s.shelf_life_days ? parseInt(s.shelf_life_days, 10) : null,
        s.storage_conditions || null,
        allergens,
        s.kosher === true || s.kosher === 'true',
        s.organic === true || s.organic === 'true',
        s.gmo_free === true || s.gmo_free === 'true',
        s.lot_tracking_required !== false && s.lot_tracking_required !== 'false',
        s.reorder_point ? parseFloat(s.reorder_point) : null,
        s.reorder_qty ? parseFloat(s.reorder_qty) : null,
        s.safety_stock ? parseFloat(s.safety_stock) : null,
        s.active !== false && s.active !== 'false',
        username,
      ]
    );

    const created = await db.get(
      'SELECT * FROM items WHERE id = $1',
      [info.lastInsertRowid]
    );
    logAudit(req, 'create_item', 'items', created.id, created.item_code, {
      new_values: { item_code: created.item_code, name: created.name, item_type: created.item_type },
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'item_code already exists' });
    }
    console.error('items create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── PUT /items/:id ───────────────────────────────────────────────────────────

router.put('/items/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get(
      'SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const s = sanitizeBody(req.body);
    const { username } = userCtx(req);

    if (s.item_type && !VALID_ITEM_TYPES.includes(s.item_type)) {
      return res.status(400).json({
        error: `Invalid item_type. Must be one of: ${VALID_ITEM_TYPES.join(', ')}`,
      });
    }

    const setClauses = [];
    const params = [];
    let idx = 0;

    const addField = (col, val) => {
      setClauses.push(`${col} = $${++idx}`);
      params.push(val);
    };

    for (const field of MUTABLE_FIELDS) {
      if (s[field] !== undefined) {
        if (field === 'allergens') {
          const arr = Array.isArray(s[field])
            ? s[field]
            : s[field].split(',').map(a => a.trim()).filter(Boolean);
          addField(field, arr);
        } else if (field === 'item_type') {
          addField('item_type', s[field]);
          addField('type', s[field]); // keep legacy column in sync
        } else if (field === 'base_uom') {
          addField('base_uom', s[field]);
          addField('unit_of_measure', s[field]); // keep legacy column in sync
        } else {
          addField(field, s[field]);
        }
      }
    }

    if (setClauses.length === 0) return res.json(existing);

    addField('updated_by', username);
    addField('updated_at', new Date().toISOString());

    params.push(req.params.id);
    await db.run(
      `UPDATE items SET ${setClauses.join(', ')} WHERE id = $${++idx}`,
      params
    );

    const updated = await db.get('SELECT * FROM items WHERE id = $1', [req.params.id]);
    logAudit(req, 'update_item', 'items', req.params.id, existing.item_code, {
      old_values: existing,
      new_values: s,
    });
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'item_code already exists' });
    }
    console.error('items update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── DELETE /items/:id (soft delete) ─────────────────────────────────────────

router.delete('/items/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get(
      'SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const { username } = userCtx(req);
    await db.run(
      `UPDATE items
          SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE id = $2`,
      [username, req.params.id]
    );

    logAudit(req, 'delete_item', 'items', req.params.id, existing.item_code, {
      old_values: { item_code: existing.item_code, name: existing.name },
    });
    res.json({ success: true, message: `Item ${existing.item_code} soft-deleted` });
  } catch (err) {
    console.error('items delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
