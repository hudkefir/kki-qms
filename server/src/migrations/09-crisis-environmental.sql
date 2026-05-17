-- Crisis Management & Environmental Monitoring
CREATE TABLE IF NOT EXISTS crisis_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crisis_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS environmental_samples (
  id SERIAL PRIMARY KEY,
  sample_id TEXT UNIQUE NOT NULL,
  sample_date TEXT NOT NULL,
  zone TEXT NOT NULL,
  location TEXT NOT NULL,
  surface_type TEXT DEFAULT '',
  sample_type TEXT NOT NULL DEFAULT 'routine',
  test_method TEXT DEFAULT 'swab',
  target_organism TEXT DEFAULT '',
  result TEXT DEFAULT 'pending',
  result_value TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  threshold TEXT DEFAULT '',
  pass_fail TEXT DEFAULT 'pending',
  collected_by TEXT NOT NULL,
  lab_name TEXT DEFAULT '',
  lab_report_number TEXT DEFAULT '',
  corrective_action TEXT DEFAULT '',
  linked_deviation_id INTEGER,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS environmental_locations (
  id SERIAL PRIMARY KEY,
  location_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  area TEXT DEFAULT '',
  surface_type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  sampling_frequency TEXT DEFAULT 'monthly',
  last_sampled TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS env_sample_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

-- Crisis/environmental indexes
CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_events(severity);
