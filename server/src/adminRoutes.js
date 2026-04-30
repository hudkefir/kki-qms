import { Router } from 'express';
import db from './database-pg.js';
import { requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { broadcast } from './websocket.js';
import { sanitizeBody } from './sanitize.js';

const router = Router();

// All admin routes require admin role
router.use(requireRole('admin'));

// Helper: capture old values, perform action, log audit with old/new
async function auditedUpdate(req, table, id, allowedFields, identifierField) {
  const old = await await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!old) return null;

  const sanitized = sanitizeBody(req.body);
  const updates = [];
  const params = [];
  const oldValues = {};
  const newValues = {};

  for (const field of allowedFields) {
    if (sanitized[field] !== undefined && sanitized[field] !== old[field]) {
      updates.push(`${field} = ?`);
      params.push(sanitized[field]);
      oldValues[field] = old[field];
      newValues[field] = sanitized[field];
    }
  }

  if (updates.length === 0) return old;

  updates.push("updated_at = datetime('now')");
  params.push(id);
  await db.run(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, params);

  const updated = await await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);

  logAudit(req, `admin_update_${table}`, table, id, old[identifierField] || '', {
    old_values: oldValues,
    new_values: newValues,
  });

  return updated;
}

async function auditedDelete(req, table, id, identifierField, cascades = []) {
  const old = await await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!old) return null;

  for (const { table: cTable, column } of cascades) {
    await await db.run(`DELETE FROM ${cTable} WHERE ${column} = ?`, [id]);
  }
  await await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

  logAudit(req, `admin_delete_${table}`, table, id, old[identifierField] || '', {
    old_values: old,
  });

  return old;
}

// ==================== ADMIN SOP MANAGEMENT ====================

