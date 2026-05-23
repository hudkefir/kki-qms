/**
 * AuditService — auto-logs every data mutation with full context.
 *
 * Usage:
 *   import { AuditService } from '../services/AuditService.js';
 *
 *   await AuditService.logMutation('batches', 42, 'update', {
 *     before: { status: 'planned' },
 *     after:  { status: 'fermenting' },
 *     changedBy: { id: 7, username: 'hbay' },
 *     sessionInfo: { ip: req.ip, userAgent: req.get('user-agent'), sessionId: req.sessionID }
 *   });
 *
 *   const trail   = await AuditService.getHistory('batches', 42);
 *   const recent  = await AuditService.getRecentActivity(50);
 *
 * Writes to the existing `audit_logs` table (see migrations/01-core.sql).
 */

import db from '../database-pg.js';

/**
 * Compute a shallow diff between two objects.
 * Returns { changed: { field: { from, to } }, addedKeys, removedKeys }.
 * Compares scalars by value; deep objects via JSON.stringify (good enough for audit purposes).
 */
function diff(before = {}, after = {}) {
  const b = before || {};
  const a = after || {};
  const changed = {};
  const addedKeys = [];
  const removedKeys = [];

  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const key of keys) {
    const hasBefore = Object.prototype.hasOwnProperty.call(b, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(a, key);

    if (hasBefore && !hasAfter) {
      removedKeys.push(key);
      continue;
    }
    if (!hasBefore && hasAfter) {
      addedKeys.push(key);
      changed[key] = { from: undefined, to: a[key] };
      continue;
    }

    const bv = b[key];
    const av = a[key];
    const equal = (bv === av) ||
      (typeof bv === 'object' && typeof av === 'object' && JSON.stringify(bv) === JSON.stringify(av));
    if (!equal) {
      changed[key] = { from: bv, to: av };
    }
  }

  return { changed, addedKeys, removedKeys };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

class AuditServiceImpl {
  /**
   * Log a single mutation to the audit_logs table.
   *
   * @param {string} tableName            Resource type (e.g. 'batches', 'complaints').
   * @param {string|number} recordId      Primary key of the affected row.
   * @param {string} action               Action verb ('create' | 'update' | 'delete' | custom).
   * @param {object} ctx
   * @param {object} [ctx.before]         Row state before mutation (omit for create).
   * @param {object} [ctx.after]          Row state after mutation (omit for delete).
   * @param {object} [ctx.changedBy]      { id, username } of the actor.
   * @param {object} [ctx.sessionInfo]    { ip, userAgent, sessionId }.
   * @param {string} [ctx.resourceName]   Human-readable name (e.g. batch number).
   * @param {object} [ctx.extraDetails]   Arbitrary extra context merged into `details`.
   * @returns {Promise<{id:number}|null>} Inserted audit row id (or null on failure).
   */
  async logMutation(tableName, recordId, action, ctx = {}) {
    try {
      const before = ctx.before || null;
      const after = ctx.after || null;
      const computedDiff = diff(before || {}, after || {});

      const details = {
        diff: computedDiff,
        ...(ctx.extraDetails || {}),
      };

      const user = ctx.changedBy || {};
      const session = ctx.sessionInfo || {};

      const result = await db.run(
        `INSERT INTO audit_logs
          (user_id, username, action, resource_type, resource_id, resource_name,
           details, old_values, new_values, ip_address, user_agent, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id ?? null,
          user.username || 'system',
          action,
          tableName || '',
          String(recordId ?? ''),
          ctx.resourceName || '',
          safeStringify(details),
          safeStringify(before || {}),
          safeStringify(after || {}),
          session.ip || '',
          session.userAgent || '',
          session.sessionId || '',
        ]
      );

      return { id: result.lastInsertRowid };
    } catch (err) {
      console.error('[AuditService.logMutation] failed:', err.message);
      return null;
    }
  }

  /**
   * Return the audit trail for a single record, oldest → newest.
   * @param {string} tableName
   * @param {string|number} recordId
   * @returns {Promise<Array>}
   */
  async getHistory(tableName, recordId) {
    try {
      return await db.all(
        `SELECT * FROM audit_logs
         WHERE resource_type = ? AND resource_id = ?
         ORDER BY timestamp ASC, id ASC`,
        [tableName, String(recordId)]
      );
    } catch (err) {
      console.error('[AuditService.getHistory] failed:', err.message);
      return [];
    }
  }

  /**
   * Return recent mutations across all tables, newest first.
   * @param {number} [limit=100]
   * @returns {Promise<Array>}
   */
  async getRecentActivity(limit = 100) {
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
    try {
      return await db.all(
        `SELECT * FROM audit_logs
         ORDER BY timestamp DESC, id DESC
         LIMIT ?`,
        [safeLimit]
      );
    } catch (err) {
      console.error('[AuditService.getRecentActivity] failed:', err.message);
      return [];
    }
  }
}

export const AuditService = new AuditServiceImpl();
export default AuditService;
