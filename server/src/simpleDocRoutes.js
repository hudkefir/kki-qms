import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, createReadStream, readFileSync } from 'fs';
import { join, extname, basename } from 'path';
import mammoth from 'mammoth';
import db from './database-pg.js';
import { requireAuth, requireWriteAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { sanitizeFilename } from './sanitize.js';

const router = Router();

// Setup directories
const documentsBaseDir = process.env.KKI_DOCS_DIR ? process.env.KKI_DOCS_DIR.replace('/SOPs', '') : join(process.cwd(), 'documents');
const categoryDirs = {
  sop: join(documentsBaseDir, 'SOPs'),
  ccr: join(documentsBaseDir, 'CCRs'),
  complaint: join(documentsBaseDir, 'Complaints', '2026'),
  audit: join(documentsBaseDir, 'Audit'),
  general: join(documentsBaseDir, 'General')
};

// Ensure directories exist
Object.values(categoryDirs).forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Upload to temp dir first, then move to correct category folder after body is fully parsed.
// Multer's destination callback fires before req.body.category is available if the file
// field comes before the category field in the multipart form.
import { renameSync, unlinkSync as _unlinkSync } from 'fs';
const tmpUploadDir = join(documentsBaseDir, '.tmp-uploads');
if (!existsSync(tmpUploadDir)) {
  mkdirSync(tmpUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpUploadDir);
  },
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid collisions in temp dir
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'];
    const ext = extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  }
});

