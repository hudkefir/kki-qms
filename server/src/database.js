import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = process.env.KKI_DATA_DIR || join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'qms.db');
const db = new Database(dbPath);

// SAFETY CHECK: REFUSE to start without KKI_DATA_DIR in production
if (!process.env.KKI_DATA_DIR) {
  console.error("");
  console.error("🚨 FATAL: KKI_DATA_DIR not set!");
  console.error("🚨 The server would use the WRONG database and you would lose data.");
  console.error("🚨 Production DB: /Users/kefirbot/KKI/Databases/qms.db");
  console.error("🚨 Use: bash restart-server.sh");
  console.error("");
  if (!process.env.QMS_ALLOW_FALLBACK_DB) {
    console.error("Refusing to start. Set QMS_ALLOW_FALLBACK_DB=1 to override (dev only).");
    process.exit(1);
  }
  console.error("⚠️  QMS_ALLOW_FALLBACK_DB set — using fallback DB. NOT PRODUCTION.");
}
console.log('📂 Database: ' + dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category_code TEXT NOT NULL,
    category_name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','active','archived')),
    costco_cleanup_status TEXT DEFAULT 'not_yet_built' CHECK(costco_cleanup_status IN ('clean','needs_costco_strip','not_yet_built')),
    owner TEXT DEFAULT '',
    reviewer TEXT DEFAULT '',
    approver TEXT DEFAULT '',
    effective_date TEXT,
    next_review_date TEXT,
    last_updated TEXT,
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sop_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    version TEXT NOT NULL,
    changed_by TEXT DEFAULT '',
    change_description TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  CREATE TABLE IF NOT EXISTS sop_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_type TEXT DEFAULT '',
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  CREATE TABLE IF NOT EXISTS sop_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    author TEXT DEFAULT '',
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  CREATE TABLE IF NOT EXISTS audit_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    requirement TEXT NOT NULL,
    category TEXT DEFAULT '',
    status TEXT DEFAULT 'not_met' CHECK(status IN ('met','partial','not_met','na')),
    notes TEXT DEFAULT '',
    evidence_ref TEXT DEFAULT '',
    checked_by TEXT DEFAULT '',
    checked_at TEXT,
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_number TEXT UNIQUE NOT NULL,
    date_received TEXT NOT NULL,
    source TEXT DEFAULT '',
    reporter TEXT DEFAULT '',
    store_location TEXT DEFAULT '',
    product_sku TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    lot_number TEXT DEFAULT '',
    best_before TEXT DEFAULT '',
    quantity_affected INTEGER DEFAULT 0,
    issue_type TEXT DEFAULT '',
    severity TEXT DEFAULT 'low' CHECK(severity IN ('low','medium','high','critical')),
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','corrective_action','resolved','closed')),
    linked_ccr_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (linked_ccr_id) REFERENCES ccrs(id)
  );

  CREATE TABLE IF NOT EXISTS ccrs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ccr_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    date_created TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','in_review','approved','sent','closed')),
    recipient_company TEXT DEFAULT '',
    recipient_contact TEXT DEFAULT '',
    recipient_email TEXT DEFAULT '',
    root_causes TEXT DEFAULT '[]',
    preventive_measures TEXT DEFAULT '[]',
    target_resolution_date TEXT,
    actual_resolution_date TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ccr_complaints (
    ccr_id INTEGER NOT NULL,
    complaint_id INTEGER NOT NULL,
    PRIMARY KEY (ccr_id, complaint_id),
    FOREIGN KEY (ccr_id) REFERENCES ccrs(id),
    FOREIGN KEY (complaint_id) REFERENCES complaints(id)
  );

  CREATE TABLE IF NOT EXISTS corrective_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ccr_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    responsible TEXT DEFAULT '',
    target_date TEXT,
    completion_date TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','overdue')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ccr_id) REFERENCES ccrs(id)
  );

  -- Users table for authentication
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','manager','viewer','operator')),
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Session store table
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  );

  -- Audit logs table (append-only)
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    user_id INTEGER,
    username TEXT DEFAULT '',
    action TEXT NOT NULL,
    resource_type TEXT DEFAULT '',
    resource_id TEXT DEFAULT '',
    resource_name TEXT DEFAULT '',
    details TEXT DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    session_id TEXT DEFAULT ''
  );

  -- Documents table (global document library)
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT DEFAULT 'general',
    linked_type TEXT,
    linked_id INTEGER,
    description TEXT,
    uploaded_by TEXT,
    upload_date TEXT DEFAULT (datetime('now')),
    version INTEGER DEFAULT 1,
    tags TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Batch tests table (production QC)
  CREATE TABLE IF NOT EXISTS batch_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_number TEXT NOT NULL,
    product_sku TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    test_date TEXT NOT NULL,
    tested_by TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pass','fail','pending','to_be_shipped')),
    notes TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    updated_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Batch test results table
  CREATE TABLE IF NOT EXISTS batch_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_test_id INTEGER NOT NULL,
    test_type TEXT NOT NULL,
    test_name TEXT NOT NULL,
    target_value TEXT DEFAULT '',
    actual_value TEXT DEFAULT '',
    unit TEXT DEFAULT '',
    pass_fail TEXT DEFAULT 'pending' CHECK(pass_fail IN ('pass','fail','pending','na')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (batch_test_id) REFERENCES batch_tests(id) ON DELETE CASCADE
  );

  -- Daily tasks template table
  CREATE TABLE IF NOT EXISTS daily_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('daily','per_shift','weekly')),
    description TEXT DEFAULT '',
    sop_reference TEXT DEFAULT '',
    color TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Daily task completions table
  CREATE TABLE IF NOT EXISTS daily_task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_task_id INTEGER NOT NULL,
    completed_by TEXT NOT NULL,
    completed_at TEXT DEFAULT (datetime('now')),
    shift TEXT DEFAULT 'morning' CHECK(shift IN ('morning','afternoon','evening')),
    date TEXT NOT NULL,
    status TEXT DEFAULT 'done' CHECK(status IN ('done','skipped','na')),
    notes TEXT DEFAULT '',
    locked INTEGER DEFAULT 0,
    verified_by TEXT DEFAULT '',
    verified_at TEXT,
    admin_modified_by TEXT DEFAULT '',
    admin_modified_at TEXT,
    admin_modify_reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (daily_task_id) REFERENCES daily_tasks(id)
  );

  -- Daily task templates (collections of pre-set tasks)
  CREATE TABLE IF NOT EXISTS daily_task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Daily task template items
  CREATE TABLE IF NOT EXISTS daily_task_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    sop_reference TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    color TEXT DEFAULT '',
    FOREIGN KEY (template_id) REFERENCES daily_task_templates(id) ON DELETE CASCADE
  );

  -- SOP files table (versioned documents)
  CREATE TABLE IF NOT EXISTS sop_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT DEFAULT '',
    file_size INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    uploaded_by TEXT DEFAULT '',
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  -- SOP Forms (logbooks, checklists, inspection records, etc.)
  CREATE TABLE IF NOT EXISTS sop_forms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_id INTEGER NOT NULL,
    form_number TEXT NOT NULL,
    title TEXT NOT NULL,
    form_type TEXT DEFAULT 'record' CHECK(form_type IN ('logbook','checklist','inspection','record','report')),
    description TEXT DEFAULT '',
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_id) REFERENCES sops(id)
  );

  -- SOP Form Fields (define the structure of each form)
  CREATE TABLE IF NOT EXISTS sop_form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_form_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT DEFAULT 'text' CHECK(field_type IN ('text','number','date','checkbox','select','signature','temperature','time')),
    field_options TEXT DEFAULT '[]',
    required INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    section_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_form_id) REFERENCES sop_forms(id) ON DELETE CASCADE
  );

  -- SOP Form Entries (submitted form data)
  CREATE TABLE IF NOT EXISTS sop_form_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sop_form_id INTEGER NOT NULL,
    entry_data TEXT DEFAULT '{}',
    submitted_by TEXT DEFAULT '',
    submitted_at TEXT DEFAULT (datetime('now')),
    shift TEXT DEFAULT '',
    date TEXT NOT NULL,
    verified_by TEXT DEFAULT '',
    verified_at TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','submitted','verified')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sop_form_id) REFERENCES sop_forms(id) ON DELETE CASCADE
  );
