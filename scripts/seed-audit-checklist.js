/**
 * Seed comprehensive Costco GMP V3.0 audit checklist items
 * Maps requirements to existing SOPs by ID
 *
 * Run: node scripts/seed-audit-checklist.js
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.KKI_DATA_DIR
  ? join(process.env.KKI_DATA_DIR, 'qms.db')
  : join(__dirname, '..', 'server', 'data', 'qms.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure columns exist
try { db.exec(`ALTER TABLE audit_checklist ADD COLUMN evidence_ref TEXT DEFAULT ''`); } catch (e) {}
try { db.exec(`ALTER TABLE audit_checklist ADD COLUMN category TEXT DEFAULT ''`); } catch (e) {}

// Look up SOP IDs by sop_number
function sopId(sopNumber) {
  const row = db.prepare('SELECT id FROM sops WHERE sop_number = ?').get(sopNumber);
  return row ? row.id : null;
}

// Costco GMP V3.0 audit checklist items mapped to KKI SOPs
const checklistItems = [
  // === Documentation & Records Control ===
  { category: 'Documentation & Records Control', requirement: 'Document control system in place with master list of all controlled documents', sop: 'KK-SOP-00100' },
  { category: 'Documentation & Records Control', requirement: 'All SOPs are current, approved, and accessible to relevant personnel', sop: 'KK-SOP-00100' },
  { category: 'Documentation & Records Control', requirement: 'Document revision history maintained with change descriptions', sop: 'KK-SOP-00100' },
  { category: 'Documentation & Records Control', requirement: 'Obsolete documents removed from circulation and archived', sop: 'KK-SOP-00100' },
  { category: 'Documentation & Records Control', requirement: 'Handwritten entries are legible, in permanent ink, and errors corrected properly', sop: 'KK-SOP-00101' },
  { category: 'Documentation & Records Control', requirement: 'Electronic signatures comply with regulatory requirements', sop: 'KK-SOP-00101' },
  { category: 'Documentation & Records Control', requirement: 'Records retained for minimum required period (2+ years)', sop: 'KK-SOP-00100' },
  { category: 'Documentation & Records Control', requirement: 'Records are complete, accurate, and available for audit review', sop: 'KK-SOP-00100' },

  // === Personnel Hygiene & Training ===
  { category: 'Personnel Hygiene & Training', requirement: 'Written employee hygiene policy in place and communicated to all staff', sop: 'KK-SOP-00201' },
  { category: 'Personnel Hygiene & Training', requirement: 'Handwashing stations adequately supplied and accessible', sop: 'KK-SOP-00201' },
  { category: 'Personnel Hygiene & Training', requirement: 'Appropriate protective clothing provided and worn correctly', sop: 'KK-SOP-00201' },
  { category: 'Personnel Hygiene & Training', requirement: 'Illness reporting policy in place and enforced', sop: 'KK-SOP-00201' },
  { category: 'Personnel Hygiene & Training', requirement: 'Hair restraints, jewelry policy, and personal item storage enforced', sop: 'KK-SOP-00201' },
  { category: 'Personnel Hygiene & Training', requirement: 'Food safety training program documented with completion records', sop: 'KK-SOP-00102' },
  { category: 'Personnel Hygiene & Training', requirement: 'New employee orientation includes food safety and GMP training', sop: 'KK-SOP-00102' },
  { category: 'Personnel Hygiene & Training', requirement: 'Annual refresher training conducted and documented', sop: 'KK-SOP-00102' },
  { category: 'Personnel Hygiene & Training', requirement: 'Training effectiveness verified through assessment or observation', sop: 'KK-SOP-00102' },
  { category: 'Personnel Hygiene & Training', requirement: 'Visitor and contractor hygiene policy enforced', sop: 'KK-SOP-00201' },

  // === Facility Design & Maintenance ===
  { category: 'Facility Design & Maintenance', requirement: 'Facility layout prevents cross-contamination (product flow, zoning)', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Floors, walls, and ceilings are in good repair and cleanable', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Adequate lighting in production, storage, and inspection areas', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Ventilation and air quality adequate to prevent condensation and contamination', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Water supply tested and meets potable water standards', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Waste management system prevents product contamination', sop: 'KK-SOP-00802' },
  { category: 'Facility Design & Maintenance', requirement: 'Preventive maintenance program documented with schedules and records', sop: 'KK-SOP-00800' },
  { category: 'Facility Design & Maintenance', requirement: 'Equipment design is sanitary and maintained in good working order', sop: 'KK-SOP-00800' },
  { category: 'Facility Design & Maintenance', requirement: 'Process flow diagram current and reflects actual facility layout', sop: 'KK-SOP-00203' },
  { category: 'Facility Design & Maintenance', requirement: 'Personnel flow diagram prevents cross-contamination between zones', sop: 'KK-SOP-00204' },

  // === Pest Control ===
  { category: 'Pest Control', requirement: 'Written pest control program with licensed operator', sop: 'KK-SOP-00801' },
  { category: 'Pest Control', requirement: 'Pest control devices mapped and numbered on facility diagram', sop: 'KK-SOP-00801' },
  { category: 'Pest Control', requirement: 'Service reports reviewed and trends analyzed', sop: 'KK-SOP-00801' },
  { category: 'Pest Control', requirement: 'No evidence of pest activity in production or storage areas', sop: 'KK-SOP-00801' },
  { category: 'Pest Control', requirement: 'Building exterior maintained to prevent pest entry', sop: 'KK-SOP-00801' },
  { category: 'Pest Control', requirement: 'Chemical pesticides stored safely and SDS available', sop: 'KK-SOP-00801' },

  // === Cleaning & Sanitation ===
  { category: 'Cleaning & Sanitation', requirement: 'Master cleaning schedule covers all areas and equipment', sop: 'KK-SOP-00205' },
  { category: 'Cleaning & Sanitation', requirement: 'Cleaning procedures specify chemicals, concentrations, contact time, temperature', sop: 'KK-SOP-00301' },
  { category: 'Cleaning & Sanitation', requirement: 'Cleaning chemicals approved for food contact and properly stored', sop: 'KK-SOP-00205' },
  { category: 'Cleaning & Sanitation', requirement: 'Pre-operational inspection conducted and documented before production', sop: 'KK-SOP-00301' },
  { category: 'Cleaning & Sanitation', requirement: 'CIP procedures validated for fermentation vessels', sop: 'KK-SOP-00300' },
  { category: 'Cleaning & Sanitation', requirement: 'Sanitation verification records (ATP, swabs, visual) maintained', sop: 'KK-SOP-00301' },
  { category: 'Cleaning & Sanitation', requirement: 'Cleaning equipment stored properly to prevent contamination', sop: 'KK-SOP-00205' },

  // === Allergen Control ===
  { category: 'Allergen Control', requirement: 'Written allergen control program identifies all allergens used in facility', sop: 'KK-SOP-01001' },
  { category: 'Allergen Control', requirement: 'Allergen risk assessment conducted for all products and ingredients', sop: 'KK-SOP-01001' },
  { category: 'Allergen Control', requirement: 'Production scheduling minimizes allergen cross-contact risk', sop: 'KK-SOP-01001' },
  { category: 'Allergen Control', requirement: 'Allergen cleaning validation conducted and documented', sop: 'KK-SOP-01001' },
  { category: 'Allergen Control', requirement: 'Labels accurately declare all allergens per regulatory requirements', sop: 'KK-SOP-01001' },
  { category: 'Allergen Control', requirement: 'Staff trained on allergen awareness and prevention measures', sop: 'KK-SOP-01001' },

  // === Foreign Material Control ===
  { category: 'Foreign Material Control', requirement: 'Written foreign material control program in place', sop: 'KK-SOP-01500' },
  { category: 'Foreign Material Control', requirement: 'Glass and brittle plastic policy documented and implemented', sop: 'KK-SOP-00600' },
  { category: 'Foreign Material Control', requirement: 'Metal detection or X-ray equipment used and regularly tested', sop: 'KK-SOP-01500' },
  { category: 'Foreign Material Control', requirement: 'Breakage procedure in place for glass/brittle items', sop: 'KK-SOP-00600' },
  { category: 'Foreign Material Control', requirement: 'Filters, screens, and sieves inspected at defined intervals', sop: 'KK-SOP-01500' },
  { category: 'Foreign Material Control', requirement: 'Foreign material incidents investigated with corrective actions', sop: 'KK-SOP-01500' },

  // === Receiving, Storage & Shipping ===
  { category: 'Receiving, Storage & Shipping', requirement: 'Incoming materials inspected against specifications on receipt', sop: 'KK-SOP-00500' },
  { category: 'Receiving, Storage & Shipping', requirement: 'Temperature-sensitive materials verified at receiving', sop: 'KK-SOP-00500' },
  { category: 'Receiving, Storage & Shipping', requirement: 'Storage conditions (temperature, humidity, FIFO) monitored and maintained', sop: 'KK-SOP-00500' },
  { category: 'Receiving, Storage & Shipping', requirement: 'Raw materials, packaging, and finished goods properly segregated', sop: 'KK-SOP-00500' },
  { category: 'Receiving, Storage & Shipping', requirement: 'Shipping vehicles inspected and temperatures recorded', sop: 'KK-SOP-00500' },
  { category: 'Receiving, Storage & Shipping', requirement: 'Non-conforming materials quarantined and clearly identified', sop: 'KK-SOP-00500' },

  // === Production Process Controls ===
  { category: 'Production Process Controls', requirement: 'HACCP plan or food safety plan current and validated', sop: 'KK-SOP-00200' },
  { category: 'Production Process Controls', requirement: 'Critical control points identified with monitoring procedures', sop: 'KK-SOP-00206' },
  { category: 'Production Process Controls', requirement: 'CCP monitoring records complete and reviewed', sop: 'KK-SOP-00206' },
  { category: 'Production Process Controls', requirement: 'Corrective actions documented when CCP limits exceeded', sop: 'KK-SOP-00206' },
  { category: 'Production Process Controls', requirement: 'pH meters calibrated per schedule with records maintained', sop: 'KK-SOP-00400' },
  { category: 'Production Process Controls', requirement: 'Temperature probes calibrated per schedule with records maintained', sop: 'KK-SOP-00401' },
  { category: 'Production Process Controls', requirement: 'Batch/lot records maintained with complete production data', sop: 'KK-SOP-00202' },
  { category: 'Production Process Controls', requirement: 'Food handling practices followed during all production operations', sop: 'KK-SOP-00202' },
  { category: 'Production Process Controls', requirement: 'Rework procedures controlled and documented', sop: 'KK-SOP-01600' },
  { category: 'Production Process Controls', requirement: 'Hold and release procedures in place with proper documentation', sop: 'KK-SOP-01600' },

  // === Product Examination & Testing ===
  { category: 'Product Examination & Testing', requirement: 'Finished product examination procedures documented', sop: 'KK-SOP-00600' },
  { category: 'Product Examination & Testing', requirement: 'Product testing plan covers microbiological and chemical parameters', sop: 'KK-SOP-00600' },
  { category: 'Product Examination & Testing', requirement: 'Test results reviewed before product release', sop: 'KK-SOP-00600' },
  { category: 'Product Examination & Testing', requirement: 'Out-of-spec results trigger investigation and corrective action', sop: 'KK-SOP-00600' },
  { category: 'Product Examination & Testing', requirement: 'Label verification conducted for each production run', sop: 'KK-SOP-01700' },

  // === Traceability & Recall ===
  { category: 'Traceability & Recall', requirement: 'Traceability system links raw materials to finished product lots', sop: 'KK-SOP-00903' },
  { category: 'Traceability & Recall', requirement: 'Mock recall conducted annually with results documented', sop: 'KK-SOP-00903' },
  { category: 'Traceability & Recall', requirement: 'Mock recall achieves 100% traceability within target timeframe', sop: 'KK-SOP-00903' },
  { category: 'Traceability & Recall', requirement: 'Written recall procedure with assigned team and contact list', sop: 'KK-SOP-00901' },
  { category: 'Traceability & Recall', requirement: 'Customer complaint system captures and tracks all complaints', sop: 'KK-SOP-00902' },
  { category: 'Traceability & Recall', requirement: 'Complaint trends analyzed and corrective actions implemented', sop: 'KK-SOP-00902' },

  // === Supplier Approval ===
  { category: 'Supplier Approval', requirement: 'Written approved supplier program with qualification criteria', sop: 'KK-SOP-00900' },
  { category: 'Supplier Approval', requirement: 'Supplier risk assessment conducted and documented', sop: 'KK-SOP-00900' },
  { category: 'Supplier Approval', requirement: 'Certificates of analysis or conformance obtained for critical ingredients', sop: 'KK-SOP-00900' },
  { category: 'Supplier Approval', requirement: 'Supplier performance monitored and reviewed periodically', sop: 'KK-SOP-00900' },
  { category: 'Supplier Approval', requirement: 'Specifications established for all incoming materials', sop: 'KK-SOP-00900' },

  // === Food Defense ===
  { category: 'Food Defense', requirement: 'Written food defense plan with vulnerability assessment', sop: 'KK-SOP-01200' },
  { category: 'Food Defense', requirement: 'Facility access controlled and unauthorized entry prevented', sop: 'KK-SOP-01200' },
  { category: 'Food Defense', requirement: 'Incoming materials and supply chain security measures in place', sop: 'KK-SOP-01200' },
  { category: 'Food Defense', requirement: 'Food defense awareness included in employee training', sop: 'KK-SOP-01200' },
  { category: 'Food Defense', requirement: 'Intentional adulteration mitigation strategies implemented', sop: 'KK-SOP-01200' },

  // === Environmental Monitoring ===
  { category: 'Environmental Monitoring', requirement: 'Written environmental monitoring program (EMP) in place', sop: 'KK-SOP-01300' },
  { category: 'Environmental Monitoring', requirement: 'Sampling sites identified on facility map (Zones 1-4)', sop: 'KK-SOP-01300' },
  { category: 'Environmental Monitoring', requirement: 'Sampling frequency and indicator organisms defined', sop: 'KK-SOP-01300' },
  { category: 'Environmental Monitoring', requirement: 'Positive results trigger investigation, corrective actions, and intensified sampling', sop: 'KK-SOP-01300' },
  { category: 'Environmental Monitoring', requirement: 'Environmental monitoring trends analyzed and reviewed', sop: 'KK-SOP-01300' },

  // === Change Control & Deviations ===
  { category: 'Change Control & Deviations', requirement: 'Written change control procedure for process, equipment, and formulation changes', sop: 'KK-SOP-01400' },
  { category: 'Change Control & Deviations', requirement: 'Change requests documented with impact assessment and approval', sop: 'KK-SOP-01400' },
  { category: 'Change Control & Deviations', requirement: 'Deviations documented with root cause analysis', sop: 'KK-SOP-01400' },
  { category: 'Change Control & Deviations', requirement: 'Corrective and preventive actions (CAPA) tracked to closure', sop: 'KK-SOP-01400' },
  { category: 'Change Control & Deviations', requirement: 'CAPA effectiveness verified after implementation', sop: 'KK-SOP-01400' },
  { category: 'Change Control & Deviations', requirement: 'Product returns handled per documented procedure', sop: 'KK-SOP-01800' },
];

// Determine status based on SOP's costco_cleanup_status
function getItemStatus(sopNumber) {
  const sop = db.prepare('SELECT costco_cleanup_status FROM sops WHERE sop_number = ?').get(sopNumber);
  if (!sop) return 'not_met';
  if (sop.costco_cleanup_status === 'clean') return 'met';
  if (sop.costco_cleanup_status === 'needs_costco_strip') return 'partial';
  return 'not_met';
}

function seed() {
  // Clear existing checklist items
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM audit_checklist').get().count;
  console.log(`Existing audit checklist items: ${existingCount}`);

  if (existingCount > 0) {
    db.prepare('DELETE FROM audit_checklist').run();
    console.log('Cleared existing audit checklist items');
  }

  const insert = db.prepare(`
    INSERT INTO audit_checklist (sop_id, requirement, category, status, notes, evidence_ref)
    VALUES (@sop_id, @requirement, @category, @status, @notes, @evidence_ref)
  `);

  let inserted = 0;
  let skipped = 0;

  const insertAll = db.transaction(() => {
    for (const item of checklistItems) {
      const sid = sopId(item.sop);
      if (!sid) {
        console.warn(`  SKIP: SOP ${item.sop} not found for: ${item.requirement.substring(0, 60)}...`);
        skipped++;
        continue;
      }
      insert.run({
        sop_id: sid,
        requirement: item.requirement,
        category: item.category,
        status: getItemStatus(item.sop),
        notes: '',
        evidence_ref: '',
      });
      inserted++;
    }
  });

  insertAll();
  console.log(`\nSeeded ${inserted} audit checklist items (${skipped} skipped)`);

  // Summary by category
  const cats = db.prepare(`
    SELECT category, COUNT(*) as total,
      SUM(CASE WHEN status = 'met' THEN 1 ELSE 0 END) as met,
      SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial,
      SUM(CASE WHEN status = 'not_met' THEN 1 ELSE 0 END) as not_met
    FROM audit_checklist
    GROUP BY category
    ORDER BY category
  `).all();

  console.log('\nChecklist Summary by Category:');
  console.log('─'.repeat(80));
  for (const c of cats) {
    console.log(`  ${c.category.padEnd(35)} Total: ${c.total}  Met: ${c.met}  Partial: ${c.partial}  Not Met: ${c.not_met}`);
  }
  console.log('─'.repeat(80));

  const totals = db.prepare('SELECT COUNT(*) as total FROM audit_checklist').get();
  console.log(`Total: ${totals.total} items`);
}

seed();
db.close();
