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


function capaHtml(c) {
  return `
<div class="section">
  <h2>${c.capa_id} — ${c.corrective_action.split(':')[0]}</h2>
  <table>
    <tr><td class="field-label">CAPA Number</td><td>${c.capa_id}</td><td class="field-label">Status</td><td>${statusBadge(c.status)}</td></tr>
    <tr><td class="field-label">Source</td><td>${c.source_type} #${c.source_id}</td><td class="field-label">Responsible Person</td><td>${c.responsible_person}</td></tr>
    <tr><td class="field-label">Target Date</td><td>${c.target_date}</td><td class="field-label">Completion Date</td><td>${c.actual_completion_date || 'Pending'}</td></tr>
    <tr><td class="field-label">Effectiveness Check</td><td>${c.effectiveness_check_date || 'Not scheduled'}</td><td class="field-label">Effectiveness Result</td><td>${statusBadge(c.effectiveness_result || 'pending')}</td></tr>
  </table>
  ${c.containment_action ? '<h3>Containment / Immediate Action</h3><div class="notes-box">' + c.containment_action + '</div>' : ''}
  ${c.root_cause_method ? '<tr><td class="field-label">Root Cause Method</td><td colspan="3">' + c.root_cause_method + '</td></tr>' : ''}
  <h3>Corrective Action</h3>
  <div class="notes-box">${c.corrective_action}</div>
  <h3>Preventive Action</h3>
  <div class="notes-box">${c.preventive_action}</div>
  ${c.effectiveness_notes ? '<h3>Progress Notes / Evidence</h3><div class="notes-box">' + c.effectiveness_notes + '</div>' : ''}
</div>`;
}

// GET /api/print/capa/:id
router.get('/print/capa/:id', requireAuth, async (req, res) => {
  try {
    const c = await db.get('SELECT * FROM capas WHERE id = ?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'CAPA not found' });
    const html = baseHtml('CAPA Report', c.capa_id, capaHtml(c));
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
      content += `<tr><td>${c.capa_id}</td><td>${c.corrective_action.split(':')[0]}</td><td>${c.responsible_person}</td><td>${c.target_date}</td><td>${statusBadge(c.status)}</td><td>${statusBadge(c.effectiveness_result || 'pending')}</td></tr>`;
    }
    content += '</table>';
    for (const c of capas) { content += '<div class="page-break"></div>' + capaHtml(c); }
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
    for (const c of capas) { content += '<div class="page-break"></div>' + capaHtml(c); }

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
function createCAPADoc(capa, updates) {
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
  
  const sections = [
    // Header
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'KEFIR Kultures Inc.', bold: true, size: 28, font: 'Arial' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [new TextRun({ text: 'Unit 15-16, 1545 Britannia Road East, Mississauga, ON L4W 3C6', size: 18, font: 'Arial', color: '666666' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'CORRECTIVE AND PREVENTIVE ACTION (CAPA) REPORT', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
    
    // Info table
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [labelCell('CAPA Number'), valueCell(capa.capa_id), labelCell('Status'), valueCell((capa.status || '').toUpperCase())] }),
      new TableRow({ children: [labelCell('Source'), valueCell(capa.source_type), labelCell('Responsible Person'), valueCell(capa.responsible_person)] }),
      new TableRow({ children: [labelCell('Target Date'), valueCell(capa.target_date), labelCell('Completion Date'), valueCell(capa.actual_completion_date || 'Pending')] }),
      new TableRow({ children: [labelCell('Effectiveness Check'), valueCell(capa.effectiveness_check_date || 'Not Scheduled'), labelCell('Effectiveness Result'), valueCell((capa.effectiveness_result || 'Pending').toUpperCase())] }),
      new TableRow({ children: [labelCell('Generated'), valueCell(now), labelCell('Generated By'), valueCell('QMS System')] }),
    ]}),
    
    ...(capa.containment_action ? [
      new Paragraph({ spacing: { before: 300 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Containment / Immediate Action', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: capa.containment_action, size: 20, font: 'Arial' })] }),
    ] : []),
    ...(capa.root_cause_method ? [
      new Paragraph({ spacing: { before: 200 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Root Cause Method', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: capa.root_cause_method, size: 20, font: 'Arial' })] }),
    ] : []),
    new Paragraph({ spacing: { before: 300 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Corrective Action', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: capa.corrective_action || '', size: 20, font: 'Arial' })] }),
    
    new Paragraph({ spacing: { before: 200 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Preventive Action', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: capa.preventive_action || '', size: 20, font: 'Arial' })] }),
    
    new Paragraph({ spacing: { before: 200 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Progress Notes / Evidence', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: capa.effectiveness_notes || '(No notes recorded)', size: 20, font: 'Arial' })] }),
  ];
  
  // Activity log
  if (updates && updates.length > 0) {
    sections.push(new Paragraph({ spacing: { before: 300 }, heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Activity Log', bold: true, size: 24, font: 'Arial', color: '1E3A5F' })] }));
    for (const u of updates) {
      sections.push(new Paragraph({ spacing: { before: 100 }, children: [
        new TextRun({ text: u.created_at + ' — ', bold: true, size: 18, font: 'Arial', color: '666666' }),
        new TextRun({ text: '[' + (u.update_type || 'note').toUpperCase() + '] ', bold: true, size: 18, font: 'Arial', color: '2563EB' }),
        new TextRun({ text: u.content, size: 20, font: 'Arial' }),
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

    let updates = [];
    try { updates = await db.all('SELECT * FROM capa_updates WHERE capa_id = ? ORDER BY created_at DESC', [capa.id]); } catch(e) {}
    
    const doc = createCAPADoc(capa, updates);
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
