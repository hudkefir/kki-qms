CREATE TABLE IF NOT EXISTS deviation_attachments (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deviation_attachments_dev ON deviation_attachments(deviation_id);
