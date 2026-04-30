import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_KEY not set — file storage will fail');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const BUCKET = 'qms-documents';

/**
 * Upload a file buffer to Supabase Storage.
 * @param {string} storagePath - Path within the bucket (e.g. "sops/file_123.pdf")
 * @param {Buffer} buffer - File contents
 * @param {string} contentType - MIME type
 * @returns {Promise<{path: string}>}
 */
export async function uploadFile(storagePath, buffer, contentType) {
  if (!supabase) throw new Error('Supabase Storage not configured');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return data;
}

/**
 * Download a file from Supabase Storage.
 * @param {string} storagePath - Path within the bucket
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(storagePath) {
  if (!supabase) throw new Error('Supabase Storage not configured');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  // data is a Blob; convert to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from Supabase Storage.
 * @param {string} storagePath - Path within the bucket
 */
export async function deleteFile(storagePath) {
  if (!supabase) throw new Error('Supabase Storage not configured');
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

/**
 * Get a signed URL for temporary access.
 * @param {string} storagePath - Path within the bucket
 * @param {number} expiresIn - Seconds until expiry (default 3600 = 1 hour)
 * @returns {Promise<string>}
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  if (!supabase) throw new Error('Supabase Storage not configured');
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
