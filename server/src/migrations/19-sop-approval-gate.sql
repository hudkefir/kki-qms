-- ============================================================================
-- 19-sop-approval-gate.sql  —  Controlled-document approval gate (Phase 1)
-- STAGED 2026-06-12 by Jarvis. NOT YET APPLIED TO PROD.
--
-- Purpose: wire the existing (empty) approval_history + digital_signatures
-- tables to the legacy integer-keyed `sops` table so the QMS can record
-- WHO approved each SOP and WHEN (ISO 9001 §7.5 control #2 + #5).
--
-- Why additive `sop_id` (option C): approval_history.record_id and
-- digital_signatures.record_id are UUID, built for the `documents_unified`
-- model — which is EMPTY (0 rows). The live system runs on legacy integer
-- `sops.id`. Bridging via documents_unified is impossible, so adding an explicit
-- integer FK is the clean route. See Obsidian:
--   KEFIR/QMS/2026-06-12-Controlled-Document-Compliance-Gap-Assessment.md
--
-- ⚠️ APPLY PATH: the migration runner (server/src/migrate.js) is currently
-- WEDGED — schema_migrations shows 05-daily-ops.sql success=false, and
-- database-pg.js swallows the throw ("Don't crash"). Result: migrations 06+
-- never auto-run; later schema was applied out-of-band. Until the runner is
-- un-wedged, THIS FILE MUST BE APPLIED MANUALLY to Supabase. Do so only in a
-- maintenance window with a snapshot taken first.
--
-- Fully additive + reversible. No data mutated. No NOT NULL added.
-- Rollback: see bottom of file.
-- ============================================================================

-- 1) Link compliance tables to the legacy integer-keyed sops table.
ALTER TABLE approval_history   ADD COLUMN IF NOT EXISTS sop_id INTEGER REFERENCES sops(id);
ALTER TABLE digital_signatures ADD COLUMN IF NOT EXISTS sop_id INTEGER REFERENCES sops(id);

CREATE INDEX IF NOT EXISTS idx_approval_history_sop_id   ON approval_history(sop_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_sop_id ON digital_signatures(sop_id);

-- 2) Convenience view: current approval state per SOP (read-only, no enforcement).
--    Lets the app + an auditor answer "who approved SOP-X and when" in one query.
CREATE OR REPLACE VIEW sop_approval_status AS
SELECT
  s.id              AS sop_id,
  s.sop_number,
  s.title,
  s.status,
  s.approver,
  s.reviewer,
  s.effective_date,
  s.next_review_date,
  ah.decided_by     AS last_decided_by,
  ah.decided_at     AS last_decided_at,
  ah.to_status      AS last_transition_to,
  (s.status = 'active' AND ah.id IS NULL) AS active_without_approval_record
FROM sops s
LEFT JOIN LATERAL (
  SELECT * FROM approval_history a
  WHERE a.sop_id = s.id
  ORDER BY a.created_at DESC
  LIMIT 1
) ah ON true;

-- NOTE: status-transition CHECK constraints and the "block active without
-- approver" rule are intentionally NOT in this migration. They are enforced
-- first at the APP layer (reversible) in Phase 1b, then hardened to a DB
-- trigger/CHECK after burn-in — so we never lock out the 24 currently-active
-- SOPs that have no approval_history row yet (those need a backfill decision).

-- ============================================================================
-- ROLLBACK (manual):
--   DROP VIEW IF EXISTS sop_approval_status;
--   DROP INDEX IF EXISTS idx_approval_history_sop_id;
--   DROP INDEX IF EXISTS idx_digital_signatures_sop_id;
--   ALTER TABLE approval_history   DROP COLUMN IF EXISTS sop_id;
--   ALTER TABLE digital_signatures DROP COLUMN IF EXISTS sop_id;
-- ============================================================================
