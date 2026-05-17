-- Recalls & Traceability
CREATE TABLE IF NOT EXISTS recalls (
  id SERIAL PRIMARY KEY,
  recall_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  classification TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  trigger_type TEXT NOT NULL,
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
  product_disposition TEXT,
  disposition_date TEXT,
  disposition_witnessed_by TEXT,
  linked_capa_id INTEGER,
  initiated_by TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recall_distribution (
  id SERIAL PRIMARY KEY,
  recall_id INTEGER NOT NULL REFERENCES recalls(id),
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  customer_type TEXT,
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recall_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS traceability_exercises (
  id SERIAL PRIMARY KEY,
  exercise_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercise_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

-- Recall indexes
CREATE INDEX IF NOT EXISTS idx_recalls_status ON recalls(status);
CREATE INDEX IF NOT EXISTS idx_recalls_type ON recalls(type);
CREATE INDEX IF NOT EXISTS idx_recall_distribution_recall ON recall_distribution(recall_id);
CREATE INDEX IF NOT EXISTS idx_traceability_exercises_status ON traceability_exercises(status);
