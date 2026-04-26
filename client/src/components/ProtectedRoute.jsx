import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AccessDenied from './AccessDenied';

/**
 * Wraps a page component with role-based access control.
 * Shows a friendly AccessDenied page instead of a blank/error page.
 *
 * Usage: <ProtectedRoute roles={['admin']} label="Admin"><UserManagement /></ProtectedRoute>
 *        <ProtectedRoute roles={['admin', 'manager']}><CAPAs /></ProtectedRoute>
 */
export default function ProtectedRoute({ roles, label, children }) {
  const { hasRole } = useAuth();

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    const roleLabel = label || roles.join(' or ');
    return <AccessDenied requiredRole={roleLabel} />;
  }

  return children;
}
