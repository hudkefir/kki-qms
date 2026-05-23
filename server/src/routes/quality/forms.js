import { Router } from 'express';
import db from '../../database-pg.js';
import { logAudit } from '../../auditMiddleware.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess, requireRole } from '../../authMiddleware.js';

const router = Router();

// ============================================================
// All Forms listing — /api/forms  (used by Document Library)
// ============================================================
router.get('/forms', async (req, res) => {
  try {
    const { search, form_type, status } = req.query;
    let query = `
      SELECT f.*, s.sop_number, s.title as sop_title,
        (SELECT COUNT(*) FROM sop_form_fields WHERE sop_form_id = f.id) as field_count,
        (SELECT COUNT(*) FROM sop_form_entries WHERE sop_form_id = f.id) as entry_count
      FROM sop_forms f
      LEFT JOIN sops s ON f.sop_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (LOWER(f.title) LIKE LOWER(?) OR LOWER(f.form_number) LIKE LOWER(?) OR LOWER(f.description) LIKE LOWER(?) OR LOWER(s.sop_number) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (form_type) {
      query += ' AND f.form_type = ?';
      params.push(form_type);
    }
    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.created_at DESC';
    const forms = await db.all(query, params);
    res.json(forms);
  } catch (err) {
    console.error('Error fetching all forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// ============================================================
// SOP Forms CRUD — /api/sops/:id/forms
// ============================================================

// GET all forms for an SOP
router.get('/sops/:id/forms', async (req, res) => {
  try {
    const forms = await db.all(`
      SELECT f.*, (SELECT COUNT(*) FROM sop_form_fields WHERE sop_form_id = f.id) as field_count,
             (SELECT COUNT(*) FROM sop_form_entries WHERE sop_form_id = f.id) as entry_count
      FROM sop_forms f WHERE f.sop_id = ? ORDER BY f.created_at DESC
    `, [req.params.id]);
    res.json(forms);
  } catch (err) {
    console.error('Error fetching SOP forms:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// POST create a new form for an SOP
router.post('/sops/:id/forms', requireWriteAccess, async (req, res) => {
  try {
    const { form_number, title, form_type, description, version, status } = req.body;
    if (!form_number || !title) {
      return res.status(400).json({ error: 'form_number and title are required' });
    }
    const sop = await db.get('SELECT id, sop_number FROM sops WHERE id = ?', [req.params.id]);
    if (!sop) return res.status(404).json({ error: 'SOP not found' });

    const info = await db.run(`
      INSERT INTO sop_forms (sop_id, form_number, title, form_type, description, version, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id, form_number, title,
      form_type || 'record', description || '', version || '1.0',
      status || 'draft', req.session.user?.display_name || req.session.user?.username || ''
    ]);
    const created = await db.get('SELECT * FROM sop_forms WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_sop_form', 'sop_forms', created.id, title, { sop_id: req.params.id, form_number });
    broadcast('sop_form_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating SOP form:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// PUT update a form
router.put('/sop-forms/:id', requireWriteAccess, async (req, res) => {
  try {
    const form = await db.get('SELECT * FROM sop_forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const { form_number, title, form_type, description, version, status } = req.body;
    await db.run(`
      UPDATE sop_forms SET form_number = ?, title = ?, form_type = ?, description = ?, version = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      form_number ?? form.form_number, title ?? form.title, form_type ?? form.form_type,
      description ?? form.description, version ?? form.version, status ?? form.status, req.params.id
    ]);
    const updated = await db.get('SELECT * FROM sop_forms WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_sop_form', 'sop_forms', req.params.id, updated.title, {
      old_values: { title: form.title, status: form.status },
      new_values: { title: updated.title, status: updated.status },
    });
    broadcast('sop_form_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('Error updating SOP form:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// DELETE a form
router.delete('/sop-forms/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const form = await db.get('SELECT * FROM sop_forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    await db.run('DELETE FROM sop_form_entries WHERE sop_form_id = ?', [req.params.id]);
    await db.run('DELETE FROM sop_form_fields WHERE sop_form_id = ?', [req.params.id]);
    await db.run('DELETE FROM sop_forms WHERE id = ?', [req.params.id]);
    logAudit(req, 'delete_sop_form', 'sop_forms', req.params.id, form.title, { form_number: form.form_number });
    broadcast('sop_form_deleted', { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting SOP form:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// ============================================================
// Form Fields CRUD — /api/sop-forms/:id/fields
// ============================================================

// GET fields for a form
router.get('/sop-forms/:id/fields', async (req, res) => {
  try {
    const fields = await db.all('SELECT * FROM sop_form_fields WHERE sop_form_id = ? ORDER BY sort_order ASC', [req.params.id]);
    res.json(fields);
  } catch (err) {
    console.error('Error fetching form fields:', err);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

// POST create a field
router.post('/sop-forms/:id/fields', requireWriteAccess, async (req, res) => {
  try {
    const form = await db.get('SELECT id FROM sop_forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const { field_name, field_type, field_options, required, sort_order, section_name } = req.body;
    if (!field_name) return res.status(400).json({ error: 'field_name is required' });

    const info = await db.run(`
      INSERT INTO sop_form_fields (sop_form_id, field_name, field_type, field_options, required, sort_order, section_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id, field_name, field_type || 'text',
      typeof field_options === 'string' ? field_options : JSON.stringify(field_options || []),
      required ? 1 : 0, sort_order || 0, section_name || ''
    ]);
    const created = await db.get('SELECT * FROM sop_form_fields WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_form_field', 'sop_form_fields', created.id, field_name, { form_id: req.params.id });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating form field:', err);
    res.status(500).json({ error: 'Failed to create field' });
  }
});

// PUT update a field
router.put('/sop-forms/:formId/fields/:fieldId', requireWriteAccess, async (req, res) => {
  try {
    const field = await db.get('SELECT * FROM sop_form_fields WHERE id = ? AND sop_form_id = ?', [req.params.fieldId, req.params.formId]);
    if (!field) return res.status(404).json({ error: 'Field not found' });

    const { field_name, field_type, field_options, required, sort_order, section_name } = req.body;
    await db.run(`
      UPDATE sop_form_fields SET field_name = ?, field_type = ?, field_options = ?, required = ?, sort_order = ?, section_name = ?
      WHERE id = ?
    `, [
      field_name ?? field.field_name, field_type ?? field.field_type,
      field_options !== undefined ? (typeof field_options === 'string' ? field_options : JSON.stringify(field_options)) : field.field_options,
      required !== undefined ? (required ? 1 : 0) : field.required,
      sort_order ?? field.sort_order, section_name ?? field.section_name, req.params.fieldId
    ]);
    const updated = await db.get('SELECT * FROM sop_form_fields WHERE id = ?', [req.params.fieldId]);
    res.json(updated);
  } catch (err) {
    console.error('Error updating form field:', err);
    res.status(500).json({ error: 'Failed to update field' });
  }
});

// PUT bulk update fields (reorder / batch save)
router.put('/sop-forms/:id/fields', requireWriteAccess, async (req, res) => {
  try {
    const { fields } = req.body;
    if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields array required' });

    for (const f of fields) {
      const opts = typeof f.field_options === 'string' ? f.field_options : JSON.stringify(f.field_options || []);
      if (f.id) {
        await db.run(`
          UPDATE sop_form_fields SET field_name = ?, field_type = ?, field_options = ?, required = ?, sort_order = ?, section_name = ?
          WHERE id = ? AND sop_form_id = ?
        `, [f.field_name, f.field_type || 'text', opts, f.required ? 1 : 0, f.sort_order || 0, f.section_name || '', f.id, req.params.id]);
      } else {
        await db.run(`
          INSERT INTO sop_form_fields (sop_form_id, field_name, field_type, field_options, required, sort_order, section_name)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.params.id, f.field_name, f.field_type || 'text', opts, f.required ? 1 : 0, f.sort_order || 0, f.section_name || '']);
      }
    }

    const updated = await db.all('SELECT * FROM sop_form_fields WHERE sop_form_id = ? ORDER BY sort_order ASC', [req.params.id]);
    logAudit(req, 'update_form_fields', 'sop_form_fields', req.params.id, `${updated.length} fields`, { form_id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error('Error bulk updating form fields:', err);
    res.status(500).json({ error: 'Failed to update fields' });
  }
});

// DELETE a field
router.delete('/sop-forms/:formId/fields/:fieldId', requireWriteAccess, async (req, res) => {
  try {
    const field = await db.get('SELECT * FROM sop_form_fields WHERE id = ? AND sop_form_id = ?', [req.params.fieldId, req.params.formId]);
    if (!field) return res.status(404).json({ error: 'Field not found' });
    await db.run('DELETE FROM sop_form_fields WHERE id = ?', [req.params.fieldId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form field:', err);
    res.status(500).json({ error: 'Failed to delete field' });
  }
});

// ============================================================
// Form Entries CRUD — /api/sop-forms/:id/entries
// ============================================================

// GET entries for a form
router.get('/sop-forms/:id/entries', async (req, res) => {
  try {
    const entries = await db.all('SELECT * FROM sop_form_entries WHERE sop_form_id = ? ORDER BY date DESC, submitted_at DESC', [req.params.id]);
    res.json(entries);
  } catch (err) {
    console.error('Error fetching form entries:', err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// GET single entry
router.get('/sop-forms/:formId/entries/:entryId', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM sop_form_entries WHERE id = ? AND sop_form_id = ?', [req.params.entryId, req.params.formId]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    console.error('Error fetching form entry:', err);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// POST create an entry
router.post('/sop-forms/:id/entries', async (req, res) => {
  try {
    const form = await db.get('SELECT id, title FROM sop_forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const { entry_data, shift, date, status } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const submittedBy = req.session.user?.display_name || req.session.user?.username || '';
    const entryStatus = status || 'submitted';

    const info = await db.run(`
      INSERT INTO sop_form_entries (sop_form_id, entry_data, submitted_by, shift, date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      typeof entry_data === 'string' ? entry_data : JSON.stringify(entry_data || {}),
      submittedBy, shift || '', date, entryStatus
    ]);
    const created = await db.get('SELECT * FROM sop_form_entries WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_form_entry', 'sop_form_entries', created.id, form.title, { form_id: req.params.id, date, shift });
    broadcast('form_entry_created', { ...created, form_title: form.title });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating form entry:', err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// PUT update an entry
router.put('/sop-forms/:formId/entries/:entryId', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM sop_form_entries WHERE id = ? AND sop_form_id = ?', [req.params.entryId, req.params.formId]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const { entry_data, shift, date, status } = req.body;
    await db.run(`
      UPDATE sop_form_entries SET entry_data = ?, shift = ?, date = ?, status = ?
      WHERE id = ?
    `, [
      entry_data !== undefined ? (typeof entry_data === 'string' ? entry_data : JSON.stringify(entry_data)) : entry.entry_data,
      shift ?? entry.shift, date ?? entry.date, status ?? entry.status, req.params.entryId
    ]);
    const updated = await db.get('SELECT * FROM sop_form_entries WHERE id = ?', [req.params.entryId]);
    logAudit(req, 'update_form_entry', 'sop_form_entries', req.params.entryId, `Entry ${req.params.entryId}`, {
      old_values: { status: entry.status }, new_values: { status: updated.status },
    });
    broadcast('form_entry_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('Error updating form entry:', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// PUT verify an entry (manager/admin)
router.put('/sop-forms/:formId/entries/:entryId/verify', requireWriteAccess, async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM sop_form_entries WHERE id = ? AND sop_form_id = ?', [req.params.entryId, req.params.formId]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const verifiedBy = req.session.user?.display_name || req.session.user?.username || '';
    await db.run(`
      UPDATE sop_form_entries SET status = 'verified', verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [verifiedBy, req.params.entryId]);

    const updated = await db.get('SELECT * FROM sop_form_entries WHERE id = ?', [req.params.entryId]);
    logAudit(req, 'verify_form_entry', 'sop_form_entries', req.params.entryId, `Entry ${req.params.entryId}`, { verified_by: verifiedBy });
    broadcast('form_entry_verified', updated);
    res.json(updated);
  } catch (err) {
    console.error('Error verifying form entry:', err);
    res.status(500).json({ error: 'Failed to verify entry' });
  }
});

// DELETE an entry
router.delete('/sop-forms/:formId/entries/:entryId', requireWriteAccess, async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM sop_form_entries WHERE id = ? AND sop_form_id = ?', [req.params.entryId, req.params.formId]);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    await db.run('DELETE FROM sop_form_entries WHERE id = ?', [req.params.entryId]);
    logAudit(req, 'delete_form_entry', 'sop_form_entries', req.params.entryId, `Entry ${req.params.entryId}`, {});
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting form entry:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ============================================================
// Single form detail (with fields) — /api/sop-forms/:id
// ============================================================
router.get('/sop-forms/:id', async (req, res) => {
  try {
    const form = await db.get('SELECT * FROM sop_forms WHERE id = ?', [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    const fields = await db.all('SELECT * FROM sop_form_fields WHERE sop_form_id = ? ORDER BY sort_order ASC', [req.params.id]);
    const entries = await db.all('SELECT * FROM sop_form_entries WHERE sop_form_id = ? ORDER BY date DESC, submitted_at DESC', [req.params.id]);
    res.json({ ...form, fields, entries });
  } catch (err) {
    console.error('Error fetching form detail:', err);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

export default router;
