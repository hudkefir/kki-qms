-- Production Planner
CREATE TABLE IF NOT EXISTS planner_batches (
  id SERIAL PRIMARY KEY,
  batch_number TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  production_date TEXT NOT NULL,
  bins INTEGER NOT NULL DEFAULT 0,
  cases_per_bin REAL NOT NULL DEFAULT 10.4,
  estimated_cases INTEGER NOT NULL DEFAULT 0,
  actual_cases INTEGER,
  inventory_remaining INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  hold INTEGER DEFAULT 0,
  pour_week INTEGER,
  pour_day INTEGER,
  pour_index INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  customer TEXT NOT NULL DEFAULT '',
  ship_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped INTEGER DEFAULT 0,
  shipped_at TEXT,
  enabled INTEGER DEFAULT 1,
  skus TEXT DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_fermentation (
  id SERIAL PRIMARY KEY,
  grp_number INTEGER NOT NULL,
  batch_number TEXT DEFAULT '',
  bins INTEGER NOT NULL DEFAULT 30,
  flavour TEXT DEFAULT 'Original',
  ferment_date TEXT,
  strain_date TEXT,
  ready_date TEXT,
  status TEXT DEFAULT 'fermenting',
  enabled INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_pours (
  id SERIAL PRIMARY KEY,
  week_index INTEGER NOT NULL,
  day_index INTEGER NOT NULL,
  pour_index INTEGER NOT NULL DEFAULT 0,
  pour_date TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT 'NONE',
  bins INTEGER NOT NULL DEFAULT 0,
  actual_cases INTEGER,
  batch_number TEXT DEFAULT '',
  fermentation_links TEXT DEFAULT '[]',
  enabled INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(week_index, day_index, pour_index)
);

CREATE TABLE IF NOT EXISTS planner_inventory_counts (
  id SERIAL PRIMARY KEY,
  count_date TEXT NOT NULL,
  sku TEXT NOT NULL,
  system_count INTEGER NOT NULL DEFAULT 0,
  physical_count INTEGER NOT NULL DEFAULT 0,
  variance INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  counted_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planner_fridge (
  id SERIAL PRIMARY KEY,
  batch_number TEXT NOT NULL,
  grp_number INTEGER,
  bins INTEGER NOT NULL DEFAULT 0,
  strain_date TEXT,
  flavour TEXT DEFAULT 'Original',
  allocated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available',
  entered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planner_pick_records (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES planner_purchase_orders(id),
  sku TEXT NOT NULL,
  batch_id INTEGER REFERENCES planner_batches(id),
  batch_number TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  picked_by TEXT DEFAULT '',
  picked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS planner_announcements (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_state (
  id INTEGER PRIMARY KEY,
  data TEXT,
  updated_at TEXT
);

-- Planner indexes
CREATE INDEX IF NOT EXISTS idx_planner_batches_sku ON planner_batches(sku);
CREATE INDEX IF NOT EXISTS idx_planner_batches_date ON planner_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_planner_batches_status ON planner_batches(status);
CREATE INDEX IF NOT EXISTS idx_planner_pos_status ON planner_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_planner_pos_ship_date ON planner_purchase_orders(ship_date);
CREATE INDEX IF NOT EXISTS idx_planner_fermentation_status ON planner_fermentation(status);
CREATE INDEX IF NOT EXISTS idx_planner_pours_date ON planner_pours(pour_date);
CREATE INDEX IF NOT EXISTS idx_planner_inventory_counts_date ON planner_inventory_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_planner_pick_records_po ON planner_pick_records(po_id);
