-- CAPA, Deviations, Change Control, Sequences
CREATE TABLE IF NOT EXISTS change_requests (
  id SERIAL PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  classification TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
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
  effectiveness_result TEXT,
  effectiveness_notes TEXT,
  approved_by TEXT,
  approved_at TEXT,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deviation_reports (
  id SERIAL PRIMARY KEY,
  report_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  classification TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  discovered_by TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  location TEXT,
  affected_batches TEXT DEFAULT '[]',
  affected_products TEXT DEFAULT '[]',
  immediate_action TEXT,
  is_ccp_deviation INTEGER DEFAULT 0,
  process_stopped INTEGER DEFAULT 0,
  product_on_hold INTEGER DEFAULT 0,
  root_cause_method TEXT,
  root_cause TEXT,
  scope_assessment TEXT,
  product_disposition TEXT,
  disposition_rationale TEXT,
  investigation_due_date TEXT,
  escalated_from_minor INTEGER DEFAULT 0,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  linked_complaints_json TEXT DEFAULT '[]',
  linked_sops_json TEXT DEFAULT '[]',
  linked_batch_tests_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS capas (
  id SERIAL PRIMARY KEY,
  capa_id TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  corrective_action TEXT NOT NULL,
  preventive_action TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  target_date TEXT NOT NULL,
  actual_completion_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  effectiveness_check_date TEXT,
  effectiveness_result TEXT,
  effectiveness_notes TEXT,
  linked_change_request_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capa_action_items (
  id SERIAL PRIMARY KEY,
  capa_id INTEGER NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qms_sequence (
  type TEXT NOT NULL,
  year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (type, year)
);

-- CAPA/deviation indexes
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_category ON change_requests(category);
CREATE INDEX IF NOT EXISTS idx_deviation_reports_status ON deviation_reports(status);
CREATE INDEX IF NOT EXISTS idx_deviation_reports_category ON deviation_reports(category);
CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(status);
CREATE INDEX IF NOT EXISTS idx_capas_source ON capas(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_capa_action_items_capa_id ON capa_action_items(capa_id);

-- Dynamic columns for capas (added post-initial schema)
ALTER TABLE capas ADD COLUMN IF NOT EXISTS root_cause_method TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS root_cause_analysis TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS investigation_details TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS containment_action TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS risk_assessment TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS initiated_by TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE capas ADD COLUMN IF NOT EXISTS linked_complaints_json TEXT DEFAULT '[]';

-- Dynamic columns for deviation_reports
ALTER TABLE deviation_reports ADD COLUMN IF NOT EXISTS linked_complaints_json TEXT DEFAULT '[]';
ALTER TABLE deviation_reports ADD COLUMN IF NOT EXISTS linked_sops_json TEXT DEFAULT '[]';
ALTER TABLE deviation_reports ADD COLUMN IF NOT EXISTS linked_batch_tests_json TEXT DEFAULT '[]';
