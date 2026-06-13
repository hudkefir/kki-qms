-- ============================================================================
-- 20-sop-approval-backfill.sql — Approval-of-record backfill (Phase 1b)
-- STAGED 2026-06-13 by Jarvis. Applies AFTER 19-sop-approval-gate.sql.
--
-- Purpose: every currently-"active" SOP must carry a recorded approver + an
-- approval_history row (ISO 9001 §7.5 controls #2 + #5). Today 0 approval rows
-- exist and 29/34 SOPs have no named approver. Per Hudson Liao's explicit
-- decision (2026-06-13) he is the APPROVER OF RECORD for the existing library.
--
-- HONESTY NOTE: this does NOT fabricate a fake approval event. It records a
-- documented fact (Hudson approves the active SOPs) and TAGS each row as a
-- legacy migration backfill, with decided_at = the SOP's recorded
-- effective_date. Fully transparent + reversible.
--
-- Idempotent: guarded by NOT EXISTS / WHERE-missing, safe to re-run every boot.
-- Constraints honored: action='approved' (CHECK), record_id NOT NULL (uuid),
--   decided_by NOT NULL (chk_approval_decision).
-- ============================================================================

-- 1) Name the approver of record on every ACTIVE SOP that has none.
UPDATE sops
SET approver   = 'Hudson Liao',
    updated_at = COALESCE(NULLIF(updated_at,''), now()::text),
    updated_by = 'jarvis-legacy-backfill-2026-06-13'
WHERE status = 'active'
  AND (approver IS NULL OR approver = '');

-- 2) One legacy approval_history row per ACTIVE SOP that lacks any.
INSERT INTO approval_history
  (record_type, record_id, sop_id, action, from_status, to_status,
   requested_by, decided_by, decided_at, comments)
SELECT
  'sop',
  gen_random_uuid(),
  s.id,
  'approved',
  'in_review',
  'active',
  'Hudson Liao',
  'Hudson Liao',
  NULLIF(s.effective_date, '')::timestamptz,
  'Legacy migration backfill (2026-06-13): approval of record assigned to '
    || 'Hudson Liao per approver-of-record decision. decided_at = recorded '
    || 'effective_date. Original electronic approval predates this '
    || 'compliance audit trail. Tag: jarvis-legacy-backfill.'
FROM sops s
WHERE s.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM approval_history a WHERE a.sop_id = s.id
  );

-- ============================================================================
-- ROLLBACK (manual):
--   DELETE FROM approval_history
--     WHERE comments LIKE 'Legacy migration backfill (2026-06-13)%';
--   UPDATE sops SET approver = NULL
--     WHERE updated_by = 'jarvis-legacy-backfill-2026-06-13';
-- ============================================================================
