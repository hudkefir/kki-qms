import { Router } from 'express';
import db from './database-pg.js';
import { requireAuth, requireRole } from './authMiddleware.js';
import { logAudit } from './auditMiddleware.js';

const router = Router();

// GET /api/audit-logs
router.get('/audit-logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { user, action, resource_type, search, date_from, date_to, page = 1, limit = 50 } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params = [];
    const countParams = [];

    if (user) {
      query += ' AND username = ?';
      countQuery += ' AND username = ?';
      params.push(user);
      countParams.push(user);
    }
    if (action) {
      query += ' AND action = ?';
      countQuery += ' AND action = ?';
      params.push(action);
      countParams.push(action);
    }
    if (resource_type) {
      query += ' AND resource_type = ?';
      countQuery += ' AND resource_type = ?';
      params.push(resource_type);
      countParams.push(resource_type);
    }
    if (date_from) {
      query += ' AND timestamp >= ?';
      countQuery += ' AND timestamp >= ?';
      params.push(date_from);
      countParams.push(date_from);
    }
    if (date_to) {
      query += ' AND timestamp <= ?';
      countQuery += ' AND timestamp <= ?';
      params.push(date_to + ' 23:59:59');
      countParams.push(date_to + ' 23:59:59');
    }
    if (search) {
      const s = `%${search}%`;
      query += ' AND (resource_name LIKE ? OR username LIKE ? OR action LIKE ? OR details LIKE ?)';
      countQuery += ' AND (resource_name LIKE ? OR username LIKE ? OR action LIKE ? OR details LIKE ?)';
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
    }

    const total = (await db.get(countQuery, countParams)).count;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = await db.all(query, params);

    // Parse JSON fields
    const parsed = logs.map(log => ({
      ...log,
      details: (() => { try { return JSON.parse(log.details); } catch { return {}; } })(),
      old_values: (() => { try { return JSON.parse(log.old_values || '{}'); } catch { return {}; } })(),
      new_values: (() => { try { return JSON.parse(log.new_values || '{}'); } catch { return {}; } })(),
    }));

    logAudit(req, 'view_audit_logs', 'audit_logs', '', '', { filters: { user, action, resource_type, date_from, date_to } });

    res.json({
      logs: parsed,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/export - CSV export
router.get('/audit-logs/export', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { user, action, resource_type, date_from, date_to } = req.query;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (user) { query += ' AND username = ?'; params.push(user); }
    if (action) { query += ' AND action = ?'; params.push(action); }
    if (resource_type) { query += ' AND resource_type = ?'; params.push(resource_type); }
    if (date_from) { query += ' AND timestamp >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND timestamp <= ?'; params.push(date_to + ' 23:59:59'); }

    query += ' ORDER BY timestamp DESC';
    const logs = await db.all(query, params);

    const header = 'ID,Timestamp,User,Action,Resource Type,Resource ID,Resource Name,IP Address,User Agent,Session ID,Details\n';
    const rows = logs.map(l => {
      const escape = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [l.id, l.timestamp, l.username, l.action, l.resource_type, l.resource_id, l.resource_name, l.ip_address, l.user_agent, l.session_id, escape(l.details)].map(escape).join(',');
    }).join('\n');

    logAudit(req, 'export_audit_logs', 'audit_logs', '', '', { count: logs.length });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(header + rows);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/stats - for dashboard widget
router.get('/audit-logs/stats', requireAuth, async (req, res) => {
  try {
    // Recent activity (last 20 actions)
    const recentActivity = await db.all(`
      SELECT id, timestamp, username, action, resource_type, resource_name
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    // Active users (last 24 hours)
    const activeUsers = await db.all(`
      SELECT DISTINCT username, MAX(timestamp) as last_active
      FROM audit_logs
      WHERE timestamp >= datetime('now', '-24 hours') AND username != 'anonymous'
      GROUP BY username
      ORDER BY last_active DESC
    `);

    // Failed logins (last 24 hours)
    const failedLogins = (await db.all(`
      SELECT * FROM audit_logs
      WHERE action = 'login_failed' AND timestamp >= datetime('now', '-24 hours')
      ORDER BY timestamp DESC
    `)).map(l => ({
      ...l,
      details: (() => { try { return JSON.parse(l.details); } catch { return {}; } })(),
    }));

    res.json({ recentActivity, activeUsers, failedLogins });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit-logs/filters - get unique values for filter dropdowns
router.get('/audit-logs/filters', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = (await db.all("SELECT DISTINCT username FROM audit_logs WHERE username != '' ORDER BY username")).map(r => r.username);
    const actions = (await db.all('SELECT DISTINCT action FROM audit_logs ORDER BY action')).map(r => r.action);
    const resourceTypes = (await db.all("SELECT DISTINCT resource_type FROM audit_logs WHERE resource_type != '' ORDER BY resource_type")).map(r => r.resource_type);

    res.json({ users, actions, resourceTypes });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/audit-trail/:resourceType/:resourceId - Per-record audit trail
router.get('/audit-trail/:resourceType/:resourceId', requireAuth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const logs = await db.all(
      'SELECT * FROM audit_logs WHERE (resource_type = ? OR resource_type = ?) AND resource_id = ? ORDER BY timestamp DESC LIMIT 100',
      [resourceType, resourceType + 's', resourceId]
    );
    res.json(logs);
  } catch (err) {
    console.error('Audit trail error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
