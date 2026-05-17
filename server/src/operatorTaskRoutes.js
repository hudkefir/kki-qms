import { Router } from 'express';
import db from './database-pg.js';
import { broadcast } from './websocket.js';
import { logAudit } from './auditMiddleware.js';
import { requireAuth, requireRole, requireContentAccess } from './authMiddleware.js';

const router = Router();

// Helper: compute overdue status on the fly
function computeStatus(task) {
  if (!task) return task;
  if (task.due_date && task.status !== 'completed' && task.status !== 'overdue') {
    const today = new Date().toISOString().split('T')[0];
    if (task.due_date < today) {
      return { ...task, status: 'overdue' };
    }
  }
  return task;
}

function computeStatuses(tasks) {
  return tasks.map(computeStatus);
}

// ─── GET /operator-tasks — list with filters ─────────────────────────────────
router.get('/operator-tasks', requireAuth, async (req, res) => {
  try {
    const { assigned_to, status, priority, linked_module, overdue } = req.query;
    let sql = 'SELECT * FROM operator_tasks WHERE 1=1';
    const params = [];
    let idx = 0;

    if (assigned_to) {
      params.push(assigned_to);
      sql += ` AND assigned_to = $${++idx}`;
    }
    if (status && status !== 'overdue') {
      params.push(status);
      sql += ` AND status = $${++idx}`;
    }
    if (priority) {
      params.push(priority);
      sql += ` AND priority = $${++idx}`;
    }
    if (linked_module) {
      params.push(linked_module);
      sql += ` AND linked_module = $${++idx}`;
    }

    sql += ' ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_date ASC NULLS LAST, created_at DESC';

    let tasks = await db.all(sql, params);
    tasks = computeStatuses(tasks);

    // Filter overdue after computation
    if (overdue === 'true' || status === 'overdue') {
      tasks = tasks.filter(t => t.status === 'overdue');
    }

    res.json(tasks);
  } catch (err) {
    console.error('GET /operator-tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-tasks/my — tasks for current user ─────────────────────────
router.get('/operator-tasks/my', requireAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    let tasks = await db.all(
      'SELECT * FROM operator_tasks WHERE assigned_to = $1 ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_date ASC NULLS LAST, created_at DESC',
      [username]
    );
    tasks = computeStatuses(tasks);
    res.json(tasks);
  } catch (err) {
    console.error('GET /operator-tasks/my error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-tasks/dashboard — summary stats ───────────────────────────
router.get('/operator-tasks/dashboard', requireAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    let tasks = await db.all('SELECT * FROM operator_tasks WHERE assigned_to = $1', [username]);
    tasks = computeStatuses(tasks);

    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = {
      total_pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      due_this_week: tasks.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekFromNow && t.status !== 'completed').length,
    };
    res.json(stats);
  } catch (err) {
    console.error('GET /operator-tasks/dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-tasks/admin — all tasks grouped by operator ───────────────
router.get('/operator-tasks/admin', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    let tasks = await db.all('SELECT * FROM operator_tasks ORDER BY assigned_to, CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_date ASC NULLS LAST');
    tasks = computeStatuses(tasks);

    // Group by operator
    const grouped = {};
    for (const task of tasks) {
      if (!grouped[task.assigned_to]) grouped[task.assigned_to] = [];
      grouped[task.assigned_to].push(task);
    }

    res.json({ tasks, grouped });
  } catch (err) {
    console.error('GET /operator-tasks/admin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-tasks/by-module/:module/:recordId ─────────────────────────
router.get('/operator-tasks/by-module/:module/:recordId', requireAuth, async (req, res) => {
  try {
    const { module, recordId } = req.params;
    let tasks = await db.all(
      'SELECT * FROM operator_tasks WHERE linked_module = $1 AND linked_record_id = $2 ORDER BY CASE priority WHEN \'critical\' THEN 0 WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, created_at DESC',
      [module, recordId]
    );
    tasks = computeStatuses(tasks);
    res.json(tasks);
  } catch (err) {
    console.error('GET /operator-tasks/by-module error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-tasks/:id — single task with comments ─────────────────────
router.get('/operator-tasks/:id', requireAuth, async (req, res) => {
  try {
    let task = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task = computeStatus(task);

    const comments = await db.all(
      'SELECT * FROM operator_task_comments WHERE task_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ...task, comments });
  } catch (err) {
    console.error('GET /operator-tasks/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /operator-tasks — create task ──────────────────────────────────────
router.post('/operator-tasks', requireAuth, requireContentAccess, async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, priority, linked_module, linked_record_id } = req.body;
    if (!title || !assigned_to || !linked_module || linked_record_id === undefined) {
      return res.status(400).json({ error: 'title, assigned_to, linked_module, and linked_record_id are required' });
    }

    const validModules = ['capa', 'deviation', 'complaint', 'change_request', 'batch_test', 'equipment', 'pm_schedule', 'work_order', 'recall', 'supplier', 'sop', 'traceability', 'general'];
    if (!validModules.includes(linked_module)) {
      return res.status(400).json({ error: `Invalid linked_module. Must be one of: ${validModules.join(', ')}` });
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

    const created_by = req.session.user.username;
    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO operator_tasks (title, description, assigned_to, created_by, due_date, priority, status, linked_module, linked_record_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $9)`,
      [title, description || '', assigned_to, created_by, due_date || null, taskPriority, linked_module, linked_record_id, now]
    );

    const task = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [result.lastInsertRowid]);
    logAudit(req, 'create_operator_task', 'operator_tasks', task.id, title, { new_values: { title, assigned_to, priority: taskPriority, linked_module, linked_record_id } });
    broadcast('operator_task_created', task);
    res.status(201).json(task);
  } catch (err) {
    console.error('POST /operator-tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /operator-tasks/:id — update task ───────────────────────────────────
router.put('/operator-tasks/:id', requireAuth, requireContentAccess, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { title, description, assigned_to, due_date, priority, status, linked_module, linked_record_id } = req.body;
    const now = new Date().toISOString();

    let completed_at = existing.completed_at;
    let completed_by = existing.completed_by;
    if (status === 'completed' && existing.status !== 'completed') {
      completed_at = now;
      completed_by = req.session.user.username;
    } else if (status && status !== 'completed') {
      completed_at = null;
      completed_by = null;
    }

    await db.run(
      `UPDATE operator_tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = COALESCE($3, assigned_to),
        due_date = COALESCE($4, due_date),
        priority = COALESCE($5, priority),
        status = COALESCE($6, status),
        linked_module = COALESCE($7, linked_module),
        linked_record_id = COALESCE($8, linked_record_id),
        completed_at = $9,
        completed_by = $10,
        updated_at = $11
      WHERE id = $12`,
      [
        title || null, description !== undefined ? description : null, assigned_to || null,
        due_date !== undefined ? due_date : null, priority || null, status || null,
        linked_module || null, linked_record_id !== undefined ? linked_record_id : null,
        completed_at, completed_by, now, req.params.id
      ]
    );

    const updated = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    logAudit(req, 'update_operator_task', 'operator_tasks', req.params.id, updated.title, { old_values: existing, new_values: updated });
    broadcast('operator_task_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('PUT /operator-tasks/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /operator-tasks/:id/status — quick status change ────────────────────
router.put('/operator-tasks/:id/status', requireAuth, async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const username = req.session.user.username;
    const role = req.session.user.role;

    // Allow: admin, manager, or the assigned operator
    if (role !== 'admin' && role !== 'manager' && existing.assigned_to !== username) {
      return res.status(403).json({ error: 'You can only update status on tasks assigned to you' });
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const now = new Date().toISOString();
    let completed_at = existing.completed_at;
    let completed_by = existing.completed_by;
    if (status === 'completed' && existing.status !== 'completed') {
      completed_at = now;
      completed_by = username;
    } else if (status !== 'completed') {
      completed_at = null;
      completed_by = null;
    }

    await db.run(
      'UPDATE operator_tasks SET status = $1, completed_at = $2, completed_by = $3, updated_at = $4 WHERE id = $5',
      [status, completed_at, completed_by, now, req.params.id]
    );

    const updated = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    logAudit(req, 'status_change_operator_task', 'operator_tasks', req.params.id, updated.title, {
      old_values: { status: existing.status },
      new_values: { status }
    });
    broadcast('operator_task_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error('PUT /operator-tasks/:id/status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /operator-tasks/:id — admin/manager only ──��──────────────────────
router.delete('/operator-tasks/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const existing = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await db.run('DELETE FROM operator_tasks WHERE id = $1', [req.params.id]);
    logAudit(req, 'delete_operator_task', 'operator_tasks', req.params.id, existing.title, { old_values: existing });
    broadcast('operator_task_deleted', { id: parseInt(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /operator-tasks/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /operator-tasks/:id/comments — add comment ─────────────────────────
router.post('/operator-tasks/:id/comments', requireAuth, async (req, res) => {
  try {
    const task = await db.get('SELECT * FROM operator_tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const author = req.session.user.display_name || req.session.user.username;
    const now = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO operator_task_comments (task_id, author, comment, created_at) VALUES ($1, $2, $3, $4)',
      [req.params.id, author, comment.trim(), now]
    );

    const created = await db.get('SELECT * FROM operator_task_comments WHERE id = $1', [result.lastInsertRowid]);
    broadcast('operator_task_comment_added', { task_id: parseInt(req.params.id), comment: created });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /operator-tasks/:id/comments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
