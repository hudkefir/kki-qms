import { Router } from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, readFileSync, unlinkSync, readdirSync, rmSync } from 'fs';
import { dirname, join, extname, basename } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import db from './database-pg.js';
import { requireAuth, requireWriteAccess, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Multer setup for COA PDF uploads ────────────────────────────────────────
const uploadsDir = join(__dirname, '..', '..', 'uploads', 'batch-testing');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const coaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const base = basename(file.originalname, ext).replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const coaUpload = multer({
  storage: coaStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ── COA PDF Parser (CREM Co Labs format) ────────────────────────────────────

function parseCOAPdf(text) {
  // Normalize whitespace but keep line breaks
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract sample/lot ID
  let sampleId = '';
  for (const line of lines) {
    const sampleMatch = line.match(/Sample\s*(?:ID|#|No\.?|Number)?\s*[:=]\s*(.+)/i);
    if (sampleMatch) {
      sampleId = sampleMatch[1].trim();
      break;
    }
  }

  // Extract product name
  let productName = '';
  for (const line of lines) {
    const prodMatch = line.match(/Product\s*[:=]\s*(.+)/i);
    if (prodMatch) {
      productName = prodMatch[1].trim();
      break;
    }
  }

  // Known test name mappings from COA to our system
  const TEST_MAPPINGS = {
    'total plate count': ['Standard Plate Count (SPC)', 'Total Plate Count'],
    'tpc': ['Standard Plate Count (SPC)', 'Total Plate Count'],
    'total aerobic count': ['Standard Plate Count (SPC)'],
    'standard plate count': ['Standard Plate Count (SPC)'],
    'spc': ['Standard Plate Count (SPC)'],
    'yeast': ['Yeast'],
    'mold': ['Mold'],
    'mould': ['Mold'],
    'yeast & mold': ['Yeast', 'Mold'],
    'yeast and mold': ['Yeast', 'Mold'],
    'yeast & mould': ['Yeast', 'Mold'],
    'yeast and mould': ['Yeast', 'Mold'],
    'e. coli': ['E. coli', 'Coliform / E. coli'],
    'e.coli': ['E. coli', 'Coliform / E. coli'],
    'escherichia coli': ['E. coli', 'Coliform / E. coli'],
    'coliform': ['Coliform', 'Coliform / E. coli'],
    'coliforms': ['Coliform', 'Coliform / E. coli'],
    's. aureus': ['Staphylococcus aureus'],
    'staphylococcus aureus': ['Staphylococcus aureus'],
    'staph aureus': ['Staphylococcus aureus'],
    'salmonella': ['Salmonella', 'Pathogen Screening (Salmonella, Listeria)'],
    'salmonella spp': ['Salmonella', 'Pathogen Screening (Salmonella, Listeria)'],
    'salmonella spp.': ['Salmonella', 'Pathogen Screening (Salmonella, Listeria)'],
    'listeria': ['Listeria monocytogenes'],
    'listeria monocytogenes': ['Listeria monocytogenes'],
    'l. monocytogenes': ['Listeria monocytogenes'],
    'total probiotic count': ['Total Probiotic Count'],
    'probiotic count': ['Total Probiotic Count'],
    'ph': ['pH Level'],
    'ph level': ['pH Level'],
    'moisture': ['Moisture'],
    'water activity': ['Water Activity'],
  };

  // Parse test results from table-like structures
  const parsedResults = [];
  const fullText = text.toLowerCase();

  // --- CREM Co Labs OCR format parser ---
  const cremCoPatterns = [
    { pattern: /Total Microbial Count[\s\S]*?(\d[\d,]+)\s*CFU\s*\/\s*g/i, test: 'total plate count', unit: 'CFU/g', extraNames: ['TPC', 'Total Microbial Count'] },
    { pattern: /(?:Mold\s*&\s*Yeast|Yeast\s*&\s*Mold|Yeast\s*and\s*Mold)[\s\S]*?(\d[\d,]+)\s*CFU\s*\/\s*g/i, test: 'yeast & mold', unit: 'CFU/g', extraNames: ['YM', 'Yeast', 'Mold', 'Mold & Yeast'] },
    { pattern: /Escherichia\s*coli[\s\S]*?\b(Absent|Not\s*Detected|Detected)\b/i, test: 'e. coli', unit: '', extraNames: ['E.coli', 'Escherichia coli'] },
    { pattern: /Staphylococcus\s*aureus[\s\S]*?\b(Absent|Not\s*Detected|Detected)\b/i, test: 's. aureus', unit: '', extraNames: ['S.aureus', 'Staph aureus'] },
    { pattern: /Salmonella\s*(?:spp\.?)?[\s\S]*?\b(Absent|Not\s*Detected|Detected)\b/i, test: 'salmonella', unit: '', extraNames: ['Salmonella spp'] },
    { pattern: /Listeria\s*monocytogenes[\s\S]*?(?:ISO[\s\S]*?)?\b(Absent|Not\s*Detected|Detected)\b/i, test: 'listeria', unit: '', extraNames: ['Listeria monocytogenes'] },
    { pattern: /Total Probiotic Count[\s\S]*?([\d,.]+\s*(?:trillion|billion|million)?)\s*CFU\s*\/\s*mL[\s\S]*?\|?\s*([\d,]+)\s*CFU\s*\/\s*mL/i, test: 'total probiotic count', unit: 'CFU/mL', group: 2, extraNames: ['Probiotic Count', 'Total Probiotic'] },
    { pattern: /Total Probiotic Count[\s\S]*?([\d,]+)\s*CFU\s*\/\s*(?:mL|g)/i, test: 'total probiotic count', unit: 'CFU/mL', extraNames: ['Probiotic Count', 'Total Probiotic'] },
  ];

  // Try CREM Co patterns first (works better with OCR text)
  for (const cp of cremCoPatterns) {
    const match = text.match(cp.pattern);
    if (match) {
      let value = (cp.group ? match[cp.group] : match[1]).trim();
      let mappedNames = TEST_MAPPINGS[cp.test] || [];
      if (cp.extraNames) mappedNames = [...mappedNames, ...cp.extraNames];
      if (mappedNames.length && value) {
        if (!parsedResults.some(r => r.test_names.some(n => mappedNames.includes(n)))) {
          parsedResults.push({
            test_names: mappedNames,
            actual_value: value.replace(/,/g, ','),
            unit: cp.unit,
            raw_line: match[0].slice(0, 100),
          });
        }
      }
    }
  }

  // Also extract lot number and sample name from CREM Co format
  if (!sampleId) {
    const lotMatch = text.match(/Lot:\s*0*(\d+)/i);
    if (lotMatch) sampleId = lotMatch[1];
  }
  if (!productName) {
    const prodMatch = text.match(/Sample\s*Name:\s*(.+?)(?:\s*Lot:|$)/im);
    if (prodMatch) productName = prodMatch[1].trim();
  }

  // If CREM Co patterns found results, skip the generic parser
  if (parsedResults.length > 0) {
    return { sampleId, productName, results: parsedResults, rawText: text };
  }

  for (const line of lines) {
    const parts = line.split(/\t+|\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const testNameRaw = parts[0].toLowerCase().replace(/[^a-z0-9\s.&]/g, '').trim();
      const mappedNames = TEST_MAPPINGS[testNameRaw];

      if (mappedNames) {
        let resultValue = '';
        let unit = '';

        for (let i = 1; i < parts.length; i++) {
          const p = parts[i];
          if (/^[A-Z]{2,}[-/]?\d/.test(p)) continue;
          if (/^[<>]?\s*\d/.test(p) || /absent|not\s*detected|negative|detected|positive|present/i.test(p)) {
            resultValue = p;
            if (i + 1 < parts.length && /^[a-zA-Z/%°]/.test(parts[i + 1]) && !/specification|spec|limit/i.test(parts[i + 1])) {
              if (!/CFU|cfu|mL|ml|mg|ppm/i.test(resultValue)) {
                unit = parts[i + 1];
              }
            }
            break;
          }
        }

        const unitMatch = resultValue.match(/^([<>]?\s*[\d,.]+)\s*(CFU\/[gm]l?|CFU\/mL|MPN\/[gm]l?|ppm|ppb|mg\/[lLkg]|%|pH|°[CF])\s*$/i);
        if (unitMatch) {
          resultValue = unitMatch[1].trim();
          unit = unitMatch[2];
        }

        if (resultValue) {
          parsedResults.push({
            test_names: mappedNames,
            actual_value: resultValue,
            unit: unit,
            raw_line: line,
          });
        }
      }
    }
  }

  return {
    sampleId,
    productName,
    results: parsedResults,
    rawText: text,
  };
}

// ── Test Profile Templates ──────────────────────────────────────────────────

const ROUTINE_TESTS = [
  { test_type: 'chemical', test_name: 'pH Level', target_value: '4.2-4.6', unit: 'pH', test_category: 'routine', target_min: '4.2', target_max: '4.6' },
  { test_type: 'chemical', test_name: 'Brix / Sugar Content', target_value: '', unit: 'Brix', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Storage Temperature', target_value: '2-4', unit: '°C', test_category: 'routine', target_min: '2', target_max: '4' },
  { test_type: 'physical', test_name: 'Viscosity', target_value: '', unit: 'cP', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Weight Check', target_value: '', unit: 'g', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Seal Integrity', target_value: 'Pass', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'sensory', test_name: 'Organoleptic (Taste/Smell/Appearance)', target_value: 'Acceptable', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'packaging', test_name: 'Label Verification', target_value: 'Correct', unit: '', test_category: 'label', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Allergen Verification', target_value: 'Confirmed', unit: '', test_category: 'routine', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Foreign Material Check', target_value: 'None detected', unit: '', test_category: 'physical', target_min: '', target_max: '' },
];

const CFIA_MICRO_TESTS = [
  { test_type: 'micro', test_name: 'Coliform', target_value: '<10 CFU/g', unit: 'CFU/g', test_category: 'cfia', target_min: '', target_max: '10' },
  { test_type: 'micro', test_name: 'E. coli', target_value: 'Absent', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Salmonella', target_value: 'Absent/25g', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Listeria monocytogenes', target_value: 'Absent/25g', unit: '', test_category: 'cfia', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Staphylococcus aureus', target_value: '<100 CFU/g', unit: 'CFU/g', test_category: 'cfia', target_min: '', target_max: '100' },
  { test_type: 'micro', test_name: 'Yeast', target_value: '<500 CFU/g', unit: 'CFU/g', test_category: 'micro', target_min: '', target_max: '500' },
  { test_type: 'micro', test_name: 'Mold', target_value: '<500 CFU/g', unit: 'CFU/g', test_category: 'micro', target_min: '', target_max: '500' },
];

const FDA_TESTS = [
  { test_type: 'micro', test_name: 'Standard Plate Count (SPC)', target_value: 'Within spec', unit: 'CFU/g', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'micro', test_name: 'Coliform / E. coli', target_value: '<10 CFU/g', unit: 'CFU/g', test_category: 'fda', target_min: '', target_max: '10' },
  { test_type: 'micro', test_name: 'Pathogen Screening (Salmonella, Listeria)', target_value: 'Negative', unit: '', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'safety', test_name: 'Allergen Verification (coconut = tree nut)', target_value: 'Confirmed', unit: '', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'physical', test_name: 'Net Weight Verification', target_value: 'Within spec', unit: 'g', test_category: 'fda', target_min: '', target_max: '' },
  { test_type: 'packaging', test_name: 'Label Compliance (21 CFR)', target_value: 'Compliant', unit: '', test_category: 'label', target_min: '', target_max: '' },
];

const TEST_PROFILES = {
  routine: { label: 'Routine QC', tests: ROUTINE_TESTS },
  cfia_micro: { label: 'CFIA Microbiological', tests: CFIA_MICRO_TESTS },
  fda: { label: 'FDA Panel', tests: FDA_TESTS },
  full_panel: { label: 'Full Panel (All)', tests: [...ROUTINE_TESTS, ...CFIA_MICRO_TESTS, ...FDA_TESTS] },
};

// ── Routes ──────────────────────────────────────────────────────────────────

const router = Router();

// GET /api/batch-tests - list all batch tests
router.get('/batch-tests', requireAuth, async (req, res) => {
  try {
    const { status, search, from, to, limit = 50 } = req.query;
    let query = 'SELECT * FROM batch_tests WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (batch_number LIKE ? OR product_sku LIKE ? OR product_name LIKE ? OR tested_by LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (from) {
      query += ' AND test_date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND test_date <= ?';
      params.push(to);
    }

    query += ' ORDER BY test_date DESC, created_at DESC LIMIT ?';
    params.push(Number(limit));

    const tests = await db.all(query, params);
    res.json(tests);
  } catch (err) {
    console.error('Get batch tests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/batch-tests/templates - get test profile templates
router.get('/batch-tests/templates', requireAuth, (req, res) => {
  res.json({
    profiles: Object.entries(TEST_PROFILES).map(([key, val]) => ({ key, label: val.label, test_count: val.tests.length })),
    tests: TEST_PROFILES,
  });
});

// GET /api/batch-tests/by-lot/:lot - find batch tests by lot/batch number
router.get('/batch-tests/by-lot/:lot', requireAuth, async (req, res) => {
  try {
    const tests = await db.all('SELECT * FROM batch_tests WHERE batch_number = ? ORDER BY test_date DESC', [req.params.lot]);
    const enriched = [];
    for (const t of tests) {
      const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY id', [t.id]);
      enriched.push({ ...t, results });
    }
    res.json(enriched);
  } catch (err) {
    console.error('Get batch tests by lot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/batch-tests/:id - get single batch test with results
// POST /api/batch-tests/parse-coa-multi - Parse a multi-lot COA PDF
// Splits by lot, extracts per-lot pages, auto-fills results, attaches per-lot PDFs
router.post('/batch-tests/parse-coa-multi', requireAuth, requireWriteAccess, coaUpload.single('coa'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const tmpDir = join(__dirname, '..', '..', 'uploads', 'ocr-multi-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });

    // Step 1: Split PDF into individual pages
    execSync(`pdfseparate "${req.file.path}" "${join(tmpDir, 'page-%d.pdf')}"`, { timeout: 60000 });
    const pageFiles = readdirSync(tmpDir).filter(f => f.startsWith('page-') && f.endsWith('.pdf')).sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

    // Step 2: OCR each page and detect lot numbers
    const pages = [];
    for (const pf of pageFiles) {
      const pageNum = parseInt(pf.match(/\d+/)[0]);
      const pagePdfPath = join(tmpDir, pf);
      const pageImgBase = join(tmpDir, 'img-' + pageNum);

      // Convert to image
      execSync(`pdftoppm -png -r 300 -f 1 -l 1 "${pagePdfPath}" "${pageImgBase}"`, { timeout: 30000 });
      const imgFile = readdirSync(tmpDir).find(f => f.startsWith('img-' + pageNum) && f.endsWith('.png'));
      if (!imgFile) continue;

      // OCR
      const ocrBase = join(tmpDir, 'ocr-' + pageNum);
      execSync(`cd "${tmpDir}" && tesseract "${imgFile}" "ocr-${pageNum}" 2>/dev/null`, { timeout: 30000 });
      let ocrText = '';
      try { ocrText = readFileSync(ocrBase + '.txt', 'utf8'); } catch(e) {}

      // Detect lot number
      const lotMatch = ocrText.match(/Lot:\s*0*(\d{4,})/i);
      const sampleMatch = ocrText.match(/Sample\s*Name:\s*(.+?)(?:\s*Lot:|$)/im);
      const lotNumber = lotMatch ? lotMatch[1] : null;
      const productName = sampleMatch ? sampleMatch[1].trim() : '';

      pages.push({
        pageNum,
        pdfPath: pagePdfPath,
        lotNumber,
        productName,
        ocrText,
      });
    }

    // Step 3: Group pages by lot
    const lotGroups = {};
    let currentLot = null;
    for (const page of pages) {
      if (page.lotNumber) {
        currentLot = page.lotNumber;
      }
      if (currentLot) {
        if (!lotGroups[currentLot]) {
          lotGroups[currentLot] = { lotNumber: currentLot, productName: page.productName || '', pages: [], ocrText: '' };
        }
        lotGroups[currentLot].pages.push(page.pdfPath);
        lotGroups[currentLot].ocrText += page.ocrText + '\n';
        if (page.productName && !lotGroups[currentLot].productName) {
          lotGroups[currentLot].productName = page.productName;
        }
      }
    }

    // Step 4: For each lot, merge pages into a per-lot PDF, parse results, match to DB
    const uploadsDir = join(__dirname, '..', '..', 'uploads', 'batch-testing');
    const results = [];

    for (const [lotNum, group] of Object.entries(lotGroups)) {
      // Merge pages into per-lot PDF
      const lotPdfName = `COA-Lot-${lotNum}_${Date.now()}.pdf`;
      const lotPdfPath = join(uploadsDir, lotPdfName);

      if (group.pages.length === 1) {
        // Just copy the single page
        const { copyFileSync } = await import('fs');
        copyFileSync(group.pages[0], lotPdfPath);
      } else {
        execSync(`pdfunite ${group.pages.map(p => '"' + p + '"').join(' ')} "${lotPdfPath}"`, { timeout: 30000 });
      }

      // Also create a PNG screenshot of the first page for quick preview
      const pngName = `COA-Lot-${lotNum}_${Date.now()}.png`;
      const pngPath = join(uploadsDir, pngName);
      execSync(`pdftoppm -png -r 200 -f 1 -l 1 "${lotPdfPath}" "${join(tmpDir, 'preview-' + lotNum)}"`, { timeout: 15000 });
      const previewImg = readdirSync(tmpDir).find(f => f.startsWith('preview-' + lotNum) && f.endsWith('.png'));
      if (previewImg) {
        const { copyFileSync } = await import('fs');
        copyFileSync(join(tmpDir, previewImg), pngPath);
      }

      // Parse test results from OCR text
      const parsed = parseCOAPdf(group.ocrText);

      // Find matching batch test in DB
      const batchTest = await db.get('SELECT * FROM batch_tests WHERE batch_number = ?', [lotNum]);

      let matched = [];
      let attachment = null;

      if (batchTest) {
        // Match parsed results to existing test results
        const existingResults = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY id', [batchTest.id]);

        for (const pr of parsed.results) {
          for (const er of existingResults) {
            const nameMatch = pr.test_names.some(tn =>
              er.test_name.toLowerCase().includes(tn.toLowerCase()) ||
              tn.toLowerCase().includes(er.test_name.toLowerCase())
            );
            if (nameMatch && !matched.some(m => m.result_id === er.id)) {
              matched.push({
                result_id: er.id,
                test_name: er.test_name,
                parsed_value: pr.actual_value,
                parsed_unit: pr.unit || er.unit,
              });
            }
          }
        }

        // Attach per-lot PDF to batch test
        attachment = {
          name: `COA - Lot ${lotNum} (extracted from ${req.file.originalname})`,
          path: `/uploads/batch-testing/${lotPdfName}`,
          size: readFileSync(lotPdfPath).length,
          uploaded_at: new Date().toISOString(),
          preview: previewImg ? `/uploads/batch-testing/${pngName}` : null,
        };

        let existingAttachments = [];
        try { existingAttachments = JSON.parse(batchTest.attachments || '[]'); } catch(e) {}
        existingAttachments.push(attachment);

        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        await db.run('UPDATE batch_tests SET attachments = ?, updated_by = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(existingAttachments), req.session.user.username, now, batchTest.id]);

        logAudit(req, 'parse', 'batch_test_coa_multi', batchTest.id, lotNum, {
          new_values: { filename: lotPdfName, matches: matched.length, source: req.file.originalname }
        });
      }

      results.push({
        lotNumber: lotNum,
        productName: group.productName,
        pageCount: group.pages.length,
        batchTestId: batchTest?.id || null,
        batchTestFound: !!batchTest,
        totalParsed: parsed.results.length,
        matched,
        attachment,
      });
    }

    // Cleanup temp files
    rmSync(tmpDir, { recursive: true, force: true });

    res.json({
      sourceFile: req.file.originalname,
      totalPages: pageFiles.length,
      lotsFound: Object.keys(lotGroups).length,
      results,
    });
  } catch (err) {
    console.error('Multi-lot COA parse error:', err);
    res.status(500).json({ error: 'Failed to process multi-lot COA: ' + err.message });
  }
});


router.get('/batch-tests/:id', requireAuth, async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY id', [req.params.id]);
    res.json({ ...test, results });
  } catch (err) {
    console.error('Get batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/batch-tests/:id/coa - Certificate of Analysis
router.get('/batch-tests/:id/coa', requireAuth, async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY test_category, test_type, id', [req.params.id]);

    const grouped = {};
    for (const r of results) {
      const cat = r.test_category || 'routine';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }

    const categorySummary = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const hasFail = items.some(r => r.pass_fail === 'fail');
      const allDone = items.every(r => r.pass_fail !== 'pending');
      categorySummary[cat] = hasFail ? 'fail' : (allDone ? 'pass' : 'pending');
    }

    res.json({
      batch: test,
      results,
      grouped,
      categorySummary,
      overallStatus: test.status,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Get CoA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/batch-tests - create batch test with results
router.post('/batch-tests', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { batch_number, product_sku, product_name, test_date, tested_by, notes, results, test_profile, lab_name, lab_report_number, sample_date, report_date } = req.body;
    if (!batch_number || !test_date) {
      return res.status(400).json({ error: 'Batch number and test date are required' });
    }

    const profile = test_profile || 'routine';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    const info = await db.run(`
      INSERT INTO batch_tests (batch_number, product_sku, product_name, test_date, tested_by, status, notes, test_profile, lab_name, lab_report_number, sample_date, report_date, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batch_number, product_sku || '', product_name || '', test_date,
      tested_by || username, notes || '', profile, lab_name || '',
      lab_report_number || '', sample_date || '', report_date || '',
      username, username, now, now
    ]);
    const batchId = info.lastInsertRowid;

    const testResults = results && results.length > 0 ? results : (TEST_PROFILES[profile]?.tests || ROUTINE_TESTS);
    for (const r of testResults) {
      await db.run(`
        INSERT INTO batch_test_results (batch_test_id, test_type, test_name, target_value, actual_value, unit, pass_fail, notes, test_category, target_min, target_max, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchId, r.test_type, r.test_name, r.target_value || '', r.actual_value || '',
        r.unit || '', r.pass_fail || 'pending', r.notes || '',
        r.test_category || 'routine', r.target_min || '', r.target_max || '',
        r.comments || ''
      ]);
    }

    const created = await db.get('SELECT * FROM batch_tests WHERE id = ?', [batchId]);
    const createdResults = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [batchId]);

    logAudit(req, 'create', 'batch_test', batchId, batch_number, { new_values: { batch_number, product_sku, test_date, test_profile: profile } });

    res.json({ ...created, results: createdResults });
  } catch (err) {
    console.error('Create batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/batch-tests/:id - update batch test
router.put('/batch-tests/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { batch_number, product_sku, product_name, test_date, tested_by, status, notes, comments, lab_name, lab_report_number, sample_date, report_date } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run(`
      UPDATE batch_tests SET batch_number = ?, product_sku = ?, product_name = ?, test_date = ?, tested_by = ?, status = ?, notes = ?, comments = ?,
        lab_name = ?, lab_report_number = ?, sample_date = ?, report_date = ?, updated_by = ?, updated_at = ?
      WHERE id = ?
    `, [
      batch_number || existing.batch_number, product_sku ?? existing.product_sku, product_name ?? existing.product_name,
      test_date || existing.test_date, tested_by || existing.tested_by, status || existing.status, notes ?? existing.notes,
      comments ?? existing.comments,
      lab_name ?? existing.lab_name, lab_report_number ?? existing.lab_report_number,
      sample_date ?? existing.sample_date, report_date ?? existing.report_date,
      username, now, req.params.id
    ]);

    logAudit(req, 'update', 'batch_test', req.params.id, batch_number || existing.batch_number, { old_values: existing, new_values: req.body });

    const updated = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    res.json({ ...updated, results });
  } catch (err) {
    console.error('Update batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/batch-tests/:id/results - update test results (with comments)
router.put('/batch-tests/:id/results', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { results } = req.body;
    if (!Array.isArray(results)) return res.status(400).json({ error: 'Results array required' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    for (const r of results) {
      if (r.id) {
        await db.run(`
          UPDATE batch_test_results SET actual_value = ?, pass_fail = ?, notes = ?, comments = ?, target_value = ? WHERE id = ? AND batch_test_id = ?
        `, [r.actual_value || '', r.pass_fail || 'pending', r.notes || '', r.comments || '', r.target_value || '', r.id, req.params.id]);
      }
    }

    // Auto-calculate overall status
    const allResults = await db.all('SELECT pass_fail FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    const hasFail = allResults.some(r => r.pass_fail === 'fail');
    const allDone = allResults.every(r => r.pass_fail !== 'pending');
    const currentStatus = existing.status;
    const newStatus = currentStatus === 'to_be_shipped' ? 'to_be_shipped' : (hasFail ? 'fail' : (allDone ? 'pass' : 'pending'));

    await db.run('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [newStatus, username, now, req.params.id]);

    logAudit(req, 'update', 'batch_test_results', req.params.id, existing.batch_number, { new_values: { results_count: results.length } });

    const updated = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    const updatedResults = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    res.json({ ...updated, results: updatedResults });
  } catch (err) {
    console.error('Update batch test results error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/batch-tests/:id/results - add a custom test result
router.post('/batch-tests/:id/results', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const { test_type, test_name, target_value, actual_value, unit, pass_fail, notes, test_category } = req.body;
    if (!test_name) return res.status(400).json({ error: 'Test name is required' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    const info = await db.run(`
      INSERT INTO batch_test_results (batch_test_id, test_type, test_name, target_value, actual_value, unit, pass_fail, notes, test_category, target_min, target_max, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '')
    `, [
      req.params.id,
      test_type || 'other',
      test_name,
      target_value || '',
      actual_value || '',
      unit || '',
      pass_fail || 'pending',
      notes || '',
      test_category || 'custom'
    ]);

    await db.run('UPDATE batch_tests SET updated_by = ?, updated_at = ? WHERE id = ?', [username, now, req.params.id]);

    logAudit(req, 'create', 'batch_test_result', req.params.id, test.batch_number, { new_values: { test_name, test_type } });

    const created = await db.get('SELECT * FROM batch_test_results WHERE id = ?', [info.lastInsertRowid]);
    res.json(created);
  } catch (err) {
    console.error('Add custom test result error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/batch-tests/:id/results/:resultId - delete individual test result

// PATCH /api/batch-tests/:id/status - admin-only status override
router.patch('/batch-tests/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { status } = req.body;
    const validStatuses = ['pending', 'pass', 'fail', 'to_be_shipped'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [status, username, now, req.params.id]);

    logAudit(req, 'status_override', 'batch_test', req.params.id, existing.batch_number, {
      old_status: existing.status,
      new_status: status,
      overridden_by: username
    });

    const updated = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    res.json({ ...updated, results });
  } catch (err) {
    console.error('Status override error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/batch-tests/:id/results/:resultId', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    const result = await db.get('SELECT * FROM batch_test_results WHERE id = ? AND batch_test_id = ?', [req.params.resultId, req.params.id]);
    if (!result) return res.status(404).json({ error: 'Test result not found' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run('DELETE FROM batch_test_results WHERE id = ? AND batch_test_id = ?', [req.params.resultId, req.params.id]);

    // Recalculate overall status
    const remaining = await db.all('SELECT pass_fail FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    if (remaining.length > 0) {
      const hasFail = remaining.some(r => r.pass_fail === 'fail');
      const allDone = remaining.every(r => r.pass_fail !== 'pending');
      const currentStatus = existing.status;      const newStatus = currentStatus === 'to_be_shipped' ? 'to_be_shipped' : (hasFail ? 'fail' : (allDone ? 'pass' : 'pending'));
      await db.run('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [newStatus, username, now, req.params.id]);
    }

    logAudit(req, 'delete', 'batch_test_result', req.params.id, test.batch_number, { old_values: { result_id: result.id, test_name: result.test_name } });

    res.json({ success: true, deleted: result });
  } catch (err) {
    console.error('Delete test result error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/batch-tests/:id/upload-coa - Upload COA PDF and attach to batch test
router.post('/batch-tests/:id/upload-coa', requireAuth, requireWriteAccess, coaUpload.single('coa'), async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Build attachment record
    const attachment = {
      name: req.file.originalname,
      path: `/uploads/batch-testing/${req.file.filename}`,
      size: req.file.size,
      uploaded_at: new Date().toISOString(),
    };

    // Append to existing attachments
    let existing = [];
    try { existing = JSON.parse(test.attachments || '[]'); } catch(e) {}
    existing.push(attachment);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.run('UPDATE batch_tests SET attachments = ?, updated_by = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(existing), req.session.user.username, now, req.params.id]);

    logAudit(req, 'upload', 'batch_test_coa', req.params.id, test.batch_number, { new_values: { filename: req.file.originalname } });

    res.json({ attachment, attachments: existing });
  } catch (err) {
    console.error('Upload COA error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/batch-tests/:id/parse-coa - Parse an uploaded COA PDF and return autofill data
router.post('/batch-tests/:id/parse-coa', requireAuth, requireWriteAccess, coaUpload.single('coa'), async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Parse the PDF
    let pdfText = '';
    try {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdfBuffer = readFileSync(req.file.path);
      const uint8 = new Uint8Array(pdfBuffer);
      const doc = await getDocument({ data: uint8 }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pdfText += content.items.map(item => item.str).join(' ') + '\n';
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read PDF: ' + e.message });
    }
    // If no text extracted (scanned PDF), try OCR with tesseract
    if (!pdfText || pdfText.trim().length < 20) {
      try {
        const ocrDir = join(__dirname, '..', '..', 'uploads', 'ocr-tmp-' + Date.now());
        mkdirSync(ocrDir, { recursive: true });

        execSync(`pdftoppm -png -r 300 "${req.file.path}" "${join(ocrDir, 'page')}"`, { timeout: 60000 });

        const pageFiles = readdirSync(ocrDir).filter(f => f.endsWith('.png')).sort();
        pdfText = '';
        for (const pageFile of pageFiles) {
          const pagePath = join(ocrDir, pageFile);
          const ocrOut = join(ocrDir, pageFile.replace('.png', ''));
          execSync(`tesseract "${pagePath}" "${ocrOut}" 2>/dev/null`, { timeout: 30000 });
          const ocrText = readFileSync(ocrOut + '.txt', 'utf8');
          pdfText += ocrText + '\n';
        }

        rmSync(ocrDir, { recursive: true, force: true });
      } catch (ocrErr) {
        console.error('OCR fallback failed:', ocrErr.message);
      }
    }

    if (!pdfText || pdfText.trim().length < 20) {
      const attachment = {
        name: req.file.originalname,
        path: `/uploads/batch-testing/${req.file.filename}`,
        size: req.file.size,
        uploaded_at: new Date().toISOString(),
      };
      let existingAttachments = [];
      try { existingAttachments = JSON.parse(test.attachments || '[]'); } catch(e) {}
      if (!existingAttachments.some(a => a.name === attachment.name)) {
        existingAttachments.push(attachment);
      }
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      await db.run('UPDATE batch_tests SET attachments = ?, updated_by = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(existingAttachments), req.session.user.username, now, req.params.id]);

      return res.json({
        sampleId: '',
        productName: '',
        matched: [],
        totalParsed: 0,
        attachment,
        attachments: existingAttachments,
        warning: 'Could not extract text from this PDF even with OCR. You can still manually enter the values.',
      });
    }
    const parsed = parseCOAPdf(pdfText);

    const attachment = {
      name: req.file.originalname,
      path: `/uploads/batch-testing/${req.file.filename}`,
      size: req.file.size,
      uploaded_at: new Date().toISOString(),
    };

    let existingAttachments = [];
    try { existingAttachments = JSON.parse(test.attachments || '[]'); } catch(e) {}
    if (!existingAttachments.some(a => a.name === attachment.name)) {
      existingAttachments.push(attachment);
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.run('UPDATE batch_tests SET attachments = ?, updated_by = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(existingAttachments), req.session.user.username, now, req.params.id]);

    const existingResults = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ? ORDER BY id', [req.params.id]);

    const matched = [];
    for (const pr of parsed.results) {
      for (const er of existingResults) {
        const nameMatch = pr.test_names.some(tn =>
          er.test_name.toLowerCase().includes(tn.toLowerCase()) ||
          tn.toLowerCase().includes(er.test_name.toLowerCase())
        );
        if (nameMatch) {
          matched.push({
            result_id: er.id,
            test_name: er.test_name,
            parsed_value: pr.actual_value,
            parsed_unit: pr.unit || er.unit,
          });
        }
      }
    }

    const seen = new Set();
    const dedupMatched = [];
    for (const m of matched) {
      if (!seen.has(m.result_id)) {
        seen.add(m.result_id);
        dedupMatched.push(m);
      }
    }

    logAudit(req, 'parse', 'batch_test_coa', req.params.id, test.batch_number, { new_values: { filename: req.file.originalname, matches: dedupMatched.length } });

    res.json({
      sampleId: parsed.sampleId,
      productName: parsed.productName,
      matched: dedupMatched,
      totalParsed: parsed.results.length,
      attachment,
      attachments: existingAttachments,
    });
  } catch (err) {
    console.error('Parse COA error:', err);
    res.status(500).json({ error: 'Failed to parse COA: ' + err.message });
  }
});


// DELETE /api/batch-tests/:id/attachments/:index - Remove an attachment from batch test

// PATCH /api/batch-tests/:id/status - admin-only status override
router.patch('/batch-tests/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { status } = req.body;
    const validStatuses = ['pending', 'pass', 'fail', 'to_be_shipped'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [status, username, now, req.params.id]);

    logAudit(req, 'status_override', 'batch_test', req.params.id, existing.batch_number, {
      old_status: existing.status,
      new_status: status,
      overridden_by: username
    });

    const updated = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    res.json({ ...updated, results });
  } catch (err) {
    console.error('Status override error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/batch-tests/:id/attachments/:index', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const test = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!test) return res.status(404).json({ error: 'Batch test not found' });

    let attachments = [];
    try { attachments = JSON.parse(test.attachments || '[]'); } catch(e) {}

    const idx = parseInt(req.params.index, 10);
    if (idx < 0 || idx >= attachments.length) {
      return res.status(400).json({ error: 'Invalid attachment index' });
    }

    const removed = attachments.splice(idx, 1)[0];

    if (removed.path) {
      const filePath2 = join(__dirname, '..', '..', removed.path);
      try { unlinkSync(filePath2); } catch(e) { /* file may not exist */ }
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.run('UPDATE batch_tests SET attachments = ?, updated_by = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(attachments), req.session.user.username, now, req.params.id]);

    logAudit(req, 'delete', 'batch_test_attachment', req.params.id, test.batch_number, { old_values: { filename: removed.name } });

    res.json({ success: true, attachments });
  } catch (err) {
    console.error('Delete attachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/batch-tests/:id

// PATCH /api/batch-tests/:id/status - admin-only status override
router.patch('/batch-tests/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    const { status } = req.body;
    const validStatuses = ['pending', 'pass', 'fail', 'to_be_shipped'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.run('UPDATE batch_tests SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [status, username, now, req.params.id]);

    logAudit(req, 'status_override', 'batch_test', req.params.id, existing.batch_number, {
      old_status: existing.status,
      new_status: status,
      overridden_by: username
    });

    const updated = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    const results = await db.all('SELECT * FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    res.json({ ...updated, results });
  } catch (err) {
    console.error('Status override error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/batch-tests/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM batch_tests WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Batch test not found' });

    await db.run('DELETE FROM batch_test_results WHERE batch_test_id = ?', [req.params.id]);
    await db.run('DELETE FROM batch_tests WHERE id = ?', [req.params.id]);

    logAudit(req, 'delete', 'batch_test', req.params.id, existing.batch_number, { old_values: existing });

    res.json({ message: 'Batch test deleted' });
  } catch (err) {
    console.error('Delete batch test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
