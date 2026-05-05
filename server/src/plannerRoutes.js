import { Router } from 'express';
import db from './database-pg.js';
import { logAudit } from './auditMiddleware.js';

const router = Router();

// ─── Database Initialization ────────────────────────────────────────────────
async function init() {
  await db.run(`CREATE TABLE IF NOT EXISTS planner_batches (
    id SERIAL PRIMARY KEY,
    batch_number TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    production_date TEXT NOT NULL,
    bins INTEGER NOT NULL DEFAULT 0,
    cases_per_bin REAL NOT NULL DEFAULT 10.4,
    estimated_cases INTEGER NOT NULL DEFAULT 0,
    actual_cases INTEGER,
    inventory_remaining INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available',
    hold INTEGER DEFAULT 0,
    pour_week INTEGER,
    pour_day INTEGER,
    pour_index INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    customer TEXT NOT NULL DEFAULT '',
    ship_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    shipped INTEGER DEFAULT 0,
    shipped_at TEXT,
    enabled INTEGER DEFAULT 1,
    skus JSONB DEFAULT '{}',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_fermentation (
    id SERIAL PRIMARY KEY,
    grp_number INTEGER NOT NULL,
    batch_number TEXT DEFAULT '',
    bins INTEGER NOT NULL DEFAULT 30,
    flavour TEXT DEFAULT 'Original',
    ferment_date TEXT,
    strain_date TEXT,
    ready_date TEXT,
    status TEXT DEFAULT 'fermenting',
    enabled INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_pours (
    id SERIAL PRIMARY KEY,
    week_index INTEGER NOT NULL,
    day_index INTEGER NOT NULL,
    pour_index INTEGER NOT NULL DEFAULT 0,
    pour_date TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT 'NONE',
    bins INTEGER NOT NULL DEFAULT 0,
    actual_cases INTEGER,
    batch_number TEXT DEFAULT '',
    fermentation_links JSONB DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_index, day_index, pour_index)
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_inventory_counts (
    id SERIAL PRIMARY KEY,
    count_date TEXT NOT NULL,
    sku TEXT NOT NULL,
    system_count INTEGER NOT NULL DEFAULT 0,
    physical_count INTEGER NOT NULL DEFAULT 0,
    variance INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    counted_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT DEFAULT ''
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS planner_fridge (
    id SERIAL PRIMARY KEY,
    batch_number TEXT NOT NULL,
    grp_number INTEGER,
    bins INTEGER NOT NULL DEFAULT 0,
    strain_date TEXT,
    flavour TEXT DEFAULT 'Original',
    allocated INTEGER DEFAULT 0,
    status TEXT DEFAULT 'available',
    entered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT DEFAULT ''
  )`);

  console.log('Planner DB initialized');
}

init().catch(err => console.error('Planner DB init error:', err.message));