`);

// Create index on audit_logs for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
  CREATE INDEX IF NOT EXISTS idx_sop_files_sop_id ON sop_files(sop_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
  CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
  CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents(linked_type, linked_id);
  CREATE INDEX IF NOT EXISTS idx_batch_tests_date ON batch_tests(test_date);
  CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(status);
  CREATE INDEX IF NOT EXISTS idx_batch_test_results_test_id ON batch_test_results(batch_test_id);
  CREATE INDEX IF NOT EXISTS idx_daily_tasks_category ON daily_tasks(category);
  CREATE INDEX IF NOT EXISTS idx_daily_task_completions_date ON daily_task_completions(date);
  CREATE INDEX IF NOT EXISTS idx_daily_task_completions_task ON daily_task_completions(daily_task_id);
  CREATE INDEX IF NOT EXISTS idx_sop_forms_sop_id ON sop_forms(sop_id);
  CREATE INDEX IF NOT EXISTS idx_sop_forms_status ON sop_forms(status);
  CREATE INDEX IF NOT EXISTS idx_sop_form_fields_form_id ON sop_form_fields(sop_form_id);
  CREATE INDEX IF NOT EXISTS idx_sop_form_entries_form_id ON sop_form_entries(sop_form_id);
  CREATE INDEX IF NOT EXISTS idx_sop_form_entries_date ON sop_form_entries(date);
`);

// Migrations for existing databases
try {
  db.exec(`ALTER TABLE documents ADD COLUMN download_count INTEGER DEFAULT 0`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE audit_checklist ADD COLUMN evidence_ref TEXT DEFAULT ''`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE audit_checklist ADD COLUMN category TEXT DEFAULT ''`);
} catch (e) {
  // Column already exists
}

// Add extracted content fields to sops table
const sopContentColumns = [
  { name: 'scope', def: "TEXT DEFAULT ''" },
  { name: 'procedure_text', def: "TEXT DEFAULT ''" },
  { name: 'responsibilities', def: "TEXT DEFAULT ''" },
  { name: 'materials_equipment', def: "TEXT DEFAULT ''" },
  { name: 'sop_references', def: "TEXT DEFAULT ''" },
];
for (const col of sopContentColumns) {
  try {
    db.exec(`ALTER TABLE sops ADD COLUMN ${col.name} ${col.def}`);
  } catch (e) {
    // Column already exists
  }
}

// Batch 2 migrations: dedicated old_values/new_values on audit_logs
for (const col of ['old_values', 'new_values']) {
  try {
    db.exec(`ALTER TABLE audit_logs ADD COLUMN ${col} TEXT DEFAULT '{}'`);
  } catch (e) {
    // Column already exists
  }
}

// Batch 2 migrations: created_by / updated_by on resource tables
const userAttrCols = [
  { table: 'complaints', col: 'created_by', def: "TEXT DEFAULT ''" },
  { table: 'complaints', col: 'updated_by', def: "TEXT DEFAULT ''" },
  { table: 'ccrs', col: 'created_by', def: "TEXT DEFAULT ''" },
  { table: 'ccrs', col: 'updated_by', def: "TEXT DEFAULT ''" },
  { table: 'corrective_actions', col: 'created_by', def: "TEXT DEFAULT ''" },
  { table: 'corrective_actions', col: 'updated_by', def: "TEXT DEFAULT ''" },
  { table: 'sops', col: 'created_by', def: "TEXT DEFAULT ''" },
  { table: 'sops', col: 'updated_by', def: "TEXT DEFAULT ''" },
  { table: 'documents', col: 'created_by', def: "TEXT DEFAULT ''" },
];
for (const { table, col, def } of userAttrCols) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  } catch (e) {
    // Column already exists
  }
}

// Batch testing regulatory profile migrations
const batchTestNewCols = [
  { table: 'batch_tests', col: 'test_profile', def: "TEXT DEFAULT 'routine'" },
  { table: 'batch_tests', col: 'lab_name', def: "TEXT DEFAULT ''" },
  { table: 'batch_tests', col: 'lab_report_number', def: "TEXT DEFAULT ''" },
  { table: 'batch_tests', col: 'sample_date', def: "TEXT DEFAULT ''" },
  { table: 'batch_tests', col: 'report_date', def: "TEXT DEFAULT ''" },
  { table: 'batch_test_results', col: 'test_category', def: "TEXT DEFAULT 'routine'" },
  { table: 'batch_test_results', col: 'target_min', def: "TEXT DEFAULT ''" },
  { table: 'batch_test_results', col: 'target_max', def: "TEXT DEFAULT ''" },
  { table: 'batch_test_results', col: 'comments', def: "TEXT DEFAULT ''" },
  { table: 'batch_tests', col: 'attachments', def: "TEXT DEFAULT '[]'" },
];
for (const { table, col, def } of batchTestNewCols) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  } catch (e) {
    // Column already exists
  }
}

