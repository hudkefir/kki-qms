-- 35-sop-categories.sql
-- Controlled lookup table for SOP categories.
-- Replaces free-text category entry with a governed list (dropdown).
-- Non-destructive: sops.category_code / category_name columns are untouched;
-- this table becomes the source of truth for the picker and is seeded from
-- whatever distinct categories already exist on SOPs.

CREATE TABLE IF NOT EXISTS sop_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed from existing distinct categories already in use. ON CONFLICT keeps the
-- first name encountered per code so re-running is idempotent and harmless.
INSERT INTO sop_categories (code, name)
SELECT DISTINCT category_code, category_name
FROM sops
WHERE category_code IS NOT NULL AND category_code <> ''
ON CONFLICT (code) DO NOTHING;
