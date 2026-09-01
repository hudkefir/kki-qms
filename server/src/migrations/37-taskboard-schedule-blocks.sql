-- Migration 37: iObeya-style planning magnets for the operator task board.
-- Additive only. Self-contained in the QMS taskboard DB where the live board lives.
--
-- Model: a "magnet" = a planned block of work placed on an operator's lane for a
-- given operational_date, spanning a start->end time of day, colored by process type.
-- This is PLANNING intent (supervisor schedules the day), distinct from the existing
-- tb_tasks execution/checklist model.

BEGIN;

-- Process-type palette. Created here IF NOT EXISTS so the QMS DB is self-contained
-- even on a fresh local instance; seed is idempotent (ON CONFLICT DO NOTHING).
CREATE TABLE IF NOT EXISTS schedule_process_types (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_ooo     BOOLEAN NOT NULL DEFAULT FALSE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schedule_process_types (key, label, color, sort_order, is_ooo) VALUES
  ('seed_build',    'Seed Build / Backslop',       '#8B5CF6', 10, FALSE),
  ('fermentation',  'Fermentation',                '#3B82F6', 20, FALSE),
  ('straining',     'Straining',                   '#14B8A6', 30, FALSE),
  ('flavouring',    'Flavouring',                  '#F59E0B', 40, FALSE),
  ('fill_pack',     'Fill & Pack',                 '#22C55E', 50, FALSE),
  ('cip',           'CIP / Cleaning & Sanitize',   '#EF4444', 60, FALSE),
  ('out_of_office', 'Out of Office',               '#9CA3AF', 90, TRUE)
ON CONFLICT (key) DO NOTHING;

-- The magnet table. Keyed to tb_operators.id (the board's actual operators) and
-- schedule_process_types.key (the palette above).
CREATE TABLE IF NOT EXISTS tb_schedule_blocks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_date DATE NOT NULL,
  operator_id      TEXT NOT NULL REFERENCES tb_operators(id) ON DELETE CASCADE,
  process_type     TEXT NOT NULL REFERENCES schedule_process_types(key),
  label            TEXT NOT NULL DEFAULT '',
  starts_at        TIME NOT NULL,
  ends_at          TIME NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       TEXT NOT NULL DEFAULT 'system',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       TEXT NOT NULL DEFAULT 'system',
  CONSTRAINT tb_schedule_blocks_time_order CHECK (starts_at < ends_at)
);

CREATE INDEX IF NOT EXISTS idx_tb_schedule_blocks_date
  ON tb_schedule_blocks (operational_date, operator_id, starts_at);

COMMIT;