// Seed data
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as count FROM sops').get();
  if (count.count > 0) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const cleanSops = [
    { sop_number: 'KK-SOP-00100', title: 'Good Documentation Practices (GDP)', category_code: '001', category_name: 'Documentation & Training' },
    { sop_number: 'KK-SOP-00101', title: 'Handwritten and Electronic Signatures', category_code: '001', category_name: 'Documentation & Training' },
    { sop_number: 'KK-SOP-00102', title: 'Employee Training Program', category_code: '001', category_name: 'Documentation & Training' },
    { sop_number: 'KK-SOP-00200', title: 'Food Safety Policy', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00201', title: 'Employee Sanitation and Hygiene Standards', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00202', title: 'Food Handling Fundamentals', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00205', title: 'Housekeeping and Sanitation Program', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00206', title: 'Production Critical Control Points', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00300', title: 'Cleaning Procedure — Fermentation Vessels', category_code: '003', category_name: 'Cleaning Procedures' },
    { sop_number: 'KK-SOP-00301', title: 'Cleaning and Disinfection of Production Areas', category_code: '003', category_name: 'Cleaning Procedures' },
    { sop_number: 'KK-SOP-00400', title: 'Calibration and Operation of pH Meters', category_code: '004', category_name: 'Calibration' },
    { sop_number: 'KK-SOP-00800', title: 'Preventive Maintenance Program', category_code: '008', category_name: 'Facility' },
    { sop_number: 'KK-SOP-00801', title: 'Pest Control Program', category_code: '008', category_name: 'Facility' },
    { sop_number: 'KK-SOP-00802', title: 'Facility Design and Infrastructure', category_code: '008', category_name: 'Facility' },
    { sop_number: 'KK-SOP-00900', title: 'Approved Supplier Program', category_code: '009', category_name: 'Supplier & Recall' },
    { sop_number: 'KK-SOP-00901', title: 'Food Recall and Withdrawal Procedure', category_code: '009', category_name: 'Supplier & Recall' },
    { sop_number: 'KK-SOP-00903', title: 'Traceability, Mock Recall & Crisis Management', category_code: '009', category_name: 'Supplier & Recall' },
    { sop_number: 'KK-SOP-01001', title: 'Allergen Control Program', category_code: '010', category_name: 'Allergen Control' },
    { sop_number: 'KK-SOP-01100', title: 'Regulatory Affairs and Inspection Program', category_code: '011', category_name: 'Regulatory Affairs' },
    { sop_number: 'KK-SOP-01200', title: 'Food Defense Program', category_code: '012', category_name: 'Food Defense' },
    { sop_number: 'KK-SOP-01300', title: 'Environmental Monitoring Program', category_code: '013', category_name: 'Environmental Monitoring' },
  ];

  const needsStripSops = [
    { sop_number: 'KK-SOP-00401', title: 'Calibration and Operation of Temperature Probes', category_code: '004', category_name: 'Calibration' },
    { sop_number: 'KK-SOP-00500', title: 'Receiving, Shipping and Warehouse Procedures', category_code: '005', category_name: 'Warehouse' },
    { sop_number: 'KK-SOP-00600', title: 'Examination of Packaged Product (+ Glass §7)', category_code: '006', category_name: 'Product Examination' },
    { sop_number: 'KK-SOP-00902', title: 'Customer Complaint Management Program', category_code: '009', category_name: 'Supplier & Recall' },
    { sop_number: 'KK-SOP-01400', title: 'Change Control and Deviation Management', category_code: '014', category_name: 'Change Control' },
    { sop_number: 'KK-SOP-01500', title: 'Foreign Material Control Program', category_code: '015', category_name: 'Foreign Material' },
    { sop_number: 'KK-SOP-01600', title: 'Rework, Hold and Release Procedures', category_code: '016', category_name: 'Rework/Hold/Release' },
    { sop_number: 'KK-SOP-01700', title: 'Label Review Program', category_code: '017', category_name: 'Label Review' },
    { sop_number: 'KK-SOP-01800', title: 'Product Returns Procedure', category_code: '018', category_name: 'Product Returns' },
  ];

  const notBuiltSops = [
    { sop_number: 'KK-SOP-00203', title: 'Process Flow Diagram (Facility)', category_code: '002', category_name: 'Food Safety & Production' },
    { sop_number: 'KK-SOP-00204', title: 'Personnel Flow Diagram', category_code: '002', category_name: 'Food Safety & Production' },
  ];

  const insertSop = db.prepare(`
    INSERT INTO sops (sop_number, title, category_code, category_name, version, status, costco_cleanup_status, owner, effective_date, next_review_date, last_updated)
    VALUES (@sop_number, @title, @category_code, @category_name, @version, @status, @costco_cleanup_status, @owner, @effective_date, @next_review_date, @last_updated)
  `);

  const insertChecklist = db.prepare(`
    INSERT INTO audit_checklist (sop_id, requirement, status)
    VALUES (@sop_id, @requirement, @status)
  `);

  const seedAll = db.transaction(() => {
    // Clean SOPs
    for (const sop of cleanSops) {
      const info = insertSop.run({
        ...sop,
        version: '1.0',
        status: 'active',
        costco_cleanup_status: 'clean',
        owner: 'QA Manager',
        effective_date: '2025-01-15',
        next_review_date: '2026-01-15',
        last_updated: now,
      });
      const sopId = info.lastInsertRowid;
      insertChecklist.run({ sop_id: sopId, requirement: 'Document current and approved', status: 'met' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Staff trained on procedure', status: 'met' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Records available for review', status: 'met' });
    }

    // Needs Costco Strip SOPs
    for (const sop of needsStripSops) {
      const info = insertSop.run({
        ...sop,
        version: '1.0',
        status: 'in_review',
        costco_cleanup_status: 'needs_costco_strip',
        owner: 'QA Manager',
        effective_date: null,
        next_review_date: null,
        last_updated: now,
      });
      const sopId = info.lastInsertRowid;
      insertChecklist.run({ sop_id: sopId, requirement: 'Document current and approved', status: 'partial' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Staff trained on procedure', status: 'partial' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Records available for review', status: 'partial' });
    }

    // Not Yet Built SOPs
    for (const sop of notBuiltSops) {
      const info = insertSop.run({
        ...sop,
        version: '0.0',
        status: 'draft',
        costco_cleanup_status: 'not_yet_built',
        owner: 'QA Manager',
        effective_date: null,
        next_review_date: null,
        last_updated: now,
      });
      const sopId = info.lastInsertRowid;
      insertChecklist.run({ sop_id: sopId, requirement: 'Document current and approved', status: 'not_met' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Staff trained on procedure', status: 'not_met' });
      insertChecklist.run({ sop_id: sopId, requirement: 'Records available for review', status: 'not_met' });
    }
  });

  seedAll();
  console.log('Database seeded with initial SOP data');
}

function seedComplaintsAndCCRs() {
  const count = db.prepare('SELECT COUNT(*) as count FROM complaints').get();
  if (count.count > 0) return;

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (complaint_number, date_received, source, reporter, store_location, product_sku, product_name, lot_number, best_before, quantity_affected, issue_type, severity, description, status, created_at, updated_at)
    VALUES (@complaint_number, @date_received, @source, @reporter, @store_location, @product_sku, @product_name, @lot_number, @best_before, @quantity_affected, @issue_type, @severity, @description, @status, @created_at, @updated_at)
  `);

  const insertCCR = db.prepare(`
    INSERT INTO ccrs (ccr_number, title, date_created, status, recipient_company, recipient_contact, recipient_email, root_causes, preventive_measures, target_resolution_date, actual_resolution_date, notes, created_at, updated_at)
    VALUES (@ccr_number, @title, @date_created, @status, @recipient_company, @recipient_contact, @recipient_email, @root_causes, @preventive_measures, @target_resolution_date, @actual_resolution_date, @notes, @created_at, @updated_at)
  `);

  const insertCCRComplaint = db.prepare(`INSERT INTO ccr_complaints (ccr_id, complaint_id) VALUES (?, ?)`);

  const insertAction = db.prepare(`
    INSERT INTO corrective_actions (ccr_id, description, responsible, target_date, completion_date, status, notes, created_at, updated_at)
    VALUES (@ccr_id, @description, @responsible, @target_date, @completion_date, @status, @notes, @created_at, @updated_at)
  `);

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const complaints = [
    { complaint_number: 'KK-CMP-2025-001', date_received: '2025-08-13', source: 'Purity Life', reporter: 'Callum Nicholl', store_location: 'Natures Fare', product_sku: '39507', product_name: 'CocoGua 359ml', lot_number: '', best_before: '', quantity_affected: 0, issue_type: 'Fermentation/Bloating', severity: 'critical', description: 'Bulging, explosive fermentation, product actively fermenting in store. Multiple units affected with dangerous pressure build-up.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-001', date_received: '2026-01-21', source: 'Purity Life', reporter: 'Callum Nicholl', store_location: 'Natures Fare W. Kelowna', product_sku: '39505', product_name: 'CocoFam 630ml', lot_number: '003195', best_before: '2026-01-31', quantity_affected: 2, issue_type: 'Separation', severity: 'high', description: 'Product separation observed in 2 units. Visual quality issue affecting consumer perception.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-002', date_received: '2026-03-13', source: 'Purity Life', reporter: 'Nancy Lim', store_location: 'Nutters Prince Albert', product_sku: '39506', product_name: 'CocoMng 359ml', lot_number: '003327', best_before: '2026-08-30', quantity_affected: 6, issue_type: 'Seal Failure', severity: 'high', description: 'Leaking from lid, sizzling sound upon opening, 1 bottle exploded. Seal integrity compromised across multiple units.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-003', date_received: '2026-03-13', source: 'Purity Life', reporter: 'Nancy Lim', store_location: 'Nutters Prince Albert', product_sku: '39507', product_name: 'CocoGua 359ml', lot_number: '003296', best_before: '2026-07-04', quantity_affected: 6, issue_type: 'Seal Failure', severity: 'high', description: 'Seal failure on multiple units from same lot. Potential fermentation pressure causing seal breach.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-004', date_received: '2026-03-13', source: 'Purity Life', reporter: 'Tara Smith', store_location: 'Nutters Cranbrook', product_sku: '39506', product_name: 'CocoMng 359ml', lot_number: '003321', best_before: '2026-08-23', quantity_affected: 6, issue_type: 'Seal Failure', severity: 'critical', description: 'All 6 units leaking from seals. Complete batch failure indicating systematic seal integrity issue.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-005', date_received: '2026-03-16', source: 'Purity Life', reporter: 'Nancy Lim', store_location: 'Natures Fare Kelowna', product_sku: '39506', product_name: 'CocoMng 359ml', lot_number: '003321', best_before: '2026-08-23', quantity_affected: 4, issue_type: 'Leaking', severity: 'high', description: 'Leaking units from same lot 003321. Consistent with other reports of seal failure on this lot.', status: 'corrective_action' },
    { complaint_number: 'KK-CMP-2026-006', date_received: '2026-03-23', source: 'Purity Life', reporter: 'Callum Nicholl', store_location: 'Reported by Purity Life', product_sku: '39506', product_name: 'CocoMng 359ml', lot_number: '003321', best_before: '2026-08-23', quantity_affected: 7, issue_type: 'Seal Failure', severity: 'high', description: 'Additional 7 units reported with seal failure from lot 003321. Ongoing pattern across multiple retail locations.', status: 'open' },
    { complaint_number: 'KK-CMP-2026-007', date_received: '2026-03-23', source: 'Purity Life', reporter: 'Nancy Lim', store_location: 'City Avenue Market POCO', product_sku: '39505', product_name: 'CocoFam 630ml', lot_number: '003291', best_before: '2026-06-23', quantity_affected: 1, issue_type: 'Mold', severity: 'critical', description: 'Mold growth observed in product. Critical food safety issue requiring immediate investigation.', status: 'open' },
  ];

  const seedAll = db.transaction(() => {
    const complaintIds = [];
    for (const c of complaints) {
      const info = insertComplaint.run({ ...c, created_at: now, updated_at: now });
      complaintIds.push(info.lastInsertRowid);
    }

    // Create CCR
    const ccrInfo = insertCCR.run({
      ccr_number: 'KK-CCR-2026-003',
      title: 'Purity Life - Coconut Kefir Quality Issues (Aug 2025 - Mar 2026)',
      date_created: '2026-03-23',
      status: 'draft',
      recipient_company: 'Purity Life Grocery',
      recipient_contact: 'Callum Nicholl',
      recipient_email: '',
      root_causes: JSON.stringify(['Active post-fill fermentation due to live cultures continuing to produce CO2', 'Seal integrity insufficient to withstand internal pressure from ongoing fermentation', 'Temperature fluctuations during distribution chain may accelerate fermentation']),
      preventive_measures: JSON.stringify(['Implement culture optimization program with Escarpment Labs to reduce post-fill fermentation activity', 'Reformulate flavour profiles with Birdway CPG to ensure stability', 'Upgrade packaging seals with I.M. Packaging for improved pressure resistance']),
      target_resolution_date: '2026-05-15',
      actual_resolution_date: null,
      notes: 'Comprehensive quality improvement initiative addressing recurring seal failure and fermentation issues across multiple Purity Life retail locations. Three parallel corrective action workstreams initiated.',
      created_at: now,
      updated_at: now,
    });
    const ccrId = ccrInfo.lastInsertRowid;

    // Link all complaints to CCR
    for (const cId of complaintIds) {
      insertCCRComplaint.run(ccrId, cId);
    }

    // Update complaints with linked CCR
    const updateLinkedCCR = db.prepare('UPDATE complaints SET linked_ccr_id = ? WHERE id = ?');
    for (const cId of complaintIds) {
      updateLinkedCCR.run(ccrId, cId);
    }

    // Add corrective actions
    insertAction.run({ ccr_id: ccrId, description: 'Culture Optimization - Escarpment Labs: Reformulate culture blend to reduce post-fill CO2 production while maintaining probiotic efficacy and product quality.', responsible: 'Escarpment Labs', target_date: '2026-05-15', completion_date: null, status: 'in_progress', notes: 'Initial culture samples under evaluation. Targeting reduced gas production strains.', created_at: now, updated_at: now });
    insertAction.run({ ccr_id: ccrId, description: 'Flavour Reformulation - Birdway CPG: Reformulate coconut kefir flavour profiles for improved shelf stability and reduced fermentation activity post-fill.', responsible: 'Birdway CPG', target_date: '2026-05-15', completion_date: null, status: 'in_progress', notes: 'Working on adjusted sugar/acid profiles to limit secondary fermentation.', created_at: now, updated_at: now });
    insertAction.run({ ccr_id: ccrId, description: 'Packaging Upgrade - I.M. Packaging: Source and validate upgraded seal technology to withstand higher internal pressures from fermented beverages.', responsible: 'I.M. Packaging', target_date: '2026-04-17', completion_date: null, status: 'in_progress', notes: 'Evaluating new liner and torque specifications. Sample run scheduled.', created_at: now, updated_at: now });
  });

  seedAll();
  console.log('Database seeded with complaints and CCR data');
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (count.count > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, active)
    VALUES (@username, @password_hash, @display_name, @role, @active)
  `);

  const users = [
    { username: 'hudson', password: 'KefirKult2026!', display_name: 'Hudson', role: 'admin' },
    { username: 'tim', password: 'KKItim2026', display_name: 'Tim', role: 'manager' },
    { username: 'greg', password: 'KKIgreg2026', display_name: 'Greg', role: 'manager' },
    { username: 'viewer', password: 'KKIview2026', display_name: 'Viewer', role: 'viewer' },
  ];

  const seedAll = db.transaction(() => {
    for (const u of users) {
      const hash = bcrypt.hashSync(u.password, 10);
      insertUser.run({
        username: u.username,
        password_hash: hash,
        display_name: u.display_name,
        role: u.role,
        active: 1,
      });
    }
  });

  seedAll();
  console.log('Database seeded with users');
}

// Migration: add assigned_to column to daily_tasks
try {
  db.exec(`ALTER TABLE daily_tasks ADD COLUMN assigned_to TEXT DEFAULT NULL`);
} catch (e) {
  // Column already exists
}

// Migration: add color column to daily_tasks
try {
  db.exec(`ALTER TABLE daily_tasks ADD COLUMN color TEXT DEFAULT ''`);
} catch (e) { /* exists */ }

// Migration: add locked, admin_modified_by, admin_modified_at, admin_modify_reason to completions
for (const { col, def } of [
  { col: 'locked', def: 'INTEGER DEFAULT 0' },
  { col: 'admin_modified_by', def: "TEXT DEFAULT ''" },
  { col: 'admin_modified_at', def: 'TEXT' },
  { col: 'admin_modify_reason', def: "TEXT DEFAULT ''" },
]) {
  try {
    db.exec(`ALTER TABLE daily_task_completions ADD COLUMN ${col} ${def}`);
  } catch (e) { /* exists */ }
}

// Migration: create template tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS daily_task_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    task_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    sop_reference TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    color TEXT DEFAULT '',
    FOREIGN KEY (template_id) REFERENCES daily_task_templates(id) ON DELETE CASCADE
  );
