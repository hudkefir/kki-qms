-- Migration: 22-phase1-1-item-master.sql
-- Description: Phase 1.1 — Enrich ERP core tables with full schema from Phase-1-Schema-Draft.md
--
-- Strategy:
--   • ALTER TABLE ... ADD COLUMN IF NOT EXISTS for all enrichments (existing SERIAL PKs preserved)
--   • CREATE TABLE IF NOT EXISTS for any new structure
--   • CREATE OR REPLACE VIEW for updated analytics views
--   • ON CONFLICT DO NOTHING for all seed data
--   • Does NOT modify or drop any existing columns or constraints
--
-- Reference: ~/ObsidianBrain/KEFIR/ERP-Build/Phase-1-Schema-Draft.md

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ITEMS — Master Item Registry
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing columns (from 20-erp-core-model.sql):
--   id SERIAL PK, item_code, name, type, unit_of_measure,
--   lot_tracking_required, active, created_at, updated_at

ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT;

-- item_type: canonical Phase-1 column (type still exists for backward compat)
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type VARCHAR(30);
UPDATE items SET item_type = type WHERE item_type IS NULL AND type IS NOT NULL;

ALTER TABLE items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);

-- base_uom: canonical Phase-1 column (unit_of_measure still exists for compat)
ALTER TABLE items ADD COLUMN IF NOT EXISTS base_uom VARCHAR(30);
UPDATE items SET base_uom = unit_of_measure WHERE base_uom IS NULL AND unit_of_measure IS NOT NULL;

ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_uom VARCHAR(30);
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_uom_factor NUMERIC(10,4);

-- default_supplier_id uses integer FK to match existing SERIAL suppliers.id
ALTER TABLE items ADD COLUMN IF NOT EXISTS default_supplier_id INTEGER REFERENCES suppliers(id);

-- Food safety / GMP
ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS storage_conditions VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS allergens TEXT[];
ALTER TABLE items ADD COLUMN IF NOT EXISTS kosher BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS organic BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS gmo_free BOOLEAN DEFAULT FALSE;

-- Inventory control
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(18,4);
ALTER TABLE items ADD COLUMN IF NOT EXISTS reorder_qty NUMERIC(18,4);
ALTER TABLE items ADD COLUMN IF NOT EXISTS safety_stock NUMERIC(18,4);

-- BaseModel audit fields
ALTER TABLE items ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_item_type    ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_category     ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_not_deleted  ON items(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE items IS 'Master registry for all materials: raw, packaging, intermediate, finished goods, consumables. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SKUS — Sellable Product Variants
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20 + 30): id, sku_code, item_id, market, jar_size, description,
--   unit_of_measure, lot_tracking_required, active

ALTER TABLE skus ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS flavour VARCHAR(100);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS label_version VARCHAR(30);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS units_per_case INTEGER DEFAULT 6;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS cases_per_pallet INTEGER;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS standard_cost NUMERIC(10,4);
ALTER TABLE skus ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE skus ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE skus ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_skus_not_deleted ON skus(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE skus IS 'Sellable product variants — market/size/flavour combinations of a finished good item. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SUPPLIERS — Enrich existing QMS supplier table
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 10-suppliers.sql): id, supplier_id TEXT, name, category,
--   status, contact_name, contact_email, contact_phone, address, country,
--   website, products_supplied, certifications, risk_level, last_audit_date,
--   next_audit_date, approval_date, notes, created_by, updated_by,
--   created_at, updated_at

-- ERP supplier code (separate from the legacy supplier_id TEXT field)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE;

-- ERP type classification ('ingredient','packaging','service','equipment')
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS coa_required BOOLEAN DEFAULT FALSE;

-- approved BOOLEAN mirrors status = 'approved' for ERP-style checks
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT FALSE;
UPDATE suppliers SET approved = TRUE WHERE approved IS NULL AND status = 'approved';

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS approved_date DATE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS audit_date DATE;   -- last audit (last_audit_date is TEXT)

