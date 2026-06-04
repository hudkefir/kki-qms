CREATE TABLE IF NOT EXISTS deviation_comments (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment' CHECK (comment_type IN ('comment', 'status_change', 'system')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deviation_comments_dev ON deviation_comments(deviation_id);
