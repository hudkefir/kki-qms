-- Supplier Management
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  supplier_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ingredient',
  status TEXT NOT NULL DEFAULT 'pending',
  contact_name TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  country TEXT DEFAULT '',
  website TEXT DEFAULT '',
  products_supplied TEXT DEFAULT '[]',
  certifications TEXT DEFAULT '[]',
  risk_level TEXT DEFAULT 'medium',
  last_audit_date TEXT,
  next_audit_date TEXT,
  approval_date TEXT,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_reviews (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  review_date TEXT NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'annual',
  reviewer TEXT NOT NULL,
  overall_rating INTEGER DEFAULT 3,
  quality_rating INTEGER DEFAULT 3,
  delivery_rating INTEGER DEFAULT 3,
  communication_rating INTEGER DEFAULT 3,
  findings TEXT DEFAULT '',
  corrective_actions TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  next_review_date TEXT,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_sequence (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1
);
