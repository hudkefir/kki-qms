import mammoth from 'mammoth';
import { readFileSync, existsSync } from 'fs';

/**
 * SOP Content Extractor — HTML-based approach (v2: format-preserving).
 *
 * Uses mammoth's HTML output to reliably identify headings via:
 *   1. Real heading tags: <h1>, <h2>, etc.
 *   2. Bold paragraph headings: <p><strong>N  Title</strong></p>
 *
 * TOC entries are plain <p> tags (not bold, not <hN>), so they're
 * naturally excluded.
 *
 * v2 changes (Apr 20, 2026):
 * - Replaced summarize() with formatText() — preserves numbered steps, tables, line breaks
 * - Improved htmlToText() — tables rendered as structured text, lists preserved
 * - Removed 1000-char truncation on preview updates
 * - Increased raw_text cap to 50000
 */

const HEADING_TO_FIELD = {
  'purpose': 'purpose',
  'objective': 'purpose',
  'scope': 'scope',
  'applicability': 'scope',
  'procedure': 'procedure',
  'procedures': 'procedure',
  'method': 'procedure',
  'responsibilities': 'responsibilities',
  'roles and responsibilities': 'responsibilities',
  'materials and equipment': 'materials_equipment',
  'materials & equipment': 'materials_equipment',
  'materials': 'materials_equipment',
  'equipment': 'materials_equipment',
  'references': 'references',
  'regulatory references': 'references',
  'related documents': 'references',
};

const FIELD_KEYWORDS = {
  'purpose': ['purpose', 'objective'],
  'scope': ['scope', 'applicability'],
  'procedure': ['procedure'],
  'responsibilities': ['responsibilities'],
  'materials_equipment': ['materials', 'equipment'],
  'references': ['references'],
};

const VERSION_PATTERNS = [
  /version\s*:?\s*([v]?\d+(?:\.\d+)*)/i,
  /v(\d+(?:\.\d+)+)/i,
  /rev(?:ision)?\s*:?\s*([v]?\d+(?:\.\d+)*)/i,
  /_v(\d+(?:[._]\d+)+)/i,
];

/**
 * Parse HTML into sections by splitting on heading elements.
 * Returns [{ number, title, html, isTopLevel }]
 */
function parseHtmlSections(html) {
  const headingRe = /(?:<h([1-6])[^>]*>(.*?)<\/h\1>|<p><strong>(\d+(?:\.\d+)*\s{1,4}[A-Z].*?)<\/strong><\/p>)/g;

  const headings = [];
  let match;
  while ((match = headingRe.exec(html)) !== null) {
    const raw = match[2] || match[3];
    const clean = raw.replace(/<[^>]+>/g, '').trim();

    const numMatch = clean.match(/^(\d+(?:\.\d+)*)\s{1,4}(.+)$/);
    if (numMatch) {
      headings.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        number: numMatch[1],
        title: numMatch[2].trim(),
        isTopLevel: !numMatch[1].includes('.'),
      });
    }
  }

  const sections = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!h.isTopLevel) continue;

    let endIdx = html.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].isTopLevel) {
        endIdx = headings[j].index;
        break;
      }
    }

    const bodyHtml = html.substring(h.endIndex, endIdx);
    sections.push({
      number: h.number,
      title: h.title,
      html: bodyHtml,
      text: htmlToText(bodyHtml),
    });
  }

  return sections;
}

/**
 * Convert an HTML table to readable structured text.
 * Renders as "Header1: Value1 | Header2: Value2" per row,
 * or as aligned columns if no headers detected.
 */
