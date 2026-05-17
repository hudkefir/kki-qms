import { Router } from 'express';
import db from './database-pg.js';
import { requireAuth } from './authMiddleware.js';

const router = Router();

// Helper: compute overdue status
function computeOverdue(item) {
  if (!item || !item.due_date) return item;
  if (item.status === 'completed') return item;
  const today = new Date().toISOString().split('T')[0];
  if (item.due_date < today) {
    return { ...item, computed_overdue: true };
  }
  return item;
}

// ─── GET /operator-dashboard/unified — all work items for current user ─────
router.get('/operator-dashboard/unified', requireAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    const displayName = req.session.user.display_name || username;
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      operatorTasks,
      capaActionItems,
      pmSchedules,
      workOrders,
      dailyTasks,
      dailyCompletions,
      pickLists,
      plannerBatches,
      recentActivity,
    ] = await Promise.all([
      // 1. Operator Tasks (general task system)
      db.all(
        `SELECT *, 'operator_task' as source_type FROM operator_tasks
         WHERE assigned_to = $1
         ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         due_date ASC NULLS LAST`,
        [username]
      ),

      // 2. CAPA Action Items assigned to this user
      db.all(
        `SELECT ai.*, c.capa_id as capa_number, c.title as capa_title, 'capa_action_item' as source_type
         FROM capa_action_items ai
         JOIN capas c ON c.id = ai.capa_id
         WHERE ai.assigned_to = $1 OR ai.assigned_to = $2
         ORDER BY ai.due_date ASC NULLS LAST`,
        [username, displayName]
      ),

      // 3. PM Schedules assigned to this user
      db.all(
        `SELECT ps.*, e.name as equipment_name, e.equipment_id as equipment_code, e.location as equipment_location,
                'pm_task' as source_type
         FROM pm_schedules ps
         JOIN equipment e ON e.id = ps.equipment_id
         WHERE (ps.assigned_to = $1 OR ps.assigned_to = $2) AND ps.is_active = 1
         ORDER BY ps.next_due_date ASC NULLS LAST`,
        [username, displayName]
      ),

      // 4. Work Orders assigned to this user
      db.all(
        `SELECT wo.*, e.name as equipment_name, e.equipment_id as equipment_code,
                'work_order' as source_type
         FROM work_orders wo
         LEFT JOIN equipment e ON e.id = wo.equipment_id
         WHERE (wo.assigned_to = $1 OR wo.assigned_to = $2) AND wo.status != 'completed'
         ORDER BY CASE wo.priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'routine' THEN 2 ELSE 3 END,
         wo.created_at DESC`,
        [username, displayName]
      ),

      // 5. Daily Tasks assigned to this user
      db.all(
        `SELECT *, 'daily_task' as source_type FROM daily_tasks
         WHERE (assigned_to = $1 OR assigned_to = $2) AND is_active = 1
         ORDER BY sort_order ASC, task_name ASC`,
        [username, displayName]
      ),

      // 6. Today's daily task completions by this user
      db.all(
        `SELECT dtc.*, dt.task_name, dt.category
         FROM daily_task_completions dtc
         JOIN daily_tasks dt ON dt.id = dtc.daily_task_id
         WHERE dtc.completed_by = $1 AND dtc.date = $2`,
        [username, today]
      ),

      // 7. Pick Lists assigned to this user
      db.all(
        `SELECT *, 'pick_list' as source_type FROM pick_lists
         WHERE (picked_by = $1 OR picked_by = $2) AND status NOT IN ('shipped', 'cancelled')
         ORDER BY pick_date ASC NULLS LAST`,
        [username, displayName]
      ),

      // 8. Planner batches (recent non-completed)
      db.all(
        `SELECT *, 'planner_batch' as source_type FROM planner_batches
         WHERE status NOT IN ('completed', 'cancelled')
         ORDER BY production_date ASC
         LIMIT 10`
      ),

      // 9. Recent activity by this user (last 50 actions)
      db.all(
        `SELECT id, timestamp, action, resource_type, resource_id, resource_name
         FROM audit_logs
         WHERE username = $1
         ORDER BY timestamp DESC
         LIMIT 50`,
        [username]
      ),
    ]);

    // Compute overdue flags
    const enrichedOperatorTasks = operatorTasks.map(t => {
      if (t.due_date && t.status !== 'completed' && t.due_date < today) {
        return { ...t, status: 'overdue' };
      }
      return t;
    });

    const enrichedCapaItems = capaActionItems.map(t => {
      if (t.due_date && t.status !== 'completed' && t.due_date < today) {
        return { ...t, computed_overdue: true };
      }
      return t;
    });

    const enrichedPmSchedules = pmSchedules.map(ps => {
      if (ps.next_due_date && ps.next_due_date <= today) {
        return { ...ps, computed_overdue: true };
      }
      return ps;
    });

    // Build summary stats
    const allActive = [
      ...enrichedOperatorTasks.filter(t => t.status !== 'completed'),
      ...enrichedCapaItems.filter(t => t.status !== 'completed'),
      ...enrichedPmSchedules,
      ...workOrders,
      ...pickLists,
      ...plannerBatches,
    ];

    const stats = {
      total_active: allActive.length,
      overdue: [
        ...enrichedOperatorTasks.filter(t => t.status === 'overdue'),
        ...enrichedCapaItems.filter(t => t.computed_overdue),
        ...enrichedPmSchedules.filter(t => t.computed_overdue),
        ...workOrders.filter(wo => wo.priority === 'emergency'),
      ].length,
      due_this_week: allActive.filter(t => {
        const d = t.due_date || t.next_due_date || t.pick_date || t.production_date;
        return d && d >= today && d <= weekFromNow;
      }).length,
      completed_today: [
        ...enrichedOperatorTasks.filter(t => t.completed_at && t.completed_at.startsWith(today)),
        ...enrichedCapaItems.filter(t => t.completed_at && t.completed_at.startsWith(today)),
        ...dailyCompletions,
      ].length,
      operator_tasks: { active: enrichedOperatorTasks.filter(t => t.status !== 'completed').length, total: enrichedOperatorTasks.length },
      capa_items: { active: enrichedCapaItems.filter(t => t.status !== 'completed').length, total: enrichedCapaItems.length },
      pm_tasks: { due: enrichedPmSchedules.filter(ps => ps.next_due_date && ps.next_due_date <= weekFromNow).length, total: enrichedPmSchedules.length },
      work_orders: { active: workOrders.length },
      daily_tasks: { assigned: dailyTasks.length, completed_today: dailyCompletions.length },
      pick_lists: { active: pickLists.length },
      batches: { active: plannerBatches.length },
    };

    res.json({
      stats,
      operator_tasks: enrichedOperatorTasks,
      capa_action_items: enrichedCapaItems,
      pm_schedules: enrichedPmSchedules,
      work_orders: workOrders,
      daily_tasks: dailyTasks,
      daily_completions: dailyCompletions,
      pick_lists: pickLists,
      planner_batches: plannerBatches,
      recent_activity: recentActivity,
    });
  } catch (err) {
    console.error('GET /operator-dashboard/unified error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /operator-dashboard/preferences — load saved layout preferences ────
router.get('/operator-dashboard/preferences', requireAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    // Try to load from a simple key-value store (we'll use operator_tasks_comments table pattern)
    // For now, check if preferences table exists, if not return defaults
    try {
      const pref = await db.get(
        'SELECT preferences FROM operator_dashboard_preferences WHERE username = $1',
        [username]
      );
      if (pref) {
        return res.json(JSON.parse(pref.preferences));
      }
    } catch {
      // Table doesn't exist yet — that's fine, return defaults
    }

    // Default preferences
    res.json({
      visible_widgets: ['stats', 'operator_tasks', 'capa_items', 'pm_tasks', 'work_orders', 'daily_tasks', 'pick_lists', 'batches', 'activity'],
      widget_order: ['stats', 'operator_tasks', 'capa_items', 'pm_tasks', 'work_orders', 'daily_tasks', 'pick_lists', 'batches', 'activity'],
      compact_mode: false,
    });
  } catch (err) {
    console.error('GET /operator-dashboard/preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /operator-dashboard/preferences — save layout preferences ──────────
router.put('/operator-dashboard/preferences', requireAuth, async (req, res) => {
  try {
    const username = req.session.user.username;
    const preferences = JSON.stringify(req.body);
    const now = new Date().toISOString();

    // Ensure table exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS operator_dashboard_preferences (
        username TEXT PRIMARY KEY,
        preferences TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Upsert
    await db.run(
      `INSERT INTO operator_dashboard_preferences (username, preferences, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET preferences = $2, updated_at = $3`,
      [username, preferences, now]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /operator-dashboard/preferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
