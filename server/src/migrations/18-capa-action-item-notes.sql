CREATE TABLE IF NOT EXISTS capa_action_item_notes (
  id SERIAL PRIMARY KEY,
  action_item_id INTEGER NOT NULL REFERENCES capa_action_items(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_capa_action_item_notes_item ON capa_action_item_notes(action_item_id);