function tableToText(tableHtml) {
  const rows = [];
  const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
    for (const cellHtml of cellMatches) {
      const text = cellHtml
        .replace(/<t[dh][^>]*>/gi, '')
        .replace(/<\/t[dh]>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
      cells.push(text);
    }
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return '';

  // Check if first row looks like a header (contains typical header words)
  const headerWords = ['area', 'item', 'frequency', 'record', 'task', 'responsible', 'action', 'description', 'method', 'standard', 'parameter', 'limit', 'specification', 'requirement', 'who', 'what', 'when', 'how', 'where', 'step', 'role', 'document', 'reference', 'time', 'temp', 'temperature', 'concentration', 'agent'];
  const firstRow = rows[0].map(c => c.toLowerCase());
  const hasHeaders = firstRow.some(cell => headerWords.some(w => cell.includes(w))) || rows.length > 2;

  if (hasHeaders && rows.length > 1) {
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const lines = [];
    for (const row of dataRows) {
      const parts = [];
      for (let i = 0; i < row.length; i++) {
        if (row[i]) {
          const label = headers[i] || `Col${i + 1}`;
          parts.push(`${label}: ${row[i]}`);
        }
      }
      if (parts.length > 0) lines.push('  • ' + parts.join(' | '));
    }
    return (headers.length > 0 ? `[${headers.join(' | ')}]\n` : '') + lines.join('\n');
  }

  // No clear headers — render as simple rows
  return rows.map(r => '  ' + r.join(' | ')).join('\n');
}

/** Strip HTML tags, decode entities, preserve structure (v2: format-preserving) */
function htmlToText(html) {
  if (!html) return '';

  // Process tables first — extract them before stripping tags
  let processed = html;
  const tables = [];
  const tableRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let tableMatch;
  let tableIdx = 0;
  while ((tableMatch = tableRe.exec(html)) !== null) {
    const placeholder = `__TABLE_${tableIdx}__`;
    const tableText = tableToText(tableMatch[0]);
    tables.push({ placeholder, text: tableText });
    processed = processed.replace(tableMatch[0], `\n${placeholder}\n`);
    tableIdx++;
  }

  // Convert list items to bullets
  processed = processed.replace(/<li[^>]*>/gi, '\n• ');
  processed = processed.replace(/<\/li>/gi, '');

  // Preserve line breaks
  processed = processed.replace(/<br\s*\/?>/gi, '\n');
  processed = processed.replace(/<\/p>/gi, '\n');
  processed = processed.replace(/<\/div>/gi, '\n');
  processed = processed.replace(/<\/tr>/gi, '\n');
  processed = processed.replace(/<\/h[1-6]>/gi, '\n');

  // Bold text — keep as emphasis markers for sub-headings
  processed = processed.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  processed = processed.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');

  // Strip remaining tags
  processed = processed.replace(/<[^>]+>/g, '');

  // Decode entities
  processed = processed
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Restore tables
  for (const t of tables) {
    processed = processed.replace(t.placeholder, t.text);
  }

  // Clean up whitespace — preserve newlines but collapse multiple spaces
  processed = processed.replace(/[ \t]+/g, ' ');           // collapse horizontal whitespace
  processed = processed.replace(/ ?\n ?/g, '\n');           // trim spaces around newlines
  processed = processed.replace(/\n{4,}/g, '\n\n\n');       // max 3 consecutive newlines
  processed = processed.replace(/^\n+/, '');                 // trim leading newlines
  processed = processed.replace(/\n+$/, '');                 // trim trailing newlines

  return processed;
}

/** 
 * Format text for DB storage — preserves structure (v2).
 * Unlike the old summarize() which collapsed everything to one paragraph,
 * this keeps numbered steps, line breaks, and table formatting intact.
 */
function formatText(text) {
  if (!text) return '';
  // Light cleanup only — preserve all meaningful structure
  return text
    .replace(/\n{4,}/g, '\n\n')  // cap excessive blank lines
    .replace(/[ \t]+/g, ' ')     // collapse horizontal whitespace
    .replace(/^ +| +$/gm, '')    // trim each line
    .trim();
}

/** Find section body for a target field */
function findField(sections, fieldName) {
  // Exact match
  for (const s of sections) {
    const titleLower = s.title.toLowerCase().trim();
    if (HEADING_TO_FIELD[titleLower] === fieldName && s.text) {
      return formatText(s.text);
    }
  }
  // Keyword fallback
  const keywords = FIELD_KEYWORDS[fieldName] || [];
  for (const s of sections) {
    const titleLower = s.title.toLowerCase().trim();
    for (const kw of keywords) {
      if (titleLower.includes(kw) && s.text && s.title.length < 60) {
        return formatText(s.text);
      }
    }
  }
  return null;
}

/** Extract version from cover page table HTML */
function extractVersionFromHtml(html, filename) {
  const tableMatch = html.match(/Version<\/strong>.*?<\/td>\s*<td[^>]*>\s*<p>([^<]+)<\/p>/i);
  if (tableMatch) {
    const v = tableMatch[1].trim().replace(/^v/i, '');
    if (/^\d+(\.\d+)*$/.test(v)) return v;
  }

  const header = html.substring(0, 2000).replace(/<[^>]+>/g, ' ');
  for (const pattern of VERSION_PATTERNS) {
    const m = header.match(pattern);
    if (m && m[1]) return m[1].replace(/^v/, '');
  }

  for (const pattern of VERSION_PATTERNS) {
    const m = filename.match(pattern);
    if (m && m[1]) return m[1].replace(/^v/, '').replace(/_/g, '.');
  }

  return null;
}

/** Extract author from cover page table HTML */
function extractAuthorFromHtml(html) {
  const m = html.match(/Prepared\s*By<\/strong>.*?<\/td>\s*<td[^>]*>\s*<p>([^<]+)<\/p>/i);
  if (m) {
    const author = m[1].trim();
    if (author.length > 2 && author.length <= 50) return author;
  }
  return null;
}

export async function readSOPContent(filePath, originalFilename) {
  try {
    if (!existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    const buffer = readFileSync(filePath);

    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ buffer }),
      mammoth.extractRawText({ buffer }),
    ]);

    const html = htmlResult.value;
    const text = textResult.value;

    if (!text || text.trim().length < 100) {
      throw new Error('Document appears to be empty or too short');
    }

    const sections = parseHtmlSections(html);

    const extractedContent = {
      raw_text: text.substring(0, 50000),
      purpose: findField(sections, 'purpose'),
      scope: findField(sections, 'scope'),
      procedure: findField(sections, 'procedure'),
      responsibilities: findField(sections, 'responsibilities'),
      materials_equipment: findField(sections, 'materials_equipment'),
      references: findField(sections, 'references'),
      extracted_version: extractVersionFromHtml(html, originalFilename),
      extracted_author: extractAuthorFromHtml(html),
      extraction_timestamp: new Date().toISOString(),
      word_count: text.split(/\s+/).length,
      warnings: [],
    };

    const required = ['purpose', 'scope', 'procedure'];
    for (const s of required) {
      if (!extractedContent[s]) {
        extractedContent.warnings.push(`Could not extract ${s} section`);
      }
    }

    if (extractedContent.extracted_version && originalFilename) {
      const fnVer = extractVersionFromFilename(originalFilename);
      if (fnVer && fnVer !== extractedContent.extracted_version) {
        extractedContent.warnings.push(`Version mismatch: filename (${fnVer}) vs document (${extractedContent.extracted_version})`);
      }
    }

    return { success: true, data: extractedContent };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
}


