import { Router } from 'express';
import db from './database.js';

const router = Router();

// GET /api/links/:type/:id — get all links for a record (both directions)
router.get('/links/:type/:id', (req, res) => {
  const { type, id } = req.params;
  try {
    const links = db.prepare(`
      SELECT l.*,
        CASE WHEN l.source_type = ? AND l.source_id = ? THEN l.target_type ELSE l.source_type END AS linked_type,
        CASE WHEN l.source_type = ? AND l.source_id = ? THEN l.target_id ELSE l.source_id END AS linked_id
      FROM qms_record_links l
      WHERE (l.source_type = ? AND l.source_id = ?) OR (l.target_type = ? AND l.target_id = ?)
      ORDER BY l.created_at DESC
    `).all(type, id, type, id, type, id, type, id);

    // Enrich each link with record title/number
    const enriched = links.map(link => {
      const info = getRecordInfo(link.linked_type, link.linked_id);
      return { ...link, linked_record_number: info.number, linked_record_title: info.title };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching links:', err);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// POST /api/links — create a link
router.post('/links', (req, res) => {
  const { source_type, source_id, target_type, target_id, link_reason } = req.body;
  if (!source_type || !source_id || !target_type || !target_id) {
    return res.status(400).json({ error: 'source_type, source_id, target_type, and target_id are required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO qms_record_links (source_type, source_id, target_type, target_id, link_reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(source_type, source_id, target_type, target_id, link_reason || null, req.session?.user?.display_name || '');
    res.json({ id: result.lastInsertRowid, message: 'Link created' });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'This link already exists' });
    }
    console.error('Error creating link:', err);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// DELETE /api/links/:linkId — remove a link
router.delete('/links/:linkId', (req, res) => {
  try {
    db.prepare('DELETE FROM qms_record_links WHERE id = ?').run(req.params.linkId);
    res.json({ message: 'Link removed' });
  } catch (err) {
    console.error('Error deleting link:', err);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// GET /api/links/search?type=capa&q=pH — search linkable records
router.get('/links/search', (req, res) => {
  const { type, q } = req.query;
  if (!type) return res.status(400).json({ error: 'type is required' });
  const query = (q || '').toLowerCase();

  try {
    let results = [];
    switch (type) {
      case 'capa':
        results = db.prepare(`
          SELECT id, capa_id AS record_number,
            COALESCE(corrective_action, '') AS title, status
          FROM capas
          WHERE LOWER(capa_id) LIKE ? OR LOWER(corrective_action) LIKE ? OR LOWER(preventive_action) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        break;
      case 'deviation':
        results = db.prepare(`
          SELECT id, report_id AS record_number, title, status
          FROM deviation_reports
          WHERE LOWER(report_id) LIKE ? OR LOWER(title) LIKE ? OR LOWER(description) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        break;
      case 'complaint':
        results = db.prepare(`
          SELECT id, complaint_number AS record_number,
            (product_name || ' — ' || issue_type) AS title, status
          FROM complaints
          WHERE LOWER(complaint_number) LIKE ? OR LOWER(product_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(reporter) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
        break;
      case 'ccr':
        results = db.prepare(`
          SELECT id, ccr_number AS record_number, title, status
          FROM ccrs
          WHERE LOWER(ccr_number) LIKE ? OR LOWER(title) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`);
        break;
      case 'change_request':
        results = db.prepare(`
          SELECT id, request_id AS record_number, title, status
          FROM change_requests
          WHERE LOWER(request_id) LIKE ? OR LOWER(title) LIKE ? OR LOWER(description) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`, `%${query}%`);
        break;
      case 'batch_test':
        results = db.prepare(`
          SELECT id, batch_number AS record_number,
            (product_name || ' — ' || test_date) AS title, status
          FROM batch_tests
          WHERE LOWER(batch_number) LIKE ? OR LOWER(product_name) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`);
        break;
      case 'sop':
        results = db.prepare(`
          SELECT id, sop_number AS record_number, title, status
          FROM sops
          WHERE LOWER(sop_number) LIKE ? OR LOWER(title) LIKE ?
          LIMIT 20
        `).all(`%${query}%`, `%${query}%`);
        break;
      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }
    res.json(results.map(r => ({ ...r, type })));
  } catch (err) {
    console.error('Error searching links:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/links/suggestions/:type/:id — GMP smart link suggestions
router.get('/links/suggestions/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const suggestions = [];

  try {
    // Get existing links to avoid suggesting already-linked records
    const existingLinks = db.prepare(`
      SELECT target_type, target_id FROM qms_record_links WHERE source_type = ? AND source_id = ?
      UNION
      SELECT source_type, source_id FROM qms_record_links WHERE target_type = ? AND target_id = ?
    `).all(type, id, type, id);
    const linkedSet = new Set(existingLinks.map(l => `${l.target_type}:${l.target_id}`));

    if (type === 'deviation') {
      const dev = db.prepare('SELECT * FROM deviation_reports WHERE id = ?').get(id);
      if (dev) {
        // Major/Critical deviation → suggest CAPA
        if (['major', 'critical'].includes(dev.classification)) {
          const existingCapas = db.prepare("SELECT id, capa_id FROM capas WHERE source_type = 'deviation' AND source_id = ?").all(id);
          if (existingCapas.length === 0) {
            suggestions.push({
              suggestion_type: 'create',
              target_type: 'capa',
              message: `This ${dev.classification} deviation may need a CAPA. Link or create one?`,
              severity: 'high',
              icon: 'alert-triangle',
            });
          }
        }
        // Deviation → suggest linking complaints with same lot/product
        if (dev.affected_batches || dev.affected_products) {
          suggestions.push({
            suggestion_type: 'search',
            target_type: 'complaint',
            message: 'Check for customer complaints related to the affected batches/products.',
            severity: 'medium',
            icon: 'search',
          });
        }
      }
    }

    if (type === 'complaint') {
      const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(id);
      if (complaint) {
        // Complaint → suggest deviation
        if (['high', 'critical'].includes(complaint.severity)) {
          suggestions.push({
            suggestion_type: 'search',
            target_type: 'deviation',
            message: 'This complaint may indicate a deviation. Check for or create a Deviation Report.',
            severity: 'high',
            icon: 'alert-triangle',
          });
        }
        // Recurring complaints → suggest CAPA
        if (complaint.product_sku) {
          const sameProduct = db.prepare(
            "SELECT COUNT(*) as cnt FROM complaints WHERE product_sku = ? AND id != ?"
          ).get(complaint.product_sku, id);
          if (sameProduct.cnt >= 2) {
            suggestions.push({
              suggestion_type: 'search',
              target_type: 'capa',
              message: `${sameProduct.cnt} other complaints exist for this product. Consider a CAPA for recurring issues.`,
              severity: 'high',
              icon: 'repeat',
            });
          }
        }
        // Complaint → batch test
        if (complaint.lot_number) {
          const batchTests = db.prepare(
            "SELECT id, batch_number FROM batch_tests WHERE batch_number = ?"
          ).all(complaint.lot_number);
          for (const bt of batchTests) {
            if (!linkedSet.has(`batch_test:${bt.id}`)) {
              suggestions.push({
                suggestion_type: 'link',
                target_type: 'batch_test',
                target_id: bt.id,
                target_number: bt.batch_number,
                message: `Batch test found for lot ${bt.batch_number}. Link it?`,
                severity: 'medium',
                icon: 'flask-conical',
              });
            }
          }
        }
      }
    }

    if (type === 'capa') {
      // CAPA → suggest change request if corrective action requires process change
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'change_request',
        message: 'If the corrective action requires a process change, link or create a Change Request.',
        severity: 'low',
        icon: 'git-branch',
      });
      // CAPA → SOPs
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'sop',
        message: 'Link relevant SOPs that may need updating as part of this CAPA.',
        severity: 'low',
        icon: 'file-text',
      });
    }

    if (type === 'change_request') {
      // Change Request → CCR
      const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id);
      if (cr && ['approved', 'implementing', 'monitoring', 'closed'].includes(cr.status)) {
        suggestions.push({
          suggestion_type: 'search',
          target_type: 'ccr',
          message: 'Approved change requests may need a CCR for supplier communication.',
          severity: 'medium',
          icon: 'mail',
        });
      }
      // Change Request → SOPs
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'sop',
        message: 'Link SOPs affected by this change.',
        severity: 'low',
        icon: 'file-text',
      });
    }

    if (type === 'ccr') {
      // CCR → complaints (already handled natively, but suggest more)
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'complaint',
        message: 'Link additional customer complaints related to this CCR.',
        severity: 'low',
        icon: 'message-square',
      });
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'change_request',
        message: 'Link change requests that arose from this CCR.',
        severity: 'low',
        icon: 'git-branch',
      });
    }

    // Always suggest SOPs for any record type
    if (!['sop'].includes(type) && !suggestions.find(s => s.target_type === 'sop')) {
      suggestions.push({
        suggestion_type: 'search',
        target_type: 'sop',
        message: 'Link relevant SOPs to this record.',
        severity: 'low',
        icon: 'file-text',
      });
    }

    res.json(suggestions);
  } catch (err) {
    console.error('Error generating suggestions:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Helper: get record number and title for display
function getRecordInfo(type, id) {
  try {
    switch (type) {
      case 'capa': {
        const r = db.prepare('SELECT capa_id, corrective_action FROM capas WHERE id = ?').get(id);
        return r ? { number: r.capa_id, title: r.corrective_action?.slice(0, 80) } : { number: '?', title: 'Unknown' };
      }
      case 'deviation': {
        const r = db.prepare('SELECT report_id, title FROM deviation_reports WHERE id = ?').get(id);
        return r ? { number: r.report_id, title: r.title } : { number: '?', title: 'Unknown' };
      }
      case 'complaint': {
        const r = db.prepare('SELECT complaint_number, product_name, issue_type FROM complaints WHERE id = ?').get(id);
        return r ? { number: r.complaint_number, title: `${r.product_name} — ${r.issue_type}` } : { number: '?', title: 'Unknown' };
      }
      case 'ccr': {
        const r = db.prepare('SELECT ccr_number, title FROM ccrs WHERE id = ?').get(id);
        return r ? { number: r.ccr_number, title: r.title } : { number: '?', title: 'Unknown' };
      }
      case 'change_request': {
        const r = db.prepare('SELECT request_id, title FROM change_requests WHERE id = ?').get(id);
        return r ? { number: r.request_id, title: r.title } : { number: '?', title: 'Unknown' };
      }
      case 'batch_test': {
        const r = db.prepare('SELECT batch_number, product_name, test_date FROM batch_tests WHERE id = ?').get(id);
        return r ? { number: r.batch_number, title: `${r.product_name || ''} ${r.test_date || ''}`.trim() } : { number: '?', title: 'Unknown' };
      }
      case 'sop': {
        const r = db.prepare('SELECT sop_number, title FROM sops WHERE id = ?').get(id);
        return r ? { number: r.sop_number, title: r.title } : { number: '?', title: 'Unknown' };
      }
      default:
        return { number: '?', title: 'Unknown' };
    }
  } catch {
    return { number: '?', title: 'Unknown' };
  }
}

export default router;
