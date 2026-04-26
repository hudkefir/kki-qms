import { Router } from 'express';
import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import db from './database.js';
import { broadcast } from './websocket.js';
import { requireWriteAccess, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { readSOPContent, previewSOPUpdates } from './sopContentReader.js';
import { sanitizeBody } from './sanitize.js';

const router = Router();

// GET /api/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const totalSops = db.prepare('SELECT COUNT(*) as count FROM sops').get().count;
    const cleanCount = db.prepare("SELECT COUNT(*) as count FROM sops WHERE costco_cleanup_status = 'clean'").get().count;
    const needsCostcoStripCount = db.prepare("SELECT COUNT(*) as count FROM sops WHERE costco_cleanup_status = 'needs_costco_strip'").get().count;
    const notYetBuiltCount = db.prepare("SELECT COUNT(*) as count FROM sops WHERE costco_cleanup_status = 'not_yet_built'").get().count;
    const auditReadinessPercent = totalSops > 0 ? Math.round((cleanCount / totalSops) * 100) : 0;

    const categoryCounts = db.prepare(`
      SELECT category_name,
        COUNT(*) as count,
        SUM(CASE WHEN costco_cleanup_status = 'clean' THEN 1 ELSE 0 END) as cleanCount
      FROM sops
      GROUP BY category_name
      ORDER BY category_name
    `).all();

    const recentActivity = db.prepare(`
      SELECT r.*, s.sop_number, s.title
      FROM sop_revisions r
      JOIN sops s ON r.sop_id = s.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `).all();

    // QMS module counts
    const complaintCount = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
    const openComplaints = db.prepare("SELECT COUNT(*) as c FROM complaints WHERE status NOT IN ('closed','resolved')").get().c;
    const ccrCount = db.prepare('SELECT COUNT(*) as c FROM ccrs').get().c;
    const openCcrs = db.prepare("SELECT COUNT(*) as c FROM ccrs WHERE status NOT IN ('closed','sent')").get().c;
    const capaCount = db.prepare('SELECT COUNT(*) as c FROM capas').get().c;
    const openCapas = db.prepare("SELECT COUNT(*) as c FROM capas WHERE status NOT IN ('closed','completed')").get().c;
    const deviationCount = db.prepare('SELECT COUNT(*) as c FROM deviation_reports').get().c;
    const openDeviations = db.prepare("SELECT COUNT(*) as c FROM deviation_reports WHERE status != 'closed'").get().c;
    const crCount = db.prepare('SELECT COUNT(*) as c FROM change_requests').get().c;
    const openCrs = db.prepare("SELECT COUNT(*) as c FROM change_requests WHERE status NOT IN ('closed','completed','rejected')").get().c;
    const supplierCount = db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c;
    const approvedSuppliers = db.prepare("SELECT COUNT(*) as c FROM suppliers WHERE status = 'approved'").get().c;

    res.json({
      totalSops,
      cleanCount,
      needsCostcoStripCount,
      notYetBuiltCount,
      auditReadinessPercent,
      categoryCounts,
      recentActivity,
      qms: {
        complaints: { total: complaintCount, open: openComplaints },
        ccrs: { total: ccrCount, open: openCcrs },
        capas: { total: capaCount, open: openCapas },
        deviations: { total: deviationCount, open: openDeviations },
        changeRequests: { total: crCount, open: openCrs },
        suppliers: { total: supplierCount, approved: approvedSuppliers },
      },
      deadlines: db.prepare(`
        SELECT 'CAPA' as type, capa_id as ref_id, ('CAPA: ' || capa_id) as title, target_date as deadline, status
        FROM capas WHERE status NOT IN ('closed','completed') AND target_date IS NOT NULL
        UNION ALL
        SELECT 'CR', request_id, title, proposed_effective_date, status
        FROM change_requests WHERE status NOT IN ('closed','completed','rejected') AND proposed_effective_date IS NOT NULL
        UNION ALL
        SELECT 'DEV', report_id, title, investigation_due_date, status
        FROM deviation_reports WHERE status != 'closed' AND investigation_due_date IS NOT NULL
        ORDER BY deadline ASC LIMIT 10
      `).all(),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sops
router.get('/sops', (req, res) => {
  try {
    const { status, category, costco_status, search } = req.query;
    let query = 'SELECT * FROM sops WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND category_code = ?';
      params.push(category);
    }
    if (costco_status) {
      query += ' AND costco_cleanup_status = ?';
      params.push(costco_status);
    }
    if (search) {
      query += ' AND (title LIKE ? OR sop_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY sop_number';

    const sops = db.prepare(query).all(...params);
    res.json(sops);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sops/:id
router.get('/sops/:id', (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const revisions = db.prepare('SELECT * FROM sop_revisions WHERE sop_id = ? ORDER BY created_at DESC').all(req.params.id);
    const comments = db.prepare('SELECT * FROM sop_comments WHERE sop_id = ? ORDER BY created_at DESC').all(req.params.id);
    const attachments = db.prepare('SELECT * FROM sop_attachments WHERE sop_id = ? ORDER BY uploaded_at DESC').all(req.params.id);
    const auditChecklist = db.prepare('SELECT * FROM audit_checklist WHERE sop_id = ?').all(req.params.id);

    res.json({
      ...sop,
      revisions,
      comments,
      attachments,
      auditChecklist,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sops/:id
router.put('/sops/:id', requireWriteAccess, (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'sop_number', 'title', 'category_code', 'category_name', 'version',
      'status', 'costco_cleanup_status', 'owner', 'reviewer', 'approver',
      'effective_date', 'next_review_date', 'last_updated', 'description', 'notes',
      'scope', 'procedure_text', 'responsibilities', 'materials_equipment', 'sop_references'
    ];

    const updates = [];
    const params = [];

    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    // User attribution
    const sessionUser = req.session?.user;
    const updatedBy = sessionUser?.display_name || sessionUser?.username || '';
    updates.push('updated_by = ?');
    params.push(updatedBy);

    updates.push("updated_at = datetime('now')");

    if (updates.length === 1) {
      // Only updated_at, nothing else to update
      return res.json(sop);
    }

    params.push(req.params.id);
    db.prepare(`UPDATE sops SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);

    // Auto-create revision record for tracked changes
    const trackedFields = ['title', 'version', 'status', 'owner', 'reviewer', 'approver', 'description', 'notes'];
    const changedFields = [];
    for (const field of trackedFields) {
      if (sanitized[field] !== undefined && sanitized[field] !== sop[field]) {
        changedFields.push(field);
      }
    }
    if (changedFields.length > 0) {
      const changeDesc = changedFields.map(f => `${f}: "${sop[f] || ''}" → "${sanitized[f]}"`).join('; ');
      const sessionUser = req.session?.user;
      const changedBy = sessionUser?.display_name || sessionUser?.username || sanitized.owner || sop.owner || 'System';
      db.prepare(`
        INSERT INTO sop_revisions (sop_id, version, changed_by, change_description, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.params.id, updated.version || sop.version || '1.0', changedBy, changeDesc, 'Manual edit');
    }

    // Audit log with old/new values
    const oldValues = {};
    const newValues = {};
    for (const field of fields) {
      if (sanitized[field] !== undefined && sanitized[field] !== sop[field]) {
        oldValues[field] = sop[field];
        newValues[field] = sanitized[field];
      }
    }
    if (Object.keys(oldValues).length > 0) {
      logAudit(req, 'update_sops', 'sops', req.params.id, sop.sop_number, { old_values: oldValues, new_values: newValues });
    }

    broadcast('sop_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sops
router.post('/sops', requireWriteAccess, (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      sop_number, title, category_code, category_name,
      version = '1.0', status = 'draft', costco_cleanup_status = 'not_yet_built',
      owner = '', reviewer = '', approver = '',
      effective_date = null, next_review_date = null,
      description = '', notes = ''
    } = sanitized;

    if (!sop_number || !title || !category_code || !category_name) {
      return res.status(400).json({ error: 'sop_number, title, category_code, and category_name are required' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const sessionUser = req.session?.user;
    const createdBy = sessionUser?.display_name || sessionUser?.username || '';

    const info = db.prepare(`
      INSERT INTO sops (sop_number, title, category_code, category_name, version, status, costco_cleanup_status, owner, reviewer, approver, effective_date, next_review_date, last_updated, description, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sop_number, title, category_code, category_name, version, status, costco_cleanup_status, owner, reviewer, approver, effective_date, next_review_date, now, description, notes, createdBy);

    const created = db.prepare('SELECT * FROM sops WHERE id = ?').get(info.lastInsertRowid);

    logAudit(req, 'create_sops', 'sops', created.id, sop_number, { new_values: { sop_number, title, category_code, category_name, version, status, costco_cleanup_status } });
    broadcast('sop_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sops/:id (admin only)
router.delete('/sops/:id', requireRole('admin'), (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Delete related records first (foreign key constraints)
    db.prepare('DELETE FROM sop_revisions WHERE sop_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sop_attachments WHERE sop_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sop_comments WHERE sop_id = ?').run(req.params.id);
    db.prepare('DELETE FROM audit_checklist WHERE sop_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sop_files WHERE sop_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sops WHERE id = ?').run(req.params.id);

    logAudit(req, 'delete_sops', 'sops', req.params.id, sop.sop_number, { old_values: sop });
    broadcast('sop_deleted', { id: parseInt(req.params.id), sop_number: sop.sop_number });
    res.json({ success: true, message: `SOP ${sop.sop_number} deleted` });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sops/:id/revisions
router.post('/sops/:id/revisions', requireWriteAccess, (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const { version, changed_by, change_description, reason = '', author, description } = req.body;
    const sessionUser = req.session?.user;
    const finalChangedBy = changed_by || author || sessionUser?.display_name || sessionUser?.username || '';
    const finalDescription = change_description || description || '';
    if (!version) {
      return res.status(400).json({ error: 'version is required' });
    }

    const info = db.prepare(`
      INSERT INTO sop_revisions (sop_id, version, changed_by, change_description, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, version, finalChangedBy, finalDescription, reason);

    const created = db.prepare('SELECT * FROM sop_revisions WHERE id = ?').get(info.lastInsertRowid);

    logAudit(req, 'create_revision', 'sop_revisions', created.id, sop.sop_number, { new_values: { sop_id: req.params.id, version, changed_by: finalChangedBy, change_description: finalDescription } });
    broadcast('revision_created', { ...created, sop_number: sop.sop_number });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sops/:id/comments
router.post('/sops/:id/comments', requireWriteAccess, (req, res) => {
  try {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ error: 'comment is required' });
    }

    // Use logged-in user as author
    const sessionUser = req.session?.user;
    const author = sessionUser?.display_name || sessionUser?.username || 'Anonymous';

    const info = db.prepare(`
      INSERT INTO sop_comments (sop_id, author, comment)
      VALUES (?, ?, ?)
    `).run(req.params.id, author, comment);

    const created = db.prepare('SELECT * FROM sop_comments WHERE id = ?').get(info.lastInsertRowid);

    logAudit(req, 'create_comment', 'sop_comments', created.id, sop.sop_number, { new_values: { sop_id: req.params.id, author, comment } });
    broadcast('comment_created', { ...created, sop_number: sop.sop_number });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sops/:id/comments/:commentId (admin only)
router.delete('/sops/:id/comments/:commentId', requireRole('admin'), (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM sop_comments WHERE id = ? AND sop_id = ?').get(req.params.commentId, req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    db.prepare('DELETE FROM sop_comments WHERE id = ?').run(req.params.commentId);
    logAudit(req, 'delete_comment', 'sop_comments', req.params.commentId, comment.author, { old_values: comment });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit
router.get('/audit', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ac.*, s.sop_number, s.title, s.category_name, s.costco_cleanup_status
      FROM audit_checklist ac
      JOIN sops s ON ac.sop_id = s.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE ac.status = ?';
      params.push(status);
    }

    query += ' ORDER BY s.sop_number, ac.id';

    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/audit/:id
router.put('/audit/:id', requireWriteAccess, (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM audit_checklist WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Audit checklist item not found' });
    }

    const { status, notes, checked_by, evidence_ref } = req.body;
    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    // Auto-fill checked_by from session if not explicitly provided
    const sessionUser = req.session?.user;
    const effectiveCheckedBy = checked_by || sessionUser?.display_name || sessionUser?.username || '';
    updates.push('checked_by = ?');
    params.push(effectiveCheckedBy);

    if (evidence_ref !== undefined) {
      updates.push('evidence_ref = ?');
      params.push(evidence_ref);
    }

    updates.push("checked_at = datetime('now')");

    if (updates.length === 1) {
      return res.json(item);
    }

    params.push(req.params.id);
    db.prepare(`UPDATE audit_checklist SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare(`
      SELECT ac.*, s.sop_number, s.title, s.category_name, s.costco_cleanup_status
      FROM audit_checklist ac
      JOIN sops s ON ac.sop_id = s.id
      WHERE ac.id = ?
    `).get(req.params.id);

    // Audit log with old/new values
    const auditOld = {};
    const auditNew = {};
    if (status !== undefined && status !== item.status) { auditOld.status = item.status; auditNew.status = status; }
    if (notes !== undefined && notes !== item.notes) { auditOld.notes = item.notes; auditNew.notes = notes; }
    if (evidence_ref !== undefined && evidence_ref !== item.evidence_ref) { auditOld.evidence_ref = item.evidence_ref; auditNew.evidence_ref = evidence_ref; }
    if (Object.keys(auditOld).length > 0) {
      logAudit(req, 'update_audit_checklist', 'audit_checklist', req.params.id, item.requirement, { old_values: auditOld, new_values: auditNew });
    }

    broadcast('audit_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT
        category_code as code,
        category_name as name,
        COUNT(*) as sopCount,
        SUM(CASE WHEN costco_cleanup_status = 'clean' THEN 1 ELSE 0 END) as cleanCount,
        SUM(CASE WHEN costco_cleanup_status = 'needs_costco_strip' THEN 1 ELSE 0 END) as needsStripCount,
        SUM(CASE WHEN costco_cleanup_status = 'not_yet_built' THEN 1 ELSE 0 END) as notBuiltCount
      FROM sops
      GROUP BY category_code, category_name
      ORDER BY category_code
    `).all();

    res.json(categories);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SOP CONTENT READING ====================

// POST /api/sops/:id/read-content - Extract content from linked SOP document
router.post('/sops/:id/read-content', requireWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id);
    
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Find linked document — check documents table first, then sop_files table
    // Check both documents and sop_files tables, pick the newest file
    let document = null;
    
    const docRecord = db.prepare(
      'SELECT * FROM documents WHERE linked_type = ? AND linked_id = ? AND category = ? ORDER BY upload_date DESC LIMIT 1'
    ).get('sop', id, 'sop');

    const sopFile = db.prepare(
      'SELECT * FROM sop_files WHERE sop_id = ? ORDER BY id DESC LIMIT 1'
    ).get(id);

    let sopFileDoc = null;
    if (sopFile) {
      const sopDocsDir = join(process.cwd(), 'documents');
      const sopFilePath = join(sopDocsDir, sopFile.filename);
      if (existsSync(sopFilePath)) {
        sopFileDoc = {
          id: sopFile.id,
          filename: sopFile.filename,
          original_name: sopFile.original_name,
          file_type: sopFile.file_type,
          file_size: sopFile.file_size,
          upload_date: sopFile.uploaded_at,
          _source: 'sop_files',
          _filepath: sopFilePath,
        };
      }
    }

    // Pick whichever is newer (prefer sop_files if both exist and sop_files is newer)
    if (docRecord && sopFileDoc) {
      const docDate = new Date(docRecord.upload_date || 0).getTime();
      const sfDate = new Date(sopFileDoc.upload_date || 0).getTime();
      document = sfDate >= docDate ? sopFileDoc : docRecord;
      console.log(`Picked ${document._source || 'documents'} table file: ${document.original_name}`);
    } else {
      document = sopFileDoc || docRecord;
      if (document) console.log(`Found document in ${document._source || 'documents'}: ${document.original_name}`);
    }

    // AUTO-REPAIR: If no document found, try to find and link orphaned files
    if (!document) {
      const sopDir = process.env.KKI_DOCS_DIR || '/Users/kefirbot/KKI/QMS/SOPs';
      
      try {
        const files = readdirSync(sopDir);
        const matchingFile = files.find(f => f.includes(sop.sop_number));
        
        if (matchingFile) {
          // Auto-create document record
          const stats = statSync(join(sopDir, matchingFile));
          const result = db.prepare(`
            INSERT INTO documents (filename, original_name, file_type, file_size, category, linked_type, linked_id, description, uploaded_by, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            matchingFile,
            matchingFile,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            stats.size,
            'sop',
            'sop',
            id,
            `Auto-linked document for ${sop.sop_number}`,
            'System (Auto-repair)',
            1.0
          );
          
          document = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
          console.log(`✅ Auto-repaired: Linked ${matchingFile} to ${sop.sop_number}`);
        }
      } catch (err) {
        console.log('Auto-repair failed:', err.message);
      }
    }

    if (!document) {
      return res.status(404).json({ 
        error: `No document found for ${sop.sop_number}`,
        message: 'This SOP has no document uploaded yet.',
        solution: 'To use the "Read & Update" feature, you need to:',
        steps: [
          '1. Scroll down to the "Linked Documents" section on this page',
          '2. Click "Upload" or drag & drop your .docx file',
          '3. Select category "SOP"',
          '4. Click upload to save the file',
          '5. Then click "Read & Update" again'
        ]
      });
    }

    // Determine file path
    const filePath = document._filepath || join(process.env.KKI_DOCS_DIR || '/Users/kefirbot/KKI/QMS/SOPs', document.filename);
    
    // AUTO-REPAIR: Check if file exists, if not try to fix filename
    if (!existsSync(filePath)) {
      const sopDir = process.env.KKI_DOCS_DIR || '/Users/kefirbot/KKI/QMS/SOPs';
      
      try {
        const files = readdirSync(sopDir);
        const baseName = document.filename.replace(/_\d+\.docx$/, '.docx');
        const matchingFile = files.find(f => f === baseName || f.startsWith(baseName.replace('.docx', '')));
        
        if (matchingFile) {
          db.prepare('UPDATE documents SET filename = ? WHERE id = ?').run(matchingFile, document.id);
          document.filename = matchingFile;
          console.log(`✅ Auto-repaired: Fixed filename ${document.id} → ${matchingFile}`);
        }
      } catch (err) {
        console.log('Filename auto-repair failed:', err.message);
      }
    }
    
    // Extract content
    const result = await readSOPContent(filePath, document.original_name);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Failed to read document: ' + result.error });
    }

    // Generate preview of what would be updated
    const preview = previewSOPUpdates(sop, result.data);
    
    res.json({
      extraction: result.data,
      preview,
      document_info: {
        filename: document.original_name,
        size: document.file_size,
        upload_date: document.upload_date
      }
    });

  } catch (error) {
    console.error('Error reading SOP content:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sops/:id/apply-content - Apply extracted content to SOP record
router.post('/sops/:id/apply-content', requireWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { updates } = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id);
    if (!sop) {
      return res.status(404).json({ error: 'SOP not found' });
    }

    // Build update query dynamically
    const allowedFields = ['version', 'owner', 'description', 'scope', 'procedure_text', 'responsibilities', 'materials_equipment', 'sop_references'];
    // Map 'procedure' key from extraction to 'procedure_text' DB column
    if (updates.procedure && !updates.procedure_text) {
      updates.procedure_text = updates.procedure;
      delete updates.procedure;
    }
    const updateFields = [];
    const updateValues = [];
    
    for (const [field, change] of Object.entries(updates)) {
      if (allowedFields.includes(field) && change.proposed !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(change.proposed);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    // Execute update
    const query = `UPDATE sops SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...updateValues);

    // Get updated SOP
    const updated = db.prepare('SELECT * FROM sops WHERE id = ?').get(id);

    // Auto-create revision record for apply-content changes
    const appliedFields = Object.keys(updates).filter(f => allowedFields.includes(f) && updates[f].proposed !== undefined);
    if (appliedFields.length > 0) {
      const changeDesc = appliedFields.map(f => {
        const oldVal = sop[f] || '';
        const preview = oldVal.length > 40 ? oldVal.substring(0, 40) + '...' : oldVal;
        return `${f} updated from document (was: "${preview}")`;
      }).join('; ');
      const applyUser = req.session?.user;
      const applyChangedBy = applyUser?.display_name || applyUser?.username || 'Read & Update';
      db.prepare(`
        INSERT INTO sop_revisions (sop_id, version, changed_by, change_description, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, updated.version || sop.version || '1.0', applyChangedBy, changeDesc, 'Content applied from linked document');
    }

    // Audit log for apply-content
    const applyOld = {};
    const applyNew = {};
    for (const [field, change] of Object.entries(updates)) {
      if (allowedFields.includes(field) && change.proposed !== undefined) {
        applyOld[field] = sop[field] || '';
        applyNew[field] = change.proposed;
      }
    }
    logAudit(req, 'apply_content', 'sops', id, sop.sop_number, { old_values: applyOld, new_values: applyNew });

    broadcast('sop_updated', updated);
    res.json({
      success: true,
      updated_sop: updated,
      applied_changes: Object.keys(updates)
    });

  } catch (error) {
    console.error('Error applying SOP content:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sops/bulk-read-content - Read content from multiple SOPs
router.post('/sops/bulk-read-content', requireWriteAccess, async (req, res) => {
  try {
    const { sop_ids } = req.body;
    
    if (!Array.isArray(sop_ids) || sop_ids.length === 0) {
      return res.status(400).json({ error: 'sop_ids array is required' });
    }

    if (sop_ids.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 SOPs can be processed at once' });
    }

    const results = [];
    
    for (const sopId of sop_ids) {
      try {
        const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(sopId);
        if (!sop) {
          results.push({ sop_id: sopId, error: 'SOP not found' });
          continue;
        }

        const document = db.prepare(
          'SELECT * FROM documents WHERE linked_type = ? AND linked_id = ? AND category = ? ORDER BY upload_date DESC LIMIT 1'
        ).get('sop', sopId, 'sop');

        if (!document) {
          results.push({ sop_id: sopId, error: 'No document linked' });
          continue;
        }

        const filePath = join(process.env.KKI_DOCS_DIR || '/Users/kefirbot/KKI/QMS/SOPs', document.filename);
        const result = await readSOPContent(filePath, document.original_name);
        
        if (result.success) {
          const preview = previewSOPUpdates(sop, result.data);
          results.push({
            sop_id: sopId,
            sop_number: sop.sop_number,
            success: true,
            preview,
            warnings: result.data.warnings || []
          });
        } else {
          results.push({ sop_id: sopId, error: result.error });
        }

      } catch (error) {
        results.push({ sop_id: sopId, error: error.message });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Error in bulk SOP content reading:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