-- active soft-delete flag
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_suppliers_code        ON suppliers(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_not_deleted ON suppliers(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE suppliers IS 'Supplier master — QMS tracking + ERP Phase 1.1 enrichment.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CUSTOMERS — Master
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, name, code, type, contact, created_at, updated_at

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50);
UPDATE customers SET customer_type = type WHERE customer_type IS NULL AND type IS NOT NULL;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS market VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS min_shelf_life_days INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS requires_lot_cert BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_not_deleted ON customers(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE customers IS 'Customer and distribution center master. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LOCATIONS — Warehouse / Storage Locations
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, name, code, type, created_at, updated_at

-- location_type: canonical Phase-1 column (type still exists for compat)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);
UPDATE locations SET location_type = type WHERE location_type IS NULL AND type IS NOT NULL;

ALTER TABLE locations ADD COLUMN IF NOT EXISTS temperature_controlled BOOLEAN DEFAULT FALSE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS target_temp_min NUMERIC(5,2);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS target_temp_max NUMERIC(5,2);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_locations_location_type ON locations(location_type);

COMMENT ON TABLE locations IS 'Physical storage and processing locations. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REASON CODES — Exception Tracking
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, code, meaning, category, created_at, updated_at

-- description: new canonical name. meaning still exists for compat.
ALTER TABLE reason_codes ADD COLUMN IF NOT EXISTS description TEXT;
UPDATE reason_codes SET description = meaning WHERE description IS NULL AND meaning IS NOT NULL;

ALTER TABLE reason_codes ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Seed Phase-1 reason codes (codes not in the original seed)
INSERT INTO reason_codes (code, meaning, description, category) VALUES
    ('INV-EXPIRED',  'Expired product removal',       'Expired product removal',       'inventory'),
    ('PROD-SCRAP',   'Production scrap/waste',         'Production scrap/waste',         'production'),
    ('SHIP-RETURN',  'Customer return',                'Customer return',                'shipping'),
    ('RCV-DAMAGE',   'Damaged on receipt',             'Damaged on receipt',             'receiving'),
    ('RCV-SHORT',    'Short receipt vs PO',            'Short receipt vs PO',            'receiving'),
    ('RCV-REJECT',   'Rejected on receipt (QA fail)',  'Rejected on receipt (QA fail)',  'receiving')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE reason_codes IS 'Structured reason codes for every inventory, QA, and production exception. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. LOTS — Unified Lot/Batch Master (Enrich)
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, lot_number, item_id, supplier_id, received_date,
--   expiry_date, qa_status CHECK, quantity_received, quantity_remaining,
--   created_at, updated_at
-- NOTE: qa_status CHECK uses 'qa_released' (old). New design uses 'released'.
--   Cannot alter existing CHECK without modifying table. Both values will exist;
--   new code should use 'released', legacy data may have 'qa_released'.

-- lot_type discriminator ('received', 'wip', 'produced', 'rework')
ALTER TABLE lots ADD COLUMN IF NOT EXISTS lot_type VARCHAR(30);

-- For produced/WIP lots
ALTER TABLE lots ADD COLUMN IF NOT EXISTS sku_id INTEGER REFERENCES skus(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS supplier_lot_number VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS coa_document_id TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS production_order_id INTEGER REFERENCES production_orders(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS bom_version_id INTEGER REFERENCES bom_versions(id);

-- parent_lot_ids: INTEGER[] of lot IDs that went into this batch (one-up traceability)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS parent_lot_ids INTEGER[];

-- Dates
ALTER TABLE lots ADD COLUMN IF NOT EXISTS production_date TIMESTAMPTZ;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS best_before_date TIMESTAMPTZ;

-- Quantity (initial_quantity: canonical; quantity_received still exists for compat)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS initial_quantity NUMERIC(18,4);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS unit VARCHAR(30);

-- QA release tracking
ALTER TABLE lots ADD COLUMN IF NOT EXISTS qa_released_by TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS qa_released_at TIMESTAMPTZ;

-- Location
ALTER TABLE lots ADD COLUMN IF NOT EXISTS current_location_id INTEGER REFERENCES locations(id);

ALTER TABLE lots ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE lots ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE lots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lots_lot_type        ON lots(lot_type);
CREATE INDEX IF NOT EXISTS idx_lots_sku_id          ON lots(sku_id);
CREATE INDEX IF NOT EXISTS idx_lots_production_date ON lots(production_date);
CREATE INDEX IF NOT EXISTS idx_lots_not_deleted     ON lots(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE lots IS 'Unified lot/batch master — raw material lots, WIP, and finished goods batches. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. BOM_VERSIONS — Recipe / Formula Versions
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, sku_id, version_code, effective_date, status CHECK
--   ('draft','approved','superseded'), approved_by, notes, created_at, updated_at

ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS superseded_date DATE;
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS supersedes_id INTEGER REFERENCES bom_versions(id);
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS expected_yield NUMERIC(10,4);
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS yield_unit VARCHAR(30);
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE bom_versions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON TABLE bom_versions IS 'Versioned recipes/formulas per SKU. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BOM_LINES — Recipe Ingredients / Materials
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, bom_version_id, item_id, quantity_per_unit,
--   tolerance_percent, unit, created_at, updated_at

ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS line_type VARCHAR(30) NOT NULL DEFAULT 'ingredient';
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS critical BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS sequence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS lot_tracking_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'system';
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'system';

-- quantity_per is the new canonical alias; quantity_per_unit still exists
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS quantity_per NUMERIC(18,4);
UPDATE bom_lines SET quantity_per = quantity_per_unit WHERE quantity_per IS NULL AND quantity_per_unit IS NOT NULL;

-- tolerance_pct: canonical alias; tolerance_percent still exists
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS tolerance_pct NUMERIC(5,2);
UPDATE bom_lines SET tolerance_pct = tolerance_percent WHERE tolerance_pct IS NULL AND tolerance_percent IS NOT NULL;

COMMENT ON TABLE bom_lines IS 'Individual ingredients and packaging in a BOM version. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. INVENTORY_TRANSACTIONS — Ledger Enrichment
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing (from 20): id, transaction_type CHECK, item_id, lot_id, batch_id,
--   quantity, from_location_id, to_location_id, reason_code_id, user_name,
--   source_document_type, source_document_id, created_at, updated_at
-- NOTE: transaction_type CHECK missing 'return_in', 'return_out', 'scrap'.
--   Cannot alter the CHECK without modifying the table. New inserts using
--   these types will need the CHECK relaxed separately by Hudson if needed.

ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS unit VARCHAR(30);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS notes TEXT;

-- created_by: canonical audit field (user_name still exists for compat)
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS created_by TEXT;
UPDATE inventory_transactions SET created_by = user_name WHERE created_by IS NULL AND user_name IS NOT NULL;

-- source_doc aliases (source_document_type/id are the existing names)
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS source_doc_type VARCHAR(50);
UPDATE inventory_transactions
    SET source_doc_type = source_document_type
    WHERE source_doc_type IS NULL AND source_document_type IS NOT NULL;

COMMENT ON TABLE inventory_transactions IS 'Immutable inventory ledger. Enriched Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ADDITIONAL INDEXES (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_txn_source_doc ON inventory_transactions(source_doc_type, source_document_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. VIEWS — Phase 1.1 Replacements
-- ─────────────────────────────────────────────────────────────────────────────

-- v_current_inventory: live stock by item/lot/location from the transaction ledger.
-- Compatible with existing transaction_type direction convention (separate types
-- for in vs out, not signed quantity). Also handles legacy 'qa_released' status.
CREATE OR REPLACE VIEW v_current_inventory AS
SELECT
    i.id                                                            AS item_id,
    i.item_code,
    i.name                                                          AS item_name,
    COALESCE(i.item_type, i.type)                                   AS item_type,
    COALESCE(i.base_uom, i.unit_of_measure)                         AS unit,
    l.id                                                            AS lot_id,
    l.lot_number,
    COALESCE(l.lot_type, 'received')                                AS lot_type,
    l.qa_status,
    l.expiry_date,
    loc.id                                                          AS location_id,
    loc.code                                                        AS location_code,
    loc.name                                                        AS location_name,
    SUM(
        CASE WHEN it.transaction_type IN ('receive', 'produce', 'return_in', 'release')
             THEN it.quantity
             WHEN it.transaction_type IN ('consume', 'ship', 'scrap', 'return_out', 'adjust')
             THEN -it.quantity
             ELSE 0
        END
    )                                                               AS current_qty,
    EXTRACT(DAY FROM (l.expiry_date - NOW()))                       AS days_until_expiry
FROM inventory_transactions it
JOIN items i   ON it.item_id  = i.id
JOIN lots  l   ON it.lot_id   = l.id
LEFT JOIN locations loc
    ON COALESCE(it.to_location_id, it.from_location_id) = loc.id
WHERE i.deleted_at IS NULL
  AND l.deleted_at IS NULL
GROUP BY
    i.id, i.item_code, i.name, i.item_type, i.type, i.base_uom, i.unit_of_measure,
    l.id, l.lot_number, l.lot_type, l.qa_status, l.expiry_date,
    loc.id, loc.code, loc.name
HAVING SUM(
    CASE WHEN it.transaction_type IN ('receive', 'produce', 'return_in', 'release')
         THEN it.quantity
         WHEN it.transaction_type IN ('consume', 'ship', 'scrap', 'return_out', 'adjust')
         THEN -it.quantity
         ELSE 0
    END
) != 0;

COMMENT ON VIEW v_current_inventory IS
'Live inventory by item/lot/location, computed from transaction ledger. Phase 1.1.';


-- v_shippable_inventory: QA-released, unexpired finished goods ranked FEFO.
-- Accepts both 'released' (new) and 'qa_released' (legacy) qa_status values.
CREATE OR REPLACE VIEW v_shippable_inventory AS
SELECT
    ci.*,
    ROW_NUMBER() OVER (
        PARTITION BY ci.item_id
        ORDER BY ci.expiry_date ASC NULLS LAST
    ) AS fefo_rank
FROM v_current_inventory ci
WHERE ci.qa_status IN ('released', 'qa_released')
  AND (ci.expiry_date IS NULL OR ci.expiry_date > NOW())
  AND ci.current_qty > 0
  AND ci.lot_type = 'produced';

COMMENT ON VIEW v_shippable_inventory IS
'QA-released, unexpired finished goods ranked FEFO (first expiry, first out). Phase 1.1.';


-- v_batch_traceability: one-up traceability for finished batches.
-- parent_lot_ids array references the raw material / WIP lots that went in.
CREATE OR REPLACE VIEW v_batch_traceability AS
SELECT
    fg.id                       AS finished_lot_id,
    fg.lot_number               AS batch_number,
    s.sku_code,
    fg.production_date,
    fg.expiry_date,
    fg.qa_status,
    fg.initial_quantity,
    fg.unit,
    unnest(fg.parent_lot_ids)   AS source_lot_id
FROM lots fg
LEFT JOIN skus s ON fg.sku_id = s.id
WHERE fg.lot_type = 'produced'
  AND fg.parent_lot_ids IS NOT NULL
  AND array_length(fg.parent_lot_ids, 1) > 0
  AND fg.deleted_at IS NULL;

COMMENT ON VIEW v_batch_traceability IS
'One-up traceability: for each finished batch, which raw material/WIP lots went into it. Phase 1.1.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. CONSTRAINT FIXES (Phase 1.1 cleanup)
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix 1: lots.qa_status — drop old CHECK, add new one with 'released'
DO $$
BEGIN
    -- Find and drop the existing qa_status check constraint
    EXECUTE (
        SELECT 'ALTER TABLE lots DROP CONSTRAINT ' || conname
        FROM pg_constraint
        WHERE conrelid = 'lots'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%qa_status%'
        LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No existing qa_status CHECK to drop (or already dropped)';
END $$;

ALTER TABLE lots ADD CONSTRAINT lots_qa_status_check CHECK (qa_status IN (
    'pending_qa', 'qa_hold', 'released', 'rejected', 'rework', 'destroyed', 'expired',
    'qa_released'  -- legacy compat
));

-- Fix 2: inventory_transactions.transaction_type — drop old CHECK, add expanded one
DO $$
BEGIN
    EXECUTE (
        SELECT 'ALTER TABLE inventory_transactions DROP CONSTRAINT ' || conname
        FROM pg_constraint
        WHERE conrelid = 'inventory_transactions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%transaction_type%'
        LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'No existing transaction_type CHECK to drop (or already dropped)';
END $$;

ALTER TABLE inventory_transactions ADD CONSTRAINT inv_txn_type_check CHECK (transaction_type IN (
    'receive', 'consume', 'produce', 'adjust', 'transfer', 'ship',
    'return_in', 'return_out', 'scrap',
    'receipt', 'pick', 'production'  -- legacy compat
));

-- Fix 3: Ensure bom_lines references bom_version_id correctly
-- (boms.js may reference bom_id — this ensures the column exists either way)
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS bom_id INTEGER;
UPDATE bom_lines SET bom_id = bom_version_id WHERE bom_id IS NULL AND bom_version_id IS NOT NULL;

