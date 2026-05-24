-- Migration tracking table — must be first migration (00-)
-- Records which migrations have been applied and their checksums
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT,
  success BOOLEAN DEFAULT true
);
