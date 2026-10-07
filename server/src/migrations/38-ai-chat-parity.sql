-- Additive chat parity storage. Apply through the normal migration process.
CREATE TABLE IF NOT EXISTS qms_ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  input_hash TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed', 'cancelled', 'expired')),
  result JSONB,
  decided_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qms_ai_pending_actions_session_created ON qms_ai_pending_actions(session_id, created_at);

CREATE TABLE IF NOT EXISTS qms_ai_model_access (
  user_id INTEGER PRIMARY KEY,
  allowed_models TEXT[] NOT NULL,
  updated_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
