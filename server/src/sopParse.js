import mammoth from 'mammoth';
import { readSOPContentFromBuffer } from './sopContentReader.js';

/**
 * Tier A SOP parse — deterministic .docx → form pre-fill.
 *
 * Maps the controlled KKI SOP Word template (cover heading + 2-column header
 * table + numbered body sections) onto the `sops` columns. Every field is
 * returned tagged with { value, source, confidence } so the UI can show the
 * human which values came from a fixed header cell (high confidence) versus a
 * body section or were absent entirely (needs-review).
 *
 * Grounded against real masters KK-SOP-01400 and KK-SOP-00800 (2026-06-23):
 *   Cover heading:  "Kefir Kultures Inc. {TITLE} {DOC_NUMBER}"
 *   Header table:   Document Number | Version | Effective Date | Review Date |
 *                   Prepared By | Approved By | Classification
 *   No Reviewer cell and no Category exist in the template — both are emitted
 *   empty/needs-review for the human to supply.
 *
 * Tier B (LLM prose) is intentionally out of scope here.
 */

const COMPANY_PREFIX = /kefir\s*kultures\s*inc\.?/i;
const DOC_NUMBER_RE = /\bKK-[A-Z]{2,4}-\d{3,6}\b/i;

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function high(value, source) {
  return { value: value ?? '', source, confidence: 'high' };
}
function review(value, source) {
  return { value: value ?? '', source, confidence: 'needs-review' };
}

/** Strip tags + decode the handful of entities mammoth emits. */
function cellText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const normLabel = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Parse the first 2-column key/value table into { normalizedLabel: value }. */
function extractHeaderTable(html) {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return {};
  const out = {};
  const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(cellText);
    if (cells.length >= 2 && cells[0]) {
      const key = normLabel(cells[0]);
      if (key && !(key in out)) out[key] = cells[1];
    }
  }
  return out;
}

/** Title = cover-heading text minus the company name and the doc number. */
function extractTitle(html, sopNumber) {
  const beforeTable = html.split(/<table/i)[0] || '';
  let text = cellText(beforeTable);
  text = text.replace(COMPANY_PREFIX, ' ');
  if (sopNumber) text = text.split(sopNumber).join(' ');
  text = text.replace(DOC_NUMBER_RE, ' ').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 3) return null;
  return toTitleCase(text);
}

