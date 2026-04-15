import { Router } from 'express';
import db from './database.js';

const router = Router();

// GET /api/planner/state — return full planner JSON blob
router.get('/state', (req, res) => {
  try {
    const row = db.prepare('SELECT data FROM planner_state WHERE id = 1').get();
    if (row && row.data) {
      res.json(JSON.parse(row.data));
    } else {
      res.json({});
    }
  } catch (err) {
    console.error('Planner get state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/planner/state — save full planner JSON blob
router.post('/state', (req, res) => {
  try {
    const data = JSON.stringify(req.body);
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO planner_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
    ).run(data, now);
    res.json({ ok: true, updated_at: now });
  } catch (err) {
    console.error('Planner save state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
