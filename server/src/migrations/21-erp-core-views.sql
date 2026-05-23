-- Migration: 21-erp-core-views.sql
-- Description: Creates useful views for the KKI ERP data model.

-- View: v_inventory_by_lot
-- Shows current inventory levels per lot/batch, calculated from inventory_transactions.
CREATE OR REPLACE VIEW v_inventory_by_lot AS
SELECT
    i.id AS item_id,
    i.item_code,
    i.name AS item_name,
    i.unit_of_measure,
    COALESCE(l.id, fgb.id) AS lot_batch_id, -- Use lot_id for raw materials/WIP, batch_id for finished goods
    COALESCE(l.lot_number, fgb.batch_number) AS lot_batch_number,
    COALESCE(l.type, 'finished_goods') AS lot_batch_type, -- Infer type if from finished_goods_batches
    COALESCE(l.expiry_date, fgb.expiry_date) AS expiry_date,
    COALESCE(l.qa_status, fgb.qa_status) AS qa_status,
    SUM(CASE WHEN it.transaction_type IN ('receive', 'produce', 'release') THEN it.quantity ELSE 0 END) - 
    SUM(CASE WHEN it.transaction_type IN ('consume', 'ship', 'hold', 'adjust') THEN it.quantity ELSE 0 END) AS current_quantity,
    loc.name AS current_location_name,
    loc.code AS current_location_code
FROM
    inventory_transactions it
JOIN
    items i ON it.item_id = i.id
LEFT JOIN
    lots l ON it.lot_id = l.id
LEFT JOIN
    finished_goods_batches fgb ON it.batch_id = fgb.id
LEFT JOIN
    locations loc ON it.to_location_id = loc.id -- Assumes the last to_location_id is the current location for simplicity, or could be more complex with aggregation
GROUP BY
    i.id, i.item_code, i.name, i.unit_of_measure, lot_batch_id, lot_batch_number, lot_batch_type, expiry_date, qa_status, current_location_name, current_location_code;

COMMENT ON VIEW v_inventory_by_lot IS 'Current inventory levels by item and lot/batch, with QA status and expiry date.';

-- View: v_batch_traceability
-- Provides a one-step-back view for finished goods batches to raw material lots.
CREATE OR REPLACE VIEW v_batch_traceability AS
SELECT
    fgb.id AS finished_goods_batch_id,
    fgb.batch_number,
    fgb.sku_id,
    s.sku_code,
    s.description AS sku_description,
    fgb.production_date,
    fgb.expiry_date,
    fgb.qa_status AS finished_goods_qa_status,
    mc.item_id AS consumed_item_id,
    i.item_code AS consumed_item_code,
    i.name AS consumed_item_name,
    l.id AS consumed_lot_id,
    l.lot_number AS consumed_lot_number,
    l.supplier_id,
    sup.name AS supplier_name,
    l.received_date AS consumed_lot_received_date,
    l.expiry_date AS consumed_lot_expiry_date,
    l.qa_status AS consumed_lot_qa_status,
    mc.actual_quantity AS quantity_consumed
FROM
    finished_goods_batches fgb
JOIN
    skus s ON fgb.sku_id = s.id
LEFT JOIN
    production_orders po ON fgb.production_order_id = po.id -- Assuming FGBs are created from POs, need to link through inventory_transactions for a cleaner join
LEFT JOIN
    material_consumption mc ON po.id = mc.production_order_id
LEFT JOIN
    items i ON mc.item_id = i.id
LEFT JOIN
    lots l ON mc.lot_id = l.id
LEFT JOIN
    suppliers sup ON l.supplier_id = sup.id;

COMMENT ON VIEW v_batch_traceability IS 'Traceability of finished goods batches back to their consumed raw material lots and suppliers.';

-- View: v_shippable_inventory
-- Shows finished goods inventory that is QA released, not expired, and indicates days remaining until expiry.
CREATE OR REPLACE VIEW v_shippable_inventory AS
SELECT
    fgb.id AS batch_id,
    fgb.batch_number,
    fgb.sku_id,
    s.sku_code,
    s.description AS sku_description,
    fgb.production_date,
    fgb.expiry_date,
    fgb.quantity_available AS available_for_shipment,
    EXTRACT(DAY FROM (fgb.expiry_date - NOW())) AS days_until_expiry,
    loc.name AS current_location_name,
    loc.code AS current_location_code
FROM
    finished_goods_batches fgb
JOIN
    skus s ON fgb.sku_id = s.id
LEFT JOIN
    inventory_transactions it ON fgb.id = it.batch_id AND it.transaction_type NOT IN ('ship', 'hold', 'adjust', 'destroyed') -- Attempt to get current location from latest transaction. This needs refinement if multiple locations are possible for a batch.
LEFT JOIN
    locations loc ON it.to_location_id = loc.id
WHERE
    fgb.qa_status = 'qa_released' AND fgb.expiry_date > NOW()
GROUP BY
    fgb.id, fgb.batch_number, fgb.sku_id, s.sku_code, s.description, fgb.production_date, fgb.expiry_date, fgb.quantity_available, current_location_name, current_location_code
HAVING
    fgb.quantity_available > 0; -- Only show batches with available quantity

COMMENT ON VIEW v_shippable_inventory IS 'Summary of QA-released, unexpired finished goods inventory available for shipment, including days until expiry.';