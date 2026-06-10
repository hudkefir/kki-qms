import { Router } from 'express';
import multer from 'multer';
import { extname, basename } from 'path';
import db from '../../database-pg.js';
import { requireAuth, requireWriteAccess, requireRole } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';
import { sanitizeFilename } from '../../sanitize.js';
import { uploadFile, downloadFile, deleteFile } from '../../supabase.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
});

/** Strip characters that could break out of a Content-Disposition header value */
function safeHeaderFilename(name) {
  return String(name).replace(/["\r\n]/g, '');
}

const router = Router();

// POST /api/sops/:id/upload
router.post('/sops/:id/upload', requireAuth, requireWriteAccess, upload.single('file'), async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid SOP ID' });
    }

    const sop = await db.get('SELECT * FROM sops WHERE id = ?', [req.params.id]);
    if (!sop) return res.status(404).json({ error: 'SOP not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (req.file.size === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    // Determine version
    const lastFile = await db.get(
      'SELECT MAX(version) as maxVersion FROM sop_files WHERE sop_id = ? AND original_name = ?',
      [req.params.id, req.file.originalname]
    );
    const version = (lastFile?.maxVersion || 0) + 1;

    const ext = extname(req.file.originalname).toLowerCase();
    const fileType = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Build storage filename and path
    const base = basename(sanitizeFilename(req.file.originalname), ext);
    const diskFilename = `${base}_${Date.now()}${ext}`;
    const storagePath = `sops/${req.params.id}/${diskFilename}`;

    // Upload to Supabase Storage
    await uploadFile(storagePath, req.file.buffer, fileType);

    const info = await db.run(`
      INSERT INTO sop_files (sop_id, filename, original_name, file_type, file_size, version, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      req.params.id,
      storagePath,
      req.file.originalname,
      fileType,
      req.file.size,
      version,
      req.session.user.username
    ]);

    const created = await db.get('SELECT * FROM sop_files WHERE id = ?', [info.lastInsertRowid]);

    // Auto-update SOP version from filename
    const versionMatch = req.file.originalname.match(/_v(\d+[._]\d+)/i);
    if (versionMatch) {
      const newVersion = versionMatch[1].replace('_', '.');
      await db.run('UPDATE sops SET version = ?, updated_at = datetime(\'now\') WHERE id = ?', [newVersion, req.params.id]);
    }

    logAudit(req, 'upload_file', 'sops', req.params.id, sop.sop_number, {
      filename: req.file.originalname,
      version,
      size: req.file.size,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// GET /api/sops/:id/files
router.get('/sops/:id/files', requireAuth, async (req, res) => {
  try {
    const files = await db.all(
      'SELECT * FROM sop_files WHERE sop_id = ? ORDER BY original_name, version DESC',
      [req.params.id]
    );
    res.json(files);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/files/:id/download
router.get('/files/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await db.get('SELECT sf.*, s.sop_number FROM sop_files sf JOIN sops s ON sf.sop_id = s.id WHERE sf.id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    logAudit(req, 'download_file', 'sops', file.sop_id, file.sop_number, {
      filename: file.original_name,
      version: file.version,
    });

    const buffer = await downloadFile(file.filename);
    res.setHeader('Content-Disposition', `attachment; filename="${safeHeaderFilename(file.original_name)}"`);
    res.setHeader('Content-Type', file.file_type);
    res.send(buffer);
  } catch (err) {
    console.error('File download error:', err);
    res.status(500).json({ error: 'File download failed' });
  }
});

// GET /api/files/:id/preview - Serve file inline for in-browser viewing
router.get('/files/:id/preview', requireAuth, async (req, res) => {
  try {
    const file = await db.get('SELECT sf.*, s.sop_number FROM sop_files sf JOIN sops s ON sf.sop_id = s.id WHERE sf.id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const buffer = await downloadFile(file.filename);
    res.setHeader('Content-Disposition', `inline; filename="${safeHeaderFilename(file.original_name)}"`);
    res.setHeader('Content-Type', file.file_type);
    res.send(buffer);
  } catch (err) {
    console.error('File preview error:', err);
    res.status(500).json({ error: 'File preview failed' });
  }
});

// GET /api/files/:id/preview-html - Render DOCX as HTML for in-browser reading
router.get('/files/:id/preview-html', requireAuth, async (req, res) => {
  try {
    const file = await db.get('SELECT sf.*, s.sop_number FROM sop_files sf JOIN sops s ON sf.sop_id = s.id WHERE sf.id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const ext = extname(file.original_name).toLowerCase();
    if (ext === '.docx' || ext === '.doc') {
      const buffer = await downloadFile(file.filename);
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.convertToHtml({ buffer });
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${file.original_name}</title>
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
      res.redirect(`/api/files/${req.params.id}/preview`);
    }
  } catch (err) {
    console.error('File preview-html error:', err);
    res.status(500).json({ error: 'File preview failed' });
  }
});

// DELETE /api/files/:id — admin only, removes file from storage + database
router.delete('/files/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const file = await db.get(
      'SELECT sf.*, s.sop_number FROM sop_files sf JOIN sops s ON sf.sop_id = s.id WHERE sf.id = ?',
      [req.params.id]
    );
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Remove from Supabase Storage
    try {
      await deleteFile(file.filename);
    } catch (e) {
      console.warn('Storage delete warning:', e.message);
    }

    // Remove from database
    await db.run('DELETE FROM sop_files WHERE id = ?', [req.params.id]);

    logAudit(req, 'delete_file', 'sops', file.sop_id, file.sop_number, {
      filename: file.original_name,
      version: file.version,
      file_size: file.file_size,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('File delete error:', err);
    res.status(500).json({ error: 'File deletion failed' });
  }
});

export default router;
