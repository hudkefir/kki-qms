-- Taskboard System
CREATE TABLE IF NOT EXISTS taskboard_tasks (
  id SERIAL PRIMARY KEY,
  task TEXT NOT NULL DEFAULT '',
  operator TEXT DEFAULT '',
  section TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  backup TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'todo',
  num INTEGER,
  sort_order INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT,
  progress_note TEXT,
  board_date TEXT,
  data TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taskboard_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taskboard_backups (
  id SERIAL PRIMARY KEY,
  data TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taskboard_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES taskboard_templates(id),
  task TEXT NOT NULL DEFAULT '',
  operator TEXT DEFAULT '',
  section TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  backup TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS taskboard_state (
  id INTEGER PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS taskboard_audit (
  id SERIAL PRIMARY KEY,
  task_id INTEGER,
  task_name TEXT DEFAULT '',
  operator TEXT DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS taskboard_state_backups (
  id SERIAL PRIMARY KEY,
  data TEXT,
  saved_at TEXT
);

CREATE TABLE IF NOT EXISTS tb_operators (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  zone TEXT,
  color TEXT,
  avatar TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS tb_sections (
  id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  color TEXT,
  bg TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS tb_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS tb_announcements (
  id TEXT PRIMARY KEY,
  text TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tb_daily_config (
  id SERIAL PRIMARY KEY,
  task_text TEXT,
  section TEXT,
  tag TEXT,
  sort_order INTEGER,
  enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tb_process_templates (
  id TEXT PRIMARY KEY,
  name TEXT,
  version INTEGER,
  roles TEXT,
  history TEXT,
  created_at TEXT,
  updated_at TEXT
);