router.put('/admin/sops/:id', async (req, res) => {
  try {
    const fields = [
      'sop_number', 'title', 'category_code', 'category_name', 'version',
      'status', 'costco_cleanup_status', 'owner', 'reviewer', 'approver',
      'effective_date', 'next_review_date', 'description', 'notes',
      'scope', 'procedure_text', 'responsibilities', 'materials_equipment', 'sop_references'
    ];
    const updated = await auditedUpdate(req, 'sops', req.params.id, fields, 'sop_number');
    if (!updated) return res.status(404).json({ error: 'SOP not found' });
    broadcast('sop_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/sops/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'sops', req.params.id, 'sop_number', [
      { table: 'sop_revisions', column: 'sop_id' },
      { table: 'sop_attachments', column: 'sop_id' },
      { table: 'sop_comments', column: 'sop_id' },
      { table: 'audit_checklist', column: 'sop_id' },
      { table: 'sop_files', column: 'sop_id' },
    ]);
    if (!deleted) return res.status(404).json({ error: 'SOP not found' });
    broadcast('sop_deleted', { id: parseInt(req.params.id), sop_number: deleted.sop_number });
    res.json({ success: true, message: `SOP ${deleted.sop_number} deleted by admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN COMPLAINT MANAGEMENT ====================

router.put('/admin/complaints/:id', async (req, res) => {
  try {
    const fields = [
      'date_received', 'source', 'reporter', 'store_location', 'product_sku',
      'product_name', 'lot_number', 'best_before', 'quantity_affected',
      'issue_type', 'severity', 'description', 'status', 'linked_ccr_id'
    ];
    const updated = await auditedUpdate(req, 'complaints', req.params.id, fields, 'complaint_number');
    if (!updated) return res.status(404).json({ error: 'Complaint not found' });
    broadcast('complaint_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/complaints/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'complaints', req.params.id, 'complaint_number', [
      { table: 'ccr_complaints', column: 'complaint_id' },
    ]);
    if (!deleted) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, message: `Complaint ${deleted.complaint_number} deleted by admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN CCR MANAGEMENT ====================

router.put('/admin/ccrs/:id', async (req, res) => {
  try {
    const fields = [
      'title', 'status', 'recipient_company', 'recipient_contact', 'recipient_email',
      'root_causes', 'preventive_measures', 'target_resolution_date',
      'actual_resolution_date', 'notes'
    ];
    const updated = await auditedUpdate(req, 'ccrs', req.params.id, fields, 'ccr_number');
    if (!updated) return res.status(404).json({ error: 'CCR not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/ccrs/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'ccrs', req.params.id, 'ccr_number', [
      { table: 'ccr_complaints', column: 'ccr_id' },
      { table: 'corrective_actions', column: 'ccr_id' },
    ]);
    if (!deleted) return res.status(404).json({ error: 'CCR not found' });
    res.json({ success: true, message: `CCR ${deleted.ccr_number} deleted by admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN DOCUMENT MANAGEMENT ====================

router.put('/admin/documents/:id', async (req, res) => {
  try {
    const fields = ['original_name', 'description', 'category', 'tags', 'version'];
    const updated = await auditedUpdate(req, 'documents', req.params.id, fields, 'original_name');
    if (!updated) return res.status(404).json({ error: 'Document not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/documents/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'documents', req.params.id, 'original_name', []);
    if (!deleted) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true, message: `Document ${deleted.original_name} deleted by admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN AUDIT CHECKLIST MANAGEMENT ====================

router.put('/admin/audit-checklist/:id', async (req, res) => {
  try {
    const fields = ['requirement', 'category', 'status', 'notes', 'evidence_ref', 'checked_by'];
    const old = await await db.get('SELECT * FROM audit_checklist WHERE id = ?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'Audit checklist item not found' });

    const sanitized = sanitizeBody(req.body);
    const updates = [];
    const params = [];
    const oldValues = {};
    const newValues = {};

    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== old[field]) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
        oldValues[field] = old[field];
        newValues[field] = sanitized[field];
      }
    }
    if (updates.length === 0) return res.json(old);

    updates.push("checked_at = datetime('now')");
    params.push(req.params.id);
    await db.run(`UPDATE audit_checklist SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await await db.get('SELECT * FROM audit_checklist WHERE id = ?', [req.params.id]);
    logAudit(req, 'admin_update_audit_checklist', 'audit_checklist', req.params.id, old.requirement || '', {
      old_values: oldValues,
      new_values: newValues,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/audit-checklist/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'audit_checklist', req.params.id, 'requirement', []);
    if (!deleted) return res.status(404).json({ error: 'Audit checklist item not found' });
    res.json({ success: true, message: 'Audit checklist item deleted by admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN CORRECTIVE ACTION MANAGEMENT ====================

router.put('/admin/corrective-actions/:id', async (req, res) => {
  try {
    const fields = ['description', 'responsible', 'target_date', 'completion_date', 'status', 'notes'];
    const updated = await auditedUpdate(req, 'corrective_actions', req.params.id, fields, 'description');
    if (!updated) return res.status(404).json({ error: 'Corrective action not found' });
    broadcast('action_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/corrective-actions/:id', async (req, res) => {
  try {
    const deleted = await auditedDelete(req, 'corrective_actions', req.params.id, 'description', []);
    if (!deleted) return res.status(404).json({ error: 'Corrective action not found' });
    res.json({ success: true, message: 'Corrective action deleted by admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ADMIN USER MANAGEMENT (enhanced with audit) ====================

router.put('/admin/users/:id', async (req, res) => {
  try {
    const fields = ['display_name', 'role', 'active'];
    const old = await await db.get('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'User not found' });

    const sanitized = sanitizeBody(req.body);
    const updates = [];
    const params = [];
    const oldValues = {};
    const newValues = {};

    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== old[field]) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
        oldValues[field] = old[field];
        newValues[field] = sanitized[field];
      }
    }
    if (updates.length === 0) return res.json(old);

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await await db.get('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?', [req.params.id]);
    logAudit(req, 'admin_update_users', 'users', req.params.id, old.username, {
      old_values: oldValues,
      new_values: newValues,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  try {
    const user = await await db.get('SELECT id, username, display_name, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Soft delete - deactivate
    await db.run("UPDATE users SET active = 0, updated_at = datetime('now') WHERE id = ?", [req.params.id]);

    logAudit(req, 'admin_delete_users', 'users', req.params.id, user.username, {
      old_values: { active: 1 },
      new_values: { active: 0 },
    });
    res.json({ success: true, message: `User ${user.username} deactivated by admin` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
