-- Migration: 30-production-tables.sql
-- Sprint 2: Production MVP tables
-- Per KKI-Unified-System-Architecture.md
-- NOTE: Does NOT duplicate existing tables. Extends or creates new only.

-- ─── Extend existing SKUs table ──────────────────────────────────────────────
ALTER TABLE skus ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'cases';
ALTER TABLE skus ADD COLUMN IF NOT EXISTS lot_tracking_required BOOLEAN DEFAULT TRUE;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS jar_size VARCHAR(50);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS market VARCHAR(50);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS description TEXT;

-- ─── Fermentation Batches (NEW — replaces basic fermentation_schedules) ──────
CREATE TABLE IF NOT EXISTS production_fermentation (
    id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    culture_type VARCHAR(100) NOT NULL,           -- e.g., 'milk kefir', 'coconut kefir', 'water kefir'
    substrate VARCHAR(100),                        -- e.g., 'whole milk', 'coconut milk'
    vessel VARCHAR(100),                           -- e.g., 'Bin A1', 'Fermenter 3'
    volume_litres NUMERIC(10,2),
    grain_weight_kg NUMERIC(10,3),
    start_date TIMESTAMPTZ NOT NULL,
    expected_ready_date TIMESTAMPTZ,
    actual_ready_date TIMESTAMPTZ,
    target_ph NUMERIC(4,2),
    actual_ph NUMERIC(4,2),
    target_ta NUMERIC(5,2),
    actual_ta NUMERIC(5,2),
    temperature_c NUMERIC(4,1),
    status VARCHAR(30) NOT NULL DEFAULT 'planned',  -- planned, fermenting, ready, used, discarded
    operator_id TEXT REFERENCES operators(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT chk_ferm_status CHECK (status IN ('planned', 'fermenting', 'ready', 'used', 'discarded'))
);
COMMENT ON TABLE production_fermentation IS 'Individual fermentation batches — tracks culture from start to ready.';
CREATE INDEX IF NOT EXISTS idx_ferm_status ON production_fermentation(status);
CREATE INDEX IF NOT EXISTS idx_ferm_expected_ready ON production_fermentation(expected_ready_date);

-- ─── Production Orders (NEW — the core entity linking fermentation → flavour → pour → pack) ─
CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    sku_id TEXT REFERENCES skus(id),
    fermentation_id INTEGER REFERENCES production_fermentation(id),
    status VARCHAR(30) NOT NULL DEFAULT 'planned',  -- planned, in_progress, flavouring, pouring, packing, qa_hold, released, shipped, cancelled
    planned_date DATE,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    target_quantity INTEGER,                         -- target cases/units
    actual_quantity INTEGER,
    bins_used INTEGER,
    operator_id TEXT REFERENCES operators(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT chk_po_status CHECK (status IN ('planned', 'in_progress', 'flavouring', 'pouring', 'packing', 'qa_hold', 'released', 'shipped', 'cancelled'))
);
COMMENT ON TABLE production_orders IS 'Production orders — tracks a batch from start to ship.';
CREATE INDEX IF NOT EXISTS idx_prodorder_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_prodorder_planned ON production_orders(planned_date);
CREATE INDEX IF NOT EXISTS idx_prodorder_sku ON production_orders(sku_id);

-- ─── Pour Records (NEW — actual pour execution) ────────────────────────────
CREATE TABLE IF NOT EXISTS production_pours (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER REFERENCES production_orders(id),
    fermentation_id INTEGER REFERENCES production_fermentation(id),
    sku_id TEXT REFERENCES skus(id),
    pour_date DATE NOT NULL,
    jar_size VARCHAR(50),
    bins_poured INTEGER,
    cases_produced INTEGER,
    operator_id TEXT REFERENCES operators(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
COMMENT ON TABLE production_pours IS 'Individual pour records — what was actually poured, how many cases.';
CREATE INDEX IF NOT EXISTS idx_pour_date ON production_pours(pour_date);
CREATE INDEX IF NOT EXISTS idx_pour_order ON production_pours(production_order_id);

-- ─── Flavouring Records (NEW — tracks flavouring step) ─────────────────────
CREATE TABLE IF NOT EXISTS production_flavouring (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER REFERENCES production_orders(id),
    flavour VARCHAR(100) NOT NULL,                   -- e.g., 'Guava', 'Mango', 'Plain'
    bins_flavoured INTEGER,
    flavour_date DATE NOT NULL,
    operator_id TEXT REFERENCES operators(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);
COMMENT ON TABLE production_flavouring IS 'Flavouring step records — which bins got which flavour.';

-- ─── Bill of Materials (NEW — recipe per SKU) ──────────────────────────────
CREATE TABLE IF NOT EXISTS bom_versions (
    id SERIAL PRIMARY KEY,
    sku_id TEXT REFERENCES skus(id),
    version INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(255),
    effective_date DATE,
    status VARCHAR(20) DEFAULT 'draft',              -- draft, active, superseded
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    UNIQUE(sku_id, version)
);
COMMENT ON TABLE bom_versions IS 'Bill of materials versions — recipe definitions per SKU.';

CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER NOT NULL REFERENCES bom_versions(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,                 -- e.g., 'Whole Milk 3.25%', 'Guava Puree'
    item_type VARCHAR(50),                           -- raw_material, packaging, label, additive
    quantity NUMERIC(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,                       -- kg, L, units, ml
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE bom_lines IS 'BOM line items — individual ingredients/materials in a recipe.';

-- ─── Production Taskboard (NEW — separate from QMS taskboard) ──────────────
CREATE TABLE IF NOT EXISTS production_taskboard (
    id SERIAL PRIMARY KEY,
    task_date DATE NOT NULL,
    task TEXT NOT NULL,
    section VARCHAR(100),                            -- e.g., 'Fermentation', 'Pouring', 'Packing', 'Cleaning'
    assigned_to TEXT REFERENCES operators(id),
    status VARCHAR(20) DEFAULT 'pending',            -- pending, in_progress, done
    priority INTEGER DEFAULT 0,
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT chk_ptb_status CHECK (status IN ('pending', 'in_progress', 'done'))
);
COMMENT ON TABLE production_taskboard IS 'Daily production task assignments — separate from QMS taskboard.';
CREATE INDEX IF NOT EXISTS idx_ptb_date ON production_taskboard(task_date);
CREATE INDEX IF NOT EXISTS idx_ptb_assigned ON production_taskboard(assigned_to);

-- ─── Production sequence for order numbers ──────────────────────────────────
CREATE TABLE IF NOT EXISTS production_order_seq (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
);
