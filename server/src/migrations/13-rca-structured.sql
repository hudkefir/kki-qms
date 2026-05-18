-- Structured root cause analysis data (method-specific forms)
ALTER TABLE capas ADD COLUMN IF NOT EXISTS root_cause_structured JSONB;
