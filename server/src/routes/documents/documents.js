import { Router } from 'express';
import multer from 'multer';
import { extname } from 'path';
import db from '../../database-pg.js';
import { requireAuth, requireWriteAccess } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { uploadFile, downloadFile, deleteFile } from '../../supabase.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${ext}`));
    }
  }
});

const router = Router();

// Get all documents with optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, search, tags, sort, order, document_type, linked_sop_id, linked_type, linked_id } = req.query;
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (document_type) {
      query += ' AND document_type = ?';
      params.push(document_type);
    }

    if (linked_sop_id) {
      query += ' AND linked_sop_id = ?';
      params.push(linked_sop_id);
    }

    if (linked_type) {
      query += ' AND linked_type = ?';
      params.push(linked_type);
    }

    if (linked_id) {
      query += ' AND linked_id = ?';
      params.push(linked_id);
    }

    if (search) {
      query += ' AND (LOWER(original_name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(tags) LIKE LOWER(?))';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      for (const tag of tagList) {
        query += ' AND tags LIKE ?';
        params.push(`%${tag}%`);
      }
    }

    const validSorts = { name: 'original_name', date: 'upload_date', size: 'file_size', downloads: 'download_count', version: 'version' };
    const sortCol = validSorts[sort] || 'upload_date';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    const documents = await db.all(query, [...params]);

    logAudit(req, 'view', 'documents', null, null, {
      count: documents.length,
      filters: { category, search, tags }
    });

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get version history for a document (by base name + category)
router.get('/:id/versions', requireAuth, async (req, res) => {
  try {
    const doc = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const baseName = doc.original_name.replace(/(_v\d+\.\d+)?(\.[^.]+)$/, '');
    const fileExt = extname(doc.original_name);

    const versions = await db.all(
      `SELECT * FROM documents WHERE original_name LIKE ? AND category = ? ORDER BY version DESC`
    , [`${baseName}%${fileExt}`, doc.category]);

    res.json(versions);
  } catch (error) {
    console.error('Version history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload documents
router.post('/upload', requireAuth, requireWriteAccess, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Please select at least one file.' });
    }

    const { category = 'general', versionType = 'major', description = '', versionNotes = '', document_type = 'other', linked_sop_id } = req.body;

    const validCategories = ['sop', 'ccr', 'complaint', 'audit', 'general'];
    const safeCategory = validCategories.includes(category) ? category : 'general';

    const uploadedFiles = [];

    for (const file of req.files) {
      if (file.size === 0) continue;

      // Check if this document already exists (for versioning)
      const baseName = file.originalname.replace(/(_v\d+\.\d+)?(\.[^.]+)$/, '');
      const fileExt = extname(file.originalname);

      const existingDoc = await db.get(
        'SELECT * FROM documents WHERE original_name LIKE ? AND category = ? ORDER BY version DESC LIMIT 1'
      , [`${baseName}%${fileExt}`, safeCategory]);

      // Calculate new version
      let newVersion = 1.0;
      if (existingDoc) {
        const currentVersion = parseFloat(existingDoc.version) || 1.0;
        if (versionType === 'minor') {
          newVersion = currentVersion + 0.1;
        } else {
          newVersion = Math.floor(currentVersion) + 1.0;
        }
        newVersion = Math.round(newVersion * 10) / 10;
      }

      const versionedName = `${baseName}_v${newVersion.toFixed(1)}${fileExt}`;
      const storagePath = `documents/${safeCategory}/${versionedName}`;

      // Upload to Supabase Storage
      await uploadFile(storagePath, file.buffer, file.mimetype);

      // Auto-detect document type from filename
      let docType = document_type || 'other';
      const upperName = file.originalname.toUpperCase();
      if (docType === 'other') {
        if (upperName.includes('-FRM-')) docType = 'form';
        else if (upperName.includes('-LOG-')) docType = 'logbook';
        else if (upperName.includes('-CHK-')) docType = 'checklist';
        else if (upperName.includes('-SPE-')) docType = 'specification';
        else if (upperName.includes('-POL-')) docType = 'policy';
        else if (upperName.includes('-SUP-')) docType = 'supplement';
        else if (upperName.includes('-SOP-')) docType = 'sop';
        else if (upperName.includes('-REC-')) docType = 'record';
      }

      // Auto-link to parent SOP
      let sopId = linked_sop_id || null;
      if (!sopId) {
        const sopMatch = upperName.match(/KK-(?:FRM|LOG|CHK|SUP)-(\d{5})/);
        if (sopMatch) {
          const parentSopNumber = `KK-SOP-${sopMatch[1]}`;
          const parentSop = await db.get('SELECT id FROM sops WHERE sop_number = ?', [parentSopNumber]);
          if (parentSop) sopId = parentSop.id;
        }
      }

      const docData = {
        filename: storagePath,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        category: safeCategory,
        description: description || null,
        uploaded_by: req.user.username,
        version: newVersion,
        tags: versionNotes || null,
        document_type: docType,
        linked_sop_id: sopId
      };

      const result = await db.run(`
        INSERT INTO documents (filename, original_name, file_type, file_size, category, description, uploaded_by, version, tags, document_type, linked_sop_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        docData.filename,
        docData.original_name,
        docData.file_type,
        docData.file_size,
        docData.category,
        docData.description,
        docData.uploaded_by,
        docData.version,
        docData.tags,
        docData.document_type,
        docData.linked_sop_id
      ]);

      uploadedFiles.push({
        id: result.lastInsertRowid,
        ...docData,
        upload_date: new Date().toISOString()
      });

      logAudit(req, 'create', 'document', result.lastInsertRowid, versionedName, {
        category: safeCategory,
        version: newVersion,
        versionType,
        size: file.size,
        description,
        versionNotes
      });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No valid files uploaded. Files may have been empty or invalid.' });
    }

    res.json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const doc = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Track download count
    await db.run('UPDATE documents SET download_count = download_count + 1 WHERE id = ?', [doc.id]);

    logAudit(req, 'download', 'document', doc.id, doc.filename);

    const buffer = await downloadFile(doc.filename);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.file_type);
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preview document (inline — for PDF embed viewer)
router.get('/:id/preview', requireAuth, async (req, res) => {
  try {
    const doc = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const buffer = await downloadFile(doc.filename);
    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.file_type);
    res.send(buffer);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document
router.delete('/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const doc = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete documents' });
    }

    // Delete from Supabase Storage
    try {
      await deleteFile(doc.filename);
    } catch (e) {
      console.warn('Storage delete warning:', e.message);
    }

    // Delete from database
    await db.run('DELETE FROM documents WHERE id = ?', [req.params.id]);

    logAudit(req, 'delete', 'document', doc.id, doc.original_name || doc.filename, {
      old_values: doc
    });

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
