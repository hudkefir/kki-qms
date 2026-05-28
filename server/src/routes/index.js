// Barrel re-exports for all route modules, organized by domain.
// Import sites can pull a route via:
//   import { complaintRoutes } from './routes/index.js';
// or stay specific with the per-file path.

// quality
export { default as routes } from './quality/dashboard.js';
export { default as complaintRoutes } from './quality/complaints.js';
export { default as changeControlRoutes } from './quality/changeControls.js';
export { default as batchTestRoutes } from './quality/batchTests.js';
export { default as recallRoutes } from './quality/recalls.js';
export { default as maintenanceRoutes } from './quality/maintenance.js';
export { default as environmentalRoutes } from './quality/environmental.js';
export { default as taskboardRoutes } from './quality/taskboard.js';
export { default as dailyTaskRoutes } from './quality/dailyTasks.js';
export { default as linkRoutes } from './quality/links.js';
export { default as formRoutes } from './quality/forms.js';
export { default as printRoutes } from './quality/print.js';

// inventory
export { default as inventoryRoutes } from './inventory/stock.js';
export { default as pickListRoutes } from './inventory/picks.js';
export { default as sosRoutes } from './inventory/sos.js';
export { default as itemRoutes } from './inventory/items.js';
export { default as lotRoutes } from './inventory/lots.js';

// documents
export { default as documentRoutes } from './documents/documents.js';
export { default as fileRoutes } from './documents/files.js';
export { default as simpleDocRoutes } from './documents/simpleDocs.js';

// admin
export { default as adminRoutes } from './admin/admin.js';
export { default as authRoutes } from './admin/auth.js';
export { default as supplierRoutes } from './admin/suppliers.js';
export { default as operatorDashboardRoutes } from './admin/operators.js';
export { default as operatorTaskRoutes } from './admin/operatorTasks.js';

// shared
export { default as auditRoutes } from './shared/audit.js';
export { default as aiRoutes } from './shared/ai.js';
export { default as aiChatRoutes } from './shared/aiChat.js';
export { default as diagnosticsRoutes } from './shared/diagnostics.js';
export { default as emailRoutes } from './shared/email.js';

// legacy
export { default as plannerRoutes } from './legacy/planner.js';
export { default as journalRoutes } from './legacy/journal.js';
