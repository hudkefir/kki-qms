CREATE TABLE IF NOT EXISTS deviation_approvals (
  id SERIAL PRIMARY KEY,
  deviation_id INTEGER NOT NULL REFERENCES deviation_reports(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('investigation', 'disposition', 'closure')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  signature_meaning TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deviation_approvals_dev ON deviation_approvals(deviation_id);