function toTitleCase(s) {
  const small = new Set(['and', 'or', 'of', 'the', 'for', 'to', 'a', 'an', 'in', 'on']);
  return s.toLowerCase().split(/\s+/).map((w, i) => {
    if (w === '&') return '&';
    if (i > 0 && small.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

/** Is this header value an unfilled template placeholder like "[DDMMMYYYY]"? */
function isPlaceholder(v) {
  if (!v) return true;
  const t = v.trim();
  return t.startsWith('[') || /^DDMMM?YYYY$/i.test(t) || /^x+$/i.test(t) || /^tbd$/i.test(t) || /^n\/?a$/i.test(t);
}

/**
 * Normalize a KKI date string to ISO YYYY-MM-DD. Handles DDMMMYYYY ("08MAR2026")
 * with optional separators. Returns null for placeholders / unrecognized input.
 */
function normalizeDate(raw) {
  if (isPlaceholder(raw)) return null;
  const t = raw.trim();
  const m = t.match(/^(\d{1,2})[\s-]*([A-Za-z]{3})[A-Za-z]*[\s-]*(\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${day}`;
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return t;
  return null;
}

/** Pull the document number from the filename as a fallback (KK-SOP-01400_...). */
function docNumberFromFilename(filename) {
  const m = String(filename || '').match(DOC_NUMBER_RE);
  return m ? m[0].toUpperCase() : null;
}

/**
 * Parse a .docx buffer into tagged Tier A fields.
 * @returns {Promise<{ ok: boolean, error?: string, fields?: object, warnings?: string[], raw_sections?: object }>}
 */
export async function parseSOPDocx(buffer, filename) {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: 'Empty file buffer' };
  }

  let html;
  try {
    ({ value: html } = await mammoth.convertToHtml({ buffer }));
  } catch (err) {
    return { ok: false, error: `Could not read .docx: ${err.message}` };
  }
  if (!html || html.trim().length < 50) {
    return { ok: false, error: 'Document appears to be empty' };
  }

  const header = extractHeaderTable(html);
  const warnings = [];

  // --- Header-cell fields (high confidence) ---
  const sopNumber = (header.documentnumber || '').trim() || docNumberFromFilename(filename);
  const sopNumberField = header.documentnumber
    ? high(sopNumber, 'header-cell')
    : (sopNumber ? review(sopNumber, 'filename') : review('', 'absent'));

  const title = extractTitle(html, sopNumber);
  const titleField = title ? high(title, 'cover-heading') : review('', 'absent');

  const version = (header.version || '').trim().replace(/^v/i, '');
  const versionField = version ? high(version, 'header-cell') : review('', 'absent');

  const effRaw = header.effectivedate;
  const effDate = normalizeDate(effRaw || '');
  const effField = effDate
    ? high(effDate, 'header-cell')
    : review('', isPlaceholder(effRaw) ? 'placeholder' : 'absent');

  const revRaw = header.reviewdate;
  const revDate = normalizeDate(revRaw || '');
  const nextReviewField = revDate
    ? high(revDate, 'header-cell')
    : review('', isPlaceholder(revRaw) ? 'placeholder' : 'absent');

  const owner = (header.preparedby || '').trim();
  const ownerField = owner ? high(owner, 'header-cell') : review('', 'absent');

  const approver = (header.approvedby || '').trim();
  const approverField = approver ? high(approver, 'header-cell') : review('', 'absent');

  // Reviewer is NOT in the controlled KKI template — always human-supplied.
  const reviewerField = review('', 'absent');

  // Category is not encoded in the document — human must pick the controlled value.
  const categoryField = review('', 'absent');

  // --- Body-section fields (deterministic, heading-based, but prose → needs-review) ---
  let scope = '', responsibilities = '', sopReferences = '', rawSections = {};
  try {
    const res = await readSOPContentFromBuffer(buffer, filename);
    if (res.success) {
      const d = res.data;
      scope = d.scope || '';
      responsibilities = d.responsibilities || '';
      sopReferences = d.references || '';
      rawSections = {
        purpose: d.purpose || '',
        scope: d.scope || '',
        procedure: d.procedure || '',
        responsibilities: d.responsibilities || '',
        references: d.references || '',
      };
      for (const w of d.warnings || []) warnings.push(w);
    } else {
      warnings.push(`Body section extraction failed: ${res.error}`);
    }
  } catch (err) {
    warnings.push(`Body section extraction error: ${err.message}`);
  }

  const scopeField = scope ? review(scope, 'section') : review('', 'absent');
  const responsibilitiesField = responsibilities ? review(responsibilities, 'section') : review('', 'absent');
  const sopReferencesField = sopReferences ? review(sopReferences, 'section') : review('', 'absent');

  if (!header.documentnumber) warnings.push('No "Document Number" header cell found — used filename / left for review');
  if (!title) warnings.push('Could not derive title from cover heading');
  if (isPlaceholder(effRaw)) warnings.push('Effective Date is an unfilled placeholder');
  if (isPlaceholder(revRaw)) warnings.push('Review Date is an unfilled placeholder');

  const fields = {
    sop_number: sopNumberField,
    title: titleField,
    category_name: categoryField,
    version: versionField,
    owner: ownerField,
    reviewer: reviewerField,
    approver: approverField,
    effective_date: effField,
    next_review_date: nextReviewField,
    scope: scopeField,
    responsibilities: responsibilitiesField,
    sop_references: sopReferencesField,
  };

  return { ok: true, fields, warnings, raw_sections: rawSections };
}
