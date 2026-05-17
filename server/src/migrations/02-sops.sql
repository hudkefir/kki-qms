-- SOP Management
CREATE TABLE IF NOT EXISTS sops (
  id SERIAL PRIMARY KEY,
  sop_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
  costco_cleanup_status TEXT DEFAULT 'not_yet_built',
  owner TEXT DEFAULT '',
  reviewer TEXT DEFAULT '',
  approver TEXT DEFAULT '',
  effective_date TEXT,
  next_review_date TEXT,
  last_updated TEXT,
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  scope TEXT DEFAULT '',
  procedure_text TEXT DEFAULT '',
  responsibilities TEXT DEFAULT '',
  materials_equipment TEXT DEFAULT '',
  sop_references TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_revisions (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  version TEXT NOT NULL,
  changed_by TEXT DEFAULT '',
  change_description TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_attachments (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_comments (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  author TEXT DEFAULT '',
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_files (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  uploaded_by TEXT DEFAULT '',
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  storage_path TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sop_forms (
  id SERIAL PRIMARY KEY,
  sop_id INTEGER NOT NULL REFERENCES sops(id),
  form_number TEXT NOT NULL,
  title TEXT NOT NULL,
  form_type TEXT DEFAULT 'record',
  description TEXT DEFAULT '',
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_form_fields (
  id SERIAL PRIMARY KEY,
  sop_form_id INTEGER NOT NULL REFERENCES sop_forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  field_options TEXT DEFAULT '[]',
  required INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  section_name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_form_entries (
  id SERIAL PRIMARY KEY,
  sop_form_id INTEGER NOT NULL REFERENCES sop_forms(id) ON DELETE CASCADE,
  entry_data TEXT DEFAULT '{}',
  submitted_by TEXT DEFAULT '',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  shift TEXT DEFAULT '',
  date TEXT NOT NULL,
  verified_by TEXT DEFAULT '',
  verified_at TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SOP indexes
CREATE INDEX IF NOT EXISTS idx_sop_files_sop_id ON sop_files(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_forms_sop_id ON sop_forms(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_forms_status ON sop_forms(status);
CREATE INDEX IF NOT EXISTS idx_sop_form_fields_form_id ON sop_form_fields(sop_form_id);
CREATE INDEX IF NOT EXISTS idx_sop_form_entries_form_id ON sop_form_entries(sop_form_id);
CREATE INDEX IF NOT EXISTS idx_sop_form_entries_date ON sop_form_entries(date);
