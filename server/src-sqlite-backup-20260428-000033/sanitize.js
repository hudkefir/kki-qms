import { basename } from 'path';

/**
 * Strip HTML tags from a string to prevent stored XSS.
 * Removes all < ... > sequences and decodes common HTML entities.
 */
export function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Sanitize all string values in an object (shallow, one level).
 */
export function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = typeof value === 'string' ? stripHtml(value) : value;
  }
  return cleaned;
}

/**
 * Sanitize a filename to prevent path traversal.
 * Strips directory components and .. sequences, returning only the base name.
 */
export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'unnamed';
  // Use basename to strip directory traversal, then remove any remaining ..
  let safe = basename(filename);
  safe = safe.replace(/\.\./g, '');
  // Remove null bytes
  safe = safe.replace(/\0/g, '');
  return safe || 'unnamed';
}
