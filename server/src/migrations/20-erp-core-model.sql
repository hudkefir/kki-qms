
-- Migration: 20-erp-core-model.sql
-- Description: Creates the core ERP data model tables for KEFIR Kultures Inc.
-- KKI ERP Data Model - Master Data Tables

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'raw_material', 'packaging', 'wip', 'finished_goods'
    unit_of_measure VARCHAR(50) NOT NULL,
    lot_tracking_required BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE items IS 'Master data for all raw materials, packaging, WIP, and finished goods.';

CREATE TABLE IF NOT EXISTS skus (
    id SERIAL PRIMARY KEY,
    sku_code VARCHAR(50) UNIQUE NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    market VARCHAR(50), -- e.g., 'USA', 'Canada'
    jar_size VARCHAR(50), -- e.g., '310mL', '500mL'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE skus IS 'Sellable product variants (SKUs) linking to parent items.';

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE suppliers IS 'Master data for all raw material and packaging suppliers.';

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50), -- e.g., 'retailer', 'distributor', 'dc'
    contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE customers IS 'Master data for all customers and distribution centers.';

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'storage', 'production', 'qa_hold', 'shipping'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE locations IS 'Warehouse and production area locations.';

CREATE TABLE IF NOT EXISTS reason_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    meaning TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'qa', 'inventory', 'production', 'shipping'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE reason_codes IS 'Structured reason codes for inventory, QA, and production events.';

-- Seed reason_codes
INSERT INTO reason_codes (code, meaning, category) VALUES
('QA-LEAK', 'Leaking jar', 'qa'),
('QA-CO2', 'Excess CO2/Bulging Jar', 'qa'),
('QA-PH-HIGH', 'pH too high', 'qa'),
('QA-PH-LOW', 'pH too low', 'qa'),
('QA-TEXTURE', 'Texture issue', 'qa'),
('QA-UNDERFILL', 'Underfilled bottle', 'qa'),
('QA-DIRTY', 'Dirty jar/bottle', 'qa'),
('QA-LABEL', 'Labeling issue', 'qa'),
('QA-MICRO', 'Microbiological issue', 'qa'),
('INV-DAMAGE', 'Damaged inventory', 'inventory'),
('INV-COUNT', 'Cycle count adjustment', 'inventory'),
('PROD-YIELD', 'Production yield variance', 'production'),
('SHIP-SHORT', 'Short shipment', 'shipping')
ON CONFLICT (code) DO NOTHING;

-- KKI ERP Data Model - Lot & Batch Tables

CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
    received_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ,
    qa_status VARCHAR(50) DEFAULT 'pending_qa' CHECK (qa_status IN ('pending_qa','qa_hold','qa_released','rejected','rework','destroyed')),
    quantity_received NUMERIC(18, 4) NOT NULL,
    quantity_remaining NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE lots IS 'Tracks supplier lots and internal WIP/fermentation lots.';
