import { Router } from 'express';
import db from './database-pg.js';
import { broadcast } from './websocket.js';
import { requireWriteAccess } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';
import { sanitizeBody } from './sanitize.js';

const router = Router();

// ──── WO Sequence helper ────
async function nextWONumber() {
  const year = new Date().getFullYear();
  const row = await db.get('SELECT next_number FROM wo_sequence WHERE year = ?', [year]);
  let num;
  if (row) {
    num = row.next_number;
    await db.run('UPDATE wo_sequence SET next_number = ? WHERE year = ?', [num + 1, year]);
  } else {
    num = 1;
    await db.run('INSERT INTO wo_sequence (year, next_number) VALUES (?, ?)', [year, 2]);
  }
  return `WO-${year}-${String(num).padStart(3, '0')}`;
}

// ──── Next due date calculator ────
function calcNextDue(fromDate, frequency) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'semi_annual': d.setMonth(d.getMonth() + 6); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

// ==================== EQUIPMENT ====================

// GET /api/equipment
router.get('/equipment', async (req, res) => {
  try {
    const { status, is_critical, location, search } = req.query;
    let query = 'SELECT * FROM equipment WHERE 1=1';
    const params = [];

    if (status) { query += ' AND status = ?'; params.push(status); }
    if (is_critical !== undefined && is_critical !== '') { query += ' AND is_critical = ?'; params.push(Number(is_critical)); }
    if (location) { query += ' AND location LIKE ?'; params.push(`%${location}%`); }
    if (search) {
      query += ' AND (equipment_id LIKE ? OR name LIKE ? OR description LIKE ? OR manufacturer LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC, id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/equipment/:id
router.get('/equipment/:id', async (req, res) => {
  try {
    const equip = await db.get('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });

    const schedules = await db.all('SELECT * FROM pm_schedules WHERE equipment_id = ? ORDER BY next_due_date ASC', [equip.id]);
    const workOrders = await db.all('SELECT * FROM work_orders WHERE equipment_id = ? ORDER BY created_at DESC LIMIT 20', [equip.id]);

    res.json({
      ...equip,
      associated_sops: JSON.parse(equip.associated_sops || '[]'),
      schedules,
      workOrders,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/equipment
router.post('/equipment', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      equipment_id, name, description = '', location, manufacturer = '', model = '',
      serial_number = '', date_installed = null, is_critical = 0,
      associated_sops = [], pm_frequency, notes = ''
    } = sanitized;

    if (!equipment_id || !name || !location || !pm_frequency) {
      return res.status(400).json({ error: 'equipment_id, name, location, and pm_frequency are required' });
    }

    const info = await db.run(`
      INSERT INTO equipment (equipment_id, name, description, location, manufacturer, model, serial_number, date_installed, is_critical, associated_sops, pm_frequency, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [equipment_id, name, description, location, manufacturer, model, serial_number, date_installed, is_critical ? 1 : 0, JSON.stringify(associated_sops), pm_frequency, notes]);

    const created = await db.get('SELECT * FROM equipment WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_equipment', 'equipment', created.id, equipment_id, { new_values: { equipment_id, name, location } });
    broadcast('equipment_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/equipment/:id
router.put('/equipment/:id', requireWriteAccess, async (req, res) => {
  try {
    const equip = await db.get('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'name', 'description', 'location', 'manufacturer', 'model',
      'serial_number', 'date_installed', 'is_critical', 'pm_frequency', 'status', 'notes'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    if (sanitized.associated_sops !== undefined) {
      updates.push('associated_sops = ?');
      params.push(typeof sanitized.associated_sops === 'string' ? sanitized.associated_sops : JSON.stringify(sanitized.associated_sops));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(equip);

    params.push(req.params.id);
    await db.run(`UPDATE equipment SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_equipment', 'equipment', req.params.id, equip.equipment_id, { old_values: {}, new_values: sanitized });
    broadcast('equipment_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/equipment/:id (soft delete)
router.delete('/equipment/:id', requireWriteAccess, async (req, res) => {
  try {
    const equip = await db.get('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    if (!equip) return res.status(404).json({ error: 'Equipment not found' });

    await db.run("UPDATE equipment SET status = 'decommissioned', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);

    const updated = await db.get('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
    logAudit(req, 'decommission_equipment', 'equipment', req.params.id, equip.equipment_id, { new_values: { status: 'decommissioned' } });
    broadcast('equipment_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PM SCHEDULES ====================

// GET /api/pm-schedules
router.get('/pm-schedules', async (req, res) => {
  try {
    const { equipment_id, frequency, overdue } = req.query;
    let query = 'SELECT ps.*, e.equipment_id AS equip_code, e.name AS equipment_name FROM pm_schedules ps JOIN equipment e ON ps.equipment_id = e.id WHERE 1=1';
    const params = [];

    if (equipment_id) { query += ' AND ps.equipment_id = ?'; params.push(equipment_id); }
    if (frequency) { query += ' AND ps.frequency = ?'; params.push(frequency); }
    if (overdue === 'true') {
      query += " AND ps.is_active = 1 AND ps.next_due_date < CURRENT_DATE";
    }

    query += ' ORDER BY ps.next_due_date ASC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pm-schedules/overdue
router.get('/pm-schedules/overdue', async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ps.*, e.equipment_id AS equip_code, e.name AS equipment_name FROM pm_schedules ps JOIN equipment e ON ps.equipment_id = e.id WHERE ps.is_active = 1 AND ps.next_due_date < CURRENT_DATE ORDER BY ps.next_due_date ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pm-schedules/upcoming
router.get('/pm-schedules/upcoming', async (req, res) => {
  try {
    const rows = await db.all(
      "SELECT ps.*, e.equipment_id AS equip_code, e.name AS equipment_name FROM pm_schedules ps JOIN equipment e ON ps.equipment_id = e.id WHERE ps.is_active = 1 AND ps.next_due_date >= CURRENT_DATE AND ps.next_due_date <= CURRENT_DATE + INTERVAL '7 days' ORDER BY ps.next_due_date ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pm-schedules
router.post('/pm-schedules', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      equipment_id, task_name, description = '', frequency, category,
      assigned_to = '', next_due_date
    } = sanitized;

    if (!equipment_id || !task_name || !frequency || !category || !next_due_date) {
      return res.status(400).json({ error: 'equipment_id, task_name, frequency, category, and next_due_date are required' });
    }

    const equip = await db.get('SELECT * FROM equipment WHERE id = ?', [equipment_id]);
    if (!equip) return res.status(400).json({ error: 'Equipment not found' });

    const info = await db.run(`
      INSERT INTO pm_schedules (equipment_id, task_name, description, frequency, category, assigned_to, next_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [equipment_id, task_name, description, frequency, category, assigned_to, next_due_date]);

    const created = await db.get('SELECT * FROM pm_schedules WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_pm_schedule', 'pm_schedules', created.id, task_name, { new_values: { equipment_id, task_name, frequency, category } });
    broadcast('pm_schedule_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/pm-schedules/:id
router.put('/pm-schedules/:id', requireWriteAccess, async (req, res) => {
  try {
    const schedule = await db.get('SELECT * FROM pm_schedules WHERE id = ?', [req.params.id]);
    if (!schedule) return res.status(404).json({ error: 'PM schedule not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = ['task_name', 'description', 'frequency', 'category', 'assigned_to', 'next_due_date', 'is_active'];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(schedule);

    params.push(req.params.id);
    await db.run(`UPDATE pm_schedules SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM pm_schedules WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_pm_schedule', 'pm_schedules', req.params.id, schedule.task_name, { old_values: {}, new_values: sanitized });
    broadcast('pm_schedule_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pm-schedules/:id/complete
router.post('/pm-schedules/:id/complete', requireWriteAccess, async (req, res) => {
  try {
    const schedule = await db.get('SELECT * FROM pm_schedules WHERE id = ?', [req.params.id]);
    if (!schedule) return res.status(404).json({ error: 'PM schedule not found' });

    const sanitized = sanitizeBody(req.body);
    const {
      completed_by, completed_at, status = 'completed',
      notes = '', issues_found = '', parts_used = []
    } = sanitized;

    if (!completed_by || !completed_at) {
      return res.status(400).json({ error: 'completed_by and completed_at are required' });
    }

    const nextDue = calcNextDue(completed_at, schedule.frequency);

    // Create completion record
    const info = await db.run(`
      INSERT INTO pm_completions (schedule_id, equipment_id, completed_by, completed_at, status, notes, issues_found, parts_used, next_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [schedule.id, schedule.equipment_id, completed_by, completed_at, status, notes, issues_found, JSON.stringify(parts_used), nextDue]);

    // Update schedule
    await db.run("UPDATE pm_schedules SET last_completed_date = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [completed_at, nextDue, schedule.id]);

    const completion = await db.get('SELECT * FROM pm_completions WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'complete_pm_task', 'pm_completions', completion.id, schedule.task_name, { new_values: { completed_by, status, next_due_date: nextDue } });
    broadcast('pm_completed', { completion, schedule_id: schedule.id });
    res.status(201).json(completion);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== WORK ORDERS ====================

// GET /api/work-orders
router.get('/work-orders', async (req, res) => {
  try {
    const { status, type, priority, equipment_id, search } = req.query;
    let query = 'SELECT wo.*, e.equipment_id AS equip_code, e.name AS equipment_name FROM work_orders wo JOIN equipment e ON wo.equipment_id = e.id WHERE 1=1';
    const params = [];

    if (status) { query += ' AND wo.status = ?'; params.push(status); }
    if (type) { query += ' AND wo.type = ?'; params.push(type); }
    if (priority) { query += ' AND wo.priority = ?'; params.push(priority); }
    if (equipment_id) { query += ' AND wo.equipment_id = ?'; params.push(equipment_id); }
    if (search) {
      query += ' AND (wo.work_order_number LIKE ? OR wo.title LIKE ? OR wo.description LIKE ? OR wo.reported_by LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY wo.created_at DESC, wo.id DESC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work-orders/:id
router.get('/work-orders/:id', async (req, res) => {
  try {
    const wo = await db.get('SELECT wo.*, e.equipment_id AS equip_code, e.name AS equipment_name FROM work_orders wo JOIN equipment e ON wo.equipment_id = e.id WHERE wo.id = ?', [req.params.id]);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    res.json({
      ...wo,
      parts_used: JSON.parse(wo.parts_used || '[]'),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-orders
router.post('/work-orders', requireWriteAccess, async (req, res) => {
  try {
    const sanitized = sanitizeBody(req.body);
    const {
      equipment_id, type, priority = 'routine', title, description,
      reported_by, assigned_to = '', food_safety_impact = 0,
      affected_product = '', linked_deviation_id = null
    } = sanitized;

    if (!equipment_id || !type || !title || !description || !reported_by) {
      return res.status(400).json({ error: 'equipment_id, type, title, description, and reported_by are required' });
    }

    const equip = await db.get('SELECT * FROM equipment WHERE id = ?', [equipment_id]);
    if (!equip) return res.status(400).json({ error: 'Equipment not found' });

    const work_order_number = await nextWONumber();

    const info = await db.run(`
      INSERT INTO work_orders (work_order_number, equipment_id, type, priority, title, description, reported_by, assigned_to, food_safety_impact, affected_product, linked_deviation_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [work_order_number, equipment_id, type, priority, title, description, reported_by, assigned_to, food_safety_impact ? 1 : 0, affected_product, linked_deviation_id]);

    const created = await db.get('SELECT * FROM work_orders WHERE id = ?', [info.lastInsertRowid]);
    logAudit(req, 'create_work_order', 'work_orders', created.id, work_order_number, { new_values: { work_order_number, title, type, priority } });
    broadcast('work_order_created', created);
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/work-orders/:id
router.put('/work-orders/:id', requireWriteAccess, async (req, res) => {
  try {
    const wo = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const sanitized = sanitizeBody(req.body);
    const fields = [
      'type', 'priority', 'status', 'title', 'description', 'assigned_to',
      'work_performed', 'is_temporary_repair', 'temporary_repair_deadline',
      'temporary_repair_approved_by', 'post_maintenance_sanitation',
      'equipment_returned_to_service', 'food_safety_impact',
      'affected_product', 'product_disposition', 'linked_deviation_id'
    ];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (sanitized[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(sanitized[field]);
      }
    }

    if (sanitized.parts_used !== undefined) {
      updates.push('parts_used = ?');
      params.push(typeof sanitized.parts_used === 'string' ? sanitized.parts_used : JSON.stringify(sanitized.parts_used));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    if (updates.length === 1) return res.json(wo);

    params.push(req.params.id);
    await db.run(`UPDATE work_orders SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    logAudit(req, 'update_work_order', 'work_orders', req.params.id, wo.work_order_number, { old_values: {}, new_values: sanitized });
    broadcast('work_order_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-orders/:id/complete
router.post('/work-orders/:id/complete', requireWriteAccess, async (req, res) => {
  try {
    const wo = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const sanitized = sanitizeBody(req.body);
    const { work_performed = '', parts_used = [], post_maintenance_sanitation = 0, equipment_returned_to_service = 0 } = sanitized;

    const sessionUser = req.session?.user;
    const completedBy = sessionUser?.display_name || sessionUser?.username || '';

    await db.run(`
      UPDATE work_orders SET status = 'completed', work_performed = ?, parts_used = ?,
        completed_by = ?, completed_at = CURRENT_TIMESTAMP,
        post_maintenance_sanitation = ?, equipment_returned_to_service = ?,
        returned_to_service_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE returned_to_service_at END,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [work_performed, JSON.stringify(parts_used), completedBy, post_maintenance_sanitation ? 1 : 0, equipment_returned_to_service ? 1 : 0, equipment_returned_to_service ? 1 : 0, req.params.id]);

    const updated = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    logAudit(req, 'complete_work_order', 'work_orders', req.params.id, wo.work_order_number, { new_values: { completed_by: completedBy } });
    broadcast('work_order_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-orders/:id/verify
router.post('/work-orders/:id/verify', requireWriteAccess, async (req, res) => {
  try {
    const wo = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const sessionUser = req.session?.user;
    const verifiedBy = sessionUser?.display_name || sessionUser?.username || '';

    await db.run("UPDATE work_orders SET status = 'closed', verified_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [verifiedBy, req.params.id]);

    const updated = await db.get('SELECT * FROM work_orders WHERE id = ?', [req.params.id]);
    logAudit(req, 'verify_work_order', 'work_orders', req.params.id, wo.work_order_number, { new_values: { verified_by: verifiedBy, status: 'closed' } });
    broadcast('work_order_updated', updated);
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DASHBOARD ====================

// GET /api/maintenance/dashboard
router.get('/maintenance/dashboard', async (req, res) => {
  try {
    const totalEquipment = (await db.get('SELECT COUNT(*) as count FROM equipment')).count;
    const activeEquipment = (await db.get("SELECT COUNT(*) as count FROM equipment WHERE status = 'active'")).count;
    const criticalEquipment = (await db.get("SELECT COUNT(*) as count FROM equipment WHERE is_critical = 1 AND status = 'active'")).count;
    const overdueCount = (await db.get("SELECT COUNT(*) as count FROM pm_schedules WHERE is_active = 1 AND next_due_date < CURRENT_DATE")).count;
    const upcomingThisWeek = (await db.get("SELECT COUNT(*) as count FROM pm_schedules WHERE is_active = 1 AND next_due_date >= CURRENT_DATE AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'")).count;
    const openWorkOrders = (await db.get("SELECT COUNT(*) as count FROM work_orders WHERE status NOT IN ('completed','closed')")).count;

    // Completion rate this month
    const totalThisMonth = (await db.get("SELECT COUNT(*) as count FROM pm_completions WHERE completed_at >= date_trunc('month', CURRENT_DATE)")).count;
    const scheduledThisMonth = (await db.get("SELECT COUNT(*) as count FROM pm_schedules WHERE is_active = 1")).count;
    const completionRateThisMonth = scheduledThisMonth > 0 ? Math.round((totalThisMonth / scheduledThisMonth) * 100) : 0;

    res.json({ totalEquipment, activeEquipment, criticalEquipment, overdueCount, upcomingThisWeek, openWorkOrders, completionRateThisMonth });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
