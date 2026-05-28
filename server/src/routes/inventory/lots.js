/**
 * routes/inventory/lots.js
 * ERP Phase 1.1 — Unified Lot/Batch Master CRUD + QA Status Transitions
 *
 * Endpoints:
 *   GET    /lots                      — list with optional filters
 *   GET    /lots/:id                  — get lot detail (with transactions summary)
 *   POST   /lots                      — create lot
 *   PUT    /lots/:id                  — update lot
 *   POST   /lots/:id/qa-status        — QA status transition (with audit trail)
 *   GET    /lots/:id/transactions     — transaction history for this lot
 */

import { Router } from 'express';
import db from '../../database-pg.js';
import { requireAuth, requireWriteAccess } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';

const router = Router();

// All lot routes require auth
router.use(requireAuth);

// ─── helpers ──────────────────────────────────────────────────────────────────

function userCtx(req) {
  const u = req.session?.user;
  return {
    username: u?.display_name || u?.username || 'system',
    userId: u?.id ?? null,
  };
}

const VALID_LOT_TYPES = ['received', 'wip', 'produced', 'rework'];

// Both the legacy status values and the new Phase-1 values are accepted
const VALID_QA_STATUSES = [
  'pending_qa',
  'qa_hold',
  'released',
  'qa_released',  // legacy alias for 'released'
  'rejected',
  'rework',
  'destroyed',
  'expired',
];

// Which transitions are allowed (from → [to...])
const ALLOWED_TRANSITIONS = {
  pending_qa:  ['qa_hold', 'released', 'rejected'],
  qa_hold:     ['released', 'rejected', 'rework', 'destroyed'],
  released:    ['qa_hold', 'destroyed', 'expired'],
  qa_released: ['qa_hold', 'destroyed', 'expired'],
  rejected:    ['rework', 'destroyed'],
  rework:      ['pending_qa', 'released'],
  destroyed:   [],
  expired:     ['destroyed'],
};

const MUTABLE_FIELDS = [
  'lot_number', 'item_id', 'sku_id', 'lot_type',
  'supplier_id', 'supplier_lot_number', 'po_number',
  'production_order_id', 'bom_version_id',
  'parent_lot_ids',
  'received_date', 'production_date', 'expiry_date', 'best_before_date',
  'initial_quantity', 'quantity_received', 'unit',
  'current_location_id',
  'notes',
];


// ─── GET /lots ────────────────────────────────────────────────────────────────

