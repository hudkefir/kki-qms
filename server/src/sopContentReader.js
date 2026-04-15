import mammoth from 'mammoth';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Extracts structured content from SOP .docx files
 * Looks for common sections like Purpose, Scope, Procedure, etc.
 */

// Section patterns handle both "Purpose:" and numbered headings like "1  Purpose"
// Use \n\n as separator since mammoth outputs double newlines between sections
const SECTION_PATTERNS = {
  purpose: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?purpose\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:scope|objective|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?objective\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:scope|purpose|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?purpose\s*:?\s*\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:scope|objective|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
  ],
  scope: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?scope\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|objective|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?applicability\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|objective|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?scope\s*:?\s*\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|objective|procedure|responsibilities|definitions|materials|equipment|references)\b)/i,
  ],
  procedure: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?procedures?\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|objective|responsibilities|definitions|materials|equipment|references|records)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?method\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|objective|responsibilities|definitions|materials|equipment|references|records)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?procedures?\s*:?\s*\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|objective|responsibilities|definitions|materials|equipment|references|records)\b)/i,
  ],
  responsibilities: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?responsibilities\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|procedure|objective|definitions|materials|equipment|references|records)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?roles\s*(?:and\s*responsibilities)?\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|procedure|objective|definitions|materials|equipment|references|records)\b)/i,
  ],
  materials: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?(?:materials|equipment|supplies)\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|procedure|responsibilities|objective|references|records)\b)/i,
  ],
  references: [
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?references\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|procedure|responsibilities|materials|equipment|objective|records|revision)\b)/i,
    /(?:^|\n\n)\s*(?:\d+[\.\s]*\s*)?related\s*documents\s*:?\s*\n\n([\s\S]*?)(?=\n\n\s*(?:\d+[\.\s]*\s*)?(?:purpose|scope|procedure|responsibilities|materials|equipment|objective|records|revision)\b)/i,
  ]
};

const VERSION_PATTERNS = [
  /version\s*:?\s*([v]?\d+(?:\.\d+)*)/i,
  /v(\d+(?:\.\d+)*)/i,
  /rev(?:ision)?\s*:?\s*([v]?\d+(?:\.\d+)*)/i,
  /_v(\d+(?:\.\d+)*)/i
];

// BUG 1 FIX: Author regex now stops at next field label instead of $ (end of string)
const AUTHOR_PATTERNS = [
  /author\s*:?\s*(.*?)(?=\n|approved|classification|date|version|review|document)/i,
  /prepared\s*by\s*:?\s*(.*?)(?=\n|approved|classification|date|version|review|document)/i,
  /created\s*by\s*:?\s*(.*?)(?=\n|approved|classification|date|version|review|document)/i,
  /owner\s*:?\s*(.*?)(?=\n|approved|classification|date|version|review|document)/i
];

function cleanExtractedText(text) {
  if (!text) return '';

  return text
    .replace(/\n+/g, ' ')           // Replace multiple newlines with space
    .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
    .replace(/^\s*[-•]\s*/, '')     // Remove leading bullet points
    .replace(/\s*[-•]\s*/g, '. ')   // Replace bullet points with periods
    .trim();                        // Remove leading/trailing whitespace
}

function extractSection(text, sectionName) {
  const patterns = SECTION_PATTERNS[sectionName];
  if (!patterns) return null;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extracted = cleanExtractedText(match[1]);
      if (extracted.length > 10 && extracted.length < 2000) { // Reasonable length
        return extracted;
      }
    }
  }

  return null;
}

// BUG 3 FIX: Check document body first, fall back to filename
function extractVersion(text, filename) {
  // First try from document content (more accurate, may have patch version)
  const firstParagraphs = text.substring(0, 1000);
  let bodyVersion = null;
  for (const pattern of VERSION_PATTERNS) {
    const match = firstParagraphs.match(pattern);
    if (match && match[1]) {
      bodyVersion = match[1].replace(/^v/, '');
      break;
    }
  }

  // Then try filename
  let filenameVersion = null;
  for (const pattern of VERSION_PATTERNS) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      filenameVersion = match[1].replace(/^v/, '');
      break;
    }
  }

  // Prefer document body version (more precise), fall back to filename
  return bodyVersion || filenameVersion || null;
}

// BUG 1 + BUG 5 (validate): Reject author strings > 50 chars or containing sentences
function extractAuthor(text) {
  const firstParagraphs = text.substring(0, 1000);
  for (const pattern of AUTHOR_PATTERNS) {
    const match = firstParagraphs.match(pattern);
    if (match && match[1]) {
      const author = cleanExtractedText(match[1]);
      // BUG 5 FIX: Reject strings > 50 chars or that look like sentences
      if (author.length > 2 && author.length <= 50 && !/[.!?]{2,}/.test(author) && !/\b(the|this|that|is|are|was|were)\b/i.test(author)) {
        return author;
      }
    }
  }

  return null;
}

