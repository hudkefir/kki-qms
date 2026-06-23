-- Migration 33: Add is_current flag to sop_files for archive/promote workflow
-- When TRUE, this is the active version of the file. When FALSE, it's archived.

ALTER TABLE sop_files ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;

-- Backfill: for each (sop_id, original_name) group, only the highest-versioned file is current
UPDATE sop_files SET is_current = FALSE
WHERE id NOT IN (
  SELECT DISTINCT ON (sop_id, original_name) id
  FROM sop_files
  ORDER BY sop_id, original_name, version DESC
);
