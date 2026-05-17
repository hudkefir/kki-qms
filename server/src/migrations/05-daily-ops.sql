-- Daily Operations: tasks, completions, templates, operator tasks, inventory, pick lists
CREATE TABLE IF NOT EXISTS daily_tasks (
  id SERIAL PRIMARY KEY,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  description TEXT DEFAULT '',
  sop_reference TEXT DEFAULT '',
  color TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  assigned_to TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_task_completions (
  id SERIAL PRIMARY KEY,
  daily_task_id INTEGER NOT NULL REFERENCES daily_tasks(id),
  completed_by TEXT NOT NULL,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  shift TEXT DEFAULT 'morning',
  date TEXT NOT NULL,
  status TEXT DEFAULT 'done',
  notes TEXT DEFAULT '',
  locked INTEGER DEFAULT 0,
  verified_by TEXT DEFAULT '',
  verified_at TEXT,
  admin_modified_by TEXT DEFAULT '',
  admin_modified_at TEXT,
  admin_modify_reason TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_task_templates (
  id SERIAL PRIMARY KEY,
  template_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_task_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES daily_task_templates(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  sop_reference TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  color TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS operator_tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assigned_to TEXT NOT NULL,
  created_by TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  linked_module TEXT NOT NULL,
  linked_record_id INTEGER NOT NULL,
  completed_at TEXT,
  completed_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operator_task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES operator_tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_counts (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  counted_qty REAL NOT NULL DEFAULT 0,
  count_date TEXT NOT NULL,
  counted_by TEXT DEFAULT '',
  location TEXT DEFAULT '',
  lot_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pick_lists (
  id SERIAL PRIMARY KEY,
  sales_order_number TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_po TEXT DEFAULT '',
  pick_date TEXT NOT NULL,
  picked_by TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pick_list_items (
  id SERIAL PRIMARY KEY,
  pick_list_id INTEGER NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  item_name TEXT DEFAULT '',
  ordered_qty REAL NOT NULL DEFAULT 0,
  picked_qty REAL DEFAULT 0,
  uom TEXT DEFAULT 'cases',
  bin_location TEXT DEFAULT '',
  lot_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily ops indexes
CREATE INDEX IF NOT EXISTS idx_daily_tasks_category ON daily_tasks(category);
CREATE INDEX IF NOT EXISTS idx_daily_task_completions_date ON daily_task_completions(date);
CREATE INDEX IF NOT EXISTS idx_daily_task_completions_task ON daily_task_completions(daily_task_id);
CREATE INDEX IF NOT EXISTS idx_operator_tasks_assigned_to ON operator_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_operator_tasks_status ON operator_tasks(status);
CREATE INDEX IF NOT EXISTS idx_operator_tasks_linked ON operator_tasks(linked_module, linked_record_id);
CREATE INDEX IF NOT EXISTS idx_operator_tasks_due_date ON operator_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_operator_task_comments_task ON operator_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_date ON inventory_counts(count_date);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_sku ON inventory_counts(sku);
CREATE INDEX IF NOT EXISTS idx_pick_lists_date ON pick_lists(pick_date);
CREATE INDEX IF NOT EXISTS idx_pick_lists_status ON pick_lists(status);
CREATE INDEX IF NOT EXISTS idx_pick_list_items_pick_list ON pick_list_items(pick_list_id);