export async function readSOPContentFromBuffer(buffer, originalFilename) {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty buffer provided");
    }

    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ buffer }),
      mammoth.extractRawText({ buffer }),
    ]);

    const html = htmlResult.value;
    const text = textResult.value;

    if (!text || text.trim().length < 100) {
      throw new Error("Document appears to be empty or too short");
    }

    const sections = parseHtmlSections(html);

    const extractedContent = {
      raw_text: text.substring(0, 50000),
      purpose: findField(sections, "purpose"),
      scope: findField(sections, "scope"),
      procedure: findField(sections, "procedure"),
      responsibilities: findField(sections, "responsibilities"),
      materials_equipment: findField(sections, "materials_equipment"),
      references: findField(sections, "references"),
      extracted_version: extractVersionFromHtml(html, originalFilename || ""),
      extracted_author: extractAuthorFromHtml(html),
      extraction_timestamp: new Date().toISOString(),
      word_count: text.split(/\s+/).length,
      warnings: [],
    };

    const required = ["purpose", "scope", "procedure"];
    for (const s of required) {
      if (!extractedContent[s]) {
        extractedContent.warnings.push("Could not extract " + s + " section");
      }
    }

    if (extractedContent.extracted_version && originalFilename) {
      const fnVer = extractVersionFromFilename(originalFilename);
      if (fnVer && fnVer !== extractedContent.extracted_version) {
        extractedContent.warnings.push("Version mismatch: filename (" + fnVer + ") vs document (" + extractedContent.extracted_version + ")");
      }
    }

    return { success: true, data: extractedContent };
  } catch (error) {
    return { success: false, error: error.message, data: null };
  }
}
function extractVersionFromFilename(filename) {
  for (const pattern of VERSION_PATTERNS) {
    const m = filename.match(pattern);
    if (m && m[1]) return m[1].replace(/^v/, '').replace(/_/g, '.');
  }
  return null;
}