// ─── SKU Constants ───────────────────────────────────────────────────────────
const SKUS = [
  { code: 'CK001-CAD', label: 'SC-CDN',  type: 'small', yld: 10.4 },
  { code: 'CK001-USA', label: 'SC-USA',  type: 'small', yld: 10.4 },
  { code: 'CK002-CAD', label: 'LC-CDN',  type: 'large', yld: 5.5 },
  { code: 'CK003-CAD', label: 'SCM-CDN', type: 'small', yld: 11 },
  { code: 'CK003-USA', label: 'SCM-USA', type: 'small', yld: 8.8 },
  { code: 'CK004-CAD', label: 'SCG-CDN', type: 'small', yld: 11 },
  { code: 'CK004-USA', label: 'SCG-USA', type: 'small', yld: 11 },
];
const SKU_LABELS = SKUS.map(s => s.label);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Compute fermentation ready_date = strain_date + 3 days */
function computeReadyDate(strainDate) {
  if (!strainDate) return null;
  const d = new Date(strainDate);
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

/** Parse a JSON string safely, returning fallback on failure */
function safeParse(str, fallback = {}) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY STATE BLOB (backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/state', async (req, res) => {
  try {
    const row = await db.get('SELECT data FROM planner_state WHERE id = 1', []);
    if (row && row.data) {
      res.json(JSON.parse(row.data));
    } else {
      res.json({});
    }
  } catch (err) {
    console.error('Planner get state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/state', async (req, res) => {
  try {
    const data = JSON.stringify(req.body);
    const now = new Date().toISOString();
    await db.run(
      'INSERT INTO planner_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
      [data, now]
    );
    logAudit(req, 'update', 'planner_state', 1, 'planner_state', {});
    res.json({ ok: true, updated_at: now });
  } catch (err) {
    console.error('Planner save state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BATCHES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/batches', async (req, res) => {
  try {
    const { sku, status, from, to } = req.query;
    let sql = 'SELECT * FROM planner_batches WHERE 1=1';
    const params = [];
    if (sku) { sql += ' AND sku = ?'; params.push(sku); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND production_date >= ?'; params.push(from); }
    if (to) { sql += ' AND production_date <= ?'; params.push(to); }
    sql += ' ORDER BY production_date ASC, id ASC';
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /batches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/batches/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM planner_batches WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Batch not found' });
    res.json(row);
  } catch (err) {
    console.error('Planner GET /batches/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/batches', async (req, res) => {
  try {
    const { batch_number, sku, production_date, bins, cases_per_bin, estimated_cases, actual_cases, inventory_remaining, status, hold, pour_week, pour_day, pour_index, notes } = req.body;
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO planner_batches (batch_number, sku, production_date, bins, cases_per_bin, estimated_cases, actual_cases, inventory_remaining, status, hold, pour_week, pour_day, pour_index, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [batch_number, sku, production_date, bins || 0, cases_per_bin || 0, estimated_cases || 0, actual_cases || 0, inventory_remaining || 0, status || 'available', hold || 0, pour_week, pour_day, pour_index, notes || '', now, now]
    );
    const created = await db.get('SELECT * FROM planner_batches WHERE id = ?', [result.lastInsertRowid]);

    // If this batch came from a pour, consume fridge bins
    if (pour_week != null && pour_day != null) {
      const pour = await db.get(
        'SELECT * FROM planner_pours WHERE week_index = ? AND day_index = ? AND pour_index = ?',
        [pour_week, pour_day, pour_index || 0]
      );
      if (pour && pour.fermentation_links) {
        const fermLinks = safeParse(pour.fermentation_links, []);
        for (const link of fermLinks) {
          const grpNum = link.grp_number || link.grpNumber || link;
          if (grpNum) {
            // Decrement fridge bins for this fermentation group
            const fridgeEntry = await db.get(
              'SELECT * FROM planner_fridge WHERE grp_number = ? AND status = ?',
              [grpNum, 'ready']
            );
            if (fridgeEntry) {
              const binsUsed = link.bins || pour.bins || bins || 0;
              const newBins = Math.max(0, fridgeEntry.bins - binsUsed);
              const newStatus = newBins <= 0 ? 'consumed' : 'ready';
              await db.run(
                'UPDATE planner_fridge SET bins = ?, status = ?, notes = ? WHERE id = ?',
                [newBins, newStatus, `Used ${binsUsed} bins for batch ${batch_number}`, fridgeEntry.id]
              );
            }
          }
        }
      }
    }

    logAudit(req, 'create', 'planner_batch', created.id, batch_number, { new_values: { batch_number, sku, production_date, bins, status: status || 'available' } });
    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /batches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/batches/:id', async (req, res) => {
  try {
    const { batch_number, sku, production_date, bins, cases_per_bin, estimated_cases, actual_cases, inventory_remaining, status, hold, pour_week, pour_day, pour_index, notes } = req.body;
    const now = new Date().toISOString();
    await db.run(
      `UPDATE planner_batches SET batch_number=?, sku=?, production_date=?, bins=?, cases_per_bin=?, estimated_cases=?, actual_cases=?, inventory_remaining=?, status=?, hold=?, pour_week=?, pour_day=?, pour_index=?, notes=?, updated_at=?
       WHERE id=?`,
      [batch_number, sku, production_date, bins, cases_per_bin, estimated_cases, actual_cases, inventory_remaining, status, hold, pour_week, pour_day, pour_index, notes, now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_batches WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Batch not found' });
    logAudit(req, 'update', 'planner_batch', req.params.id, batch_number, { new_values: { batch_number, sku, production_date, bins, status } });
    res.json(updated);
  } catch (err) {
    console.error('Planner PUT /batches/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/batches/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM planner_batches WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Batch not found' });
    // Cascade: remove pick records referencing this batch
    await db.run('DELETE FROM planner_pick_records WHERE batch_id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Planner DELETE /batches/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/batches/:id/hold', async (req, res) => {
  try {
    const batch = await db.get('SELECT * FROM planner_batches WHERE id = ?', [req.params.id]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const newHold = batch.hold ? 0 : 1;
    const newStatus = newHold ? 'on-hold' : 'available';
    const now = new Date().toISOString();
    await db.run('UPDATE planner_batches SET hold = ?, status = ?, updated_at = ? WHERE id = ?', [newHold, newStatus, now, req.params.id]);
    const updated = await db.get('SELECT * FROM planner_batches WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('Planner PATCH /batches/:id/hold error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/batches/:id/adjust', async (req, res) => {
  try {
    const { inventory_remaining } = req.body;
    if (inventory_remaining == null) return res.status(400).json({ error: 'inventory_remaining is required' });
    const now = new Date().toISOString();
    await db.run('UPDATE planner_batches SET inventory_remaining = ?, updated_at = ? WHERE id = ?', [inventory_remaining, now, req.params.id]);
    const updated = await db.get('SELECT * FROM planner_batches WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Batch not found' });
    res.json(updated);
  } catch (err) {
    console.error('Planner PATCH /batches/:id/adjust error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/purchase-orders', async (req, res) => {
  try {
    const { status, enabled } = req.query;
    let sql = 'SELECT * FROM planner_purchase_orders WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (enabled != null) { sql += ' AND enabled = ?'; params.push(Number(enabled)); }
    sql += ' ORDER BY ship_date ASC, id ASC';
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /purchase-orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(row);
  } catch (err) {
    console.error('Planner GET /purchase-orders/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/purchase-orders', async (req, res) => {
  try {
    const { po_number, customer, ship_date, status, shipped, shipped_at, enabled, skus, notes } = req.body;
    const now = new Date().toISOString();
    const skusStr = typeof skus === 'string' ? skus : JSON.stringify(skus || {});
    const result = await db.run(
      `INSERT INTO planner_purchase_orders (po_number, customer, ship_date, status, shipped, shipped_at, enabled, skus, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [po_number, customer, ship_date, status || 'pending', shipped || 0, shipped_at || null, enabled != null ? Number(enabled) : 1, skusStr, notes || '', now, now]
    );
    const created = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /purchase-orders error:', err);
    if (err.message && err.message.includes('unique')) {
      return res.status(409).json({ error: 'Duplicate PO number' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const { po_number, customer, ship_date, status, shipped, shipped_at, enabled, skus, notes } = req.body;
    const now = new Date().toISOString();
    const skusStr = typeof skus === 'string' ? skus : JSON.stringify(skus || {});
    await db.run(
      `UPDATE planner_purchase_orders SET po_number=?, customer=?, ship_date=?, status=?, shipped=?, shipped_at=?, enabled=?, skus=?, notes=?, updated_at=?
       WHERE id=?`,
      [po_number, customer, ship_date, status, shipped, shipped_at, enabled, skusStr, notes, now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(updated);
  } catch (err) {
    console.error('Planner PUT /purchase-orders/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Purchase order not found' });

    // Cascade: restore picked inventory back to batches, then remove pick records
    const picks = await db.all('SELECT * FROM planner_pick_records WHERE po_id = ?', [req.params.id]);
    const now = new Date().toISOString();
    for (const pick of picks) {
      await db.run(
        `UPDATE planner_batches SET inventory_remaining = inventory_remaining + ?,
                status = CASE WHEN status = 'depleted' THEN 'available' ELSE status END,
                updated_at = ? WHERE id = ?`,
        [pick.quantity, now, pick.batch_id]
      );
    }
    await db.run('DELETE FROM planner_pick_records WHERE po_id = ?', [req.params.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Planner DELETE /purchase-orders/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/purchase-orders/:id/ship', async (req, res) => {
  try {
    const po = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });

    // Validate picks cover order quantities
    const skuDemand = safeParse(po.skus, {});
    const pickRows = await db.all(
      'SELECT sku, COALESCE(SUM(quantity), 0) AS picked FROM planner_pick_records WHERE po_id = ? GROUP BY sku',
      [req.params.id]
    );
    const picked = {};
    for (const r of pickRows) picked[r.sku] = r.picked;

    const shortages = {};
    for (const [sku, need] of Object.entries(skuDemand)) {
      const qty = Number(need) || 0;
      if (qty <= 0) continue;
      const have = picked[sku] || 0;
      if (have < qty) {
        shortages[sku] = { need: qty, picked: have, short: qty - have };
      }
    }

    // Allow force-ship with ?force=1, otherwise block
    if (Object.keys(shortages).length > 0 && req.query.force !== '1') {
      return res.status(400).json({
        error: 'Cannot ship — picks do not cover all SKU quantities. Use ?force=1 to override.',
        shortages
      });
    }

    const now = new Date().toISOString();
    await db.run(
      'UPDATE planner_purchase_orders SET shipped = 1, shipped_at = ?, status = ?, updated_at = ? WHERE id = ?',
      [now, 'shipped', now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('Planner PATCH /purchase-orders/:id/ship error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/purchase-orders/:id/unship', async (req, res) => {
  try {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE planner_purchase_orders SET shipped = 0, shipped_at = NULL, status = ?, updated_at = ? WHERE id = ?',
      ['pending', now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_purchase_orders WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Purchase order not found' });
    res.json(updated);
  } catch (err) {
    console.error('Planner PATCH /purchase-orders/:id/unship error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FERMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/fermentation', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM planner_fermentation ORDER BY ferment_date DESC, id DESC', []);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /fermentation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/fermentation', async (req, res) => {
  try {
    const { grp_number, batch_number, bins, flavour, ferment_date, strain_date, status, enabled, notes } = req.body;
    const ready_date = computeReadyDate(strain_date);
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO planner_fermentation (grp_number, batch_number, bins, flavour, ferment_date, strain_date, ready_date, status, enabled, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [grp_number, batch_number, bins || 0, flavour, ferment_date, strain_date, ready_date, status || 'fermenting', enabled != null ? Number(enabled) : 1, notes || '', now, now]
    );
    const created = await db.get('SELECT * FROM planner_fermentation WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /fermentation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/fermentation/:id', async (req, res) => {
  try {
    const { grp_number, batch_number, bins, flavour, ferment_date, strain_date, status, enabled, notes } = req.body;
    const ready_date = computeReadyDate(strain_date);
    const now = new Date().toISOString();
    await db.run(
      `UPDATE planner_fermentation SET grp_number=?, batch_number=?, bins=?, flavour=?, ferment_date=?, strain_date=?, ready_date=?, status=?, enabled=?, notes=?, updated_at=?
       WHERE id=?`,
      [grp_number, batch_number, bins, flavour, ferment_date, strain_date, ready_date, status, enabled, notes, now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_fermentation WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Fermentation entry not found' });
    res.json(updated);
  } catch (err) {
    console.error('Planner PUT /fermentation/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/fermentation/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM planner_fermentation WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Fermentation entry not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Planner DELETE /fermentation/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/fermentation/:id/toggle', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM planner_fermentation WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Fermentation entry not found' });
    const newEnabled = entry.enabled ? 0 : 1;
    const now = new Date().toISOString();
    await db.run('UPDATE planner_fermentation SET enabled = ?, updated_at = ? WHERE id = ?', [newEnabled, now, req.params.id]);
    const updated = await db.get('SELECT * FROM planner_fermentation WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('Planner PATCH /fermentation/:id/toggle error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POURS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pours', async (req, res) => {
  try {
    const { from, to, week_index } = req.query;
    let sql = 'SELECT * FROM planner_pours WHERE 1=1';
    const params = [];
    if (from) { sql += ' AND pour_date >= ?'; params.push(from); }
    if (to) { sql += ' AND pour_date <= ?'; params.push(to); }
    if (week_index != null) { sql += ' AND week_index = ?'; params.push(Number(week_index)); }
    sql += ' ORDER BY week_index ASC, day_index ASC, pour_index ASC';
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /pours error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pours', async (req, res) => {
  try {
    const { week_index, day_index, pour_index, pour_date, sku, bins, actual_cases, batch_number, fermentation_links, enabled, notes } = req.body;
    const now = new Date().toISOString();
    const fermLinksStr = typeof fermentation_links === 'string' ? fermentation_links : JSON.stringify(fermentation_links || []);
    const result = await db.run(
      `INSERT INTO planner_pours (week_index, day_index, pour_index, pour_date, sku, bins, actual_cases, batch_number, fermentation_links, enabled, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_index, day_index, pour_index) DO UPDATE SET
         pour_date=excluded.pour_date, sku=excluded.sku, bins=excluded.bins,
         actual_cases=excluded.actual_cases, batch_number=excluded.batch_number,
         fermentation_links=excluded.fermentation_links, enabled=excluded.enabled,
         notes=excluded.notes, updated_at=excluded.updated_at`,
      [week_index, day_index, pour_index, pour_date, sku, bins || 0, actual_cases || 0, batch_number, fermLinksStr, enabled != null ? Number(enabled) : 1, notes || '', now, now]
    );
    // Fetch the upserted row
    const row = await db.get(
      'SELECT * FROM planner_pours WHERE week_index = ? AND day_index = ? AND pour_index = ?',
      [week_index, day_index, pour_index]
    );
    res.status(201).json(row);
  } catch (err) {
    console.error('Planner POST /pours error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pours/:id', async (req, res) => {
  try {
    const { week_index, day_index, pour_index, pour_date, sku, bins, actual_cases, batch_number, fermentation_links, enabled, notes } = req.body;
    const now = new Date().toISOString();
    const fermLinksStr = typeof fermentation_links === 'string' ? fermentation_links : JSON.stringify(fermentation_links || []);
    await db.run(
      `UPDATE planner_pours SET week_index=?, day_index=?, pour_index=?, pour_date=?, sku=?, bins=?, actual_cases=?, batch_number=?, fermentation_links=?, enabled=?, notes=?, updated_at=?
       WHERE id=?`,
      [week_index, day_index, pour_index, pour_date, sku, bins, actual_cases, batch_number, fermLinksStr, enabled, notes, now, req.params.id]
    );
    const updated = await db.get('SELECT * FROM planner_pours WHERE id = ?', [req.params.id]);
    if (!updated) return res.status(404).json({ error: 'Pour not found' });
    res.json(updated);
  } catch (err) {
    console.error('Planner PUT /pours/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pours/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM planner_pours WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Pour not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Planner DELETE /pours/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pours/bulk', async (req, res) => {
  try {
    const { pours } = req.body;
    if (!Array.isArray(pours)) return res.status(400).json({ error: 'pours array is required' });
    const now = new Date().toISOString();
    const results = [];
    for (const p of pours) {
      const fermLinksStr = typeof p.fermentation_links === 'string' ? p.fermentation_links : JSON.stringify(p.fermentation_links || []);
      await db.run(
        `INSERT INTO planner_pours (week_index, day_index, pour_index, pour_date, sku, bins, actual_cases, batch_number, fermentation_links, enabled, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(week_index, day_index, pour_index) DO UPDATE SET
           pour_date=excluded.pour_date, sku=excluded.sku, bins=excluded.bins,
           actual_cases=excluded.actual_cases, batch_number=excluded.batch_number,
           fermentation_links=excluded.fermentation_links, enabled=excluded.enabled,
           notes=excluded.notes, updated_at=excluded.updated_at`,
        [p.week_index, p.day_index, p.pour_index, p.pour_date, p.sku, p.bins || 0, p.actual_cases || 0, p.batch_number, fermLinksStr, p.enabled != null ? Number(p.enabled) : 1, p.notes || '', now, now]
      );
      const row = await db.get(
        'SELECT * FROM planner_pours WHERE week_index = ? AND day_index = ? AND pour_index = ?',
        [p.week_index, p.day_index, p.pour_index]
      );
      if (row) results.push(row);
    }
    res.status(201).json(results);
  } catch (err) {
    console.error('Planner POST /pours/bulk error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/inventory', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT sku,
              SUM(inventory_remaining) AS total_cases,
              COUNT(*) AS batch_count,
              SUM(CASE WHEN status = 'available' THEN inventory_remaining ELSE 0 END) AS available_cases,
              SUM(CASE WHEN status = 'on-hold' THEN inventory_remaining ELSE 0 END) AS on_hold_cases
       FROM planner_batches
       GROUP BY sku
       ORDER BY sku`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/inventory/counts', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM planner_inventory_counts ORDER BY count_date DESC, id DESC', []);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /inventory/counts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/inventory/counts', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Helper: adjust batch inventory_remaining based on count variance
    async function adjustBatchesForVariance(sku, variance) {
      if (variance === 0) return;
      // Get available batches for this SKU, newest first (adjust newest first)
      const batches = await db.all(
        `SELECT * FROM planner_batches WHERE sku = ? AND status IN ('available', 'on-hold') AND inventory_remaining > 0
         ORDER BY production_date DESC, id DESC`,
        [sku]
      );
      if (batches.length === 0) return;

      let remaining = variance; // negative = we have less than system thinks

      if (remaining < 0) {
        // Physical < system: reduce batch inventory (newest first)
        let toReduce = Math.abs(remaining);
        for (const b of batches) {
          if (toReduce <= 0) break;
          const reduce = Math.min(toReduce, b.inventory_remaining);
          const newRemaining = b.inventory_remaining - reduce;
          const newStatus = newRemaining <= 0 ? 'depleted' : b.status;
          await db.run(
            'UPDATE planner_batches SET inventory_remaining = ?, status = ?, updated_at = ? WHERE id = ?',
            [newRemaining, newStatus, now, b.id]
          );
          toReduce -= reduce;
        }
      } else {
        // Physical > system: add to the newest available batch
        const newest = batches[0];
        await db.run(
          'UPDATE planner_batches SET inventory_remaining = inventory_remaining + ?, updated_at = ? WHERE id = ?',
          [remaining, now, newest.id]
        );
      }
    }

    // Support batch format from planner modal: { counts: [...], count_date }
    if (req.body.counts && Array.isArray(req.body.counts)) {
      const batchDate = req.body.count_date || now.slice(0, 10);
      const operator = req.user?.name || req.user?.username || '';
      const created = [];
      for (const item of req.body.counts) {
        // Calculate real system count from batches
        const sysRow = await db.get(
          `SELECT COALESCE(SUM(inventory_remaining), 0) AS total FROM planner_batches WHERE sku = ? AND status IN ('available', 'on-hold')`,
          [item.sku]
        );
        const systemCount = sysRow?.total || 0;
        const physicalCount = item.counted || 0;
        const variance = physicalCount - systemCount;

        const result = await db.run(
          `INSERT INTO planner_inventory_counts (count_date, sku, system_count, physical_count, variance, notes, counted_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [batchDate, item.sku, systemCount, physicalCount, variance, '', operator, now]
        );
        const row = await db.get('SELECT * FROM planner_inventory_counts WHERE id = ?', [result.lastInsertRowid]);
        if (row) created.push(row);

        // Auto-adjust batch inventory to match physical count
        if (variance !== 0) {
          await adjustBatchesForVariance(item.sku, variance);
        }
      }
      return res.status(201).json(created);
    }

    // Single record format (from InventoryCounts page)
    const { count_date, sku, system_count, physical_count, variance, notes, counted_by } = req.body;
    // If system_count not provided, calculate from batches
    let actualSystemCount = system_count;
    if (actualSystemCount == null || actualSystemCount === 0) {
      const sysRow = await db.get(
        `SELECT COALESCE(SUM(inventory_remaining), 0) AS total FROM planner_batches WHERE sku = ? AND status IN ('available', 'on-hold')`,
        [sku]
      );
      actualSystemCount = sysRow?.total || 0;
    }
    const computedVariance = variance != null ? variance : (physical_count || 0) - actualSystemCount;
    const result = await db.run(
      `INSERT INTO planner_inventory_counts (count_date, sku, system_count, physical_count, variance, notes, counted_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [count_date || now.slice(0, 10), sku, actualSystemCount, physical_count || 0, computedVariance, notes || '', counted_by || '', now]
    );
    const created = await db.get('SELECT * FROM planner_inventory_counts WHERE id = ?', [result.lastInsertRowid]);

    // Auto-adjust batch inventory to match physical count
    if (computedVariance !== 0 && sku) {
      await adjustBatchesForVariance(sku, computedVariance);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /inventory/counts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/inventory/fifo', async (req, res) => {
  try {
    // 1. Active POs sorted by ship_date ASC
    const pos = await db.all(
      `SELECT * FROM planner_purchase_orders WHERE enabled = 1 AND shipped = 0 ORDER BY ship_date ASC, id ASC`,
      []
    );

    // 2. Available batches sorted by production_date ASC (FIFO)
    const batches = await db.all(
      `SELECT * FROM planner_batches WHERE status = 'available' AND inventory_remaining > 0 ORDER BY production_date ASC, id ASC`,
      []
    );

    // Build a mutable remaining map keyed by batch id
    const batchRemaining = {};
    for (const b of batches) {
      batchRemaining[b.id] = b.inventory_remaining;
    }

    const allocations = {};
    const shortages = {};

    for (const po of pos) {
      const skuDemand = safeParse(po.skus, {});
      allocations[po.id] = {};
      shortages[po.id] = {};

      for (const [sku, need] of Object.entries(skuDemand)) {
        const qty = Number(need) || 0;
        if (qty <= 0) continue;

        allocations[po.id][sku] = [];
        let remaining = qty;

        // Filter batches matching this SKU
        for (const b of batches) {
          if (remaining <= 0) break;
          if (b.sku !== sku) continue;
          const avail = batchRemaining[b.id] || 0;
          if (avail <= 0) continue;

          const take = Math.min(remaining, avail);
          allocations[po.id][sku].push({
            batchId: b.id,
            batchNumber: b.batch_number,
            qty: take,
          });
          batchRemaining[b.id] -= take;
          remaining -= take;
        }

        if (remaining > 0) {
          shortages[po.id][sku] = {
            need: qty,
            have: qty - remaining,
            short: remaining,
          };
        }
      }
    }

    res.json({ allocations, shortages });
  } catch (err) {
    console.error('Planner GET /inventory/fifo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/settings', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM planner_settings ORDER BY key', []);
    const obj = {};
    for (const r of rows) obj[r.key] = r.value;
    res.json(obj);
  } catch (err) {
    console.error('Planner GET /settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key is required' });
    await db.run(
      `INSERT INTO planner_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
    res.json({ ok: true, key, value });
  } catch (err) {
    console.error('Planner PUT /settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FRIDGE
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/fridge', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM planner_fridge ORDER BY entered_at DESC, id DESC', []);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /fridge error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/fridge/sync', async (req, res) => {
  try {
    // Find fermentation entries that are ready (status='ready' or ready_date <= today)
    const today = new Date().toISOString().slice(0, 10);
    const readyEntries = await db.all(
      `SELECT * FROM planner_fermentation WHERE enabled = 1 AND (status = 'ready' OR (ready_date IS NOT NULL AND ready_date <= ?))`,
      [today]
    );

    let synced = 0;
    for (const entry of readyEntries) {
      // Check if already in fridge
      const existing = await db.get(
        'SELECT id FROM planner_fridge WHERE grp_number = ? AND batch_number = ?',
        [entry.grp_number, entry.batch_number]
      );
      if (existing) continue;

      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO planner_fridge (batch_number, grp_number, bins, strain_date, flavour, allocated, status, entered_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.batch_number, entry.grp_number, entry.bins, entry.strain_date, entry.flavour, 0, 'ready', now, '']
      );
      synced++;

      // Also update the fermentation status to 'ready' if not already
      if (entry.status !== 'ready') {
        await db.run('UPDATE planner_fermentation SET status = ?, updated_at = ? WHERE id = ?', ['ready', now, entry.id]);
      }
    }

    const rows = await db.all('SELECT * FROM planner_fridge ORDER BY entered_at DESC, id DESC', []);
    res.json({ ok: true, synced, fridge: rows });
  } catch (err) {
    console.error('Planner POST /fridge/sync error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PICK RECORDS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pick-records', async (req, res) => {
  try {
    const { po_id } = req.query;
    let sql = 'SELECT * FROM planner_pick_records';
    const params = [];
    if (po_id) { sql += ' WHERE po_id = ?'; params.push(po_id); }
    sql += ' ORDER BY picked_at DESC, id DESC';
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /pick-records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pick-records', async (req, res) => {
  try {
    const { po_id, sku, batch_id, batch_number, quantity, picked_by, notes } = req.body;
    if (!po_id || !batch_id || !quantity) {
      return res.status(400).json({ error: 'po_id, batch_id, and quantity are required' });
    }

    // Verify batch exists and has enough inventory
    const batch = await db.get('SELECT * FROM planner_batches WHERE id = ?', [batch_id]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.inventory_remaining < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory', available: batch.inventory_remaining, requested: quantity });
    }

    const now = new Date().toISOString();

    // Create pick record
    const result = await db.run(
      `INSERT INTO planner_pick_records (po_id, sku, batch_id, batch_number, quantity, picked_by, picked_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [po_id, sku || batch.sku, batch_id, batch_number || batch.batch_number, quantity, picked_by || '', now, notes || '']
    );

    // Decrement batch inventory_remaining
    const newRemaining = batch.inventory_remaining - quantity;
    const newStatus = newRemaining <= 0 ? 'depleted' : batch.status;
    await db.run(
      'UPDATE planner_batches SET inventory_remaining = ?, status = ?, updated_at = ? WHERE id = ?',
      [newRemaining, newStatus, now, batch_id]
    );

    const created = await db.get('SELECT * FROM planner_pick_records WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /pick-records error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/announcements', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM planner_announcements ORDER BY created_at DESC, id DESC', []);
    res.json(rows);
  } catch (err) {
    console.error('Planner GET /announcements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { text, created_by } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO planner_announcements (text, created_by, created_at) VALUES (?, ?, ?)',
      [text, created_by || '', now]
    );
    const created = await db.get('SELECT * FROM planner_announcements WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Planner POST /announcements error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    // Total available bins and cases from batches
    const invSummary = await db.get(
      `SELECT COALESCE(SUM(bins), 0) AS total_bins_available,
              COALESCE(SUM(inventory_remaining), 0) AS total_cases_available
       FROM planner_batches WHERE status = 'available'`,
      []
    );

    // Bins planned in pours
    const pourSummary = await db.get(
      `SELECT COALESCE(SUM(bins), 0) AS bins_planned,
              COALESCE(SUM(actual_cases), 0) AS cases_planned
       FROM planner_pours WHERE enabled = 1`,
      []
    );

    // Fermentation coverage: total fermenting/resting bins
    const fermSummary = await db.get(
      `SELECT COALESCE(SUM(bins), 0) AS fermentation_bins,
              COUNT(*) AS fermentation_entries
       FROM planner_fermentation WHERE enabled = 1 AND status IN ('fermenting', 'resting')`,
      []
    );

    // Demand vs supply per SKU
    const pos = await db.all(
      `SELECT skus FROM planner_purchase_orders WHERE enabled = 1 AND shipped = 0`,
      []
    );
    const demand = {};
    for (const po of pos) {
      const skuMap = safeParse(po.skus, {});
      for (const [sku, qty] of Object.entries(skuMap)) {
        demand[sku] = (demand[sku] || 0) + (Number(qty) || 0);
      }
    }

    const supply = {};
    const supplyRows = await db.all(
      `SELECT sku, COALESCE(SUM(inventory_remaining), 0) AS available
       FROM planner_batches WHERE status = 'available'
       GROUP BY sku`,
      []
    );
    for (const r of supplyRows) {
      supply[r.sku] = r.available;
    }

    // Merge demand and supply into per-SKU view
    const allSkus = new Set([...Object.keys(demand), ...Object.keys(supply)]);
    const demandVsSupply = {};
    for (const sku of allSkus) {
      const d = demand[sku] || 0;
      const s = supply[sku] || 0;
      demandVsSupply[sku] = { demand: d, supply: s, surplus: s - d };
    }

    res.json({
      totalBinsAvailable: invSummary.total_bins_available,
      totalCasesAvailable: invSummary.total_cases_available,
      binsPlanned: pourSummary.bins_planned,
      casesPlanned: pourSummary.cases_planned,
      fermentationBins: fermSummary.fermentation_bins,
      fermentationEntries: fermSummary.fermentation_entries,
      demandVsSupply,
    });
  } catch (err) {
    console.error('Planner GET /dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
