import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import db from './database-pg.js';

/**
 * Comprehensive SOP document repair system
 * Fixes broken links and orphaned files
 */

export async function repairSOPDocuments() {
  try {
    console.log('🔧 Running SOP document repair...');
    
    const sopDir = process.env.KKI_DOCS_DIR || '/Users/kefirbot/KKI/QMS/SOPs';
    
    if (!existsSync(sopDir)) {
      console.log('⚠️ SOP directory not found, skipping repair');
      return;
    }

    const allSopDocs = await await db.all('SELECT * FROM documents WHERE category = ?', ['sop']);
    const actualFiles = readdirSync(sopDir).filter(f => f.endsWith('.docx') || f.endsWith('.pdf'));
    
    let fixed = 0;
    let deleted = 0;
    let linked = 0;

    // Fix broken document records
    for (const doc of allSopDocs) {
      const expectedPath = join(sopDir, doc.filename);
      
      if (!existsSync(expectedPath)) {
        // Try to find matching file
        const baseName = doc.filename.replace(/_\d+\.(docx|pdf)$/, '.$1');
        const matchingFile = actualFiles.find(f => f === baseName || f.startsWith(baseName.replace(/\.(docx|pdf)$/, '')));
        
        if (matchingFile) {
          await await db.run('UPDATE documents SET filename = ? WHERE id = ?', [matchingFile, doc.id]);
          fixed++;
        } else {
          // DISABLED: Don't delete document records automatically
          // This was causing uploaded documents to disappear
          // await db.run('DELETE FROM documents WHERE id = ?', [doc.id]);
          console.log(`⚠️ Document record exists but file missing: ${doc.filename} (keeping record)`);
          // deleted++;
        }
      }
    }

    // Link orphaned files
    for (const file of actualFiles) {
      const hasRecord = allSopDocs.some(doc => doc.filename === file || doc.original_name === file);
      
      if (!hasRecord) {
        const sopMatch = file.match(/KK-SOP-(\d+)/);
        if (sopMatch) {
          const sopNumber = 'KK-SOP-' + sopMatch[1];
          const sop = await await db.get('SELECT id FROM sops WHERE sop_number = ?', [sopNumber]);
          
          if (sop) {
            const stats = statSync(join(sopDir, file));
            await db.run(`
              INSERT INTO documents (filename, original_name, file_type, file_size, category, linked_type, linked_id, description, uploaded_by, version)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              file,
              file,
              file.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              stats.size,
              'sop',
              'sop',
              sop.id,
              `Auto-linked SOP document for ${sopNumber}`,
              'System (Auto-repair)',
              1.0
            );
            linked++;
          }
        }
      }
    }

    if (fixed > 0 || deleted > 0 || linked > 0) {
      console.log(`✅ SOP repair complete: ${fixed} fixed, ${deleted} deleted, ${linked} linked`);
    } else {
      console.log('✅ SOP documents already in good state');
    }

  } catch (error) {
    console.error('❌ SOP document repair failed:', error.message);
  }
}

export async function getSOPDocumentStatus() {
  try {
    const stats = await db.get(`
      SELECT
        COUNT(DISTINCT s.id) as total_sops,
        COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN s.id END) as sops_with_docs,
        COUNT(d.id) as total_documents
      FROM sops s
      LEFT JOIN documents d ON d.linked_id = s.id AND d.linked_type = 'sop' AND d.category = 'sop'
      WHERE s.sop_number LIKE 'KK-SOP-%'
    `, []);
    
    return {
      total_sops: stats.total_sops,
      sops_with_docs: stats.sops_with_docs,
      total_documents: stats.total_documents,
      completion_rate: stats.total_sops > 0 ? Math.round((stats.sops_with_docs / stats.total_sops) * 100) : 0
    };
  } catch (error) {
    console.error('Failed to get SOP document status:', error);
    return null;
  }
}