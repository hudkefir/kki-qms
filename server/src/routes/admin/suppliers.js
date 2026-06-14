import { Router } from 'express';
import db from '../../database-pg.js';
import { requireWriteAccess, requireRole } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { broadcast } from '../../websocket.js';
import { sanitizeBody } from '../../sanitize.js';

const router = Router();

// ==================== BOOTSTRAP TABLE ====================
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      products_supplied TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('approved','conditional','suspended','pending')),
      approval_date TEXT,
      next_review_date TEXT,
      risk_level TEXT DEFAULT 'low' CHECK(risk_level IN ('low','medium','high')),
      certification TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS supplier_documents (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      document_type TEXT DEFAULT 'other',
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      uploaded_by TEXT DEFAULT '',
      uploaded_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS supplier_reviews (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      review_date TEXT NOT NULL,
      reviewer TEXT DEFAULT '',
      outcome TEXT DEFAULT 'approved' CHECK(outcome IN ('approved','conditional','suspended')),
      findings TEXT DEFAULT '',
      corrective_actions TEXT DEFAULT '',
      next_review TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS supplier_activities (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL DEFAULT 'note',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      created_by TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supplier_checklist (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      item_category TEXT DEFAULT 'documentation',
      required INTEGER DEFAULT 1,
      completed INTEGER DEFAULT 0,
      completed_date TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_checklist_supplier ON supplier_checklist(supplier_id);
  `);
} catch (e) {
  console.log('Supplier tables already exist or migration error:', e.message);
}

// ==================== STANDARD CHECKLIST TEMPLATE ====================
// Default required-document set seeded for every supplier. Items are required
// by default; staff toggle individual items to "N/A" (optional) per supplier
// via the PATCH endpoint. This drives the green-check completion % .
const STANDARD_CHECKLIST = [
  { item_name: 'Supplier Evaluation Checklist (KK-FRM-00900)', item_category: 'documentation' },
  { item_name: 'Certificate of Analysis (COA)',                item_category: 'quality' },
  { item_name: 'Food Safety Certification (SQF/BRC/GFSI)',     item_category: 'certification' },
  { item_name: 'Product Specification Sheet',                  item_category: 'documentation' },
  { item_name: 'Certificate of Insurance (COI)',               item_category: 'compliance' },
];

/**
 * Idempotently seed the standard checklist for one supplier.
 * No-op if the supplier already has ANY checklist rows (so we never clobber
 * existing per-supplier customisation or N/A toggles).
 * @returns {Promise<number>} number of items inserted (0 if skipped)
 */
async function seedChecklistForSupplier(supplierId) {
  const existing = await db.get('SELECT COUNT(*) as c FROM supplier_checklist WHERE supplier_id = ?', [supplierId]);
  if (existing && existing.c > 0) return 0;
  let inserted = 0;
  for (const item of STANDARD_CHECKLIST) {
    await db.run(
      'INSERT INTO supplier_checklist (supplier_id, item_name, item_category, required, completed) VALUES (?, ?, ?, 1, 0)',
      [supplierId, item.item_name, item.item_category]
    );
    inserted++;
  }
  return inserted;
}

// One-time boot backfill: give every existing supplier with an empty checklist
// the standard set, so green-check bars populate instead of showing "not configured".
(async () => {
  try {
    const suppliers = await db.all('SELECT id FROM suppliers');
    let seededSuppliers = 0, seededItems = 0;
    for (const s of suppliers) {
      const n = await seedChecklistForSupplier(s.id);
      if (n > 0) { seededSuppliers++; seededItems += n; }
    }
    if (seededSuppliers > 0) {
      console.log(`[supplier_checklist] backfill seeded ${seededItems} items across ${seededSuppliers} suppliers`);
    }
  } catch (e) {
    console.log('[supplier_checklist] backfill skipped:', e.message);
  }
})();

// GET /api/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const { status, risk_level, search } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (risk_level) { query += ' AND risk_level = ?'; params.push(risk_level); }
    if (search) {
      query += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(products_supplied) LIKE LOWER(?) OR LOWER(contact_name) LIKE LOWER(?))';
      params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
    }

    query += ' ORDER BY name';
    const suppliers = await db.all(query, params);
    res.json(suppliers);
  } catch (err) {
    console.error('Get suppliers error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/suppliers/activities/external — Jarvis / external system endpoint
// MUST be before /:id routes so 'activities' isn't parsed as an ID
router.post('/suppliers/activities/external', async (req, res) => {
  try {
    const apiKey = process.env.QMS_API_KEY;
    if (apiKey && req.headers['x-api-key'] !== apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { supplier_id, supplier_name, activity_type = 'system', title, description = '' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let resolvedId = supplier_id;
    if (!resolvedId && supplier_name) {
      const supplier = await db.get('SELECT id FROM suppliers WHERE LOWER(name) = LOWER(?)', [supplier_name]);
      if (!supplier) return res.status(404).json({ error: 'Supplier not found by name: ' + supplier_name });
      resolvedId = supplier.id;
    }
    if (!resolvedId) return res.status(400).json({ error: 'supplier_id or supplier_name is required' });

    const info = await db.run(
      'INSERT INTO supplier_activities (supplier_id, activity_type, title, description, source, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [resolvedId, activity_type, title, description, 'jarvis', 'Jarvis']
    );

    const created = await db.get('SELECT * FROM supplier_activities WHERE id = ?', [info.lastInsertRowid]);
    broadcast('supplier_activity_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('External supplier activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/suppliers/summary
router.get('/suppliers/summary', async (req, res) => {
  try {
    const total = (await db.get('SELECT COUNT(*) as count FROM suppliers')).count;
    const approved = (await db.get("SELECT COUNT(*) as count FROM suppliers WHERE status = 'approved'")).count;
    const conditional = (await db.get("SELECT COUNT(*) as count FROM suppliers WHERE status = 'conditional'")).count;
    const suspended = (await db.get("SELECT COUNT(*) as count FROM suppliers WHERE status = 'suspended'")).count;
    const pending = (await db.get("SELECT COUNT(*) as count FROM suppliers WHERE status = 'pending'")).count;
    const overdue = (await db.get("SELECT COUNT(*) as count FROM suppliers WHERE next_review_date < date('now') AND status != 'suspended'")).count;
    res.json({ total, approved, conditional, suspended, pending, overdue });
  } catch (err) {
    console.error('Supplier summary error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/suppliers/:id

// GET /api/suppliers/checklist/summary
router.get("/suppliers/checklist/summary", async (req, res) => {
  try {
    const suppliers = await db.all("SELECT id, name, status FROM suppliers ORDER BY name");
    const summary = [];
    for (const s of suppliers) {
      const total = (await db.get("SELECT COUNT(*) as c FROM supplier_checklist WHERE supplier_id = ? AND required = 1", [s.id])).c;
      const done = (await db.get("SELECT COUNT(*) as c FROM supplier_checklist WHERE supplier_id = ? AND required = 1 AND completed = 1", [s.id])).c;
      const missingRows = await db.all("SELECT item_name FROM supplier_checklist WHERE supplier_id = ? AND required = 1 AND completed = 0 ORDER BY item_name", [s.id]);
      const missing = missingRows.map(r => r.item_name);
      summary.push({ ...s, total_required: total, completed: done, percentage: total > 0 ? Math.round(done / total * 100) : 0, missing });
    }
    res.json(summary);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get('/suppliers/:id', async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const documents = await db.all('SELECT * FROM supplier_documents WHERE supplier_id = ? ORDER BY uploaded_at DESC', [req.params.id]);
    const reviews = await db.all('SELECT * FROM supplier_reviews WHERE supplier_id = ? ORDER BY review_date DESC', [req.params.id]);

    res.json({ ...supplier, documents, reviews });
  } catch (err) {
    console.error('Get supplier error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/suppliers
router.post('/suppliers', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const { name, contact_name = '', contact_email = '', contact_phone = '', address = '', products_supplied = '', status = 'pending', approval_date = null, next_review_date = null, risk_level = 'low', certification = '', notes = '' } = sanitized;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });

    const user = req.session?.user;
    const created_by = user?.display_name || user?.username || '';

    const info = await db.run('INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, address, products_supplied, status, approval_date, next_review_date, risk_level, certification, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, contact_name, contact_email, contact_phone, address, products_supplied, status, approval_date, next_review_date, risk_level, certification, notes, created_by]);

    const created = await db.get('SELECT * FROM suppliers WHERE id = ?', [info.lastInsertRowid]);
    // Seed the standard required-document checklist so the green-check bar is populated from day one.
    try { await seedChecklistForSupplier(created.id); } catch (seedErr) { console.log('Checklist seed on create failed:', seedErr.message); }
    logAudit(req, 'create_supplier', 'suppliers', created.id, name, { new_values: sanitized });
    broadcast('supplier_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create supplier error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/suppliers/:id
router.put('/suppliers/:id', requireWriteAccess, async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = ['name', 'contact_name', 'contact_email', 'contact_phone', 'address', 'products_supplied', 'status', 'approval_date', 'next_review_date', 'risk_level', 'certification', 'notes'];

    const updates = []; const params = []; const oldValues = {}; const newValues = {};
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(field + ' = ?'); params.push(sanitized[field]);
        if (sanitized[field] !== supplier[field]) { oldValues[field] = supplier[field]; newValues[field] = sanitized[field]; }
      }
    }

    const user = req.session?.user;
    updates.push('updated_by = ?'); params.push(user?.display_name || user?.username || '');
    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length <= 2) return res.json(supplier);

    params.push(req.params.id);
    await db.run('UPDATE suppliers SET ' + updates.join(', ') + ' WHERE id = ?', params);
    const updated = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);

    if (Object.keys(oldValues).length > 0) logAudit(req, 'update_supplier', 'suppliers', req.params.id, supplier.name, { old_values: oldValues, new_values: newValues });
    broadcast('supplier_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('Update supplier error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/suppliers/:id/status (admin only)
router.patch('/suppliers/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const { status } = req.body;
    const valid = ['approved', 'conditional', 'suspended', 'pending'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status. Must be one of: ' + valid.join(', ') });

    const user = req.session?.user;
    await db.run("UPDATE suppliers SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, user?.display_name || user?.username || '', req.params.id]);
    if (status === 'approved' && !supplier.approval_date) await db.run("UPDATE suppliers SET approval_date = date('now') WHERE id = ?", [req.params.id]);

    const updated = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_supplier_status', 'suppliers', req.params.id, supplier.name, { old_values: { status: supplier.status }, new_values: { status } });
    broadcast('supplier_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('Update supplier status error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/suppliers/:id (admin only)
router.delete('/suppliers/:id', requireRole('admin'), async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    await db.run('DELETE FROM supplier_documents WHERE supplier_id = ?', [req.params.id]);
    await db.run('DELETE FROM supplier_reviews WHERE supplier_id = ?', [req.params.id]);
    await db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);

    logAudit(req, 'delete_supplier', 'suppliers', req.params.id, supplier.name, { old_values: supplier });
    broadcast('supplier_deleted', { id: parseInt(req.params.id), name: supplier.name });
    res.json({ success: true, message: 'Supplier ' + supplier.name + ' deleted' });
  } catch (err) {
    console.error('Delete supplier error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/suppliers/:id/reviews
router.post('/suppliers/:id/reviews', requireWriteAccess, async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const { review_date, outcome = 'approved', findings = '', corrective_actions = '', next_review = '' } = req.body;
    if (!review_date) return res.status(400).json({ error: 'review_date is required' });

    const user = req.session?.user;
    const reviewer = user?.display_name || user?.username || '';

    const info = await db.run('INSERT INTO supplier_reviews (supplier_id, review_date, reviewer, outcome, findings, corrective_actions, next_review) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.params.id, review_date, reviewer, outcome, findings, corrective_actions, next_review]);

    // Update supplier status based on review
    const updateFields = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
    const updateParams = [outcome];
    if (next_review) { updateFields.push('next_review_date = ?'); updateParams.push(next_review); }
    updateParams.push(req.params.id);
    await db.run('UPDATE suppliers SET ' + updateFields.join(', ') + ' WHERE id = ?', updateParams);

    const created = await db.get('SELECT * FROM supplier_reviews WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_supplier_review', 'supplier_reviews', created.id, supplier.name, { new_values: { review_date, outcome, findings } });
    res.status(201).json(created);
  } catch (err) {
    console.error('Create supplier review error:', err); res.status(500).json({ error: 'Internal server error' });
  }
});


// ==================== DOCUMENT UPLOAD ====================
import multer from "multer";
import { extname } from "path";
import { uploadFile, downloadFile, deleteFile } from '../../supabase.js';

const supplierUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/suppliers/:id/documents", requireWriteAccess, supplierUpload.single("file"), async (req, res) => {
  try {
    const supplier = await db.get("SELECT * FROM suppliers WHERE id = ?", [req.params.id]);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { document_type = "other", description = "", notes = "" } = req.body;
    const user = req.session?.user;
    const uploaded_by = user?.display_name || user?.username || "";

    // Upload to Supabase Storage
    const ext = extname(req.file.originalname).toLowerCase();
    const diskFilename = `${Date.now()}-${req.file.originalname}`;
    const storagePath = `suppliers/${req.params.id}/${diskFilename}`;
    await uploadFile(storagePath, req.file.buffer, req.file.mimetype);

    const info = await db.run(
      "INSERT INTO supplier_documents (supplier_id, filename, original_name, document_type, notes, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.params.id, storagePath, req.file.originalname, document_type, description || notes || "", req.file.size, uploaded_by]
    );

    const doc = await db.get("SELECT * FROM supplier_documents WHERE id = ?", [info.lastInsertRowid]);
    logAudit(req, "upload_supplier_doc", "supplier_documents", doc.id, supplier.name, { document_type, original_name: req.file.originalname });
    res.status(201).json(doc);
  } catch (err) {
    console.error("Supplier doc upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/suppliers/:id/documents/:docId/download", async (req, res) => {
  try {
    const doc = await db.get("SELECT * FROM supplier_documents WHERE id = ? AND supplier_id = ?", [req.params.docId, req.params.id]);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const buffer = await downloadFile(doc.filename);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);
  } catch (err) {
    console.error("Supplier doc download error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/suppliers/:id/documents/:docId (admin only)
router.delete("/suppliers/:id/documents/:docId", requireRole("admin"), async (req, res) => {
  try {
    const doc = await db.get("SELECT * FROM supplier_documents WHERE id = ? AND supplier_id = ?", [req.params.docId, req.params.id]);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Remove file from Supabase storage
    try { await deleteFile(doc.filename); } catch (e) { /* file may already be gone */ }

    await db.run("DELETE FROM supplier_documents WHERE id = ?", [doc.id]);

    const supplier = await db.get("SELECT name FROM suppliers WHERE id = ?", [req.params.id]);
    logAudit(req, "delete_supplier_doc", "supplier_documents", doc.id, supplier?.name || "", { old_values: { original_name: doc.original_name, document_type: doc.document_type } });
    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("Delete supplier doc error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// GET /api/suppliers/:id/checklist
router.get("/suppliers/:id/checklist", async (req, res) => {
  try {
    const supplier = await db.get("SELECT * FROM suppliers WHERE id = ?", [req.params.id]);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    const items = await db.all("SELECT * FROM supplier_checklist WHERE supplier_id = ? ORDER BY required DESC, completed ASC, item_name ASC", [req.params.id]);
    const total = items.filter(i => i.required).length;
    const done = items.filter(i => i.required && i.completed).length;
    res.json({ supplier_id: supplier.id, supplier_name: supplier.name, total_required: total, completed: done, percentage: total > 0 ? Math.round(done / total * 100) : 0, items });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /api/suppliers/:id/checklist — create checklist items (bulk or single)
router.post('/suppliers/:id/checklist', requireWriteAccess, async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    // Fix SERIAL sequence if out of sync (migrated from SQLite)
    try {
      await db.run("SELECT setval('supplier_checklist_id_seq', COALESCE((SELECT MAX(id) FROM supplier_checklist), 0) + 1, false)");
    } catch (seqErr) { /* sequence may not exist or already correct */ }

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];
    for (const item of items) {
      const { item_name, item_category = 'documentation', required = true, completed = false, completed_date = null, notes = '' } = item;
      if (!item_name) continue;
      const info = await db.run(
        'INSERT INTO supplier_checklist (supplier_id, item_name, item_category, required, completed, completed_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.params.id, item_name, item_category, required ? 1 : 0, completed ? 1 : 0, completed_date, notes]
      );
      const row = await db.get('SELECT * FROM supplier_checklist WHERE id = ?', [info.lastInsertRowid]);
      created.push(row);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error('Create checklist items error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/suppliers/:id/checklist/:itemId
router.patch("/suppliers/:id/checklist/:itemId", requireWriteAccess, async (req, res) => {
  try {
    const item = await db.get("SELECT * FROM supplier_checklist WHERE id = ? AND supplier_id = ?", [req.params.itemId, req.params.id]);
    if (!item) return res.status(404).json({ error: "Checklist item not found" });
    const { completed, notes, required } = req.body;
    const updates = []; const params = [];
    if (completed !== undefined) { updates.push("completed = ?"); params.push(completed ? 1 : 0); updates.push(completed ? "completed_date = CURRENT_TIMESTAMP" : "completed_date = NULL"); }
    if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
    if (required !== undefined) { updates.push("required = ?"); params.push(required ? 1 : 0); }
    updates.push("updated_at = CURRENT_TIMESTAMP"); params.push(req.params.itemId);
    await db.run("UPDATE supplier_checklist SET " + updates.join(", ") + " WHERE id = ?", params);
    res.json(await db.get("SELECT * FROM supplier_checklist WHERE id = ?", [req.params.itemId]));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// DELETE /api/suppliers/:id/checklist/:itemId — permanently remove a requirement
router.delete("/suppliers/:id/checklist/:itemId", requireWriteAccess, async (req, res) => {
  try {
    const item = await db.get("SELECT * FROM supplier_checklist WHERE id = ? AND supplier_id = ?", [req.params.itemId, req.params.id]);
    if (!item) return res.status(404).json({ error: "Checklist item not found" });
    await db.run("DELETE FROM supplier_checklist WHERE id = ?", [req.params.itemId]);
    logAudit(req, "delete_checklist_item", "supplier_checklist", item.id, item.item_name, { old_values: { item_name: item.item_name } });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /api/suppliers/:id/checklist/seed — (re)seed standard checklist for a supplier (idempotent: skips if items exist)
router.post("/suppliers/:id/checklist/seed", requireWriteAccess, async (req, res) => {
  try {
    const supplier = await db.get("SELECT * FROM suppliers WHERE id = ?", [req.params.id]);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    const inserted = await seedChecklistForSupplier(req.params.id);
    res.json({ success: true, inserted });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ==================== ACTIVITY TIMELINE ====================

// GET /api/suppliers/:id/activities
router.get('/suppliers/:id/activities', async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    const activities = await db.all(
      'SELECT * FROM supplier_activities WHERE supplier_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(activities);
  } catch (err) {
    console.error('Get supplier activities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/suppliers/:id/activities
router.post('/suppliers/:id/activities', requireWriteAccess, async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const sanitized = sanitizeBody(req.body);
    const { activity_type = 'note', title, description = '', source = 'manual' } = sanitized;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const user = req.session?.user;
    const created_by = user?.display_name || user?.username || '';

    const info = await db.run(
      'INSERT INTO supplier_activities (supplier_id, activity_type, title, description, source, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, activity_type, title, description, source, created_by]
    );

    const created = await db.get('SELECT * FROM supplier_activities WHERE id = ?', [info.lastInsertRowid]);
    broadcast('supplier_activity_created', { ...created, supplier_name: supplier.name });
    res.status(201).json(created);
  } catch (err) {
    console.error('Create supplier activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/suppliers/:id/activities/:activityId (admin only)
router.delete('/suppliers/:id/activities/:activityId', requireRole('admin'), async (req, res) => {
  try {
    const activity = await db.get(
      'SELECT * FROM supplier_activities WHERE id = ? AND supplier_id = ?',
      [req.params.activityId, req.params.id]
    );
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    await db.run('DELETE FROM supplier_activities WHERE id = ?', [req.params.activityId]);
    res.json({ success: true, message: 'Activity deleted' });
  } catch (err) {
    console.error('Delete supplier activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
