-- Equipment & Maintenance
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  equipment_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  date_installed TEXT,
  is_critical INTEGER DEFAULT 0,
  associated_sops TEXT DEFAULT '[]',
  pm_frequency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_schedules (
  id SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  task_name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  assigned_to TEXT,
  last_completed_date TEXT,
  next_due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_completions (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES pm_schedules(id),
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  completed_by TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  issues_found TEXT,
  parts_used TEXT DEFAULT '[]',
  next_due_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  work_order_number TEXT UNIQUE NOT NULL,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  assigned_to TEXT,
  work_performed TEXT,
  parts_used TEXT DEFAULT '[]',
  is_temporary_repair INTEGER DEFAULT 0,
  temporary_repair_deadline TEXT,
  temporary_repair_approved_by TEXT,
  post_maintenance_sanitation INTEGER DEFAULT 0,
  equipment_returned_to_service INTEGER DEFAULT 0,
  returned_to_service_at TEXT,
  completed_by TEXT,
  completed_at TEXT,
  verified_by TEXT,
  food_safety_impact INTEGER DEFAULT 0,
  affected_product TEXT,
  product_disposition TEXT,
  linked_deviation_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wo_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_equipment ON pm_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_next_due ON pm_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_pm_completions_schedule ON pm_completions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
