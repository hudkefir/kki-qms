import { Router } from 'express';
import db from '../../database-pg.js';
import { broadcast } from '../../websocket.js';
import { requireWriteAccess } from '../../authMiddleware.js';
import { sanitizeBody } from '../../sanitize.js';
import { AuditService, EventBus } from '../../services/index.js';

const router = Router();

const FIELDS = ['task_date', 'task', 'section', 'assigned_to', 'status', 'priority', 'notes'];
const VALID_STATUSES = ['pending', 'in_progress', 'done'];

function userCtx(req) {
  const u = req.session?.user;
  return {
    name: u?.display_name || u?.username || '',
    auditCtx: {
      changedBy: { id: u?.id ?? null, username: u?.username || 'system' },
      sessionInfo: { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID },
    },
  };
}

// GET /taskboard?date=YYYY-MM-DD
router.get('/taskboard', async (req, res) => {
  try {
    const { date, section, assigned_to, status } = req.query;
    let query = 'SELECT * FROM production_taskboard WHERE 1=1';
    const params = [];
    if (date) { query += ' AND task_date = ?'; params.push(date); }
    if (section) { query += ' AND section = ?'; params.push(section); }
    if (assigned_to) { query += ' AND assigned_to = ?'; params.push(assigned_to); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY task_date DESC, priority DESC, id ASC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('production taskboard list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /taskboard/:id
router.get('/taskboard/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Task not found' });
    res.json(row);
  } catch (err) {
    console.error('production taskboard get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /taskboard
router.post('/taskboard', requireWriteAccess, async (req, res) => {
  try {
    const s = sanitizeBody(req.body);
    if (!s.task_date) return res.status(400).json({ error: 'task_date is required' });
    if (!s.task) return res.status(400).json({ error: 'task is required' });

    const status = s.status || 'pending';
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { name, auditCtx } = userCtx(req);
    const info = await db.run(`
      INSERT INTO production_taskboard
        (task_date, task, section, assigned_to, status, priority, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      s.task_date, s.task, s.section || null, s.assigned_to || null,
      status, s.priority ?? 0, s.notes || null, name,
    ]);

    const created = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [info.lastInsertRowid]);
    await AuditService.logMutation('production_taskboard', created.id, 'create', {
      after: created, resourceName: created.task?.slice(0, 60), ...auditCtx,
    });
    await EventBus.emit('production.task.created', { id: created.id, task: created.task });
    broadcast('production_task_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error('production taskboard create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /taskboard/:id
router.put('/taskboard/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const s = sanitizeBody(req.body);
    if (s.status !== undefined && !VALID_STATUSES.includes(s.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updates = [];
    const params = [];
    for (const f of FIELDS) {
      if (s[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(s[f]);
      }
    }
    const { name, auditCtx } = userCtx(req);
    updates.push('updated_by = ?');
    params.push(name);
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 2) return res.json(existing);

    params.push(req.params.id);
    await db.run(`UPDATE production_taskboard SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_taskboard', updated.id, 'update', {
      before: existing, after: updated, resourceName: updated.task?.slice(0, 60), ...auditCtx,
    });
    broadcast('production_task_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('production taskboard update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /taskboard/:id/status
router.put('/taskboard/:id/status', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { status: newStatus } = sanitizeBody(req.body) || {};
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { name, auditCtx } = userCtx(req);
    const completing = newStatus === 'done';
    await db.run(
      `UPDATE production_taskboard
          SET status = ?,
              completed_at = ${completing ? 'NOW()' : 'NULL'},
              updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [newStatus, name, req.params.id]
    );

    const updated = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    await AuditService.logMutation('production_taskboard', updated.id, 'status_change', {
      before: { status: existing.status }, after: { status: newStatus },
      resourceName: updated.task?.slice(0, 60), ...auditCtx,
    });
    broadcast('production_task_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('production taskboard status change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /taskboard/:id
router.delete('/taskboard/:id', requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM production_taskboard WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await db.run('DELETE FROM production_taskboard WHERE id = ?', [req.params.id]);
    const { auditCtx } = userCtx(req);
    await AuditService.logMutation('production_taskboard', existing.id, 'delete', {
      before: existing, resourceName: existing.task?.slice(0, 60), ...auditCtx,
    });
    broadcast('production_task_deleted', { id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('production taskboard delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