export async function readSOPContent(filePath, originalFilename) {
  try {
    if (!existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    // Extract text from .docx file
    const buffer = readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length < 100) {
      throw new Error('Document appears to be empty or too short');
    }

    // Extract structured content
    const extractedContent = {
      raw_text: text.substring(0, 5000), // First 5000 chars for reference
      purpose: extractSection(text, 'purpose'),
      scope: extractSection(text, 'scope'),
      procedure: extractSection(text, 'procedure'),
      responsibilities: extractSection(text, 'responsibilities'),
      materials_equipment: extractSection(text, 'materials'),
      references: extractSection(text, 'references'),
      extracted_version: extractVersion(text, originalFilename),
      extracted_author: extractAuthor(text),
      extraction_timestamp: new Date().toISOString(),
      word_count: text.split(/\s+/).length,
      warnings: []
    };

    // Add warnings for missing sections
    const requiredSections = ['purpose', 'scope', 'procedure'];
    for (const section of requiredSections) {
      if (!extractedContent[section]) {
        extractedContent.warnings.push(`Could not extract ${section} section`);
      }
    }

    // Validate version extraction
    if (extractedContent.extracted_version && originalFilename) {
      const filenameVersion = extractVersionFromFilename(originalFilename);
      if (filenameVersion && filenameVersion !== extractedContent.extracted_version) {
        extractedContent.warnings.push(`Version mismatch: filename (${filenameVersion}) vs document (${extractedContent.extracted_version})`);
      }
    }

    return {
      success: true,
      data: extractedContent
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// Helper to extract version from filename only (used for mismatch warning)
function extractVersionFromFilename(filename) {
  for (const pattern of VERSION_PATTERNS) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/^v/, '');
    }
  }
  return null;
}

export function generateSOPDescription(extractedContent) {
  const { purpose, scope } = extractedContent;

  if (purpose && scope) {
    return `${purpose} ${scope}`.substring(0, 500);
  } else if (purpose) {
    return purpose.substring(0, 500);
  } else if (scope) {
    return `This SOP covers: ${scope}`.substring(0, 500);
  } else {
    return 'Standard Operating Procedure for quality management system compliance.';
  }
}

// BUG 6 FIX (safety net): Don't replace non-empty fields with shorter/generic content
export function previewSOPUpdates(currentSOP, extractedContent) {
  const updates = {};
  const genericDescription = 'Standard Operating Procedure for quality management system compliance.';

  if (extractedContent.extracted_version && extractedContent.extracted_version !== currentSOP.version) {
    updates.version = {
      current: currentSOP.version,
      proposed: extractedContent.extracted_version
    };
  }

  if (extractedContent.extracted_author && extractedContent.extracted_author !== currentSOP.owner) {
    // Safety: don't replace a real owner with extracted text
    const currentOwner = (currentSOP.owner || '').trim();
    if (!currentOwner || extractedContent.extracted_author.length >= currentOwner.length * 0.5) {
      updates.owner = {
        current: currentSOP.owner,
        proposed: extractedContent.extracted_author
      };
    }
  }

  const generatedDescription = generateSOPDescription(extractedContent);
  if (generatedDescription !== currentSOP.description && generatedDescription !== genericDescription) {
    // Safety: don't replace non-empty description with shorter generic text
    const currentDesc = (currentSOP.description || '').trim();
    if (!currentDesc || generatedDescription.length >= currentDesc.length * 0.5) {
      updates.description = {
        current: currentSOP.description || '',
        proposed: generatedDescription
      };
    }
  }

  if (extractedContent.scope && extractedContent.scope !== currentSOP.scope) {
    updates.scope = {
      current: currentSOP.scope || '',
      proposed: extractedContent.scope
    };
  }

  if (extractedContent.procedure && extractedContent.procedure !== currentSOP.procedure) {
    updates.procedure = {
      current: currentSOP.procedure || '',
      proposed: extractedContent.procedure.substring(0, 1000)
    };
  }

  if (extractedContent.responsibilities && extractedContent.responsibilities !== currentSOP.responsibilities) {
    updates.responsibilities = {
      current: currentSOP.responsibilities || '',
      proposed: extractedContent.responsibilities.substring(0, 1000)
    };
  }

  if (extractedContent.materials_equipment && extractedContent.materials_equipment !== currentSOP.materials_equipment) {
    updates.materials_equipment = {
      current: currentSOP.materials_equipment || '',
      proposed: extractedContent.materials_equipment.substring(0, 1000)
    };
  }

  if (extractedContent.references && extractedContent.references !== currentSOP.sop_references) {
    updates.sop_references = {
      current: currentSOP.sop_references || '',
      proposed: extractedContent.references.substring(0, 1000)
    };
  }

  return {
    hasUpdates: Object.keys(updates).length > 0,
    updates,
    warnings: extractedContent.warnings || [],
    metadata: {
      word_count: extractedContent.word_count,
      extraction_timestamp: extractedContent.extraction_timestamp
    }
  };
}
