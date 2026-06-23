-- 34-harden-increment-version.sql
-- ============================================================================
-- DURABLE FIX for: "operator does not exist: text + integer" on SOP file upload.
--
-- Root cause: the shared increment_version() trigger function runs
--   NEW.version := OLD.version + 1;
-- which works on the ~48 tables whose `version` column is INTEGER, but THROWS
-- on tables whose `version` is TEXT (sops.version = '0.9.2'). The SOP upload
-- route does `UPDATE sops SET version = ...`, which fires the BEFORE UPDATE
-- trigger and 500s the upload.
--
-- Migration 32 dropped increment_version_trigger from `sops`, but it has since
-- been re-created on prod (likely by a blanket trigger-recreation step). A
-- one-off DROP is therefore not durable.
--
-- Fix: make the FUNCTION type-safe — only auto-increment when the version
-- column is a numeric type. For TEXT/semver versions (app-managed), it becomes
-- a no-op instead of throwing. Behavior on the 48 INTEGER tables is UNCHANGED.
-- Also re-drop the trigger on `sops` (it is app-managed and never needs it).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF pg_typeof(NEW.version) IN ('integer'::regtype, 'bigint'::regtype, 'smallint'::regtype, 'numeric'::regtype) THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS increment_version_trigger ON public.sops;