`);

// Document type and SOP linking migrations
for (const { col, def } of [
  { col: 'document_type', def: "TEXT DEFAULT 'other'" },
  { col: 'linked_sop_id', def: 'INTEGER' },
]) {
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN ${col} ${def}`);
  } catch (e) {
    // Column already exists
  }
}

function seedDailyTasks() {
  const count = db.prepare('SELECT COUNT(*) as count FROM daily_tasks').get();
  if (count.count > 0) return;

  const tasks = [
    // Pre-Production
    { task_name: 'Handwashing station check', category: 'Pre-Production', frequency: 'daily', description: 'Verify soap, sanitizer, paper towels, and warm water at all handwashing stations', sop_reference: 'KK-SOP-00201', sort_order: 1 },
    { task_name: 'Sanitizer concentration check', category: 'Pre-Production', frequency: 'daily', description: 'Test sanitizer concentration with test strips — must be within acceptable range', sop_reference: 'KK-SOP-00205', sort_order: 2 },
    { task_name: 'Equipment inspection', category: 'Pre-Production', frequency: 'daily', description: 'Visual inspection of all production equipment for cleanliness and damage', sop_reference: 'KK-SOP-00800', sort_order: 3 },
    { task_name: 'Temperature log (coolers/freezers)', category: 'Pre-Production', frequency: 'daily', description: 'Record temperatures of all coolers and freezers — must be within spec', sop_reference: 'KK-SOP-00206', sort_order: 4 },
    { task_name: 'Production area cleanliness', category: 'Pre-Production', frequency: 'daily', description: 'Verify production area is clean and free of debris before starting', sop_reference: 'KK-SOP-00205', sort_order: 5 },
    { task_name: 'Allergen zone verification', category: 'Pre-Production', frequency: 'daily', description: 'Confirm allergen zones are properly set up and labeled', sop_reference: 'KK-SOP-01001', sort_order: 6 },
    // During Production
    { task_name: 'CCP monitoring (pH)', category: 'During Production', frequency: 'per_shift', description: 'Monitor and record pH at critical control points — target 4.2-4.6', sop_reference: 'KK-SOP-00206', sort_order: 7 },
    { task_name: 'CCP monitoring (temperature)', category: 'During Production', frequency: 'per_shift', description: 'Monitor and record temperature at critical control points', sop_reference: 'KK-SOP-00206', sort_order: 8 },
    { task_name: 'Weight checks', category: 'During Production', frequency: 'per_shift', description: 'Verify product weight meets specifications', sop_reference: 'KK-SOP-00600', sort_order: 9 },
    { task_name: 'Seal checks', category: 'During Production', frequency: 'per_shift', description: 'Verify seal integrity on packaged products', sop_reference: 'KK-SOP-00600', sort_order: 10 },
    { task_name: 'Label verification', category: 'During Production', frequency: 'per_shift', description: 'Confirm correct labels are being applied with accurate information', sop_reference: 'KK-SOP-01700', sort_order: 11 },
    { task_name: 'Foreign material detection check', category: 'During Production', frequency: 'per_shift', description: 'Verify foreign material detection equipment is functioning', sop_reference: 'KK-SOP-01500', sort_order: 12 },
    { task_name: 'Batch record documentation', category: 'During Production', frequency: 'per_shift', description: 'Complete all batch production records accurately', sop_reference: 'KK-SOP-00100', sort_order: 13 },
    // Post-Production
    { task_name: 'Equipment cleaning verification', category: 'Post-Production', frequency: 'daily', description: 'Verify all equipment is cleaned per SOP', sop_reference: 'KK-SOP-00300', sort_order: 14 },
    { task_name: 'Sanitation checklist', category: 'Post-Production', frequency: 'daily', description: 'Complete sanitation checklist for all production areas', sop_reference: 'KK-SOP-00301', sort_order: 15 },
    { task_name: 'Waste disposal', category: 'Post-Production', frequency: 'daily', description: 'Properly dispose of all production waste and clean waste areas', sop_reference: 'KK-SOP-00205', sort_order: 16 },
    { task_name: 'Production area cleanup', category: 'Post-Production', frequency: 'daily', description: 'Final cleanup of production area — floors, drains, surfaces', sop_reference: 'KK-SOP-00205', sort_order: 17 },
    { task_name: 'End-of-day temperature log', category: 'Post-Production', frequency: 'daily', description: 'Record end-of-day temperatures for all coolers and freezers', sop_reference: 'KK-SOP-00206', sort_order: 18 },
    // Weekly
    { task_name: 'Pest trap inspection', category: 'Weekly', frequency: 'weekly', description: 'Inspect all pest traps and report any findings', sop_reference: 'KK-SOP-00801', sort_order: 19 },
    { task_name: 'Chemical inventory check', category: 'Weekly', frequency: 'weekly', description: 'Verify chemical inventory levels and storage compliance', sop_reference: 'KK-SOP-00205', sort_order: 20 },
    { task_name: 'Equipment calibration check', category: 'Weekly', frequency: 'weekly', description: 'Verify calibration status of pH meters and thermometers', sop_reference: 'KK-SOP-00400', sort_order: 21 },
  ];

  const insert = db.prepare(`
    INSERT INTO daily_tasks (task_name, category, frequency, description, sop_reference, sort_order)
    VALUES (@task_name, @category, @frequency, @description, @sop_reference, @sort_order)
  `);

  const seedAll = db.transaction(() => {
    for (const task of tasks) {
      insert.run(task);
    }
  });

  seedAll();
  console.log('Database seeded with daily tasks');
}

