-- Core: users, sessions, audit, documents, record links
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  username TEXT DEFAULT '',
  action TEXT NOT NULL,
  resource_type TEXT DEFAULT '',
  resource_id TEXT DEFAULT '',
  resource_name TEXT DEFAULT '',
  details TEXT DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  session_id TEXT DEFAULT '',
  old_values TEXT DEFAULT '{}',
  new_values TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  linked_type TEXT,
  linked_id INTEGER,
  description TEXT,
  uploaded_by TEXT,
  upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1,
  tags TEXT,
  download_count INTEGER DEFAULT 0,
  document_type TEXT DEFAULT 'other',
  linked_sop_id INTEGER,
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  storage_path TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS qms_record_links (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_id INTEGER NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER NOT NULL,
  link_reason TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_type, source_id, target_type, target_id)
);

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expire);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_record_links_source ON qms_record_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_record_links_target ON qms_record_links(target_type, target_id);
