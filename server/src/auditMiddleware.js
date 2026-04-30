import db from './database-pg.js';

// Log an audit event
export async function logAudit(req, action, resourceType, resourceId, resourceName, details = {}) {
  try {
    const user = req.session?.user;
    const oldValues = details.old_values || {};
    const newValues = details.new_values || {};
    await db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, resource_type, resource_id, resource_name, details, old_values, new_values, ip_address, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user?.id || null,
      user?.username || 'anonymous',
      action,
      resourceType || '',
      String(resourceId || ''),
      resourceName || '',
      JSON.stringify(details),
      JSON.stringify(oldValues),
      JSON.stringify(newValues),
      req.ip || req.connection?.remoteAddress || '',
      req.get('user-agent') || '',
      req.sessionID || ''
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Middleware that auto-logs POST/PUT/DELETE API calls
export function auditApiMiddleware(req, res, next) {
  // Only log mutations
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip auth routes from auto-logging (they log themselves)
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  // Capture the original json method to intercept response
  const originalJson = res.json.bind(res);
  const startBody = { ...req.body };

  res.json = function(data) {
    // Auto-log the mutation after it succeeds
    if (res.statusCode < 400) {
      try {
        const pathParts = req.path.split('/').filter(Boolean);
        // Determine resource type from path: /sops, /complaints, /ccrs, etc.
        let resourceType = pathParts[0] || '';
        let resourceId = '';
        let resourceName = '';
        let action = '';

        if (req.method === 'POST') action = `create_${resourceType}`;
        else if (req.method === 'PUT') action = `update_${resourceType}`;
        else if (req.method === 'DELETE') action = `delete_${resourceType}`;

        // Try to determine resource ID and name
        if (pathParts.length >= 2 && !isNaN(pathParts[1])) {
          resourceId = pathParts[1];
        }

        // Handle nested routes like /sops/:id/revisions
        if (pathParts.length >= 3) {
          const subResource = pathParts[2];
          if (subResource === 'revisions') action = 'create_revision';
          else if (subResource === 'comments') action = 'create_comment';
          else if (subResource === 'complaints') action = 'link_complaints';
          else if (subResource === 'actions') {
            action = pathParts.length >= 4 ? 'update_action' : 'create_action';
          }
          else if (subResource === 'upload') action = 'upload_file';
          resourceType = pathParts[0];
        }

        // Get resource name from response data
        if (data) {
          resourceName = data.sop_number || data.complaint_number || data.ccr_number || data.title || data.filename || '';
          if (!resourceId && data.id) resourceId = String(data.id);
        }

        const details = {};
        if (req.method === 'POST') {
          details.created = sanitizeForLog(startBody);
        } else if (req.method === 'PUT') {
          details.changes = sanitizeForLog(startBody);
        } else if (req.method === 'DELETE') {
          details.deleted = true;
        }

        logAudit(req, action, resourceType, resourceId, resourceName, details);
      } catch (err) {
        console.error('Auto audit log error:', err.message);
      }
    }

    return originalJson(data);
  };

  next();
}

function sanitizeForLog(obj) {
  const sanitized = { ...obj };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.password_hash;
  // Truncate long text fields
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
      sanitized[key] = sanitized[key].slice(0, 500) + '...';
    }
  }
  return sanitized;
}
