import { Router } from 'express';
import db from '../../database-pg.js';

const router = Router();

// GET /dashboard — today's production overview
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      fermentingList,
      readyList,
      ordersToday,
      ordersInProgress,
      poursToday,
      tasksToday,
      recentActivity,
    ] = await Promise.all([
      db.all(`
        SELECT * FROM production_fermentation
         WHERE status = 'fermenting'
         ORDER BY expected_ready_date ASC NULLS LAST, start_date ASC
      `),
      db.all(`
        SELECT * FROM production_fermentation
         WHERE status = 'ready'
         ORDER BY actual_ready_date DESC NULLS LAST, id DESC
      `),
      db.all(`
        SELECT po.*, f.batch_code AS fermentation_batch_code
          FROM production_orders po
          LEFT JOIN production_fermentation f ON po.fermentation_id = f.id
         WHERE po.planned_date = ?
         ORDER BY po.id ASC
      `, [today]),
      db.all(`
        SELECT po.*, f.batch_code AS fermentation_batch_code
          FROM production_orders po
          LEFT JOIN production_fermentation f ON po.fermentation_id = f.id
         WHERE po.status IN ('in_progress','flavouring','pouring','packing','qa_hold')
         ORDER BY po.planned_date ASC NULLS LAST, po.id ASC
      `),
      db.all(`
        SELECT * FROM production_pours WHERE pour_date = ? ORDER BY id ASC
      `, [today]),
      db.all(`
        SELECT * FROM production_taskboard
         WHERE task_date = ?
         ORDER BY priority DESC, id ASC
      `, [today]),
      db.all(`
        SELECT id, timestamp, username, action, resource_type, resource_id, resource_name
          FROM audit_logs
         WHERE resource_type IN (
           'production_fermentation','production_orders','production_pours',
           'production_flavouring','bom_versions','bom_lines','production_taskboard'
         )
         ORDER BY timestamp DESC, id DESC
         LIMIT 20
      `),
    ]);

    res.json({
      fermentation_active: { count: fermentingList.length, list: fermentingList },
      fermentation_ready:  { count: readyList.length,      list: readyList },
      orders_today:        { count: ordersToday.length,    list: ordersToday },
      orders_in_progress:  { count: ordersInProgress.length, list: ordersInProgress },
      pours_today:         { count: poursToday.length,     list: poursToday },
      tasks_today:         { count: tasksToday.length,     list: tasksToday },
      recent_activity:     recentActivity,
    });
  } catch (err) {
    console.error('production dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
