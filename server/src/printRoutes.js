import { Router } from 'express';
import db from './database-pg.js';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { requireAuth } from './authMiddleware.js';
import { uploadFile } from './supabase.js';

const router = Router();

const COMPANY = {
  name: 'KEFIR Kultures Inc.',
  address: 'Unit 15-16, 1545 Britannia Road East, Mississauga, ON L4W 3C6',
  phone: '(647) 321-4288',
  email: 'hudson.liao@kefirkultures.com',
  web: 'www.kefirkultures.com',
};

function statusBadge(status) {
  const colors = {
    pass: '#059669', completed: '#059669', closed: '#059669', effective: '#059669',
    fail: '#dc2626', overdue: '#dc2626', not_effective: '#dc2626',
    pending: '#d97706', in_progress: '#2563eb', investigating: '#7c3aed', open: '#6b7280',
    resolved: '#059669',
  };
  const c = colors[(status || '').toLowerCase()] || '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${c};text-transform:uppercase;">${status || 'N/A'}</span>`;
}

function baseHtml(title, docNumber, content) {
  const now = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 20mm 15mm 25mm 15mm; @bottom-center { content: "CONFIDENTIAL — ${COMPANY.name}"; font-size: 8px; color: #999; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #999; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
.header h1 { font-size: 14px; color: #1e3a5f; margin: 0; }
.header .company { font-size: 10px; color: #666; }
.header .doc-info { text-align: right; font-size: 10px; color: #666; }
h2 { font-size: 13px; color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 16px 0 8px; }
h3 { font-size: 11px; color: #374151; margin: 12px 0 6px; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #f0f4f8; color: #1e3a5f; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 6px 8px; border: 1px solid #d1d5db; text-align: left; }
td { padding: 5px 8px; border: 1px solid #d1d5db; font-size: 10px; vertical-align: top; }
tr:nth-child(even) td { background: #f9fafb; }
.field-label { font-weight: 700; color: #374151; width: 160px; }
.section { margin-bottom: 16px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; color: white; text-transform: uppercase; }
.pass { background: #059669; } .fail { background: #dc2626; } .pending { background: #d97706; } .in_progress { background: #2563eb; }
.notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; margin: 4px 0; font-size: 10px; white-space: pre-wrap; }
.page-break { page-break-before: always; }
.toc { margin: 20px 0; }
.toc a { text-decoration: none; color: #1e3a5f; }
.toc li { margin: 4px 0; font-size: 11px; }
</style></head><body>
<div class="header">
  <div><h1>${COMPANY.name}</h1><div class="company">${COMPANY.address}<br>${COMPANY.phone} | ${COMPANY.email}</div></div>
  <div class="doc-info"><strong>${title}</strong><br>${docNumber ? 'Doc: ' + docNumber + '<br>' : ''}Generated: ${now}</div>
</div>
${content}
<script>window.onload = () => window.print();</script>
</body></html>`;
}


function classificationBadge(val) {
  if (!val) return '';
  const colors = { critical: '#dc2626', major: '#d97706', minor: '#6b7280' };
  const c = colors[val.toLowerCase()] || '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${c};text-transform:uppercase;">${val}</span>`;
}

function priorityBadge(val) {
  if (!val) return '';
  const colors = { high: '#dc2626', medium: '#d97706', low: '#059669' };
  const c = colors[val.toLowerCase()] || '#6b7280';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:white;background:${c};text-transform:uppercase;">${val}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function capaHtml(c, { actionItems = [], updates = [], linkedComplaints = [], linkedTests = [], attachments = [] } = {}) {
  const heading = c.title || c.corrective_action.split(':')[0];
  let html = `
<div class="section">
  <h2>${escHtml(c.capa_id)} — ${escHtml(heading)}</h2>`;

  // ── Title & Description ──
  if (c.title) {
    html += `<h3>Title</h3><div class="notes-box">${escHtml(c.title)}</div>`;
  }
  if (c.description) {
    html += `<h3>What Happened</h3><div class="notes-box">${escHtml(c.description)}</div>`;
  }

  // ── Key fields table ──
  html += `<table>
    <tr><td class="field-label">CAPA Number</td><td>${escHtml(c.capa_id)}</td><td class="field-label">Status</td><td>${statusBadge(c.status)}</td></tr>
    <tr><td class="field-label">Classification</td><td>${classificationBadge(c.classification)}</td><td class="field-label">Priority</td><td>${priorityBadge(c.priority)}</td></tr>
    <tr><td class="field-label">Risk Assessment</td><td>${escHtml(c.risk_assessment || 'N/A')}</td><td class="field-label">Category</td><td>${escHtml(c.category || 'N/A')}</td></tr>
    <tr><td class="field-label">Department</td><td>${escHtml(c.department || 'N/A')}</td><td class="field-label">Initiated By</td><td>${escHtml(c.initiated_by || 'N/A')}</td></tr>
    <tr><td class="field-label">Source</td><td>${escHtml(c.source_type)} #${escHtml(String(c.source_id))}</td><td class="field-label">Responsible Person</td><td>${escHtml(c.responsible_person)}</td></tr>
    <tr><td class="field-label">Target Date</td><td>${escHtml(c.target_date)}</td><td class="field-label">Completion Date</td><td>${escHtml(c.actual_completion_date || 'Pending')}</td></tr>
    <tr><td class="field-label">Effectiveness Check</td><td>${escHtml(c.effectiveness_check_date || 'Not scheduled')}</td><td class="field-label">Effectiveness Result</td><td>${statusBadge(c.effectiveness_result || 'pending')}</td></tr>
    <tr><td class="field-label">Verification Method</td><td colspan="3">${escHtml(c.verification_method || 'N/A')}</td></tr>
  </table>`;

  // ── Containment ──
  if (c.containment_action) {
    html += `<h3>Containment / Immediate Action</h3><div class="notes-box">${escHtml(c.containment_action)}</div>`;
  }

  // ── Root Cause ──
  if (c.root_cause_method || c.root_cause_analysis) {
    html += `<h3>Root Cause Analysis</h3>`;
    if (c.root_cause_method) {
      html += `<p style="font-size:10px;margin:4px 0;"><strong>Method:</strong> ${escHtml(c.root_cause_method)}</p>`;
    }
    if (c.root_cause_analysis) {
      html += `<div class="notes-box">${escHtml(c.root_cause_analysis)}</div>`;
    }
  }

  // ── Structured Root Cause Analysis Data ──
  if (c.root_cause_structured) {
    let structData = c.root_cause_structured;
    if (typeof structData === 'string') {
      try { structData = JSON.parse(structData); } catch(e) { structData = null; }
    }
    if (structData && Object.keys(structData).length > 0) {
      html += `<h3>Structured Analysis Details</h3>`;

      if (c.root_cause_method === '5_whys') {
        html += '<table>';
        for (let n = 1; n <= 5; n++) {
          if (structData[`why_${n}`]) {
            html += `<tr><td class="field-label">Why #${n}</td><td>${escHtml(structData[`why_${n}`])}</td></tr>`;
          }
        }
        if (structData.root_cause_summary) {
          html += `<tr><td class="field-label">Root Cause Summary</td><td>${escHtml(structData.root_cause_summary)}</td></tr>`;
        }
        html += '</table>';
      } else if (c.root_cause_method === 'fishbone') {
        html += '<table>';
        for (const cat of ['People', 'Process', 'Equipment', 'Materials', 'Environment', 'Measurement']) {
          if (structData[cat.toLowerCase()]) {
            html += `<tr><td class="field-label">${cat}</td><td>${escHtml(structData[cat.toLowerCase()])}</td></tr>`;
          }
        }
        if (structData.root_cause_summary) {
          html += `<tr><td class="field-label">Root Cause Summary</td><td>${escHtml(structData.root_cause_summary)}</td></tr>`;
        }
        html += '</table>';
      } else if (c.root_cause_method === 'fault_tree') {
        html += '<table>';
        if (structData.top_event) {
          html += `<tr><td class="field-label">Top Event</td><td>${escHtml(structData.top_event)}</td></tr>`;
        }
        if (structData.contributing_factors && structData.contributing_factors.length > 0) {
          html += `<tr><td class="field-label">Contributing Factors</td><td>${structData.contributing_factors.map(f => escHtml(f.description)).join('<br>')}</td></tr>`;
        }
        if (structData.root_cause_summary) {
          html += `<tr><td class="field-label">Root Cause Summary</td><td>${escHtml(structData.root_cause_summary)}</td></tr>`;
        }
        html += '</table>';
      } else if (c.root_cause_method === 'pareto') {
        html += '<table>';
        if (structData.data_collection_period) {
          html += `<tr><td class="field-label">Data Collection Period</td><td>${escHtml(structData.data_collection_period)}</td></tr>`;
        }
        if (structData.issue_categories && structData.issue_categories.length > 0) {
          html += `<tr><td class="field-label">Issue Categories</td><td><table style="margin:0;"><tr><th>Category</th><th>Count</th></tr>`;
          for (const cat of structData.issue_categories) {
            html += `<tr><td>${escHtml(cat.category)}</td><td>${cat.count || 0}</td></tr>`;
          }
          html += '</table></td></tr>';
        }
        if (structData.vital_few) {
          html += `<tr><td class="field-label">Vital Few (Top Causes)</td><td>${escHtml(structData.vital_few)}</td></tr>`;
        }
        if (structData.root_cause_summary) {
          html += `<tr><td class="field-label">Root Cause Summary</td><td>${escHtml(structData.root_cause_summary)}</td></tr>`;
        }
        html += '</table>';
      } else if (c.root_cause_method === 'fmea') {
        html += '<table>';
        if (structData.failure_mode) {
          html += `<tr><td class="field-label">Failure Mode</td><td>${escHtml(structData.failure_mode)}</td></tr>`;
        }
        if (structData.potential_effects) {
          html += `<tr><td class="field-label">Potential Effects</td><td>${escHtml(structData.potential_effects)}</td></tr>`;
        }
        const sev = parseInt(structData.severity) || 0;
        const occ = parseInt(structData.occurrence) || 0;
        const det = parseInt(structData.detection) || 0;
        const rpn = sev * occ * det;
        html += `<tr><td class="field-label">Severity</td><td>${sev}/10</td></tr>`;
        html += `<tr><td class="field-label">Occurrence</td><td>${occ}/10</td></tr>`;
        html += `<tr><td class="field-label">Detection</td><td>${det}/10</td></tr>`;
        html += `<tr><td class="field-label">RPN (Risk Priority Number)</td><td><strong>${rpn}</strong> = ${sev} × ${occ} × ${det}${rpn >= 200 ? ' — HIGH RISK' : rpn >= 100 ? ' — MEDIUM RISK' : rpn > 0 ? ' — LOW RISK' : ''}</td></tr>`;
        if (structData.recommended_actions) {
          html += `<tr><td class="field-label">Recommended Actions</td><td>${escHtml(structData.recommended_actions)}</td></tr>`;
        }
        html += '</table>';
      } else if (c.root_cause_method === 'timeline') {
        if (structData.events && structData.events.length > 0) {
          html += '<table><tr><th>Date</th><th>Event</th></tr>';
          for (const evt of structData.events) {
            html += `<tr><td style="white-space:nowrap;">${escHtml(evt.date || '')}</td><td>${escHtml(evt.description || '')}</td></tr>`;
          }
          html += '</table>';
        }
        if (structData.root_cause_summary) {
          html += `<p style="margin-top:6px;"><strong>Root Cause Summary:</strong> ${escHtml(structData.root_cause_summary)}</p>`;
        }
      }
    }
  }

  // ── Investigation Details ──
  if (c.investigation_details) {
    html += `<h3>Investigation Details</h3><div class="notes-box">${escHtml(c.investigation_details)}</div>`;
  }

  // ── Corrective & Preventive Actions ──
  html += `<h3>Corrective Action</h3><div class="notes-box">${escHtml(c.corrective_action)}</div>`;
  html += `<h3>Preventive Action</h3><div class="notes-box">${escHtml(c.preventive_action)}</div>`;

  // ── Effectiveness Notes ──
  if (c.effectiveness_notes) {
    html += `<h3>Progress Notes / Evidence</h3><div class="notes-box">${escHtml(c.effectiveness_notes)}</div>`;
  }

  // ── Action Items ──
  if (actionItems.length > 0) {
    html += `<h3>Action Items (${actionItems.length})</h3>
    <table><tr><th>Title</th><th>Assigned To</th><th>Due Date</th><th>Status</th><th>Completed</th></tr>`;
    for (const ai of actionItems) {
      html += `<tr><td>${escHtml(ai.title)}</td><td>${escHtml(ai.assigned_to)}</td><td>${escHtml(ai.due_date || '—')}</td><td>${statusBadge(ai.status)}</td><td>${escHtml(ai.completed_at || '—')}</td></tr>`;
    }
    html += '</table>';
  }

  // ── Linked Batch Tests ──
  if (linkedTests.length > 0) {
    html += `<h3>Linked Batch Tests (${linkedTests.length})</h3>
    <table><tr><th>Lot #</th><th>Product</th><th>Test Date</th><th>Status</th></tr>`;
    for (const t of linkedTests) {
      html += `<tr><td>${escHtml(t.batch_number)}</td><td>${escHtml(t.product_name || '')}</td><td>${escHtml(t.test_date || '')}</td><td>${statusBadge(t.status)}</td></tr>`;
    }
    html += '</table>';
  }

  // ── Linked Complaints ──
  if (linkedComplaints.length > 0) {
    html += `<h3>Linked Complaints (${linkedComplaints.length})</h3>
    <table><tr><th>Complaint #</th><th>Issue Type</th><th>Product</th><th>Status</th></tr>`;
    for (const cmp of linkedComplaints) {
      html += `<tr><td>${escHtml(cmp.complaint_number || '')}</td><td>${escHtml(cmp.issue_type || '')}</td><td>${escHtml(cmp.product_name || '')}</td><td>${statusBadge(cmp.status)}</td></tr>`;
    }
    html += '</table>';
  }

  // ── Attachments / Documents ──
  if (attachments.length > 0) {
    html += `<h3>Documents / Attachments (${attachments.length})</h3>
    <table><tr><th>Filename</th><th>Size</th><th>Uploaded By</th><th>Date</th></tr>`;
    for (const a of attachments) {
      const sizeKB = a.file_size ? (a.file_size / 1024).toFixed(1) + ' KB' : '—';
      html += `<tr><td>${escHtml(a.original_name)}</td><td>${sizeKB}</td><td>${escHtml(a.uploaded_by || '')}</td><td>${escHtml((a.created_at || '').split('T')[0])}</td></tr>`;
    }
    html += '</table>';
  }

  // ── Activity Log ──
  if (updates.length > 0) {
    html += `<h3>Activity Log (${updates.length})</h3>
    <table><tr><th>Date</th><th>Type</th><th>By</th><th>Content</th></tr>`;
    for (const u of updates) {
      html += `<tr><td style="white-space:nowrap;">${escHtml((u.created_at || '').replace('T', ' ').slice(0, 16))}</td><td>${statusBadge(u.update_type || 'note')}</td><td>${escHtml(u.created_by || '')}</td><td>${escHtml(u.content)}</td></tr>`;
    }
    html += '</table>';
  }

  html += '</div>';
  return html;
}

// Helper: fetch all related data for a CAPA record
async function fetchCapaRelatedData(capa) {
  const related = { actionItems: [], updates: [], linkedComplaints: [], linkedTests: [], attachments: [] };

  // Action items
  try { related.actionItems = await db.all('SELECT * FROM capa_action_items WHERE capa_id = ? ORDER BY created_at ASC', [capa.id]); } catch(e) {}

  // Activity log / updates
  try { related.updates = await db.all('SELECT * FROM capa_updates WHERE capa_id = ? ORDER BY created_at DESC', [capa.id]); } catch(e) {}

  // Attachments
  try { related.attachments = await db.all('SELECT * FROM capa_attachments WHERE capa_id = ? ORDER BY created_at DESC', [capa.id]); } catch(e) {}

  // Linked batch tests
  try {
    const testIds = JSON.parse(capa.linked_batch_tests || '[]');
    if (testIds.length > 0) {
      const placeholders = testIds.map(() => '?').join(',');
      related.linkedTests = await db.all(`SELECT id, batch_number, product_name, test_date, status FROM batch_tests WHERE batch_number IN (${placeholders})`, testIds);
    }
  } catch(e) {}

  // Linked complaints (via change request OR direct JSON linkage)
  try {
    if (capa.source_type === 'change_request' && capa.source_id) {
      related.linkedComplaints = await db.all('SELECT c.* FROM complaints c JOIN ccr_complaints cc ON c.id = cc.complaint_id JOIN ccrs ccr ON cc.ccr_id = ccr.id WHERE ccr.change_request_id = ?', [capa.source_id]);
    }
  } catch(e) {}
  try {
    const directIds = JSON.parse(capa.linked_complaints_json || '[]');
    if (directIds.length > 0) {
      const placeholders = directIds.map(() => '?').join(',');
      const directComplaints = await db.all('SELECT * FROM complaints WHERE id IN (' + placeholders + ')', directIds);
      const existingIds = new Set(related.linkedComplaints.map(c => c.id));
      for (const dc of directComplaints) {
        if (!existingIds.has(dc.id)) related.linkedComplaints.push(dc);
      }
    }
  } catch(e) {}

  return related;
}

// GET /api/print/capa/:id
router.get('/print/capa/:id', requireAuth, async (req, res) => {
  try {
    const c = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'CAPA not found' });
    const related = await fetchCapaRelatedData(c);
    const html = baseHtml('CAPA Report', c.capa_id, capaHtml(c, related));
    res.send(html);
  } catch (err) { console.error('Print CAPA error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/capas
router.get('/print/capas', requireAuth, async (req, res) => {
  try {
    const capas = await db.all('SELECT * FROM capas ORDER BY capa_id');
    let content = `<h2>CAPA Register — ${capas.length} Records</h2>
    <table><tr><th>CAPA #</th><th>Description</th><th>Responsible</th><th>Target</th><th>Status</th><th>Effectiveness</th></tr>`;
    for (const c of capas) {
      content += `<tr><td>${c.capa_id}</td><td>${escHtml((c.title || c.corrective_action).split(':')[0])}</td><td>${escHtml(c.responsible_person)}</td><td>${escHtml(c.target_date)}</td><td>${statusBadge(c.status)}</td><td>${statusBadge(c.effectiveness_result || 'pending')}</td></tr>`;
    }
    content += '</table>';
    for (const c of capas) {
      const related = await fetchCapaRelatedData(c);
      content += '<div class="page-break"></div>' + capaHtml(c, related);
    }
    const html = baseHtml('CAPA Register', 'KK-CAPA-REG', content);
    res.send(html);
  } catch (err) { console.error('Print CAPAs error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/batch-test/:id
router.get('/print/batch-test/:id', requireAuth, async (req, res) => {
  try {
    const bt = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!bt) return res.status(404).json({ error: 'Batch test not found' });
    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY test_category, test_type, id', [bt.id]);
    let content = `<h2>Batch Test Report — Lot ${bt.batch_number}</h2>
    <table>
      <tr><td class="field-label">Batch / Lot #</td><td>${bt.batch_number}</td><td class="field-label">Status</td><td>${statusBadge(bt.status)}</td></tr>
      <tr><td class="field-label">Product</td><td>${bt.product_name || ''} ${bt.product_sku ? '(' + bt.product_sku + ')' : ''}</td><td class="field-label">Test Profile</td><td>${bt.test_profile || 'routine'}</td></tr>
      <tr><td class="field-label">Lab</td><td>${bt.lab_name || ''}</td><td class="field-label">Report #</td><td>${bt.lab_report_number || ''}</td></tr>
      <tr><td class="field-label">Sample Date</td><td>${bt.sample_date || ''}</td><td class="field-label">Test Date</td><td>${bt.test_date}</td></tr>
      <tr><td class="field-label">Report Date</td><td>${bt.report_date || ''}</td><td class="field-label">Tested By</td><td>${bt.tested_by || ''}</td></tr>
    </table>
    ${bt.notes ? '<h3>Notes</h3><div class="notes-box">' + bt.notes + '</div>' : ''}
    ${bt.comments ? '<h3>Comments</h3><div class="notes-box">' + bt.comments + '</div>' : ''}
    <h3>Test Results</h3>
    <table><tr><th>Test</th><th>Method</th><th>Target</th><th>Actual</th><th>Unit</th><th>Result</th><th>Notes</th><th>Comments</th></tr>`;
    const TEST_METHODS = {
      'TPC': 'MFHPB-18 / ISO 4833', 'Yeast': 'MFHPB-22 / ISO 21527', 'Mold': 'MFHPB-22 / ISO 21527',
      'E.coli': 'MFHPB-19 / ISO 4831', 'S.aureus': 'MFHPB-21 / ISO 6888', 'Salmonella': 'MFHPB-20 / ISO 6579-1',
      'Listeria': 'MFHPB-30 / ISO 11290-1', 'Coliforms': 'MFHPB-35', 'Enterobacteriaceae': 'MFLP-43 / ISO 21528',
      'Total Probiotic Count': 'MFHPB-33 / ISO 15214', 'Probiotic Count': 'MFHPB-33 / ISO 15214',
    };
    const TEST_NAMES = {
      'TPC': 'Total Plate Count', 'E.coli': 'Escherichia coli', 'S.aureus': 'Staphylococcus aureus',
      'Yeast': 'Yeast Count', 'Mold': 'Mold Count',
    };
    for (const r of results) {
      const pf = r.pass_fail === 'fail' ? 'style="background:#fee2e2;color:#991b1b;"' : '';
      content += `<tr ${pf}><td>${TEST_NAMES[r.test_name] || r.test_name}</td><td style="font-size:9px;color:#666;">${TEST_METHODS[r.test_name] || ''}</td><td>${r.target_value || '-'}</td><td><strong>${r.actual_value || '-'}</strong></td><td>${r.unit || ''}</td><td>${statusBadge(r.pass_fail)}</td><td>${r.notes || ''}</td><td>${r.comments || ''}</td></tr>`;
    }
    content += '</table>';
    const html = baseHtml('Batch Test Report', 'LOT-' + bt.batch_number, content);
    res.send(html);
  } catch (err) { console.error('Print batch test error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/batch-tests
router.get('/print/batch-tests', requireAuth, async (req, res) => {
  try {
    const tests = await db.all('SELECT * FROM batch_tests ORDER BY test_date DESC');
    let content = `<h2>Batch Testing Register — ${tests.length} Records</h2>
    <table><tr><th>Lot #</th><th>Product</th><th>Test Date</th><th>Lab</th><th>Report #</th><th>Status</th></tr>`;
    for (const t of tests) {
      content += `<tr><td>${t.batch_number}</td><td>${t.product_name || ''}</td><td>${t.test_date}</td><td>${t.lab_name || ''}</td><td>${t.lab_report_number || ''}</td><td>${statusBadge(t.status)}</td></tr>`;
    }
    content += '</table>';
    const html = baseHtml('Batch Testing Register', 'KK-BT-REG', content);
    res.send(html);
  } catch (err) { console.error('Print batch tests error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/ccr/:id
router.get('/print/ccr/:id', requireAuth, async (req, res) => {
  try {
    const c = await db.get('SELECT * FROM ccrs WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'CCR not found' });
    const complaints = await db.all('SELECT cc.complaint_id, cmp.complaint_number, cmp.issue_type, cmp.product_name, cmp.status FROM ccr_complaints cc LEFT JOIN complaints cmp ON cc.complaint_id = cmp.id WHERE cc.ccr_id = ?', [c.id]);
    let content = `<h2>Change Control Record — ${c.ccr_number || 'CCR-' + c.id}</h2>
    <table>
      <tr><td class="field-label">CCR Number</td><td>${c.ccr_number || ''}</td><td class="field-label">Status</td><td>${statusBadge(c.status)}</td></tr>
      <tr><td class="field-label">Title</td><td colspan="3">${c.title || ''}</td></tr>
      <tr><td class="field-label">Created</td><td>${c.created_at || ''}</td><td class="field-label">Updated</td><td>${c.updated_at || ''}</td></tr>
    </table>
    ${c.description ? '<h3>Description</h3><div class="notes-box">' + c.description + '</div>' : ''}
    ${c.root_cause ? '<h3>Root Cause Analysis</h3><div class="notes-box">' + c.root_cause + '</div>' : ''}
    ${c.corrective_action ? '<h3>Corrective Action</h3><div class="notes-box">' + c.corrective_action + '</div>' : ''}
    ${c.preventive_action ? '<h3>Preventive Action</h3><div class="notes-box">' + c.preventive_action + '</div>' : ''}`;
    if (complaints.length > 0) {
      content += '<h3>Linked Complaints</h3><table><tr><th>Complaint #</th><th>Issue Type</th><th>Product</th><th>Status</th></tr>';
      for (const cmp of complaints) {
        content += `<tr><td>${cmp.complaint_number || ''}</td><td>${cmp.issue_type || ''}</td><td>${cmp.product_name || ''}</td><td>${statusBadge(cmp.status)}</td></tr>`;
      }
      content += '</table>';
    }
    const html = baseHtml('Change Control Record', c.ccr_number || '', content);
    res.send(html);
  } catch (err) { console.error('Print CCR error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/ccrs
router.get('/print/ccrs', requireAuth, async (req, res) => {
  try {
    const ccrs = await db.all('SELECT * FROM ccrs ORDER BY id');
    let content = `<h2>CCR Register — ${ccrs.length} Records</h2>
    <table><tr><th>CCR #</th><th>Title</th><th>Status</th><th>Created</th></tr>`;
    for (const c of ccrs) {
      content += `<tr><td>${c.ccr_number || ''}</td><td>${(c.title || '').substring(0, 80)}</td><td>${statusBadge(c.status)}</td><td>${(c.created_at || '').split(' ')[0]}</td></tr>`;
    }
    content += '</table>';
    const html = baseHtml('CCR Register', 'KK-CCR-REG', content);
    res.send(html);
  } catch (err) { console.error('Print CCRs error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/complaints
router.get('/print/complaints', requireAuth, async (req, res) => {
  try {
    const complaints = await db.all('SELECT * FROM complaints ORDER BY id DESC');
    let content = `<h2>Complaint Log — ${complaints.length} Records</h2>
    <table><tr><th>Complaint #</th><th>Date</th><th>Product</th><th>Issue Type</th><th>Lot</th><th>Status</th></tr>`;
    for (const c of complaints) {
      content += `<tr><td>${c.complaint_number || ''}</td><td>${(c.date_received || c.created_at || '').split(' ')[0]}</td><td>${c.product_name || ''}</td><td>${c.issue_type || ''}</td><td>${c.lot_number || ''}</td><td>${statusBadge(c.status)}</td></tr>`;
    }
    content += '</table>';
    const html = baseHtml('Customer Complaint Log', 'KK-CMP-REG', content);
    res.send(html);
  } catch (err) { console.error('Print complaints error:', err); res.status(500).json({ error: err.message }); }
});

// GET /api/print/audit-package
router.get('/print/audit-package', requireAuth, async (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0];
    const capas = await db.all('SELECT * FROM capas ORDER BY capa_id');
    const ccrs = await db.all('SELECT * FROM ccrs ORDER BY id');
    const tests = await db.all('SELECT * FROM batch_tests ORDER BY test_date DESC');
    const complaints = await db.all('SELECT * FROM complaints ORDER BY id DESC');

    let content = `<h2>SGS Audit Document Package</h2>
    <p style="margin:8px 0;color:#666;">Prepared for GMP Certification Audit — ${now}</p>
    <div class="toc"><h3>Table of Contents</h3><ol>
      <li>CAPA Register (${capas.length} records)</li>
      <li>Change Control Records (${ccrs.length} records)</li>
      <li>Batch Testing Register (${tests.length} records)</li>
      <li>Customer Complaint Log (${complaints.length} records)</li>
    </ol></div>`;

    // Section 1: CAPAs
    content += '<div class="page-break"></div><h2>1. CAPA Register</h2>';
    content += `<table><tr><th>CAPA #</th><th>Description</th><th>Responsible</th><th>Target</th><th>Status</th><th>Effectiveness</th></tr>`;
    for (const c of capas) {
      content += `<tr><td>${c.capa_id}</td><td>${c.corrective_action.split(':')[0]}</td><td>${c.responsible_person}</td><td>${c.target_date}</td><td>${statusBadge(c.status)}</td><td>${statusBadge(c.effectiveness_result || 'pending')}</td></tr>`;
    }
    content += '</table>';
    for (const c of capas) {
      const related = await fetchCapaRelatedData(c);
      content += '<div class="page-break"></div>' + capaHtml(c, related);
    }

    // Section 2: CCRs
    content += '<div class="page-break"></div><h2>2. Change Control Records</h2>';
    content += `<table><tr><th>CCR #</th><th>Title</th><th>Status</th><th>Created</th></tr>`;
    for (const c of ccrs) {
      content += `<tr><td>${c.ccr_number || ''}</td><td>${(c.title || '').substring(0, 80)}</td><td>${statusBadge(c.status)}</td><td>${(c.created_at || '').split(' ')[0]}</td></tr>`;
    }
    content += '</table>';

    // Section 3: Batch Testing
    content += '<div class="page-break"></div><h2>3. Batch Testing Register</h2>';
    content += `<table><tr><th>Lot #</th><th>Product</th><th>Test Date</th><th>Lab</th><th>Report #</th><th>Status</th></tr>`;
    for (const t of tests) {
      content += `<tr><td>${t.batch_number}</td><td>${t.product_name || ''}</td><td>${t.test_date}</td><td>${t.lab_name || ''}</td><td>${t.lab_report_number || ''}</td><td>${statusBadge(t.status)}</td></tr>`;
    }
    content += '</table>';

    // Section 4: Complaints
    content += '<div class="page-break"></div><h2>4. Customer Complaint Log</h2>';
    content += `<table><tr><th>Complaint #</th><th>Date</th><th>Product</th><th>Issue Type</th><th>Lot</th><th>Status</th></tr>`;
    for (const c of complaints) {
      content += `<tr><td>${c.complaint_number || ''}</td><td>${(c.date_received || c.created_at || '').split(' ')[0]}</td><td>${c.product_name || ''}</td><td>${c.issue_type || ''}</td><td>${c.lot_number || ''}</td><td>${statusBadge(c.status)}</td></tr>`;
    }
    content += '</table>';

    const html = baseHtml('SGS Audit Document Package', 'KK-AUDIT-PKG-' + now, content);
    res.send(html);
  } catch (err) { console.error('Print audit package error:', err); res.status(500).json({ error: err.message }); }
});


// Helper: create styled CAPA Word document
function createCAPADoc(capa, { actionItems = [], updates = [], linkedComplaints = [], linkedTests = [], attachments = [] } = {}) {
  const now = new Date().toISOString().split('T')[0];

  const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

  function labelCell(text) {
    return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Arial' })] })], width: { size: 30, type: WidthType.PERCENTAGE }, borders, shading: { fill: 'F0F4F8' } });
  }
  function valueCell(text, colSpan) {
    const opts = { children: [new Paragraph({ children: [new TextRun({ text: text || '', size: 20, font: 'Arial' })] })], borders };
    if (colSpan) opts.columnSpan = colSpan;
    return new TableCell(opts);
  }
  function sectionHeading(text) {
    return new Paragraph({ spacing: { before: 300 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] });
  }
  function bodyText(text) {
    return new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: text || '', size: 20, font: 'Arial' })] });
  }

  const heading = capa.title || capa.corrective_action.split(':')[0];

  const sections = [
    // Header
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'KEFIR Kultures Inc.', bold: true, size: 28, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [new TextRun({ text: 'Unit 15-16, 1545 Britannia Road East, Mississauga, ON L4W 3C6', size: 18, font: 'Arial', color: '666666' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'CORRECTIVE AND PREVENTIVE ACTION (CAPA) REPORT', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),

    // Title
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: capa.capa_id + ' — ' + heading, bold: true, size: 22, font: 'Arial' })] }),
  ];

  // Description (What Happened)
  if (capa.description) {
    sections.push(sectionHeading('What Happened'));
    sections.push(bodyText(capa.description));
  }

  // Info table — expanded with all fields
  sections.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [labelCell('CAPA Number'), valueCell(capa.capa_id), labelCell('Status'), valueCell((capa.status || '').toUpperCase())] }),
      new TableRow({ children: [labelCell('Classification'), valueCell((capa.classification || 'N/A').toUpperCase()), labelCell('Priority'), valueCell((capa.priority || 'N/A').toUpperCase())] }),
      new TableRow({ children: [labelCell('Risk Assessment'), valueCell(capa.risk_assessment || 'N/A'), labelCell('Category'), valueCell(capa.category || 'N/A')] }),
      new TableRow({ children: [labelCell('Department'), valueCell(capa.department || 'N/A'), labelCell('Initiated By'), valueCell(capa.initiated_by || 'N/A')] }),
      new TableRow({ children: [labelCell('Source'), valueCell(capa.source_type + (capa.source_id ? ' #' + capa.source_id : '')), labelCell('Responsible Person'), valueCell(capa.responsible_person)] }),
      new TableRow({ children: [labelCell('Target Date'), valueCell(capa.target_date), labelCell('Completion Date'), valueCell(capa.actual_completion_date || 'Pending')] }),
      new TableRow({ children: [labelCell('Effectiveness Check'), valueCell(capa.effectiveness_check_date || 'Not Scheduled'), labelCell('Effectiveness Result'), valueCell((capa.effectiveness_result || 'Pending').toUpperCase())] }),
      new TableRow({ children: [labelCell('Verification Method'), valueCell(capa.verification_method || 'N/A', 3)] }),
      new TableRow({ children: [labelCell('Generated'), valueCell(now), labelCell('Generated By'), valueCell('QMS System')] }),
    ]})
  );

  // Containment
  if (capa.containment_action) {
    sections.push(sectionHeading('Containment / Immediate Action'));
    sections.push(bodyText(capa.containment_action));
  }

  // Root Cause Analysis
  if (capa.root_cause_method || capa.root_cause_analysis) {
    sections.push(sectionHeading('Root Cause Analysis'));
    if (capa.root_cause_method) {
      sections.push(new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: 'Method: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: capa.root_cause_method, size: 20, font: 'Arial' }),
      ]}));
    }
    if (capa.root_cause_analysis) {
      sections.push(bodyText(capa.root_cause_analysis));
    }
  }

  // Structured RCA data
  if (capa.root_cause_structured) {
    let structData = capa.root_cause_structured;
    if (typeof structData === 'string') {
      try { structData = JSON.parse(structData); } catch(e) { structData = null; }
    }
    if (structData && Object.keys(structData).length > 0) {
      sections.push(sectionHeading('Structured Analysis Details'));

      if (capa.root_cause_method === '5_whys') {
        for (let n = 1; n <= 5; n++) {
          if (structData[`why_${n}`]) {
            sections.push(new Paragraph({ spacing: { after: 100 }, children: [
              new TextRun({ text: `Why #${n}: `, bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: structData[`why_${n}`], size: 20, font: 'Arial' }),
            ]}));
          }
        }
      } else if (capa.root_cause_method === 'fishbone') {
        for (const cat of ['People', 'Process', 'Equipment', 'Materials', 'Environment', 'Measurement']) {
          if (structData[cat.toLowerCase()]) {
            sections.push(new Paragraph({ spacing: { after: 100 }, children: [
              new TextRun({ text: `${cat}: `, bold: true, size: 20, font: 'Arial' }),
              new TextRun({ text: structData[cat.toLowerCase()], size: 20, font: 'Arial' }),
            ]}));
          }
        }
      } else if (capa.root_cause_method === 'fmea') {
        if (structData.failure_mode) sections.push(bodyText('Failure Mode: ' + structData.failure_mode));
        if (structData.potential_effects) sections.push(bodyText('Potential Effects: ' + structData.potential_effects));
        const sev = parseInt(structData.severity) || 0;
        const occ = parseInt(structData.occurrence) || 0;
        const det = parseInt(structData.detection) || 0;
        const rpn = sev * occ * det;
        sections.push(bodyText(`Severity: ${sev}/10 | Occurrence: ${occ}/10 | Detection: ${det}/10 | RPN: ${rpn}`));
        if (structData.recommended_actions) sections.push(bodyText('Recommended Actions: ' + structData.recommended_actions));
      } else if (capa.root_cause_method === 'fault_tree') {
        if (structData.top_event) sections.push(bodyText('Top Event: ' + structData.top_event));
        if (structData.contributing_factors?.length > 0) {
          sections.push(bodyText('Contributing Factors:\n' + structData.contributing_factors.map((f, i) => `${i+1}. ${f.description}`).join('\n')));
        }
      } else if (capa.root_cause_method === 'pareto') {
        if (structData.data_collection_period) sections.push(bodyText('Data Collection Period: ' + structData.data_collection_period));
        if (structData.issue_categories?.length > 0) {
          sections.push(bodyText('Issue Categories:\n' + structData.issue_categories.map(c => `• ${c.category}: ${c.count}`).join('\n')));
        }
        if (structData.vital_few) sections.push(bodyText('Vital Few: ' + structData.vital_few));
      } else if (capa.root_cause_method === 'timeline') {
        if (structData.events?.length > 0) {
          sections.push(bodyText('Timeline:\n' + structData.events.map(e => `${e.date || '?'} — ${e.description}`).join('\n')));
        }
      }

      if (structData.root_cause_summary) {
        sections.push(new Paragraph({ spacing: { before: 100, after: 200 }, children: [
          new TextRun({ text: 'Root Cause Summary: ', bold: true, size: 20, font: 'Arial' }),
          new TextRun({ text: structData.root_cause_summary, size: 20, font: 'Arial' }),
        ]}));
      }
    }
  }

  // Investigation Details
  if (capa.investigation_details) {
    sections.push(sectionHeading('Investigation Details'));
    sections.push(bodyText(capa.investigation_details));
  }

  // Corrective & Preventive Actions
  sections.push(sectionHeading('Corrective Action'));
  sections.push(bodyText(capa.corrective_action || ''));
  sections.push(sectionHeading('Preventive Action'));
  sections.push(bodyText(capa.preventive_action || ''));

  // Effectiveness Notes
  sections.push(sectionHeading('Progress Notes / Evidence'));
  sections.push(bodyText(capa.effectiveness_notes || '(No notes recorded)'));

  // Action Items
  if (actionItems.length > 0) {
    sections.push(sectionHeading('Action Items (' + actionItems.length + ')'));
    const aiRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Title', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Assigned To', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Due Date', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
      ]}),
    ];
    for (const ai of actionItems) {
      aiRows.push(new TableRow({ children: [
        valueCell(ai.title), valueCell(ai.assigned_to), valueCell(ai.due_date || '—'), valueCell((ai.status || '').toUpperCase()),
      ]}));
    }
    sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: aiRows }));
  }

  // Linked Batch Tests
  if (linkedTests.length > 0) {
    sections.push(sectionHeading('Linked Batch Tests (' + linkedTests.length + ')'));
    const btRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Lot #', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Product', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Test Date', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
      ]}),
    ];
    for (const t of linkedTests) {
      btRows.push(new TableRow({ children: [
        valueCell(t.batch_number), valueCell(t.product_name || ''), valueCell(t.test_date || ''), valueCell((t.status || '').toUpperCase()),
      ]}));
    }
    sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: btRows }));
  }

  // Linked Complaints
  if (linkedComplaints.length > 0) {
    sections.push(sectionHeading('Linked Complaints (' + linkedComplaints.length + ')'));
    const cmpRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Complaint #', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Issue Type', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Product', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
      ]}),
    ];
    for (const cmp of linkedComplaints) {
      cmpRows.push(new TableRow({ children: [
        valueCell(cmp.complaint_number || ''), valueCell(cmp.issue_type || ''), valueCell(cmp.product_name || ''), valueCell((cmp.status || '').toUpperCase()),
      ]}));
    }
    sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: cmpRows }));
  }

  // Attachments / Documents
  if (attachments.length > 0) {
    sections.push(sectionHeading('Documents / Attachments (' + attachments.length + ')'));
    const attRows = [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Filename', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Size', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Uploaded By', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, size: 18, font: 'Arial' })] })], borders, shading: { fill: 'F0F4F8' } }),
      ]}),
    ];
    for (const a of attachments) {
      const sizeKB = a.file_size ? (a.file_size / 1024).toFixed(1) + ' KB' : '—';
      attRows.push(new TableRow({ children: [
        valueCell(a.original_name), valueCell(sizeKB), valueCell(a.uploaded_by || ''), valueCell((a.created_at || '').split('T')[0]),
      ]}));
    }
    sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: attRows }));
  }

  // Activity log
  if (updates && updates.length > 0) {
    sections.push(sectionHeading('Activity Log (' + updates.length + ')'));
    for (const u of updates) {
      sections.push(new Paragraph({ spacing: { before: 100 }, children: [
        new TextRun({ text: (u.created_at || '') + ' — ', bold: true, size: 18, font: 'Arial', color: '666666' }),
        new TextRun({ text: '[' + (u.update_type || 'note').toUpperCase() + '] ', bold: true, size: 18, font: 'Arial', color: '2563EB' }),
        new TextRun({ text: (u.created_by ? u.created_by + ': ' : '') + (u.content || ''), size: 20, font: 'Arial' }),
      ]}));
    }
  }

  // Signature block
  sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By:', bold: true, size: 20, font: 'Arial' })] }), new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '________________________', size: 20, font: 'Arial' })] }), new Paragraph({ children: [new TextRun({ text: 'Name / Date', size: 16, font: 'Arial', color: '999999' })] })], borders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Reviewed By:', bold: true, size: 20, font: 'Arial' })] }), new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '________________________', size: 20, font: 'Arial' })] }), new Paragraph({ children: [new TextRun({ text: 'Name / Date', size: 16, font: 'Arial', color: '999999' })] })], borders }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Approved By:', bold: true, size: 20, font: 'Arial' })] }), new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '________________________', size: 20, font: 'Arial' })] }), new Paragraph({ children: [new TextRun({ text: 'Name / Date', size: 16, font: 'Arial', color: '999999' })] })], borders }),
    ]}),
  ]}));

  sections.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CONFIDENTIAL — KEFIR Kultures Inc.', size: 16, font: 'Arial', color: '999999', italics: true })] }));

  return new Document({ sections: [{ children: sections }] });
}

// GET /api/print/capa/:id/docx - Download CAPA as Word document
router.get('/print/capa/:id/docx', requireAuth, async (req, res) => {
  try {
    const capa = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!capa) return res.status(404).json({ error: 'CAPA not found' });

    const related = await fetchCapaRelatedData(capa);

    const doc = createCAPADoc(capa, related);
    const buffer = await Packer.toBuffer(doc);
    
    const archiveName = capa.capa_id + '_' + new Date().toISOString().split('T')[0] + '.docx';
    try {
      await uploadFile(`capa-docs/${archiveName}`, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (e) {
      console.error('Failed to archive CAPA doc to Supabase:', e.message);
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="' + capa.capa_id + '_Report.docx"');
    res.send(buffer);
  } catch (err) {
    console.error('CAPA DOCX error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