router.get('/lots', async (req, res) => {
  try {
    const {
      item_id, sku_id, lot_type, qa_status,
      supplier_id, expiring_in_days,
      search, limit = 200, offset = 0,
    } = req.query;

    let query = `
      SELECT
        l.*,
        i.item_code,
        i.name      AS item_name,
        COALESCE(i.item_type, i.type) AS item_type,
        s.name      AS supplier_name,
        sk.sku_code,
        loc.code    AS location_code,
        loc.name    AS location_name
      FROM lots l
      LEFT JOIN items     i   ON l.item_id          = i.id
      LEFT JOIN suppliers s   ON l.supplier_id       = s.id
      LEFT JOIN skus      sk  ON l.sku_id            = sk.id
      LEFT JOIN locations loc ON l.current_location_id = loc.id
      WHERE l.deleted_at IS NULL
    `;
    const params = [];
    let idx = 0;

    if (item_id) {
      query += ` AND l.item_id = $${++idx}`;
      params.push(item_id);
    }
    if (sku_id) {
      query += ` AND l.sku_id = $${++idx}`;
      params.push(sku_id);
    }
    if (lot_type) {
      query += ` AND l.lot_type = $${++idx}`;
      params.push(lot_type);
    }
    if (qa_status) {
      if (qa_status === 'released') {
        // Accept both legacy and new value
        query += ` AND l.qa_status IN ($${++idx}, $${++idx})`;
        params.push('released', 'qa_released');
      } else {
        query += ` AND l.qa_status = $${++idx}`;
        params.push(qa_status);
      }
    }
    if (supplier_id) {
      query += ` AND l.supplier_id = $${++idx}`;
      params.push(supplier_id);
    }
    if (expiring_in_days) {
      query += ` AND l.expiry_date <= NOW() + INTERVAL '1 day' * $${++idx}`;
      query += ` AND l.expiry_date > NOW()`;
      params.push(parseInt(expiring_in_days, 10));
    }
    if (search) {
      query += ` AND (
        l.lot_number          ILIKE $${++idx} OR
        i.item_code           ILIKE $${idx}   OR
        i.name                ILIKE $${idx}   OR
        l.supplier_lot_number ILIKE $${idx}   OR
        l.po_number           ILIKE $${idx}
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${++idx} OFFSET $${++idx}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('lots list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── GET /lots/:id ────────────────────────────────────────────────────────────

router.get('/lots/:id', async (req, res) => {
  try {
    const lot = await db.get(
      `SELECT
         l.*,
         i.item_code,
         i.name      AS item_name,
         COALESCE(i.item_type, i.type) AS item_type,
         COALESCE(i.base_uom, i.unit_of_measure) AS item_uom,
         i.shelf_life_days,
         s.name      AS supplier_name,
         sk.sku_code,
         loc.code    AS location_code,
         loc.name    AS location_name
       FROM lots l
       LEFT JOIN items     i   ON l.item_id           = i.id
       LEFT JOIN suppliers s   ON l.supplier_id        = s.id
       LEFT JOIN skus      sk  ON l.sku_id             = sk.id
       LEFT JOIN locations loc ON l.current_location_id = loc.id
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    // Include running inventory balance from ledger
    const balance = await db.get(
      `SELECT
         COALESCE(SUM(
           CASE WHEN transaction_type IN ('receive','produce','return_in','release')
                THEN quantity
                WHEN transaction_type IN ('consume','ship','scrap','return_out','adjust')
                THEN -quantity
                ELSE 0
           END
         ), 0) AS current_qty
       FROM inventory_transactions
       WHERE lot_id = $1`,
      [req.params.id]
    );

    res.json({ ...lot, current_qty: parseFloat(balance?.current_qty ?? 0) });
  } catch (err) {
    console.error('lots get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── POST /lots ───────────────────────────────────────────────────────────────

router.post('/lots', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    const { username } = userCtx(req);

    if (!s.lot_number) return res.status(400).json({ error: 'lot_number is required' });
    if (!s.item_id)    return res.status(400).json({ error: 'item_id is required' });

    const lotType = s.lot_type || 'received';
    if (!VALID_LOT_TYPES.includes(lotType)) {
      return res.status(400).json({
        error: `Invalid lot_type. Must be one of: ${VALID_LOT_TYPES.join(', ')}`,
      });
    }

    const initialQty = s.initial_quantity ?? s.quantity_received;
    if (initialQty === undefined || initialQty === null) {
      return res.status(400).json({ error: 'initial_quantity (or quantity_received) is required' });
    }

    // parent_lot_ids: accept array of integers
    let parentLotIds = null;
    if (s.parent_lot_ids) {
      parentLotIds = Array.isArray(s.parent_lot_ids)
        ? s.parent_lot_ids.map(Number)
        : [Number(s.parent_lot_ids)];
    }

    const info = await db.run(
      `INSERT INTO lots (
        lot_number, item_id, sku_id, lot_type,
        supplier_id, supplier_lot_number, po_number,
        production_order_id, bom_version_id,
        parent_lot_ids,
        received_date, production_date,
        expiry_date, best_before_date,
        initial_quantity, quantity_received, quantity_remaining,
        unit,
        qa_status,
        current_location_id,
        notes,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10,
        $11, $12,
        $13, $14,
        $15, $15, $15,
        $16,
        $17,
        $18,
        $19,
        $20, $20
      )`,
      [
        s.lot_number,
        parseInt(s.item_id, 10),
        s.sku_id ? parseInt(s.sku_id, 10) : null,
        lotType,
        s.supplier_id ? parseInt(s.supplier_id, 10) : null,
        s.supplier_lot_number || null,
        s.po_number || null,
        s.production_order_id ? parseInt(s.production_order_id, 10) : null,
        s.bom_version_id ? parseInt(s.bom_version_id, 10) : null,
        parentLotIds,
        s.received_date || (lotType === 'received' ? new Date().toISOString() : null),
        s.production_date || (lotType !== 'received' ? new Date().toISOString() : null),
        s.expiry_date || null,
        s.best_before_date || null,
        parseFloat(initialQty),
        s.unit || null,
        s.qa_status || 'pending_qa',
        s.current_location_id ? parseInt(s.current_location_id, 10) : null,
        s.notes || null,
        username,
      ]
    );

    const created = await db.get('SELECT * FROM lots WHERE id = $1', [info.lastInsertRowid]);
    logAudit(req, 'create_lot', 'lots', created.id, created.lot_number, {
      new_values: { lot_number: created.lot_number, item_id: created.item_id, lot_type: created.lot_type },
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'lot_number already exists' });
    }
    console.error('lots create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── PUT /lots/:id ────────────────────────────────────────────────────────────

router.put('/lots/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get(
      'SELECT * FROM lots WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Lot not found' });

    const s = sanitizeBody(req.body);
    const { username } = userCtx(req);

    if (s.lot_type && !VALID_LOT_TYPES.includes(s.lot_type)) {
      return res.status(400).json({
        error: `Invalid lot_type. Must be one of: ${VALID_LOT_TYPES.join(', ')}`,
      });
    }

    // QA status changes must go through /qa-status endpoint
    if (s.qa_status !== undefined) {
      return res.status(400).json({
        error: 'Use POST /lots/:id/qa-status to change QA status',
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
        if (field === 'parent_lot_ids') {
          const arr = Array.isArray(s[field])
            ? s[field].map(Number)
            : [Number(s[field])];
          addField(field, arr);
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
      `UPDATE lots SET ${setClauses.join(', ')} WHERE id = $${++idx}`,
      params
    );

    const updated = await db.get('SELECT * FROM lots WHERE id = $1', [req.params.id]);
    logAudit(req, 'update_lot', 'lots', req.params.id, existing.lot_number, {
      old_values: existing,
      new_values: s,
    });
    res.json(updated);
  } catch (err) {
    console.error('lots update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── POST /lots/:id/qa-status ─────────────────────────────────────────────────

router.post('/lots/:id/qa-status', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get(
      'SELECT * FROM lots WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Lot not found' });

    const s = sanitizeBody(req.body);
    const { username } = userCtx(req);

    const newStatus = s.qa_status;
    if (!newStatus) return res.status(400).json({ error: 'qa_status is required' });
    if (!VALID_QA_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid qa_status. Must be one of: ${VALID_QA_STATUSES.join(', ')}`,
      });
    }

    const fromStatus = existing.qa_status;
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(422).json({
        error: `Cannot transition from '${fromStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
      });
    }

    const setClauses = [`qa_status = $1`, `updated_by = $2`, `updated_at = NOW()`];
    const params = [newStatus, username];
    let idx = 2;

    if (newStatus === 'released' || newStatus === 'qa_released') {
      setClauses.push(`qa_released_by = $${++idx}`, `qa_released_at = NOW()`);
      params.push(username);
    }

    params.push(req.params.id);
    await db.run(
      `UPDATE lots SET ${setClauses.join(', ')} WHERE id = $${++idx}`,
      params
    );

    const updated = await db.get('SELECT * FROM lots WHERE id = $1', [req.params.id]);
    logAudit(req, 'qa_status_change', 'lots', req.params.id, existing.lot_number, {
      old_values: { qa_status: fromStatus },
      new_values: { qa_status: newStatus, reason: s.reason || null, notes: s.notes || null },
    });
    res.json(updated);
  } catch (err) {
    console.error('lots qa-status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ─── GET /lots/:id/transactions ───────────────────────────────────────────────

router.get('/lots/:id/transactions', async (req, res) => {
  try {
    const lot = await db.get(
      'SELECT id, lot_number FROM lots WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!lot) return res.status(404).json({ error: 'Lot not found' });

    const transactions = await db.all(
      `SELECT
         it.*,
         fl.code AS from_location_code,
         fl.name AS from_location_name,
         tl.code AS to_location_code,
         tl.name AS to_location_name,
         rc.code AS reason_code,
         rc.description AS reason_description
       FROM inventory_transactions it
       LEFT JOIN locations fl ON it.from_location_id = fl.id
       LEFT JOIN locations tl ON it.to_location_id   = tl.id
       LEFT JOIN reason_codes rc ON it.reason_code_id = rc.id
       WHERE it.lot_id = $1
       ORDER BY it.created_at DESC`,
      [req.params.id]
    );

    res.json({ lot_id: lot.id, lot_number: lot.lot_number, transactions });
  } catch (err) {
    console.error('lots transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
