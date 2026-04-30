import { Router } from 'express';
import crypto from 'crypto';
import db from './database-pg.js';

const router = Router();

// ──── TASKS ────
// ──── FULL STATE (JSON blob — mirrors planner pattern) ────

// GET /api/taskboard/state — return full taskboard JSON blob
router.get('/state', async (req, res) => {
  try {
    const row = await db.prepare('SELECT data FROM taskboard_state WHERE id = 1').get();
    if (row && row.data) {
      res.json(JSON.parse(row.data));
    } else {
      res.json({});
    }
  } catch (err) {
    console.error('Taskboard get state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/state — DISABLED (v1 blob endpoint causes data loss with multi-device sync)
router.post('/state', async (req, res) => {
  console.warn('[TASKBOARD] Blocked v1 POST /state from stale client');
  res.status(410).json({
    error: 'This endpoint has been disabled to prevent data loss. Please hard-refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to get the latest version.',
    code: 'ENDPOINT_GONE'
  });
});

// GET /api/taskboard/state/backups — list backups
router.get('/state/backups', async (req, res) => {
  try {
    const backups = await db.prepare('SELECT id, saved_at, length(data) as size FROM taskboard_state_backups ORDER BY id DESC').all();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/state/restore/:id — restore a backup
router.post('/state/restore/:id', async (req, res) => {
  try {
    const backup = await db.prepare('SELECT data FROM taskboard_state_backups WHERE id = ?').get(req.params.id);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });
    const now = new Date().toISOString();
    await db.prepare('UPDATE taskboard_state SET data = ?, updated_at = ? WHERE id = 1').run(backup.data, now);
    res.json({ ok: true, restored_from: req.params.id, updated_at: now });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/state/force — force push (bypasses protection, admin only)
router.post('/state/force', async (req, res) => {
  try {
    const data = JSON.stringify(req.body);
    const now = new Date().toISOString();
    await db.prepare('INSERT INTO taskboard_state (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').run(data, now);
    res.json({ ok: true, forced: true, updated_at: now });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/taskboard/tasks — list all tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await db.prepare('SELECT * FROM taskboard_tasks ORDER BY sort_order ASC, id ASC').all();
    res.json(tasks);
  } catch (err) {
    console.error('Taskboard get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/tasks — replace entire board
router.post('/tasks', async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks must be an array' });
    }

    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM taskboard_tasks').run();
      for (const t of tasks) {
        await db.prepare(`
          INSERT INTO taskboard_tasks (task, operator, section, zone, backup, notes, status, num, sort_order, completed_at, completed_by, progress_note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          t.task || '',
          t.operator || '',
          t.section || '',
          t.zone || '',
          t.backup || '',
          t.notes || '',
          t.status || 'todo',
          t.num ?? null,
          t.sort_order ?? 0,
          t.completed_at || null,
          t.completed_by || null,
          t.progress_note || null,
        );
      }
    });
    await save();

    const saved = await db.prepare('SELECT * FROM taskboard_tasks ORDER BY sort_order ASC, id ASC').all();
    res.json({ ok: true, count: saved.length, tasks: saved });
  } catch (err) {
    console.error('Taskboard save tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── TEMPLATES ────

// GET /api/taskboard/templates — list templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await db.prepare('SELECT * FROM taskboard_templates ORDER BY created_at DESC').all();
    res.json(templates);
  } catch (err) {
    console.error('Taskboard get templates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/templates — save a template
router.post('/templates', async (req, res) => {
  try {
    const { name, description, created_by, items } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const save = db.transaction(async () => {
      const result = await db.prepare(
        'INSERT INTO taskboard_templates (name, description, created_by) VALUES (?, ?, ?)'
      ).run(name, description || '', created_by || '');

      const templateId = result.lastInsertRowid;
      if (Array.isArray(items)) {
        for (const item of items) {
          await db.prepare(`
            INSERT INTO taskboard_template_items (template_id, task, operator, section, zone, backup, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            templateId,
            item.task || '',
            item.operator || '',
            item.section || '',
            item.zone || '',
            item.backup || '',
            item.notes || '',
            item.sort_order ?? 0,
          );
        }
      }
      return templateId;
    });

    const templateId = await save();
    const template = await db.prepare('SELECT * FROM taskboard_templates WHERE id = ?').get(templateId);
    const templateItems = await db.prepare('SELECT * FROM taskboard_template_items WHERE template_id = ? ORDER BY sort_order').all(templateId);
    res.json({ ...template, items: templateItems });
  } catch (err) {
    console.error('Taskboard save template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/taskboard/templates/:id — delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.prepare('SELECT * FROM taskboard_templates WHERE id = ?').get(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const del = db.transaction(async () => {
      await db.prepare('DELETE FROM taskboard_template_items WHERE template_id = ?').run(id);
      await db.prepare('DELETE FROM taskboard_templates WHERE id = ?').run(id);
    });
    await del();

    res.json({ ok: true });
  } catch (err) {
    console.error('Taskboard delete template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/templates/:id/load — get template items
router.post('/templates/:id/load', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.prepare('SELECT * FROM taskboard_templates WHERE id = ?').get(id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const items = await db.prepare('SELECT * FROM taskboard_template_items WHERE template_id = ? ORDER BY sort_order').all(id);
    res.json({ ...template, items });
  } catch (err) {
    console.error('Taskboard load template error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── AUDIT ────

// GET /api/taskboard/audit — get audit log
router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const entries = await db.prepare('SELECT * FROM taskboard_audit ORDER BY timestamp DESC LIMIT ?').all(limit);
    res.json(entries);
  } catch (err) {
    console.error('Taskboard get audit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/audit — add audit entry
router.post('/audit', async (req, res) => {
  try {
    const { task_id, task_name, operator, action } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });

    const result = await db.prepare(
      'INSERT INTO taskboard_audit (task_id, task_name, operator, action) VALUES (?, ?, ?, ?)'
    ).run(task_id ?? null, task_name || '', operator || '', action);

    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Taskboard add audit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ════════════════════════════════════════════════════════════════════
// V2 ENDPOINTS — per-date storage
// ════════════════════════════════════════════════════════════════════

// ──── TASKS (per-date) ────

// GET /api/taskboard/v2/tasks/:date
router.get('/v2/tasks/:date', async (req, res) => {
  try {
    const rows = await db.prepare(
      'SELECT id, data, sort_order, version FROM taskboard_tasks WHERE board_date = ? ORDER BY sort_order ASC, id ASC'
    ).all(req.params.date);
    const tasks = rows.map(r => ({ ...JSON.parse(r.data), _rowId: r.id, _version: r.version || 1 }));
    const maxVersion = rows.reduce((m, r) => Math.max(m, r.version || 1), 0);
    res.set('X-Date-Version', String(maxVersion));
    res.json(tasks);
  } catch (err) {
    console.error('v2 get tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/taskboard/v2/tasks/:date — replace all tasks for a date (only if no existing tasks, or all versions match)
router.put('/v2/tasks/:date', async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });
    const date = req.params.date;

    const existing = await db.prepare('SELECT id, data, version FROM taskboard_tasks WHERE board_date = ?').all(date);

    // If tasks already exist for this date, reject full replace (use PATCH instead)
    if (existing.length > 0) {
      console.warn(`[TASKBOARD] PUT rejected for ${date}: ${existing.length} tasks already exist. Use PATCH for updates.`);
      return res.status(409).json({
        error: 'Tasks already exist for this date. Use PATCH to update individual tasks.',
        existingCount: existing.length,
        hint: 'Use PATCH /v2/tasks/:date/:taskId for per-task updates'
      });
    }

    const save = db.transaction(async () => {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        await db.prepare(
          'INSERT INTO taskboard_tasks (board_date, data, sort_order, task, status, version, updated_at) VALUES (?, ?, ?, ?, ?, 1, datetime(\'now\'))'
        ).run(date, JSON.stringify(t), t.sort_order ?? i, t.task || t.name || '', t.status || 'todo');
      }
    });
    await save();

    // Return the inserted tasks with their _rowId and _version
    const inserted = await db.prepare('SELECT id, data, version FROM taskboard_tasks WHERE board_date = ? ORDER BY sort_order ASC, id ASC').all(date);
    const result = inserted.map(r => ({ ...JSON.parse(r.data), _rowId: r.id, _version: r.version }));
    res.json({ ok: true, count: tasks.length, tasks: result });
  } catch (err) {
    console.error('v2 put tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/taskboard/v2/tasks/:date — create one task
router.post('/v2/tasks/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const t = req.body;
    const result = await db.prepare(
      'INSERT INTO taskboard_tasks (board_date, data, sort_order, task, status, version, updated_at) VALUES (?, ?, ?, ?, ?, 1, datetime(\'now\'))'
    ).run(date, JSON.stringify(t), t.sort_order ?? 0, t.task || t.name || '', t.status || 'todo');
    res.json({ ...t, _rowId: result.lastInsertRowid, _version: 1, id: t.id || String(result.lastInsertRowid) });
  } catch (err) {
    console.error('v2 post task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/taskboard/v2/tasks/:date/:id — update one task with version conflict detection
router.patch('/v2/tasks/:date/:id', async (req, res) => {
  try {
    const { date, id } = req.params;
    const clientVersion = req.body._version;

    // Find the task — match by rowid first, then by data->id field
    let row = await db.prepare(
      'SELECT id, data, version FROM taskboard_tasks WHERE board_date = ? AND id = ?'
    ).get(date, id);
    if (!row) {
      const all = await db.prepare('SELECT id, data, version FROM taskboard_tasks WHERE board_date = ?').all(date);
      row = all.find(r => {
        const d = JSON.parse(r.data);
        return d.id === id || String(d.id) === id;
      });
    }
    if (!row) return res.status(404).json({ error: 'Task not found' });

    const serverVersion = row.version || 1;

    // Version conflict check: if client provides a version and it doesn't match, reject
    if (clientVersion !== undefined && clientVersion !== serverVersion) {
      const serverTask = { ...JSON.parse(row.data), _rowId: row.id, _version: serverVersion };
      console.warn(`[TASKBOARD] CONFLICT on task ${id}: client v${clientVersion} vs server v${serverVersion}`);
      return res.status(409).json({
        error: 'Version conflict — task was updated by another device',
        serverTask,
        serverVersion,
        clientVersion
      });
    }

    const existing = JSON.parse(row.data);
    // Strip internal fields from the update payload
    const { _version, _rowId, ...updateFields } = req.body;
    const updated = { ...existing, ...updateFields };

    // Skip write if data is identical (no-op) — prevents version inflation
    const existingJson = JSON.stringify(existing);
    const updatedJson = JSON.stringify(updated);
    if (existingJson === updatedJson) {
      return res.json({ ...existing, _rowId: row.id, _version: serverVersion });
    }

    const newVersion = serverVersion + 1;

    await db.prepare(
      'UPDATE taskboard_tasks SET data = ?, task = ?, status = ?, version = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(updatedJson, updated.task || updated.name || '', updated.status || 'todo', newVersion, row.id);

    res.json({ ...updated, _rowId: row.id, _version: newVersion });
  } catch (err) {
    console.error('v2 patch task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/taskboard/v2/tasks/:date/:id — delete one task
router.delete('/v2/tasks/:date/:id', async (req, res) => {
  try {
    const { date, id } = req.params;
    let result = await db.prepare('DELETE FROM taskboard_tasks WHERE board_date = ? AND id = ?').run(date, id);
    if (result.changes === 0) {
      // Try matching by the id inside the JSON data
      const all = await db.prepare('SELECT id, data FROM taskboard_tasks WHERE board_date = ?').all(date);
      const row = all.find(r => {
        const d = JSON.parse(r.data);
        return d.id === id || String(d.id) === id;
      });
      if (row) {
        result = await db.prepare('DELETE FROM taskboard_tasks WHERE id = ?').run(row.id);
      }
    }
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('v2 delete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/taskboard/v2/dates — list dates that have tasks
router.get('/v2/dates', async (req, res) => {
  try {
    const rows = await db.prepare(
      'SELECT DISTINCT board_date FROM taskboard_tasks WHERE board_date IS NOT NULL ORDER BY board_date DESC'
    ).all();
    res.json(rows.map(r => r.board_date));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── OPERATORS ────

router.get('/v2/operators', async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM tb_operators ORDER BY sort_order ASC').all());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/operators', async (req, res) => {
  try {
    const ops = req.body;
    if (!Array.isArray(ops)) return res.status(400).json({ error: 'body must be an array' });
    // SAFETY: reject empty push if server already has operators
    const existingRow = await db.prepare('SELECT COUNT(*) as c FROM tb_operators').get();
    const existing = existingRow.c;
    if (ops.length === 0 && existing > 0) {
      console.warn('[TASKBOARD SAFETY] Blocked empty operators push (server has ' + existing + ')');
      return res.json({ ok: true, count: existing, blocked: true });
    }
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM tb_operators').run();
      for (let i = 0; i < ops.length; i++) {
        const o = ops[i];
        await db.prepare('INSERT INTO tb_operators (id, name, role, zone, color, avatar, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(o.id, o.name || '', o.role || '', o.zone || '', o.color || '', o.avatar || '', o.sort_order ?? i);
      }
    });
    await save();
    res.json({ ok: true, count: ops.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── SECTIONS ────

router.get('/v2/sections', async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM tb_sections ORDER BY sort_order ASC').all());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/sections', async (req, res) => {
  try {
    const secs = req.body;
    if (!Array.isArray(secs)) return res.status(400).json({ error: 'body must be an array' });
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM tb_sections').run();
      for (let i = 0; i < secs.length; i++) {
        const s = secs[i];
        await db.prepare('INSERT INTO tb_sections (id, name, icon, color, bg, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(s.id, s.name || '', s.icon || '', s.color || '', s.bg || '', s.sort_order ?? i);
      }
    });
    await save();
    res.json({ ok: true, count: secs.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── SETTINGS ────

router.get('/v2/settings', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT key, value FROM tb_settings').all();
    const settings = {};
    for (const r of rows) {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/settings', async (req, res) => {
  try {
    const settings = req.body;
    if (typeof settings !== 'object' || settings === null) return res.status(400).json({ error: 'body must be an object' });
    const save = db.transaction(async () => {
      for (const [k, v] of Object.entries(settings)) {
        await db.prepare('INSERT INTO tb_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    });
    await save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── ANNOUNCEMENTS ────

router.get('/v2/announcements', async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM tb_announcements ORDER BY created_at DESC').all());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/v2/announcements', async (req, res) => {
  try {
    const { id, text, created_by } = req.body;
    const aid = id || crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare('INSERT INTO tb_announcements (id, text, created_by, created_at) VALUES (?, ?, ?, ?)').run(aid, text || '', created_by || '', now);
    res.json({ id: aid, text, created_by, created_at: now });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /v2/announcements — full replace (used by frontend sync)
router.put('/v2/announcements', async (req, res) => {
  try {
    const announcements = req.body;
    if (!Array.isArray(announcements)) return res.status(400).json({ error: 'Expected array' });
    const now = new Date().toISOString();
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM tb_announcements').run();
      for (const a of announcements) {
        if (!a || !a.text) continue;
        await db.prepare('INSERT INTO tb_announcements (id, text, created_by, created_at) VALUES (?, ?, ?, ?)').run(a.id || ('ann-' + Date.now() + Math.random()), a.text, a.author || a.created_by || '', a.createdAt || a.created_at || now);
      }
    });
    await save();
    res.json({ ok: true, count: announcements.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/v2/announcements/:id', async (req, res) => {
  try {
    const result = await db.prepare('DELETE FROM tb_announcements WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── TEMPLATES (v2) ────

router.get('/v2/templates', async (req, res) => {
  try {
    const templates = await db.prepare('SELECT * FROM taskboard_templates ORDER BY created_at DESC').all();
    for (const t of templates) {
      t.items = await db.prepare('SELECT * FROM taskboard_template_items WHERE template_id = ? ORDER BY sort_order').all(t.id);
    }
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/templates', async (req, res) => {
  try {
    const templates = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'body must be an array' });
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM taskboard_template_items').run();
      await db.prepare('DELETE FROM taskboard_templates').run();
      for (const t of templates) {
        const r = await db.prepare('INSERT INTO taskboard_templates (name, description, created_by) VALUES (?, ?, ?)').run(t.name || '', t.description || '', t.created_by || '');
        if (Array.isArray(t.items)) {
          for (const item of t.items) {
            await db.prepare('INSERT INTO taskboard_template_items (template_id, task, operator, section, zone, backup, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(r.lastInsertRowid, item.task || '', item.operator || '', item.section || '', item.zone || '', item.backup || '', item.notes || '', item.sort_order ?? 0);
          }
        }
      }
    });
    await save();
    res.json({ ok: true, count: templates.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── PROCESS TEMPLATES ────

router.get('/v2/process-templates', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM tb_process_templates ORDER BY name ASC').all();
    res.json(rows.map(r => ({ ...r, roles: r.roles ? JSON.parse(r.roles) : [], history: r.history ? JSON.parse(r.history) : [] })));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/process-templates', async (req, res) => {
  try {
    const templates = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'body must be an array' });
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM tb_process_templates').run();
      const now = new Date().toISOString();
      for (const t of templates) {
        await db.prepare('INSERT INTO tb_process_templates (id, name, version, roles, history, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(t.id, t.name || '', t.version ?? 1, JSON.stringify(t.roles || []), JSON.stringify(t.history || []), t.created_at || now, t.updated_at || now);
      }
    });
    await save();
    res.json({ ok: true, count: templates.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── DAILY CONFIG ────

router.get('/v2/daily-config', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM tb_daily_config ORDER BY sort_order ASC').all();
    // Map task_text → task for frontend compatibility
    res.json(rows.map(r => ({ task: r.task_text, section: r.section, tag: r.tag, sort_order: r.sort_order, enabled: r.enabled })));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/daily-config', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'body must be an array' });
    // SAFETY: reject empty push if server already has daily config
    const existingRow = await db.prepare('SELECT COUNT(*) as c FROM tb_daily_config').get();
    const existingDc = existingRow.c;
    if (items.length === 0 && existingDc > 0) {
      console.warn('[TASKBOARD SAFETY] Blocked empty daily-config push (server has ' + existingDc + ')');
      return res.json({ ok: true, count: existingDc, blocked: true });
    }
    const save = db.transaction(async () => {
      await db.prepare('DELETE FROM tb_daily_config').run();
      for (let i = 0; i < items.length; i++) {
        const c = items[i];
        await db.prepare('INSERT INTO tb_daily_config (task_text, section, tag, sort_order, enabled) VALUES (?, ?, ?, ?, ?)').run(c.task_text || c.task || '', c.section || '', c.tag || '', c.sort_order ?? i, c.enabled ?? 1);
      }
    });
    await save();
    res.json({ ok: true, count: items.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── MIGRATE (blob → per-date) ────

router.post('/v2/migrate', async (req, res) => {
  try {
    const row = await db.prepare('SELECT data FROM taskboard_state WHERE id = 1').get();
    if (!row || !row.data) return res.json({ ok: true, migrated: { dates: 0, tasks: 0, operators: 0, sections: 0 }, message: 'No blob data to migrate' });

    const blob = JSON.parse(row.data);
    const dateBoards = blob.dateBoards || {};
    const operators = blob.operators || [];
    const sections = blob.sections || [];
    const settings = blob.settings || {};

    let totalTasks = 0;
    let totalDates = 0;

    const migrate = db.transaction(async () => {
      // Migrate tasks per date
      for (const [date, tasks] of Object.entries(dateBoards)) {
        if (!Array.isArray(tasks) || tasks.length === 0) continue;
        // Clear existing tasks for this date to avoid duplicates on re-migrate
        await db.prepare('DELETE FROM taskboard_tasks WHERE board_date = ?').run(date);
        totalDates++;
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          await db.prepare(
            'INSERT INTO taskboard_tasks (board_date, data, sort_order, task, status, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
          ).run(date, JSON.stringify(t), t.sort_order ?? i, t.task || t.name || '', t.status || 'todo');
          totalTasks++;
        }
      }

      // Also migrate the top-level tasks array (if any) as "default" date
      if (Array.isArray(blob.tasks) && blob.tasks.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        await db.prepare('DELETE FROM taskboard_tasks WHERE board_date = ?').run(today);
        totalDates++;
        for (let i = 0; i < blob.tasks.length; i++) {
          const t = blob.tasks[i];
          await db.prepare(
            'INSERT INTO taskboard_tasks (board_date, data, sort_order, task, status, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
          ).run(today, JSON.stringify(t), t.sort_order ?? i, t.task || t.name || '', t.status || 'todo');
          totalTasks++;
        }
      }

      // Migrate operators
      if (Array.isArray(operators) && operators.length > 0) {
        await db.prepare('DELETE FROM tb_operators').run();
        for (let i = 0; i < operators.length; i++) {
          const o = operators[i];
          await db.prepare('INSERT INTO tb_operators (id, name, role, zone, color, avatar, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(o.id || String(i), o.name || '', o.role || '', o.zone || '', o.color || '', o.avatar || '', o.sort_order ?? i);
        }
      }

      // Migrate sections
      if (Array.isArray(sections) && sections.length > 0) {
        await db.prepare('DELETE FROM tb_sections').run();
        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          await db.prepare('INSERT INTO tb_sections (id, name, icon, color, bg, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(s.id || String(i), s.name || '', s.icon || '', s.color || '', s.bg || '', s.sort_order ?? i);
        }
      }

      // Migrate settings
      if (settings && typeof settings === 'object') {
        for (const [k, v] of Object.entries(settings)) {
          await db.prepare('INSERT INTO tb_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
      }
    });
    await migrate();

    res.json({
      ok: true,
      migrated: {
        dates: totalDates,
        tasks: totalTasks,
        operators: operators.length,
        sections: sections.length,
      }
    });
  } catch (err) {
    console.error('v2 migrate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ── DAILY MESSAGES ──
// Stored in tb_settings with key pattern 'dailymsg-YYYY-MM-DD'

router.get('/v2/daily-message/:date', async (req, res) => {
  try {
    const row = await db.prepare('SELECT value FROM tb_settings WHERE key = ?').get('dailymsg-' + req.params.date);
    res.json({ message: row ? row.value : '' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/v2/daily-message/:date', async (req, res) => {
  try {
    const { message } = req.body;
    const key = 'dailymsg-' + req.params.date;
    await db.prepare('INSERT INTO tb_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, message || '');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