CREATE INDEX IF NOT EXISTS idx_lots_item_id ON lots (item_id);
CREATE INDEX IF NOT EXISTS idx_lots_supplier_id ON lots (supplier_id);
CREATE INDEX IF NOT EXISTS idx_lots_expiry_date ON lots (expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_qa_status ON lots (qa_status);

CREATE TABLE IF NOT EXISTS finished_goods_batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    wip_number VARCHAR(100), -- Reference to an internal WIP lot if applicable
    production_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ,
    formula_version VARCHAR(50),
    qa_status VARCHAR(50) DEFAULT 'pending_qa' CHECK (qa_status IN ('pending_qa','qa_hold','qa_released','rejected','rework','destroyed')),
    quantity_made NUMERIC(18, 4) NOT NULL,
    quantity_available NUMERIC(18, 4) NOT NULL,
    quantity_shipped NUMERIC(18, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE finished_goods_batches IS 'Tracks produced finished goods batches with full traceability info.';
CREATE INDEX IF NOT EXISTS idx_fg_batches_sku_id ON finished_goods_batches (sku_id);
CREATE INDEX IF NOT EXISTS idx_fg_batches_production_date ON finished_goods_batches (production_date);
CREATE INDEX IF NOT EXISTS idx_fg_batches_expiry_date ON finished_goods_batches (expiry_date);
CREATE INDEX IF NOT EXISTS idx_fg_batches_qa_status ON finished_goods_batches (qa_status);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('receive','consume','produce','transfer','hold','release','ship','adjust')),
    item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
    lot_id INTEGER REFERENCES lots(id) ON DELETE RESTRICT, -- For raw materials/WIP
    batch_id INTEGER REFERENCES finished_goods_batches(id) ON DELETE RESTRICT, -- For finished goods
    quantity NUMERIC(18, 4) NOT NULL,
    from_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    reason_code_id INTEGER REFERENCES reason_codes(id) ON DELETE RESTRICT,
    user_name VARCHAR(255) NOT NULL,
    source_document_type VARCHAR(50), -- e.g., 'PO', 'Production Order', 'Shipment'
    source_document_id INTEGER, -- ID of the related document
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE inventory_transactions IS 'Records every inventory movement for full audit trail and traceability.';
CREATE INDEX IF NOT EXISTS idx_inv_transactions_item_id ON inventory_transactions (item_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_lot_id ON inventory_transactions (lot_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_batch_id ON inventory_transactions (batch_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_from_loc_id ON inventory_transactions (from_location_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_to_loc_id ON inventory_transactions (to_location_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_reason_code_id ON inventory_transactions (reason_code_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_created_at ON inventory_transactions (created_at);

-- KKI ERP Data Model - Formula/BOM Tables

CREATE TABLE IF NOT EXISTS bom_versions (
    id SERIAL PRIMARY KEY,
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    version_code VARCHAR(50) NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
    approved_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sku_id, version_code)
);
COMMENT ON TABLE bom_versions IS 'Bill of Materials (BOM) recipe versions for each SKU.';
CREATE INDEX IF NOT EXISTS idx_bom_versions_sku_id ON bom_versions (sku_id);
CREATE INDEX IF NOT EXISTS idx_bom_versions_effective_date ON bom_versions (effective_date);

CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_version_id INTEGER NOT NULL REFERENCES bom_versions(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity_per_unit NUMERIC(18, 4) NOT NULL,
    tolerance_percent NUMERIC(5, 2) DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bom_version_id, item_id)
);
COMMENT ON TABLE bom_lines IS 'Individual ingredient or packaging items within a BOM version.';
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom_version_id ON bom_lines (bom_version_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_item_id ON bom_lines (item_id);

-- KKI ERP Data Model - Production Tables

CREATE TABLE IF NOT EXISTS production_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    bom_version_id INTEGER NOT NULL REFERENCES bom_versions(id) ON DELETE RESTRICT,
    planned_quantity NUMERIC(18, 4) NOT NULL,
    actual_quantity NUMERIC(18, 4),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
    operators TEXT, -- Comma-separated or JSON array of operator names/IDs
    equipment_notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE production_orders IS 'Planned and actual production runs.';
CREATE INDEX IF NOT EXISTS idx_production_orders_sku_id ON production_orders (sku_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_bom_version_id ON production_orders (bom_version_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders (status);

CREATE TABLE IF NOT EXISTS material_consumption (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    lot_id INTEGER REFERENCES lots(id) ON DELETE RESTRICT,
    planned_quantity NUMERIC(18, 4),
    actual_quantity NUMERIC(18, 4) NOT NULL,
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    consumed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE material_consumption IS 'Records raw materials consumed during a production order.';
CREATE INDEX IF NOT EXISTS idx_material_consumption_po_id ON material_consumption (production_order_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_item_id ON material_consumption (item_id);
CREATE INDEX IF NOT EXISTS idx_material_consumption_lot_id ON material_consumption (lot_id);

-- KKI ERP Data Model - QA Tables

CREATE TABLE IF NOT EXISTS qa_checks (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES finished_goods_batches(id) ON DELETE CASCADE,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE, -- For raw material/WIP lots
    check_type VARCHAR(100) NOT NULL, -- e.g., 'pH', 'Texture', 'Microbial', 'Visual'
    parameter VARCHAR(100) NOT NULL,
    spec_min NUMERIC(10, 4),
    spec_max NUMERIC(10, 4),
    actual_value NUMERIC(18, 4),
    pass_fail BOOLEAN,
    checked_by VARCHAR(255) NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE qa_checks IS 'Records individual quality assurance test results for lots or batches.';
CREATE INDEX IF NOT EXISTS idx_qa_checks_batch_id ON qa_checks (batch_id);
CREATE INDEX IF NOT EXISTS idx_qa_checks_lot_id ON qa_checks (lot_id);
CREATE INDEX IF NOT EXISTS idx_qa_checks_check_type ON qa_checks (check_type);

CREATE TABLE IF NOT EXISTS qa_status_history (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES finished_goods_batches(id) ON DELETE CASCADE,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    old_status VARCHAR(50) CHECK (old_status IN ('pending_qa','qa_hold','qa_released','rejected','rework','destroyed')),
    new_status VARCHAR(50) CHECK (new_status IN ('pending_qa','qa_hold','qa_released','rejected','rework','destroyed')),
    reason_code_id INTEGER REFERENCES reason_codes(id) ON DELETE RESTRICT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE qa_status_history IS 'Logs changes to QA status for full auditability of holds and releases.';
CREATE INDEX IF NOT EXISTS idx_qa_status_history_batch_id ON qa_status_history (batch_id);
CREATE INDEX IF NOT EXISTS idx_qa_status_history_lot_id ON qa_status_history (lot_id);

-- KKI ERP Data Model - Master BPR Tables

CREATE TABLE IF NOT EXISTS master_bprs (
    id SERIAL PRIMARY KEY,
    bpr_number VARCHAR(100) UNIQUE NOT NULL,
    sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
    bom_version_id INTEGER NOT NULL REFERENCES bom_versions(id) ON DELETE RESTRICT,
    version VARCHAR(50) NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    supersedes_id INTEGER REFERENCES master_bprs(id),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','approved','superseded')),
    approved_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sku_id, version)
);
COMMENT ON TABLE master_bprs IS 'Approved Master Batch Production Record templates.';
CREATE INDEX IF NOT EXISTS idx_master_bprs_sku_id ON master_bprs (sku_id);
CREATE INDEX IF NOT EXISTS idx_master_bprs_bom_version_id ON master_bprs (bom_version_id);
CREATE INDEX IF NOT EXISTS idx_master_bprs_effective_date ON master_bprs (effective_date);

CREATE TABLE IF NOT EXISTS master_bpr_steps (
    id SERIAL PRIMARY KEY,
    master_bpr_id INTEGER NOT NULL REFERENCES master_bprs(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    equipment TEXT,
    duration_minutes INTEGER,
    critical_parameter VARCHAR(255),
    spec_min NUMERIC(10, 4),
    spec_max NUMERIC(10, 4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(master_bpr_id, step_number)
);
COMMENT ON TABLE master_bpr_steps IS 'Individual process steps defined in a Master BPR.';
CREATE INDEX IF NOT EXISTS idx_master_bpr_steps_bpr_id ON master_bpr_steps (master_bpr_id);

CREATE TABLE IF NOT EXISTS master_bpr_qa_checks (
    id SERIAL PRIMARY KEY,
    master_bpr_id INTEGER NOT NULL REFERENCES master_bprs(id) ON DELETE CASCADE,
    check_type VARCHAR(100) NOT NULL,
    parameter VARCHAR(100) NOT NULL,
    spec_min NUMERIC(10, 4),
    spec_max NUMERIC(10, 4),
    method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(master_bpr_id, check_type, parameter)
);
COMMENT ON TABLE master_bpr_qa_checks IS 'Required QA checks defined in a Master BPR.';
CREATE INDEX IF NOT EXISTS idx_master_bpr_qa_checks_bpr_id ON master_bpr_qa_checks (master_bpr_id);

CREATE TABLE IF NOT EXISTS executed_bprs (
    id SERIAL PRIMARY KEY,
    master_bpr_id INTEGER NOT NULL REFERENCES master_bprs(id) ON DELETE RESTRICT,
    batch_id INTEGER NOT NULL REFERENCES finished_goods_batches(id) ON DELETE RESTRICT,
    production_order_id INTEGER REFERENCES production_orders(id) ON DELETE RESTRICT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    operators TEXT, -- Comma-separated or JSON array of operator names/IDs
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','reviewed','approved','rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id) -- One executed BPR per finished goods batch
);
COMMENT ON TABLE executed_bprs IS 'Actual records of BPRs executed for specific production batches.';
CREATE INDEX IF NOT EXISTS idx_executed_bprs_master_bpr_id ON executed_bprs (master_bpr_id);
CREATE INDEX IF NOT EXISTS idx_executed_bprs_batch_id ON executed_bprs (batch_id);
CREATE INDEX IF NOT EXISTS idx_executed_bprs_production_order_id ON executed_bprs (production_order_id);

CREATE TABLE IF NOT EXISTS executed_bpr_steps (
    id SERIAL PRIMARY KEY,
    executed_bpr_id INTEGER NOT NULL REFERENCES executed_bprs(id) ON DELETE CASCADE,
    master_step_id INTEGER NOT NULL REFERENCES master_bpr_steps(id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ,
    operator VARCHAR(255),
    actual_value TEXT, -- For critical parameters, store as text or JSON
    deviation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(executed_bpr_id, master_step_id)
);
COMMENT ON TABLE executed_bpr_steps IS 'Records of individual steps completed in an executed BPR.';
CREATE INDEX IF NOT EXISTS idx_executed_bpr_steps_exec_bpr_id ON executed_bpr_steps (executed_bpr_id);
CREATE INDEX IF NOT EXISTS idx_executed_bpr_steps_master_step_id ON executed_bpr_steps (master_step_id);

CREATE TABLE IF NOT EXISTS executed_bpr_qa_results (
    id SERIAL PRIMARY KEY,
    executed_bpr_id INTEGER NOT NULL REFERENCES executed_bprs(id) ON DELETE CASCADE,
    master_check_id INTEGER NOT NULL REFERENCES master_bpr_qa_checks(id) ON DELETE RESTRICT,
    actual_value NUMERIC(18, 4),
    pass_fail BOOLEAN,
    checked_by VARCHAR(255),
    checked_at TIMESTAMPTZ,
    deviation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(executed_bpr_id, master_check_id)
);
COMMENT ON TABLE executed_bpr_qa_results IS 'Actual QA check results recorded during BPR execution.';
CREATE INDEX IF NOT EXISTS idx_executed_bpr_qa_results_exec_bpr_id ON executed_bpr_qa_results (executed_bpr_id);
CREATE INDEX IF NOT EXISTS idx_executed_bpr_qa_results_master_check_id ON executed_bpr_qa_results (master_check_id);
