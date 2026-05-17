-- Quality & Compliance: complaints, CCRs, corrective actions, audit checklist, batch tests
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
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
  severity TEXT DEFAULT 'low',
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  linked_ccr_id INTEGER,
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ccrs (
  id SERIAL PRIMARY KEY,
  ccr_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  date_created TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  recipient_company TEXT DEFAULT '',
  recipient_contact TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  root_causes TEXT DEFAULT '[]',
  preventive_measures TEXT DEFAULT '[]',
  target_resolution_date TEXT,
  actual_resolution_date TEXT,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ccr_complaints (
  ccr_id INTEGER NOT NULL,
  complaint_id INTEGER NOT NULL,
  PRIMARY KEY (ccr_id, complaint_id)
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id SERIAL PRIMARY KEY,
  ccr_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  responsible TEXT DEFAULT '',
  target_date TEXT,
  completion_date TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_checklist (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  requirement TEXT NOT NULL,
  category TEXT DEFAULT '',
  status TEXT DEFAULT 'not_met',
  notes TEXT DEFAULT '',
  evidence_ref TEXT DEFAULT '',
  checked_by TEXT DEFAULT '',
  checked_at TEXT
);

CREATE TABLE IF NOT EXISTS batch_tests (
  id SERIAL PRIMARY KEY,
  batch_number TEXT NOT NULL,
  product_sku TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  test_date TEXT NOT NULL,
  tested_by TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  test_profile TEXT DEFAULT 'routine',
  lab_name TEXT DEFAULT '',
  lab_report_number TEXT DEFAULT '',
  sample_date TEXT DEFAULT '',
  report_date TEXT DEFAULT '',
  attachments TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_test_results (
  id SERIAL PRIMARY KEY,
  batch_test_id INTEGER NOT NULL REFERENCES batch_tests(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  test_name TEXT NOT NULL,
  target_value TEXT DEFAULT '',
  actual_value TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  pass_fail TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  test_category TEXT DEFAULT 'routine',
  target_min TEXT DEFAULT '',
  target_max TEXT DEFAULT '',
  comments TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Quality indexes
CREATE INDEX IF NOT EXISTS idx_batch_tests_date ON batch_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(status);
CREATE INDEX IF NOT EXISTS idx_batch_test_results_test_id ON batch_test_results(batch_test_id);
