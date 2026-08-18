-- 36-batch-test-lab-submission.sql
-- Extends batch_tests to support external-lab SAMPLE SUBMISSIONS:
--   * SR# (Sample Reference) submission-tracking identifier
--   * Composite / pooled submissions (one panel covering N pooled batches)
-- Supports KK-SOP-00602 (External Laboratory Sample Submission & Testing), §6.7 Composite Sampling.
-- Additive + idempotent — safe to re-run.

ALTER TABLE batch_tests ADD COLUMN IF NOT EXISTS sr_number TEXT DEFAULT '';
ALTER TABLE batch_tests ADD COLUMN IF NOT EXISTS is_composite BOOLEAN DEFAULT FALSE;
-- JSON array of the pooled batch numbers when is_composite = true, e.g. ["SC-260817-1","SC-260818-1"]
ALTER TABLE batch_tests ADD COLUMN IF NOT EXISTS composite_batches TEXT DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_batch_tests_sr_number ON batch_tests(sr_number);

-- Seed the SR# sequence type so the first submission this year starts at SR-YYYY-001.
-- (qms_sequence uses next_number; other types self-seed on first use, this is defensive only.)
