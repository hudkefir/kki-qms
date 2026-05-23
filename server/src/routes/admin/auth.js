import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../database-pg.js';
import { requireAuth, requireRole } from '../../authMiddleware.js';
import { logAudit } from '../../auditMiddleware.js';

const router = Router();

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      await logAudit(req, 'login_failed', 'auth', '', username || '', { reason: 'Missing credentials' });
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      await logAudit(req, 'login_failed', 'auth', '', username, { reason: 'User not found' });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.active) {
      await logAudit(req, 'login_failed', 'auth', user.id, username, { reason: 'Account disabled' });
      return res.status(401).json({ error: 'Account is disabled. Contact an administrator.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      await logAudit(req, 'login_failed', 'auth', user.id, username, { reason: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      active: user.active,
    };

    await logAudit(req, 'login', 'auth', user.id, user.username, { role: user.role });

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', async (req, res) => {
  const user = req.session?.user;
  if (user) {
    await logAudit(req, 'logout', 'auth', user.id, user.username, {});
  }
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('kki.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me and /api/auth/status - get current user
router.get(['/auth/me', '/auth/status'], async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Re-check user is still active from DB
  const user = await await db.get('SELECT id, username, display_name, role, active FROM users WHERE id = ?', [req.session.user.id]);
  if (!user || !user.active) {
    req.session.destroy();
    return res.status(401).json({ error: 'Account disabled' });
  }
  // Update session with latest role
  req.session.user = { ...req.session.user, role: user.role, active: user.active, display_name: user.display_name };
  res.json(user);
});

// ==================== USER MANAGEMENT (admin only) ====================

// GET /api/users
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await await db.all('SELECT id, username, display_name, role, active, created_at, updated_at FROM users ORDER BY username', []);
    await logAudit(req, 'view_users', 'users', '', '', {});
    res.json(users);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, display_name = '', role = 'viewer' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!['admin', 'manager', 'viewer', 'operator'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const info = await db.run(`
      INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)
    `, [username, hash, display_name || username, role]);

    const created = await await db.get('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?', [info.lastInsertRowid]);
    await logAudit(req, 'create_user', 'users', created.id, username, { new_values: { username, display_name: display_name || username, role } });
    res.status(201).json(created);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id
router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { display_name, role, active } = req.body;
    const updates = [];
    const params = [];
    const changes = {};

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
      changes.display_name = display_name;
    }
    if (role !== undefined) {
      if (!['admin', 'manager', 'viewer', 'operator'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      params.push(role);
      changes.role = { from: user.role, to: role };
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
      changes.active = { from: user.active, to: active ? 1 : 0 };
    }

    if (updates.length === 0) return res.json(user);

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(req.params.id);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await await db.get('SELECT id, username, display_name, role, active, created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
    const oldValues = {};
    const newValues = {};
    if (display_name !== undefined && display_name !== user.display_name) { oldValues.display_name = user.display_name; newValues.display_name = display_name; }
    if (role !== undefined && role !== user.role) { oldValues.role = user.role; newValues.role = role; }
    if (active !== undefined && (active ? 1 : 0) !== user.active) { oldValues.active = user.active; newValues.active = active ? 1 : 0; }
    await logAudit(req, 'update_user', 'users', user.id, user.username, { old_values: oldValues, new_values: newValues });
    res.json(updated);
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting yourself
    if (req.session.user.id === user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft-delete: deactivate instead of hard delete to preserve audit trail
    await db.run("UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    await logAudit(req, 'delete_user', 'users', user.id, user.username, { old_values: { active: 1 }, new_values: { active: 0 } });

    // Destroy any active sessions for this user
    // (Session store cleanup will handle expired sessions)

    res.json({ success: true, message: `User ${user.username} deactivated` });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/reset-password
router.post('/users/:id/reset-password', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const user = await await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = bcrypt.hashSync(password, 10);
    await db.run("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hash, req.params.id]);

    await logAudit(req, 'reset_password', 'users', user.id, user.username, {});
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