const CATEGORY_COLORS = {
  'Pre-Production': '#3B82F6',
  'During Production': '#10B981',
  'Post-Production': '#F59E0B',
  'Weekly': '#8B5CF6',
  'Cleaning': '#14B8A6',
  'Safety': '#EF4444',
};

function seedDailyTaskTemplates() {
  const count = db.prepare('SELECT COUNT(*) as count FROM daily_task_templates').get();
  if (count.count > 0) return;

  const templateItems = [
    { task_name: 'Handwashing station check', category: 'Pre-Production', description: 'Verify soap, sanitizer, paper towels, and warm water at all handwashing stations', sop_reference: 'KK-SOP-00201', sort_order: 1 },
    { task_name: 'Sanitizer concentration check', category: 'Pre-Production', description: 'Test sanitizer concentration with test strips — must be within acceptable range', sop_reference: 'KK-SOP-00205', sort_order: 2 },
    { task_name: 'Equipment inspection', category: 'Pre-Production', description: 'Visual inspection of all production equipment for cleanliness and damage', sop_reference: 'KK-SOP-00800', sort_order: 3 },
    { task_name: 'Temperature log (coolers/freezers)', category: 'Pre-Production', description: 'Record temperatures of all coolers and freezers — must be within spec', sop_reference: 'KK-SOP-00206', sort_order: 4 },
    { task_name: 'Production area cleanliness', category: 'Pre-Production', description: 'Verify production area is clean and free of debris before starting', sop_reference: 'KK-SOP-00205', sort_order: 5 },
    { task_name: 'Allergen zone verification', category: 'Pre-Production', description: 'Confirm allergen zones are properly set up and labeled', sop_reference: 'KK-SOP-01001', sort_order: 6 },
    { task_name: 'CCP monitoring (pH)', category: 'During Production', description: 'Monitor and record pH at critical control points — target 4.2-4.6', sop_reference: 'KK-SOP-00206', sort_order: 7 },
    { task_name: 'CCP monitoring (temperature)', category: 'During Production', description: 'Monitor and record temperature at critical control points', sop_reference: 'KK-SOP-00206', sort_order: 8 },
    { task_name: 'Weight checks', category: 'During Production', description: 'Verify product weight meets specifications', sop_reference: 'KK-SOP-00600', sort_order: 9 },
    { task_name: 'Seal checks', category: 'During Production', description: 'Verify seal integrity on packaged products', sop_reference: 'KK-SOP-00600', sort_order: 10 },
    { task_name: 'Label verification', category: 'During Production', description: 'Confirm correct labels are being applied with accurate information', sop_reference: 'KK-SOP-01700', sort_order: 11 },
    { task_name: 'Foreign material detection check', category: 'During Production', description: 'Verify foreign material detection equipment is functioning', sop_reference: 'KK-SOP-01500', sort_order: 12 },
    { task_name: 'Batch record documentation', category: 'During Production', description: 'Complete all batch production records accurately', sop_reference: 'KK-SOP-00100', sort_order: 13 },
    { task_name: 'Equipment cleaning verification', category: 'Post-Production', description: 'Verify all equipment is cleaned per SOP', sop_reference: 'KK-SOP-00300', sort_order: 14 },
    { task_name: 'Sanitation checklist', category: 'Post-Production', description: 'Complete sanitation checklist for all production areas', sop_reference: 'KK-SOP-00301', sort_order: 15 },
    { task_name: 'Waste disposal', category: 'Post-Production', description: 'Properly dispose of all production waste and clean waste areas', sop_reference: 'KK-SOP-00205', sort_order: 16 },
    { task_name: 'Production area cleanup', category: 'Post-Production', description: 'Final cleanup of production area — floors, drains, surfaces', sop_reference: 'KK-SOP-00205', sort_order: 17 },
    { task_name: 'End-of-day temperature log', category: 'Post-Production', description: 'Record end-of-day temperatures for all coolers and freezers', sop_reference: 'KK-SOP-00206', sort_order: 18 },
    { task_name: 'Pest trap inspection', category: 'Weekly', description: 'Inspect all pest traps and report any findings', sop_reference: 'KK-SOP-00801', sort_order: 19 },
    { task_name: 'Chemical inventory check', category: 'Weekly', description: 'Verify chemical inventory levels and storage compliance', sop_reference: 'KK-SOP-00205', sort_order: 20 },
    { task_name: 'Equipment calibration check', category: 'Weekly', description: 'Verify calibration status of pH meters and thermometers', sop_reference: 'KK-SOP-00400', sort_order: 21 },
  ];

  const seedAll = db.transaction(() => {
    const tpl = db.prepare(`
      INSERT INTO daily_task_templates (template_name, description, created_by)
      VALUES (?, ?, ?)
    `).run('Standard Daily Operations', 'Default template with all 21 standard daily production tasks', 'System');

    const insertItem = db.prepare(`
      INSERT INTO daily_task_template_items (template_id, task_name, category, description, sop_reference, sort_order, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of templateItems) {
      insertItem.run(tpl.lastInsertRowid, item.task_name, item.category, item.description, item.sop_reference, item.sort_order, CATEGORY_COLORS[item.category] || '');
    }
  });

  seedAll();
  console.log('Database seeded with daily task templates');
}

// Update existing daily_tasks with category colors
try {
  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    db.prepare("UPDATE daily_tasks SET color = ? WHERE category = ? AND (color IS NULL OR color = '')").run(color, cat);
  }
} catch (e) { /* ignore */ }

function seedSOPForms() {
  const count = db.prepare('SELECT COUNT(*) as count FROM sop_forms').get();
  if (count.count > 0) return;

  // Map SOP numbers to IDs
  const getSopId = (sopNumber) => {
    const row = db.prepare('SELECT id FROM sops WHERE sop_number = ?').get(sopNumber);
    return row ? row.id : null;
  };

  const insertForm = db.prepare(`
    INSERT INTO sop_forms (sop_id, form_number, title, form_type, description, version, status, created_by)
    VALUES (@sop_id, @form_number, @title, @form_type, @description, @version, @status, @created_by)
  `);

  const insertField = db.prepare(`
    INSERT INTO sop_form_fields (sop_form_id, field_name, field_type, field_options, required, sort_order, section_name)
    VALUES (@sop_form_id, @field_name, @field_type, @field_options, @required, @sort_order, @section_name)
  `);

  const seedAll = db.transaction(() => {
    // 1. Temperature Monitoring Log — linked to KK-SOP-00206 (Production Critical Control Points)
    const sopId206 = getSopId('KK-SOP-00206');
    if (sopId206) {
      const f1 = insertForm.run({ sop_id: sopId206, form_number: 'KK-FRM-00206-A', title: 'Temperature Monitoring Log', form_type: 'logbook', description: 'Daily cooler and freezer temperature recording log', version: '1.0', status: 'active', created_by: 'System' });
      const fid1 = f1.lastInsertRowid;
      const tempFields = [
        { field_name: 'Date', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Shift', field_type: 'select', section_name: 'Header', sort_order: 2, required: 1, field_options: JSON.stringify(['Morning', 'Afternoon', 'Evening']) },
        { field_name: 'Cooler 1 Temp (\u00b0C)', field_type: 'temperature', section_name: 'Cooler Temperatures', sort_order: 3, required: 1 },
        { field_name: 'Cooler 2 Temp (\u00b0C)', field_type: 'temperature', section_name: 'Cooler Temperatures', sort_order: 4, required: 1 },
        { field_name: 'Freezer 1 Temp (\u00b0C)', field_type: 'temperature', section_name: 'Freezer Temperatures', sort_order: 5, required: 1 },
        { field_name: 'Freezer 2 Temp (\u00b0C)', field_type: 'temperature', section_name: 'Freezer Temperatures', sort_order: 6, required: 1 },
        { field_name: 'Out of Range?', field_type: 'checkbox', section_name: 'Corrective Action', sort_order: 7, required: 0 },
        { field_name: 'Corrective Action Taken', field_type: 'text', section_name: 'Corrective Action', sort_order: 8, required: 0 },
        { field_name: 'Recorded By', field_type: 'signature', section_name: 'Sign-off', sort_order: 9, required: 1 },
      ];
      for (const tf of tempFields) {
        insertField.run({ sop_form_id: fid1, field_name: tf.field_name, field_type: tf.field_type, field_options: tf.field_options || '[]', required: tf.required, sort_order: tf.sort_order, section_name: tf.section_name });
      }
    }

    // 2. Cleaning Verification Record — linked to KK-SOP-00301
    const sopId301 = getSopId('KK-SOP-00301');
    if (sopId301) {
      const f2 = insertForm.run({ sop_id: sopId301, form_number: 'KK-FRM-00301-A', title: 'Cleaning Verification Record', form_type: 'record', description: 'Record of cleaning and disinfection activities with verification', version: '1.0', status: 'active', created_by: 'System' });
      const fid2 = f2.lastInsertRowid;
      const cleanFields = [
        { field_name: 'Date', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Area / Equipment', field_type: 'text', section_name: 'Cleaning Details', sort_order: 2, required: 1 },
        { field_name: 'Chemical Used', field_type: 'text', section_name: 'Cleaning Details', sort_order: 3, required: 1 },
        { field_name: 'Concentration', field_type: 'text', section_name: 'Cleaning Details', sort_order: 4, required: 1 },
        { field_name: 'Time Start', field_type: 'time', section_name: 'Cleaning Details', sort_order: 5, required: 1 },
        { field_name: 'Time End', field_type: 'time', section_name: 'Cleaning Details', sort_order: 6, required: 1 },
        { field_name: 'Visual Inspection Pass', field_type: 'checkbox', section_name: 'Verification', sort_order: 7, required: 1 },
        { field_name: 'ATP Swab Result', field_type: 'number', section_name: 'Verification', sort_order: 8, required: 0 },
        { field_name: 'Cleaned By', field_type: 'signature', section_name: 'Sign-off', sort_order: 9, required: 1 },
        { field_name: 'Verified By', field_type: 'signature', section_name: 'Sign-off', sort_order: 10, required: 0 },
      ];
      for (const cf of cleanFields) {
        insertField.run({ sop_form_id: fid2, field_name: cf.field_name, field_type: cf.field_type, field_options: cf.field_options || '[]', required: cf.required, sort_order: cf.sort_order, section_name: cf.section_name });
      }
    }

    // 3. Equipment Inspection Checklist — linked to KK-SOP-00800
    const sopId800 = getSopId('KK-SOP-00800');
    if (sopId800) {
      const f3 = insertForm.run({ sop_id: sopId800, form_number: 'KK-FRM-00800-A', title: 'Equipment Inspection Checklist', form_type: 'checklist', description: 'Pre-production equipment inspection and condition checklist', version: '1.0', status: 'active', created_by: 'System' });
      const fid3 = f3.lastInsertRowid;
      const equipFields = [
        { field_name: 'Date', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Equipment Name', field_type: 'text', section_name: 'Header', sort_order: 2, required: 1 },
        { field_name: 'Equipment ID', field_type: 'text', section_name: 'Header', sort_order: 3, required: 1 },
        { field_name: 'Physical Condition OK', field_type: 'checkbox', section_name: 'Inspection Items', sort_order: 4, required: 1 },
        { field_name: 'No Visible Damage', field_type: 'checkbox', section_name: 'Inspection Items', sort_order: 5, required: 1 },
        { field_name: 'Clean and Sanitized', field_type: 'checkbox', section_name: 'Inspection Items', sort_order: 6, required: 1 },
        { field_name: 'Calibration Current', field_type: 'checkbox', section_name: 'Inspection Items', sort_order: 7, required: 0 },
        { field_name: 'Safety Guards in Place', field_type: 'checkbox', section_name: 'Inspection Items', sort_order: 8, required: 1 },
        { field_name: 'Deficiencies Found', field_type: 'text', section_name: 'Notes', sort_order: 9, required: 0 },
        { field_name: 'Inspected By', field_type: 'signature', section_name: 'Sign-off', sort_order: 10, required: 1 },
      ];
      for (const ef of equipFields) {
        insertField.run({ sop_form_id: fid3, field_name: ef.field_name, field_type: ef.field_type, field_options: ef.field_options || '[]', required: ef.required, sort_order: ef.sort_order, section_name: ef.section_name });
      }
    }

    // 4. Receiving Inspection Log — linked to KK-SOP-00500
    const sopId500 = getSopId('KK-SOP-00500');
    if (sopId500) {
      const f4 = insertForm.run({ sop_id: sopId500, form_number: 'KK-FRM-00500-A', title: 'Receiving Inspection Log', form_type: 'logbook', description: 'Log of incoming materials inspection and acceptance', version: '1.0', status: 'active', created_by: 'System' });
      const fid4 = f4.lastInsertRowid;
      const recvFields = [
        { field_name: 'Date Received', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Supplier', field_type: 'text', section_name: 'Shipment Info', sort_order: 2, required: 1 },
        { field_name: 'PO Number', field_type: 'text', section_name: 'Shipment Info', sort_order: 3, required: 0 },
        { field_name: 'Product Description', field_type: 'text', section_name: 'Shipment Info', sort_order: 4, required: 1 },
        { field_name: 'Lot Number', field_type: 'text', section_name: 'Shipment Info', sort_order: 5, required: 1 },
        { field_name: 'Quantity', field_type: 'number', section_name: 'Shipment Info', sort_order: 6, required: 1 },
        { field_name: 'Temperature at Receipt (\u00b0C)', field_type: 'temperature', section_name: 'Inspection', sort_order: 7, required: 1 },
        { field_name: 'Packaging Intact', field_type: 'checkbox', section_name: 'Inspection', sort_order: 8, required: 1 },
        { field_name: 'COA Received', field_type: 'checkbox', section_name: 'Inspection', sort_order: 9, required: 0 },
        { field_name: 'Accept/Reject', field_type: 'select', section_name: 'Disposition', sort_order: 10, required: 1, field_options: JSON.stringify(['Accept', 'Reject', 'Hold']) },
        { field_name: 'Rejection Reason', field_type: 'text', section_name: 'Disposition', sort_order: 11, required: 0 },
        { field_name: 'Received By', field_type: 'signature', section_name: 'Sign-off', sort_order: 12, required: 1 },
      ];
      for (const rf of recvFields) {
        insertField.run({ sop_form_id: fid4, field_name: rf.field_name, field_type: rf.field_type, field_options: rf.field_options || '[]', required: rf.required, sort_order: rf.sort_order, section_name: rf.section_name });
      }
    }

    // 5. pH Monitoring Log — linked to KK-SOP-00400
    const sopId400 = getSopId('KK-SOP-00400');
    if (sopId400) {
      const f5 = insertForm.run({ sop_id: sopId400, form_number: 'KK-FRM-00400-A', title: 'pH Monitoring Log', form_type: 'logbook', description: 'pH measurement recording and calibration verification log', version: '1.0', status: 'active', created_by: 'System' });
      const fid5 = f5.lastInsertRowid;
      const phFields = [
        { field_name: 'Date', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Time', field_type: 'time', section_name: 'Header', sort_order: 2, required: 1 },
        { field_name: 'Batch/Lot Number', field_type: 'text', section_name: 'Sample Info', sort_order: 3, required: 1 },
        { field_name: 'Product', field_type: 'text', section_name: 'Sample Info', sort_order: 4, required: 1 },
        { field_name: 'pH Reading', field_type: 'number', section_name: 'Measurement', sort_order: 5, required: 1 },
        { field_name: 'Target pH Range', field_type: 'text', section_name: 'Measurement', sort_order: 6, required: 0 },
        { field_name: 'Within Spec', field_type: 'checkbox', section_name: 'Measurement', sort_order: 7, required: 1 },
        { field_name: 'Meter Calibrated Today', field_type: 'checkbox', section_name: 'Calibration', sort_order: 8, required: 1 },
        { field_name: 'Buffer 4.0 Reading', field_type: 'number', section_name: 'Calibration', sort_order: 9, required: 0 },
        { field_name: 'Buffer 7.0 Reading', field_type: 'number', section_name: 'Calibration', sort_order: 10, required: 0 },
        { field_name: 'Corrective Action', field_type: 'text', section_name: 'Notes', sort_order: 11, required: 0 },
        { field_name: 'Tested By', field_type: 'signature', section_name: 'Sign-off', sort_order: 12, required: 1 },
      ];
      for (const pf of phFields) {
        insertField.run({ sop_form_id: fid5, field_name: pf.field_name, field_type: pf.field_type, field_options: pf.field_options || '[]', required: pf.required, sort_order: pf.sort_order, section_name: pf.section_name });
      }
    }

    // 6. Sanitizer Concentration Log — linked to KK-SOP-00205
    const sopId205 = getSopId('KK-SOP-00205');
    if (sopId205) {
      const f6 = insertForm.run({ sop_id: sopId205, form_number: 'KK-FRM-00205-A', title: 'Sanitizer Concentration Log', form_type: 'logbook', description: 'Sanitizer concentration monitoring and verification log', version: '1.0', status: 'active', created_by: 'System' });
      const fid6 = f6.lastInsertRowid;
      const sanFields = [
        { field_name: 'Date', field_type: 'date', section_name: 'Header', sort_order: 1, required: 1 },
        { field_name: 'Time', field_type: 'time', section_name: 'Header', sort_order: 2, required: 1 },
        { field_name: 'Shift', field_type: 'select', section_name: 'Header', sort_order: 3, required: 1, field_options: JSON.stringify(['Morning', 'Afternoon', 'Evening']) },
        { field_name: 'Location', field_type: 'text', section_name: 'Measurement', sort_order: 4, required: 1 },
        { field_name: 'Sanitizer Type', field_type: 'select', section_name: 'Measurement', sort_order: 5, required: 1, field_options: JSON.stringify(['Quat', 'Chlorine', 'Peracetic Acid', 'Other']) },
        { field_name: 'Concentration (ppm)', field_type: 'number', section_name: 'Measurement', sort_order: 6, required: 1 },
        { field_name: 'Required Range (ppm)', field_type: 'text', section_name: 'Measurement', sort_order: 7, required: 0 },
        { field_name: 'Within Spec', field_type: 'checkbox', section_name: 'Measurement', sort_order: 8, required: 1 },
        { field_name: 'Corrective Action', field_type: 'text', section_name: 'Notes', sort_order: 9, required: 0 },
        { field_name: 'Checked By', field_type: 'signature', section_name: 'Sign-off', sort_order: 10, required: 1 },
      ];
      for (const sf of sanFields) {
        insertField.run({ sop_form_id: fid6, field_name: sf.field_name, field_type: sf.field_type, field_options: sf.field_options || '[]', required: sf.required, sort_order: sf.sort_order, section_name: sf.section_name });
      }
    }
  });

  seedAll();
  console.log('Database seeded with SOP forms');
}

// ──── Taskboard tables ────
db.exec(`
  CREATE TABLE IF NOT EXISTS taskboard_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL DEFAULT '',
    operator TEXT DEFAULT '',
    section TEXT DEFAULT '',
    zone TEXT DEFAULT '',
    backup TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
    num INTEGER,
    sort_order INTEGER DEFAULT 0,
    completed_at TEXT,
    completed_by TEXT,
    progress_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS taskboard_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS taskboard_template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES taskboard_templates(id),
    task TEXT NOT NULL DEFAULT '',
    operator TEXT DEFAULT '',
    section TEXT DEFAULT '',
    zone TEXT DEFAULT '',
    backup TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
  );


  CREATE TABLE IF NOT EXISTS taskboard_state (
    id INTEGER PRIMARY KEY,
    data TEXT,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS planner_state (
    id INTEGER PRIMARY KEY,
    data TEXT,
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS taskboard_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    task_name TEXT DEFAULT '',
    operator TEXT DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS taskboard_state_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    saved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tb_operators (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    zone TEXT,
    color TEXT,
    avatar TEXT,
    sort_order INTEGER
  );

  CREATE TABLE IF NOT EXISTS tb_sections (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT,
    color TEXT,
    bg TEXT,
    sort_order INTEGER
  );

  CREATE TABLE IF NOT EXISTS tb_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS tb_announcements (
    id TEXT PRIMARY KEY,
    text TEXT,
    created_by TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tb_daily_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_text TEXT,
    section TEXT,
    tag TEXT,
    sort_order INTEGER,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tb_process_templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    version INTEGER,
    roles TEXT,
    history TEXT,
    created_at TEXT,
    updated_at TEXT
  );
`);

// Add board_date and data columns to taskboard_tasks if missing
try {
  const cols = db.pragma('table_info(taskboard_tasks)').map(c => c.name);
  if (!cols.includes('board_date')) {
    db.exec(`ALTER TABLE taskboard_tasks ADD COLUMN board_date TEXT`);
  }
  if (!cols.includes('data')) {
    db.exec(`ALTER TABLE taskboard_tasks ADD COLUMN data TEXT`);
  }
  if (!cols.includes('version')) {
    db.exec(`ALTER TABLE taskboard_tasks ADD COLUMN version INTEGER DEFAULT 1`);
    db.exec(`UPDATE taskboard_tasks SET version = 1 WHERE version IS NULL`);
  }
} catch (e) {
  // columns already exist
}

// ──── Change Control, Deviation & CAPA tables ────
db.exec(`
  CREATE TABLE IF NOT EXISTS change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('ingredient','process','equipment','packaging','cleaning','document','system','facility','ccp')),
    classification TEXT CHECK(classification IN ('minor','major','critical')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_review','approved','rejected','implementing','monitoring','effectiveness_check','closed')),
    initiator TEXT NOT NULL,
    food_safety_impact TEXT DEFAULT '{}',
    proposed_effective_date TEXT,
    actual_effective_date TEXT,
    affected_documents TEXT DEFAULT '[]',
    training_required INTEGER DEFAULT 0,
    is_emergency INTEGER DEFAULT 0,
    rejection_reason TEXT,
    monitoring_end_date TEXT,
    effectiveness_check_date TEXT,
    effectiveness_result TEXT CHECK(effectiveness_result IN ('effective','not_effective')),
    effectiveness_notes TEXT,
    approved_by TEXT,
    approved_at TEXT,
    closed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deviation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('sop_bpr','ccp','product_spec','supplier_ingredient','cleaning','equipment','other')),
    classification TEXT CHECK(classification IN ('critical','major','minor')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','under_investigation','capa_defined','capa_implemented','effectiveness_check','closed')),
    discovered_by TEXT NOT NULL,
    discovered_at TEXT NOT NULL,
    location TEXT,
    affected_batches TEXT DEFAULT '[]',
    affected_products TEXT DEFAULT '[]',
    immediate_action TEXT,
    is_ccp_deviation INTEGER DEFAULT 0,
    process_stopped INTEGER DEFAULT 0,
    product_on_hold INTEGER DEFAULT 0,
    root_cause_method TEXT CHECK(root_cause_method IN ('five_whys','fishbone','timeline')),
    root_cause TEXT,
    scope_assessment TEXT,
    product_disposition TEXT CHECK(product_disposition IN ('release','hold','donate','reject_destroy','recall_evaluation')),
    disposition_rationale TEXT,
    investigation_due_date TEXT,
    escalated_from_minor INTEGER DEFAULT 0,
    closed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS capas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    capa_id TEXT UNIQUE NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('change_request','deviation')),
    source_id INTEGER NOT NULL,
    corrective_action TEXT NOT NULL,
    preventive_action TEXT NOT NULL,
    responsible_person TEXT NOT NULL,
    target_date TEXT NOT NULL,
    actual_completion_date TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','overdue','closed')),
    effectiveness_check_date TEXT,
    effectiveness_result TEXT CHECK(effectiveness_result IN ('effective','not_effective','pending')),
    effectiveness_notes TEXT,
    linked_change_request_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qms_sequence (
    type TEXT NOT NULL,
    year INTEGER NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (type, year)
  );
`);

// Indexes for change control tables
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
  CREATE INDEX IF NOT EXISTS idx_change_requests_category ON change_requests(category);
  CREATE INDEX IF NOT EXISTS idx_deviation_reports_status ON deviation_reports(status);
  CREATE INDEX IF NOT EXISTS idx_deviation_reports_category ON deviation_reports(category);
  CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(status);
  CREATE INDEX IF NOT EXISTS idx_capas_source ON capas(source_type, source_id);
`);

// ──── Preventive Maintenance tables ────
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    date_installed TEXT,
    is_critical INTEGER DEFAULT 0,
    associated_sops TEXT DEFAULT '[]',
    pm_frequency TEXT NOT NULL CHECK(pm_frequency IN ('daily','weekly','monthly','quarterly','semi_annual','annual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','out_of_service','decommissioned')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pm_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    task_name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','quarterly','semi_annual','annual')),
    category TEXT NOT NULL CHECK(category IN ('inspection','cleaning','lubrication','calibration_check','replacement','passivation','general')),
    assigned_to TEXT,
    last_completed_date TEXT,
    next_due_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pm_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES pm_schedules(id),
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    completed_by TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','completed_with_issues','skipped','deferred')),
    notes TEXT,
    issues_found TEXT,
    parts_used TEXT DEFAULT '[]',
    next_due_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_number TEXT UNIQUE NOT NULL,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id),
    type TEXT NOT NULL CHECK(type IN ('preventive','corrective','emergency')),
    priority TEXT NOT NULL DEFAULT 'routine' CHECK(priority IN ('routine','urgent','emergency')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','awaiting_parts','completed','closed')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    assigned_to TEXT,
    work_performed TEXT,
    parts_used TEXT DEFAULT '[]',
    is_temporary_repair INTEGER DEFAULT 0,
    temporary_repair_deadline TEXT,
    temporary_repair_approved_by TEXT,
    post_maintenance_sanitation INTEGER DEFAULT 0,
    equipment_returned_to_service INTEGER DEFAULT 0,
    returned_to_service_at TEXT,
    completed_by TEXT,
    completed_at TEXT,
    verified_by TEXT,
    food_safety_impact INTEGER DEFAULT 0,
    affected_product TEXT,
    product_disposition TEXT,
    linked_deviation_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wo_sequence (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
  );
`);

// Indexes for maintenance tables
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
  CREATE INDEX IF NOT EXISTS idx_pm_schedules_equipment ON pm_schedules(equipment_id);
  CREATE INDEX IF NOT EXISTS idx_pm_schedules_next_due ON pm_schedules(next_due_date);
  CREATE INDEX IF NOT EXISTS idx_pm_completions_schedule ON pm_completions(schedule_id);
  CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
  CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
`);

// ──── Recall, Traceability & Crisis Management tables ────
db.exec(`
  CREATE TABLE IF NOT EXISTS recalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recall_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('recall','withdrawal')),
    classification TEXT CHECK(classification IN ('class_1','class_2','class_3')),
    status TEXT NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated','investigating','hold_segregate','cfia_notified','customers_notified','recall_active','effectiveness_check','closed')),
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('consumer_illness','pathogen','undeclared_allergen','foreign_material','ccp_deviation','supplier_recall','labelling_error','tampering','cfia_directive','other')),
    trigger_description TEXT NOT NULL,
    affected_products TEXT DEFAULT '[]',
    affected_lot_codes TEXT DEFAULT '[]',
    affected_batch_ids TEXT DEFAULT '[]',
    root_cause TEXT,
    risk_assessment TEXT,
    total_quantity_produced INTEGER,
    total_quantity_shipped INTEGER,
    total_quantity_onsite INTEGER,
    total_quantity_accounted INTEGER,
    cfia_notified INTEGER DEFAULT 0,
    cfia_notified_at TEXT,
    cfia_contact_name TEXT,
    cfia_reference_number TEXT,
    customers_notified INTEGER DEFAULT 0,
    recall_notice_sent INTEGER DEFAULT 0,
    product_disposition TEXT CHECK(product_disposition IN ('destruction','return_to_supplier','pending')),
    disposition_date TEXT,
    disposition_witnessed_by TEXT,
    linked_capa_id INTEGER,
    initiated_by TEXT NOT NULL,
    closed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recall_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recall_id INTEGER NOT NULL REFERENCES recalls(id),
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    customer_type TEXT CHECK(customer_type IN ('distributor','retailer','direct_consumer','institution')),
    lot_codes_shipped TEXT DEFAULT '[]',
    quantity_shipped INTEGER NOT NULL DEFAULT 0,
    quantity_accounted INTEGER DEFAULT 0,
    notified INTEGER DEFAULT 0,
    notified_at TEXT,
    notified_method TEXT,
    action_taken TEXT,
    receipt_confirmed INTEGER DEFAULT 0,
    effective INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recall_sequence (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS traceability_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('finished_product','ingredient_supplier','auditor_initiated')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','passed','failed','corrective_action')),
    target_lot TEXT NOT NULL,
    target_description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    elapsed_minutes INTEGER,
    conducted_by TEXT NOT NULL,
    backward_trace TEXT DEFAULT '{}',
    forward_trace TEXT DEFAULT '{}',
    total_produced INTEGER,
    total_shipped INTEGER,
    total_onsite INTEGER,
    total_adjustments INTEGER DEFAULT 0,
    reconciliation_percent REAL,
    reconciled INTEGER DEFAULT 0,
    team_reachable_1hr INTEGER DEFAULT 0,
    evidence_complete INTEGER DEFAULT 0,
    gaps_identified TEXT,
    corrective_action TEXT,
    corrective_action_due TEXT,
    retest_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crisis_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('fire','flood','power_outage','refrigeration_failure','water_contamination','equipment_failure','security_breach','natural_disaster','it_failure','other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','contained','resolved','closed')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'moderate' CHECK(severity IN ('low','moderate','high','critical')),
    reported_by TEXT NOT NULL,
    reported_at TEXT NOT NULL,
    production_stopped INTEGER DEFAULT 0,
    product_held INTEGER DEFAULT 0,
    affected_areas TEXT DEFAULT '[]',
    affected_products TEXT DEFAULT '[]',
    food_safety_impact INTEGER DEFAULT 0,
    food_safety_assessment TEXT,
    recall_triggered INTEGER DEFAULT 0,
    linked_recall_id INTEGER,
    notifications_sent TEXT DEFAULT '[]',
    product_disposition TEXT,
    disposition_rationale TEXT,
    resolution TEXT,
    resolved_at TEXT,
    closed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crisis_sequence (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS exercise_sequence (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
  );
`);

// ──── Universal Record Links table ────
db.exec(`
  CREATE TABLE IF NOT EXISTS qms_record_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    link_reason TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source_type, source_id, target_type, target_id)
  );
  CREATE INDEX IF NOT EXISTS idx_record_links_source ON qms_record_links(source_type, source_id);
  CREATE INDEX IF NOT EXISTS idx_record_links_target ON qms_record_links(target_type, target_id);
`);

// Indexes for recall/traceability/crisis tables
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_recalls_status ON recalls(status);
  CREATE INDEX IF NOT EXISTS idx_recalls_type ON recalls(type);
  CREATE INDEX IF NOT EXISTS idx_recall_distribution_recall ON recall_distribution(recall_id);
  CREATE INDEX IF NOT EXISTS idx_traceability_exercises_status ON traceability_exercises(status);
  CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
  CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_events(severity);
`);

seedDatabase();
seedComplaintsAndCCRs();
seedUsers();
seedDailyTasks();
seedDailyTaskTemplates();
seedSOPForms();

export function getDb() {
  return db;
}

export default db;
