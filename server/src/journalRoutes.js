import { Router } from 'express';
import db from './database-pg.js';

const router = Router();

// Create journal_entries table
await db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    author_name TEXT NOT NULL DEFAULT '',
    title VARCHAR(255) DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT DEFAULT '',
    record_type VARCHAR(50) DEFAULT NULL,
    record_id INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

// GET /api/journal — list entries for current user (with optional filters)
router.get('/journal', async (req, res) => {
  try {
    const { search, record_type, record_id } = req.query;
    const userId = req.session?.user?.id;
    let query = 'SELECT * FROM journal_entries WHERE user_id = ?';
    const params = [userId];

    if (record_type) {
      query += ' AND record_type = ?';
      params.push(record_type);
    }
    if (record_id) {
      query += ' AND record_id = ?';
      params.push(record_id);
    }
    if (search) {
      query += ' AND (title ILIKE ? OR content ILIKE ? OR tags ILIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY created_at DESC';
    const entries = await db.all(query, params);
    res.json(entries);
  } catch (err) {
    console.error('Journal list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/journal/:id — single entry
router.get('/journal/:id', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(entry);
  } catch (err) {
    console.error('Journal get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/journal — create entry
router.post('/journal', async (req, res) => {
  try {
    const { title = '', content = '', tags = '', record_type = null, record_id = null } = req.body;
    if (!title.trim() && !content.trim()) {
      return res.status(400).json({ error: 'Title or content is required' });
    }

    const sessionUser = req.session?.user;
    const user_id = sessionUser?.id;
    const author_name = sessionUser?.display_name || sessionUser?.username || '';

    const created = await db.get(
      `INSERT INTO journal_entries (user_id, author_name, title, content, tags, record_type, record_id)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [user_id, author_name, title.trim(), content.trim(), tags.trim(), record_type || null, record_id || null]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('Journal create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/journal/:id — update entry (owner only)
router.put('/journal/:id', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    const sessionUser = req.session?.user;
    if (entry.user_id !== sessionUser?.id) {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }

    const { title, content, tags, record_type, record_id } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content.trim()); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(tags.trim()); }
    if (record_type !== undefined) { updates.push('record_type = ?'); params.push(record_type || null); }
    if (record_id !== undefined) { updates.push('record_id = ?'); params.push(record_id || null); }

    if (updates.length === 0) return res.json(entry);

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await db.run(`UPDATE journal_entries SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await db.get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('Journal update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/journal/:id — delete entry (owner only)
router.delete('/journal/:id', async (req, res) => {
  try {
    const entry = await db.get('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    const sessionUser = req.session?.user;
    if (entry.user_id !== sessionUser?.id) {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    await db.run('DELETE FROM journal_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Journal delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