// Get all documents with optional filters
router.get('/documents', requireAuth, async (req, res) => {
  try {
    const { category, search, linked_type, linked_id } = req.query;
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (original_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (linked_type) {
      query += ' AND linked_type = ?';
      params.push(linked_type);
    }

    if (linked_id) {
      query += ' AND linked_id = ?';
      params.push(linked_id);
    }

    query += ' ORDER BY upload_date DESC';

    const documents = await await db.all(query, [...params]);
    try { logAudit(req, 'view', 'documents', null, null, { count: documents.length, filters: { category, search, linked_type, linked_id } }); } catch(e) {}
    res.json(documents);
  } catch (error) {
    console.error('Documents route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-generate descriptions for SOPs
function generateSOPDescription(filename, sopNumber, title) {
  const descriptions = {
    'KK-SOP-00100': 'Good Documentation Practices standard operating procedure. Establishes documentation control requirements for quality management system compliance.',
    'KK-SOP-00101': 'Handwritten and Electronic Signatures procedure. Defines signature requirements and authorization protocols for quality documentation.',
    'KK-SOP-00102': 'Employee Training Program procedure. Outlines comprehensive training requirements, competency assessments, and documentation standards.',
    'KK-SOP-00200': 'Food Safety Policy procedure. Defines food safety management system, HACCP principles, and contamination prevention measures.',
    'KK-SOP-00201': 'Employee Sanitation and Hygiene Standards. Establishes hygiene requirements, protective equipment, and health monitoring protocols.',
    'KK-SOP-00300': 'Receiving and Inspection procedure. Covers incoming material verification, acceptance criteria, and documentation requirements.',
    'KK-SOP-00400': 'Production and Manufacturing procedure. Defines production processes, batch control, and manufacturing standards.',
    'KK-SOP-00500': 'Quality Control and Testing procedure. Outlines testing protocols, sampling methods, and quality verification requirements.',
    'KK-SOP-00600': 'Packaging and Labeling procedure. Covers packaging requirements, label control, and finished product handling.',
    'KK-SOP-00700': 'Storage and Distribution procedure. Defines storage conditions, inventory management, and distribution protocols.',
    'KK-SOP-00800': 'Equipment and Maintenance procedure. Covers equipment qualification, maintenance schedules, and calibration requirements.',
    'KK-SOP-00900': 'Cleaning and Sanitation procedure. Establishes cleaning protocols, sanitation schedules, and verification methods.',
    'KK-SOP-01000': 'Deviation and Investigation procedure. Defines deviation handling, investigation protocols, and corrective action requirements.',
    'KK-SOP-01100': 'Change Control procedure. Covers change management process, approval requirements, and implementation protocols.',
    'KK-SOP-01200': 'Document Control procedure. Defines document management, version control, and distribution requirements.',
    'KK-SOP-01300': 'Audit and Inspection procedure. Outlines internal audit processes, inspection protocols, and compliance verification.',
    'KK-SOP-01400': 'Supplier Qualification procedure. Covers vendor assessment, qualification criteria, and supplier management.',
    'KK-SOP-01500': 'Customer Complaint Handling procedure. Defines complaint processing, investigation, and response protocols.',
    'KK-SOP-01600': 'Product Recall procedure. Covers recall procedures, notification requirements, and traceability protocols.',
    'KK-SOP-01700': 'Environmental Monitoring procedure. Defines environmental controls, monitoring requirements, and corrective actions.',
    'KK-SOP-01800': 'Management Review procedure. Outlines management review process, performance evaluation, and improvement planning.'
  };

  // Try to find exact match
  if (descriptions[sopNumber]) {
    return descriptions[sopNumber];
  }

  // Generate based on title if no exact match
  if (title) {
    return `${title} standard operating procedure. Defines requirements and protocols for ${title.toLowerCase()} activities within the quality management system.`;
  }

  // Fallback generic description
  return `${sopNumber} standard operating procedure. Defines requirements and protocols within the quality management system.`;
}

// Upload documents
router.post('/documents/upload', requireAuth, requireWriteAccess, upload.array('files', 10), async (req, res) => {
  try {
    // Bug fix: validate that files were actually uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Please select at least one file.' });
    }

    const { category = 'general', description = '', linked_type, linked_id } = req.body;

    // Validate category is a known value (input sanitization)
    const validCategories = Object.keys(categoryDirs);
    const safeCategory = validCategories.includes(category) ? category : 'general';
    const targetDir = categoryDirs[safeCategory];

    const uploadedFiles = [];

    for (const file of req.files) {
      // Skip empty files
      if (file.size === 0) {
        try { _unlinkSync(file.path); } catch (e) {}
        continue;
      }
      // Move file from temp dir to correct category dir (sanitize to prevent path traversal)
      const finalFilename = sanitizeFilename(file.originalname);
      const finalPath = join(targetDir, finalFilename);
      try {
        renameSync(file.path, finalPath);
      } catch (moveErr) {
        console.error(`Failed to move ${file.path} → ${finalPath}:`, moveErr.message);
        try { _unlinkSync(file.path); } catch (e) {}
        continue;
      }
      const user = req.session?.user || req.user || {};
      let autoDescription = description;

      // Auto-generate description for SOPs
      if (safeCategory === 'sop') {
        const sopMatch = file.originalname.match(/KK-SOP-(\d+)/);
        if (sopMatch) {
          const sopNumber = `KK-SOP-${sopMatch[1]}`;
          const titleMatch = file.originalname.match(/KK-SOP-\d+[_-](.+?)(?:[_-]v\d+|\.\w+|$)/i);
          const title = titleMatch ? titleMatch[1].replace(/[_-]/g, ' ') : null;
          
          autoDescription = generateSOPDescription(file.originalname, sopNumber, title);
          
          // Also update the SOP record with version and title if found
          const versionMatch = file.originalname.match(/v(\d+(?:\.\d+)*)/i);
          if (versionMatch && linked_id) {
            const version = versionMatch[1];
            await await db.run('UPDATE sops SET version = ?, owner = ? WHERE id = ?', [
              version, user.display_name || user.username || 'System', linked_id
            ]);
          }
        }
      }

      // Insert into database
      const result = await db.run(`
        INSERT INTO documents (filename, original_name, file_type, file_size, category, linked_type, linked_id, description, uploaded_by, version, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        finalFilename,
        file.originalname,
        file.mimetype,
        file.size,
        safeCategory,
        linked_type || null,
        linked_id || null,
        autoDescription,
        user.display_name || user.username || 'system',
        1.0,
        user.display_name || user.username || 'system'
      ]);

      uploadedFiles.push({
        id: result.lastInsertRowid,
        filename: finalFilename,
        original_name: file.originalname,
        category: safeCategory,
        linked_type: linked_type || null,
        linked_id: linked_id || null,
        size: file.size
      });

      try { logAudit(req, 'create', 'document', result.lastInsertRowid, finalFilename, { category: safeCategory, size: file.size }); } catch(e) {}
    }

    res.json({ 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles 
    });

  } catch (error) {
    console.error('Upload error:', error);
    // Clean up temp files on error
    if (req.files) {
      req.files.forEach(file => {
        try { _unlinkSync(file.path); } catch (e) {}
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Download document
router.get('/documents/:id/download', requireAuth, async (req, res) => {
  try {
    const doc = await await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const targetDir = categoryDirs[doc.category] || categoryDirs.general;
    const filePath = join(targetDir, doc.filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Track download count
    await db.run('UPDATE documents SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?', [doc.id]);

    try { logAudit(req, 'download', 'document', doc.id, doc.filename); } catch(e) {}

    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preview document (inline — for PDF embed viewer)
router.get('/documents/:id/preview', requireAuth, async (req, res) => {
  try {
    const doc = await await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const targetDir = categoryDirs[doc.category] || categoryDirs.general;
    const filePath = join(targetDir, doc.filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Preview DOCX as rendered HTML (for in-browser reading)
router.get('/documents/:id/preview-html', requireAuth, async (req, res) => {
  try {
    const doc = await await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const targetDir = categoryDirs[doc.category] || categoryDirs.general;
    const filePath = join(targetDir, doc.filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const ext = extname(doc.original_name || doc.filename).toLowerCase();
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${doc.original_name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 1.5em; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  h2 { font-size: 1.25em; margin-top: 1.5em; color: #374151; }
  h3 { font-size: 1.1em; color: #4b5563; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  ul, ol { padding-left: 1.5em; }
  p { margin: 0.5em 0; }
</style></head><body>${result.value}</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      // For non-docx, redirect to the regular preview
      res.redirect(`/api/documents/${req.params.id}/preview`);
    }
  } catch (error) {
    console.error('DOCX preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get version history for a document
router.get('/documents/:id/versions', requireAuth, async (req, res) => {
  try {
    const doc = await await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const baseName = doc.original_name.replace(/(_v\d+(\.\d+)?)?(\.[^.]+)$/, '');
    const fileExt = extname(doc.original_name);

    const versions = await await db.all(
      'SELECT * FROM documents WHERE original_name LIKE ? AND category = ? ORDER BY version DESC'
    , [`${baseName}%${fileExt}`, doc.category]);

    res.json(versions);
  } catch (error) {
    console.error('Version history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete documents
router.delete('/documents/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await await db.get('SELECT * FROM documents WHERE id = ?', [id]);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only admin can delete documents
    const user = req.session?.user || req.user || {};
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete documents' });
    }

    // Determine file path using category directory map
    const targetDir = categoryDirs[doc.category] || categoryDirs.general;
    const filePath = join(targetDir, doc.filename);

    // Delete file from filesystem
    try {
      _unlinkSync(filePath);
    } catch (err) {
      console.log('Warning: Could not delete file from filesystem:', err.message);
    }

    // Delete from database
    await await db.run('DELETE FROM documents WHERE id = ?', [id]);

    try {
      logAudit(req, 'delete', 'document', id, doc.original_name, {
        old_values: doc
      });
    } catch(e) {}

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;