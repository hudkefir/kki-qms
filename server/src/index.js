import express from 'express';
import { requestLogger } from "./requestLogger.js";
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import db, { checkDbHealth } from './database-pg.js';
import routes from './routes.js';
import complaintRoutes from './complaintRoutes.js';
import authRoutes from './authRoutes.js';
import auditRoutes from './auditRoutes.js';
import fileRoutes from './fileRoutes.js';
import simpleDocRoutes from './simpleDocRoutes.js';
import adminRoutes from './adminRoutes.js';
import batchTestRoutes from './batchTestRoutes.js';
import formRoutes from './formRoutes.js';
import taskboardRoutes from './taskboardRoutes.js';
import changeControlRoutes from './changeControlRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import recallRoutes from './recallRoutes.js';
import sosRoutes from './sosRoutes.js';
import printRoutes from './printRoutes.js';
import environmentalRoutes from './environmentalRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import linkRoutes from './linkRoutes.js';
import aiRoutes from './aiRoutes.js';
import aiChatRoutes from './aiChatRoutes.js';
import journalRoutes from './journalRoutes.js';
import emailRoutes from './emailRoutes.js';
import diagnosticsRoutes from './diagnosticsRoutes.js';
import { setupWebSocket } from './websocket.js';
import { requireAuth } from './authMiddleware.js';
import { auditApiMiddleware } from './auditMiddleware.js';
import { repairSOPDocuments } from './sopDocumentRepair.js';
import { validateNumericParams } from './validateId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load build version info (generated at Docker build time or by prebuild script)
let versionInfo = { commit: 'dev', buildTime: 'unknown' };
try {
  const versionPath = join(__dirname, '..', '..', 'version.json');
  versionInfo = JSON.parse(readFileSync(versionPath, 'utf8'));
} catch {
  // version.json not found — running locally without a build step
}

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3002;

// Session store — Postgres-backed (persists across Cloud Run restarts)
const PgStore = pgSession(session);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins for API integration (dev + cloudflare tunnels)
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);

// Trust proxy for correct IP in audit logs
app.set('trust proxy', 1);

// Session middleware — Postgres-backed (shared cookie across *.kefirkultures.com)
app.use(session({
  store: new PgStore({
    pool: db.pool,
    tableName: 'sessions',
    pruneSessionInterval: 900, // Clear expired sessions every 15 min (seconds)
  }),
  secret: process.env.SESSION_SECRET || 'kki-shared-session-secret-2026',
  name: 'kki.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
}));

// Validate numeric ID parameters globally to prevent injection/crash on string IDs.
// Catches any /api/.../:id or /api/.../:id/... pattern where :id segment should be numeric.
app.use('/api', (req, res, next) => {
  // Extract path segments and check common ID patterns
  const segments = req.path.split('/').filter(Boolean);
  // Check segments that follow known resource names (sops, complaints, ccrs, users, documents, audit, files)
  const resources = ['sops', 'complaints', 'ccrs', 'users', 'documents', 'audit', 'files', 'corrective-actions', 'batch-tests', 'daily-tasks', 'sop-forms', 'change-requests', 'deviations', 'capas', 'change-control', 'equipment', 'pm-schedules', 'work-orders', 'recalls', 'traceability-exercises', 'crisis-events', 'recall', 'suppliers', 'links', 'inventory', 'picklists'];
  for (let i = 0; i < segments.length - 1; i++) {
    if (resources.includes(segments[i])) {
      const idSegment = segments[i + 1];
      // Skip known sub-paths that aren't IDs
      if (['analytics', 'upload', 'by-lot', 'bulk-read-content', 'status', 'admin', 'completions', 'templates', 'results', 'verify', 'bulk', 'summary', 'fields', 'entries', 'forms', 'operators', 'export', 'admin-override', 'unlock', 'load', 'classify', 'approve', 'reject', 'effectiveness', 'investigate', 'disposition', 'dashboard', 'overdue', 'upcoming', 'complete', 'hold', 'notify-cfia', 'notify-customers', 'distribution', 'close', 'resolve', 'parse-coa-multi', 'print', 'environmental', 'updates', 'link-batch', 'link-complaint', 'available-complaints', 'available-batches', 'audit-trail', 'suggest-links', 'import', 'reviews', 'checklist', 'search', 'suggestions', 'capa', 'deviation', 'complaint', 'ccr', 'change_request', 'batch_test', 'sop', 'counts', 'skus', 'sos', 'activities'].includes(idSegment)) continue;
      if (!/^\d+$/.test(idSegment)) {
        return res.status(400).json({ error: `Invalid ID '${idSegment}': must be a numeric value` });
      }
    }
  }
  next();
});

// Taskboard routes (no auth — standalone Cloudflare Pages board)
app.use('/api/taskboard', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.endsWith('.pages.dev') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use("/api/taskboard", (req, res, next) => { console.log("[TB]", req.method, req.path); next(); }, taskboardRoutes);


// Health endpoint (public — no auth, for Cloud Run probes)
app.get('/api/health', async (req, res) => {
  try {
    await checkDbHealth();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: versionInfo });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Version endpoint (public — for frontend footer)
app.get('/api/version', (req, res) => {
  res.json(versionInfo);
});

// Auth routes (no auth required for login)
app.use('/api', authRoutes);

// Audit API middleware (auto-logs mutations)
app.use('/api', auditApiMiddleware);

// Protected API routes - require auth
app.use('/api', requireAuth, routes);
app.use('/api', requireAuth, complaintRoutes);
app.use('/api', requireAuth, auditRoutes);
app.use('/api', requireAuth, fileRoutes);
app.use('/api', requireAuth, simpleDocRoutes);
app.use('/api', requireAuth, adminRoutes);
app.use('/api', requireAuth, diagnosticsRoutes);
app.use('/api', requireAuth, batchTestRoutes);
app.use('/api', requireAuth, formRoutes);
app.use('/api', requireAuth, changeControlRoutes);
app.use('/api', requireAuth, maintenanceRoutes);
app.use('/api', requireAuth, recallRoutes);
app.use('/api', requireAuth, sosRoutes);
app.use('/api', printRoutes);
app.use('/api', requireAuth, environmentalRoutes);
// Supplier external activity endpoint (Jarvis auto-log, no session auth - uses API key)
app.post('/api/suppliers/activities/external', (req, res, next) => {
  const apiKey = process.env.QMS_API_KEY;
  if (apiKey && req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}, supplierRoutes);
app.use('/api', requireAuth, supplierRoutes);
app.use('/api', requireAuth, linkRoutes);
app.use('/api', requireAuth, aiRoutes);
app.use('/api', requireAuth, aiChatRoutes);
app.use('/api', requireAuth, journalRoutes);
app.use('/api', requireAuth, emailRoutes);

// Global error handler — prevent stack trace leaks
app.use((err, req, res, _next) => {
  // Handle multer errors gracefully
  if (err.name === 'MulterError' || err.message?.includes('Only PDF')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve uploaded files (batch testing docs, etc.)
const uploadsDir = join(__dirname, '..', '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Serve static files in production
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(clientDist, 'index.html'));
  }
});

// WebSocket
setupWebSocket(server);

// Startup health check — fail closed if Postgres unreachable
try {
  await checkDbHealth();
} catch (err) {
  console.error('FATAL: Database health check failed:', err.message);
  console.error('Refusing to start — fix DB connectivity before deploying.');
  process.exit(1);
}

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`KKI QMS Server running on http://0.0.0.0:${PORT}`);

  // Run SOP document repair on startup
  try {
    await repairSOPDocuments();
  } catch (error) {
    console.error('Startup repair failed:', error);
  }
});

export default app;
