// Authentication and authorization middleware

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Check if user is still active
  if (!req.session.user.active) {
    req.session.destroy();
    return res.status(401).json({ error: 'Account disabled' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// For routes that managers+ can write, viewers can only read
export function requireWriteAccess(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const role = req.session.user.role;
  if (role === 'viewer' || role === 'operator') {
    return res.status(403).json({ error: 'Read-only access. Contact an admin for write permissions.' });
  }
  next();
}

// For routes where operators can contribute content (notes, descriptions, root cause)
// Blocks only viewers — allows operator, manager, admin
export function requireContentAccess(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.user.role === 'viewer') {
    return res.status(403).json({ error: 'Read-only access.' });
  }
  next();
}