export function generateSOPDescription(extractedContent) {
  const { purpose, scope } = extractedContent;
  // For description, we DO want a single paragraph (it's a summary field)
  const summarize = (t) => t ? t.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() : '';
  if (purpose && scope) return `${summarize(purpose)} ${summarize(scope)}`.substring(0, 500);
  if (purpose) return summarize(purpose).substring(0, 500);
  if (scope) return `This SOP covers: ${summarize(scope)}`.substring(0, 500);
  return 'Standard Operating Procedure for quality management system compliance.';
}

export function previewSOPUpdates(currentSOP, extractedContent) {
  const updates = {};
  const generic = 'Standard Operating Procedure for quality management system compliance.';

  if (extractedContent.extracted_version && extractedContent.extracted_version !== currentSOP.version) {
    // Only propose version update if the extracted version is higher than current (never downgrade)
    const parseVer = (v) => String(v).split('.').map(Number);
    const cur = parseVer(currentSOP.version);
    const proposed = parseVer(extractedContent.extracted_version);
    let isUpgrade = false;
    for (let i = 0; i < Math.max(cur.length, proposed.length); i++) {
      const c = cur[i] || 0;
      const p = proposed[i] || 0;
      if (p > c) { isUpgrade = true; break; }
      if (p < c) break;
    }
    if (isUpgrade) {
      updates.version = { current: currentSOP.version, proposed: extractedContent.extracted_version };
    }
  }

  if (extractedContent.extracted_author && extractedContent.extracted_author !== currentSOP.owner) {
    const cur = (currentSOP.owner || '').trim();
    if (!cur || extractedContent.extracted_author.length >= cur.length * 0.5) {
      updates.owner = { current: currentSOP.owner, proposed: extractedContent.extracted_author };
    }
  }

  const desc = generateSOPDescription(extractedContent);
  if (desc !== currentSOP.description && desc !== generic) {
    const cur = (currentSOP.description || '').trim();
    if (!cur || desc.length >= cur.length * 0.5) {
      updates.description = { current: currentSOP.description || '', proposed: desc };
    }
  }

  const fieldMap = [
    ['scope', 'scope'],
    ['procedure', 'procedure_text'],
    ['responsibilities', 'responsibilities'],
    ['materials_equipment', 'materials_equipment'],
    ['references', 'sop_references'],
  ];

  for (const [extractKey, dbKey] of fieldMap) {
    const val = extractedContent[extractKey];
    const curVal = currentSOP[dbKey] || currentSOP[extractKey] || '';
    if (val && val !== curVal) {
      updates[dbKey || extractKey] = {
        current: curVal,
        proposed: val,
      };
    }
  }

  return {
    hasUpdates: Object.keys(updates).length > 0,
    updates,
    warnings: extractedContent.warnings || [],
    metadata: {
      word_count: extractedContent.word_count,
      extraction_timestamp: extractedContent.extraction_timestamp,
    },
  };
}
