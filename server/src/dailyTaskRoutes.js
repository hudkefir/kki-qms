import { Router } from 'express';
import db from './database-pg.js';
import { requireAuth, requireWriteAccess, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const router = Router();

// ──── TEMPLATE ENDPOINTS ────

// GET /api/daily-tasks/templates - list all templates
router.get('/daily-tasks/templates', requireAuth, async (req, res) => {
  try {
    const templates = await db.prepare('SELECT * FROM daily_task_templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/daily-tasks/templates/:id - get template with items
router.get('/daily-tasks/templates/:id', requireAuth, async (req, res) => {
  try {
    const template = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const items = await db.prepare('SELECT * FROM daily_task_template_items WHERE template_id = ? ORDER BY sort_order').all(req.params.id);
    res.json({ ...template, items });
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/daily-tasks/templates - create template (admin/manager)
router.post('/daily-tasks/templates', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { template_name, description, items } = req.body;
    if (!template_name) return res.status(400).json({ error: 'Template name is required' });

    const result = await db.transaction(async () => {
      const tpl = await db.prepare(
        'INSERT INTO daily_task_templates (template_name, description, created_by) VALUES (?, ?, ?)'
      ).run(template_name, description || '', req.session.user.username);

      const insertItem = db.prepare(
        'INSERT INTO daily_task_template_items (template_id, task_name, category, description, sop_reference, sort_order, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      if (Array.isArray(items)) {
        for (const item of items) {
          await insertItem.run(tpl.lastInsertRowid, item.task_name, item.category, item.description || '', item.sop_reference || '', item.sort_order || 0, item.color || '');
        }
      }
      return tpl.lastInsertRowid;
    })();

    logAudit(req, 'create', 'daily_task_template', result, template_name);
    const template = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(result);
    const templateItems = await db.prepare('SELECT * FROM daily_task_template_items WHERE template_id = ? ORDER BY sort_order').all(result);
    res.json({ ...template, items: templateItems });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/daily-tasks/templates/:id - update template (admin/manager)
router.put('/daily-tasks/templates/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const { template_name, description, items } = req.body;

    await db.transaction(async () => {
      await db.prepare('UPDATE daily_task_templates SET template_name = ?, description = ? WHERE id = ?')
        .run(template_name || existing.template_name, description ?? existing.description, req.params.id);

      if (Array.isArray(items)) {
        await db.prepare('DELETE FROM daily_task_template_items WHERE template_id = ?').run(req.params.id);
        const insertItem = db.prepare(
          'INSERT INTO daily_task_template_items (template_id, task_name, category, description, sop_reference, sort_order, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        for (const item of items) {
          await insertItem.run(req.params.id, item.task_name, item.category, item.description || '', item.sop_reference || '', item.sort_order || 0, item.color || '');
        }
      }
    })();

    logAudit(req, 'update', 'daily_task_template', req.params.id, template_name || existing.template_name);
    const template = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(req.params.id);
    const templateItems = await db.prepare('SELECT * FROM daily_task_template_items WHERE template_id = ? ORDER BY sort_order').all(req.params.id);
    res.json({ ...template, items: templateItems });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/daily-tasks/templates/:id - delete template (admin/manager)
router.delete('/daily-tasks/templates/:id', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await db.prepare('DELETE FROM daily_task_template_items WHERE template_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM daily_task_templates WHERE id = ?').run(req.params.id);

    logAudit(req, 'delete', 'daily_task_template', req.params.id, existing.template_name);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/daily-tasks/templates/:id/load - load template into active tasks
router.post('/daily-tasks/templates/:id/load', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const template = await db.prepare('SELECT * FROM daily_task_templates WHERE id = ?').get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const items = await db.prepare('SELECT * FROM daily_task_template_items WHERE template_id = ? ORDER BY sort_order').all(req.params.id);

    const maxOrder = await db.prepare('SELECT MAX(sort_order) as max_order FROM daily_tasks').get();
    let baseOrder = (maxOrder.max_order || 0) + 1;

    const inserted = await db.transaction(async () => {
      const insert = db.prepare(
        'INSERT INTO daily_tasks (task_name, category, frequency, description, sop_reference, sort_order, color) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const ids = [];
      for (const item of items) {
        // Skip if task with same name already exists
        const exists = await db.prepare('SELECT id FROM daily_tasks WHERE task_name = ? AND is_active = 1').get(item.task_name);
        if (exists) continue;
        const info = await insert.run(item.task_name, item.category, 'daily', item.description, item.sop_reference, baseOrder++, item.color);
        ids.push(info.lastInsertRowid);
      }
      return ids;
    })();

    logAudit(req, 'load_template', 'daily_task_template', req.params.id, template.template_name, { new_values: { tasks_added: inserted.length } });
    res.json({ message: `${inserted.length} task(s) loaded from template`, ids: inserted });
  } catch (err) {
    console.error('Load template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── TASK ENDPOINTS ────

// GET /api/daily-tasks/operators - get active users for assignment
router.get('/daily-tasks/operators', requireAuth, async (req, res) => {
  try {
    const users = await db.prepare(
      "SELECT id, username, display_name, role FROM users WHERE active = 1 ORDER BY display_name"
    ).all();
    res.json(users);
  } catch (err) {
    console.error('Get operators error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/daily-tasks - get all task templates
router.get('/daily-tasks', requireAuth, async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM daily_tasks';
    const params = [];
    if (active !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    query += ' ORDER BY sort_order, category, task_name';
    const tasks = await db.prepare(query).all(...params);
    res.json(tasks);
  } catch (err) {
    console.error('Get daily tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/daily-tasks - create a task (admin/manager)
router.post('/daily-tasks', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { task_name, category, frequency, description, sop_reference, sort_order, color } = req.body;
    if (!task_name || !category) return res.status(400).json({ error: 'Task name and category are required' });

    const CATEGORY_COLORS = {
      'Pre-Production': '#3B82F6', 'During Production': '#10B981', 'Post-Production': '#F59E0B',
      'Weekly': '#8B5CF6', 'Cleaning': '#14B8A6', 'Safety': '#EF4444',
    };

    const maxOrder = await db.prepare('SELECT MAX(sort_order) as max_order FROM daily_tasks').get();
    const result = await db.prepare(`
      INSERT INTO daily_tasks (task_name, category, frequency, description, sop_reference, sort_order, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(task_name, category, frequency || 'daily', description || '', sop_reference || '', sort_order || (maxOrder.max_order || 0) + 1, color || CATEGORY_COLORS[category] || '');

    logAudit(req, 'create', 'daily_task', result.lastInsertRowid, task_name);

    const task = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(result.lastInsertRowid);
    res.json(task);
  } catch (err) {
    console.error('Create daily task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/daily-tasks/:id - update task template
router.put('/daily-tasks/:id', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { task_name, category, frequency, description, sop_reference, is_active, sort_order, color } = req.body;
    await db.prepare(`
      UPDATE daily_tasks SET task_name = ?, category = ?, frequency = ?, description = ?, sop_reference = ?, is_active = ?, sort_order = ?, color = ?
      WHERE id = ?
    `).run(
      task_name || existing.task_name, category || existing.category, frequency || existing.frequency,
      description ?? existing.description, sop_reference ?? existing.sop_reference,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      sort_order ?? existing.sort_order, color ?? existing.color, req.params.id
    );

    logAudit(req, 'update', 'daily_task', req.params.id, task_name || existing.task_name, { old_values: existing });

    const task = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(req.params.id);
    res.json(task);
  } catch (err) {
    console.error('Update daily task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/daily-tasks/:id/assign - assign task to an operator (admin/manager)
router.put('/daily-tasks/:id/assign', requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { assigned_to } = req.body;
    const oldAssigned = existing.assigned_to || 'unassigned';

    await db.prepare('UPDATE daily_tasks SET assigned_to = ? WHERE id = ?')
      .run(assigned_to || null, req.params.id);

    logAudit(req, 'assign', 'daily_task', req.params.id, existing.task_name, {
      old_values: { assigned_to: oldAssigned },
      new_values: { assigned_to: assigned_to || 'unassigned' },
    });

    const task = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(req.params.id);
    res.json(task);
  } catch (err) {
    console.error('Assign daily task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── COMPLETION ENDPOINTS ────

// GET /api/daily-tasks/completions - get completions for a date (+ optional shift)
router.get('/daily-tasks/completions', requireAuth, async (req, res) => {
  try {
    const { date, shift, user: completedBy } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    let query = `
      SELECT c.*, t.task_name, t.category, t.frequency, t.description, t.sop_reference, t.color
      FROM daily_task_completions c
      JOIN daily_tasks t ON c.daily_task_id = t.id
      WHERE c.date = ?
    `;
    const params = [date];

    if (shift) {
      query += ' AND c.shift = ?';
      params.push(shift);
    }
    if (completedBy) {
      query += ' AND c.completed_by = ?';
      params.push(completedBy);
    }

    query += ' ORDER BY t.sort_order, t.category';
    const completions = await db.prepare(query).all(...params);
    res.json(completions);
  } catch (err) {
    console.error('Get completions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/daily-tasks/completions/summary - supervisor view: summary by date range
router.get('/daily-tasks/completions/summary', requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date().toISOString().slice(0, 10);
    const toDate = to || fromDate;

    const summary = await db.prepare(`
      SELECT c.date, c.shift, c.completed_by,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN c.status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN c.status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        SUM(CASE WHEN c.status = 'na' THEN 1 ELSE 0 END) as na,
        SUM(CASE WHEN c.verified_by IS NOT NULL AND c.verified_by != '' THEN 1 ELSE 0 END) as verified
      FROM daily_task_completions c
      WHERE c.date >= ? AND c.date <= ?
      GROUP BY c.date, c.shift, c.completed_by
      ORDER BY c.date DESC, c.shift
    `).all(fromDate, toDate);

    res.json(summary);
  } catch (err) {
    console.error('Get completions summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/daily-tasks/completions/export - export completion history as JSON
router.get('/daily-tasks/completions/export', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || '2020-01-01';
    const toDate = to || new Date().toISOString().slice(0, 10);

    const records = await db.prepare(`
      SELECT c.*, t.task_name, t.category, t.sop_reference
      FROM daily_task_completions c
      JOIN daily_tasks t ON c.daily_task_id = t.id
      WHERE c.date >= ? AND c.date <= ?
      ORDER BY c.date DESC, c.shift, t.sort_order
    `).all(fromDate, toDate);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="daily-task-completions-${fromDate}-to-${toDate}.json"`);
    res.json(records);
  } catch (err) {
    console.error('Export completions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/daily-tasks/completions - record a task completion (with locking)
router.post('/daily-tasks/completions', requireAuth, async (req, res) => {
  try {
    const { daily_task_id, shift, date, status, notes } = req.body;
    if (!daily_task_id || !date) return res.status(400).json({ error: 'Task ID and date are required' });

    const task = await db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(daily_task_id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const username = req.session.user.username;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Check for existing completion
    const existing = await db.prepare(
      'SELECT * FROM daily_task_completions WHERE daily_task_id = ? AND date = ? AND shift = ? AND completed_by = ?'
    ).get(daily_task_id, date, shift || 'morning', username);

    if (existing) {
      // If locked and user is not admin, reject modification
      if (existing.locked && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'This task completion is locked. Only an admin can modify it.' });
      }
      // If locked and user is admin, this goes through admin override route instead
      if (existing.locked) {
        return res.status(403).json({ error: 'Use the admin override endpoint to modify locked completions.' });
      }

      // Update existing (not yet locked)
      await db.prepare(`
        UPDATE daily_task_completions SET status = ?, notes = ?, completed_at = ?, locked = 1 WHERE id = ?
      `).run(status || 'done', notes || '', now, existing.id);

      logAudit(req, 'update', 'daily_task_completion', existing.id, task.task_name);

      const updated = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    // New completion — insert and lock immediately
    const result = await db.prepare(`
      INSERT INTO daily_task_completions (daily_task_id, completed_by, completed_at, shift, date, status, notes, locked)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(daily_task_id, username, now, shift || 'morning', date, status || 'done', notes || '');

    logAudit(req, 'create', 'daily_task_completion', result.lastInsertRowid, task.task_name);

    const completion = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(result.lastInsertRowid);
    res.json(completion);
  } catch (err) {
    console.error('Create completion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/daily-tasks/completions/:id/verify - supervisor verification
router.put('/daily-tasks/completions/:id/verify', requireAuth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const completion = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.prepare('UPDATE daily_task_completions SET verified_by = ?, verified_at = ? WHERE id = ?')
      .run(username, now, req.params.id);

    logAudit(req, 'verify', 'daily_task_completion', req.params.id, `Verified by ${username}`);

    const updated = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Verify completion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── ADMIN OVERRIDE ENDPOINTS ────

// PUT /api/daily-tasks/completions/:id/admin-override - admin modify a locked completion
router.put('/daily-tasks/completions/:id/admin-override', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const completion = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    const { status, notes, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required for admin override' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.prepare(`
      UPDATE daily_task_completions
      SET status = ?, notes = ?, admin_modified_by = ?, admin_modified_at = ?, admin_modify_reason = ?
      WHERE id = ?
    `).run(status || completion.status, notes ?? completion.notes, username, now, reason, req.params.id);

    logAudit(req, 'admin_override', 'daily_task_completion', req.params.id,
      `Admin override by ${username}: ${reason}`, { old_values: completion });

    const updated = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Admin override error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/daily-tasks/completions/:id/unlock - admin unlock a completion
router.put('/daily-tasks/completions/:id/unlock', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const completion = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required to unlock' });

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const username = req.session.user.username;

    await db.prepare(`
      UPDATE daily_task_completions SET locked = 0, admin_modified_by = ?, admin_modified_at = ?, admin_modify_reason = ? WHERE id = ?
    `).run(username, now, `Unlocked: ${reason}`, req.params.id);

    logAudit(req, 'unlock', 'daily_task_completion', req.params.id, `Unlocked by ${username}: ${reason}`);

    const updated = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Unlock completion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/daily-tasks/completions/:id - admin delete a completion
router.delete('/daily-tasks/completions/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const completion = await db.prepare('SELECT * FROM daily_task_completions WHERE id = ?').get(req.params.id);
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    const { reason } = req.body;
    const username = req.session.user.username;

    await db.prepare('DELETE FROM daily_task_completions WHERE id = ?').run(req.params.id);

    logAudit(req, 'delete', 'daily_task_completion', req.params.id,
      `Deleted by ${username}: ${reason || 'No reason provided'}`, { old_values: completion });

    res.json({ message: 'Completion deleted' });
  } catch (err) {
    console.error('Delete completion error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/daily-tasks/completions/bulk - bulk complete tasks (with locking)
router.post('/daily-tasks/completions/bulk', requireAuth, async (req, res) => {
  try {
    const { completions, shift, date } = req.body;
    if (!Array.isArray(completions) || !date) return res.status(400).json({ error: 'Completions array and date required' });

    const username = req.session.user.username;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const shiftVal = shift || 'morning';
    const isAdmin = req.session.user.role === 'admin';

    const upsert = db.transaction(async () => {
      const results = [];
      const skipped = [];
      for (const c of completions) {
        const existing = await db.prepare(
          'SELECT * FROM daily_task_completions WHERE daily_task_id = ? AND date = ? AND shift = ? AND completed_by = ?'
        ).get(c.daily_task_id, date, shiftVal, username);

        if (existing) {
          // If locked and not admin, skip this one
          if (existing.locked && !isAdmin) {
            skipped.push(c.daily_task_id);
            continue;
          }
          await db.prepare('UPDATE daily_task_completions SET status = ?, notes = ?, completed_at = ?, locked = 1 WHERE id = ?')
            .run(c.status || 'done', c.notes || '', now, existing.id);
          results.push(existing.id);
        } else {
          const info = await db.prepare(`
            INSERT INTO daily_task_completions (daily_task_id, completed_by, completed_at, shift, date, status, notes, locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).run(c.daily_task_id, username, now, shiftVal, date, c.status || 'done', c.notes || '');
          results.push(info.lastInsertRowid);
        }
      }
      return { results, skipped };
    });

    const { results: ids, skipped } = await upsert();
    logAudit(req, 'bulk_complete', 'daily_task_completions', null, `${ids.length} tasks`, { new_values: { date, shift: shiftVal, count: ids.length } });

    res.json({ message: `${ids.length} task(s) recorded`, ids, skipped_locked: skipped });
  } catch (err) {
    console.error('Bulk complete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
