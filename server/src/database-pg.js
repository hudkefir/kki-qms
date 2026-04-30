import pg from 'pg';

// ─── Connection ───────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/** Convert `?` placeholders to `$1, $2, …` (skips if already using $N) */
function convertPlaceholders(sql) {
  if (!sql.includes('?')) return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Convert SQLite-isms in SQL to PG equivalents */
function convertSql(sql) {
  let s = convertPlaceholders(sql);
  // datetime('now') → CURRENT_TIMESTAMP
  s = s.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  // INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  return s;
}

/** Flatten params — handles both spread args and single-array-arg patterns */
function flattenParams(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  // Handle named-object params (used by seed code) — return empty; DDL should not need params
  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return Object.values(args[0]);
  }
  return args;
}

// ─── DB interface (mirrors better-sqlite3 API, but async) ─────────────────

const db = {
  /**
   * Run a query and return all rows.
   * Accepts SQL with either `?` or `$N` placeholders.
   */
  async all(sql, params = []) {
    const result = await pool.query(convertSql(sql), params);
    return result.rows;
  },

  /**
   * Run a query and return the first row (or null).
   */
  async get(sql, params = []) {
    const result = await pool.query(convertSql(sql), params);
    return result.rows[0] || null;
  },

  /**
   * Run an INSERT / UPDATE / DELETE.
   * For INSERT, auto-appends RETURNING id if not already present.
   * Returns { lastInsertRowid, changes } to match better-sqlite3 interface.
   */
  async run(sql, params = []) {
    let s = convertSql(sql);
    const isInsert = /^\s*INSERT\s/i.test(s);
    // Auto-add RETURNING id for INSERT if not already present
    if (isInsert && !/RETURNING\s/i.test(s)) {
      s = s.replace(/;?\s*$/, ' RETURNING id');
    }
    const result = await pool.query(s, params);
    return {
      lastInsertRowid: result.rows[0]?.id ?? null,
      changes: result.rowCount,
    };
  },

  /**
   * Execute raw SQL (typically DDL). Supports multi-statement strings.
   */
  async exec(sql) {
    await pool.query(convertSql(sql));
  },

  /** No-op — PG doesn't use pragma */
  pragma() {},

  /**
   * Transaction wrapper — returns an async callable.
   * Usage: const doWork = db.transaction(async () => { ... }); await doWork();
   */
  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(...args);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  },

  /** Direct pool access for advanced use */
  pool,
};

// ─── Table creation (PG-native syntax) ────────────────────────────────────────
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sops (
      id SERIAL PRIMARY KEY,
      sop_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category_code TEXT NOT NULL,
      category_name TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'draft',
      costco_cleanup_status TEXT DEFAULT 'not_yet_built',
      owner TEXT DEFAULT '',
      reviewer TEXT DEFAULT '',
      approver TEXT DEFAULT '',
      effective_date TEXT,
      next_review_date TEXT,
      last_updated TEXT,
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      scope TEXT DEFAULT '',
      procedure_text TEXT DEFAULT '',
      responsibilities TEXT DEFAULT '',
      materials_equipment TEXT DEFAULT '',
      sop_references TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_revisions (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      version TEXT NOT NULL,
      changed_by TEXT DEFAULT '',
      change_description TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_attachments (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_type TEXT DEFAULT '',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_comments (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      author TEXT DEFAULT '',
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_checklist (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      requirement TEXT NOT NULL,
      category TEXT DEFAULT '',
      status TEXT DEFAULT 'not_met',
      notes TEXT DEFAULT '',
      evidence_ref TEXT DEFAULT '',
      checked_by TEXT DEFAULT '',
      checked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      complaint_number TEXT UNIQUE NOT NULL,
      date_received TEXT NOT NULL,
      source TEXT DEFAULT '',
      reporter TEXT DEFAULT '',
      store_location TEXT DEFAULT '',
      product_sku TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      lot_number TEXT DEFAULT '',
      best_before TEXT DEFAULT '',
      quantity_affected INTEGER DEFAULT 0,
      issue_type TEXT DEFAULT '',
      severity TEXT DEFAULT 'low',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      linked_ccr_id INTEGER,
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ccrs (
      id SERIAL PRIMARY KEY,
      ccr_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      date_created TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      recipient_company TEXT DEFAULT '',
      recipient_contact TEXT DEFAULT '',
      recipient_email TEXT DEFAULT '',
      root_causes TEXT DEFAULT '[]',
      preventive_measures TEXT DEFAULT '[]',
      target_resolution_date TEXT,
      actual_resolution_date TEXT,
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ccr_complaints (
      ccr_id INTEGER NOT NULL,
      complaint_id INTEGER NOT NULL,
      PRIMARY KEY (ccr_id, complaint_id)
    );

    CREATE TABLE IF NOT EXISTS corrective_actions (
      id SERIAL PRIMARY KEY,
      ccr_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      responsible TEXT DEFAULT '',
      target_date TEXT,
      completion_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'viewer',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      username TEXT DEFAULT '',
      action TEXT NOT NULL,
      resource_type TEXT DEFAULT '',
      resource_id TEXT DEFAULT '',
      resource_name TEXT DEFAULT '',
      details TEXT DEFAULT '{}',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      session_id TEXT DEFAULT '',
      old_values TEXT DEFAULT '{}',
      new_values TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      category TEXT DEFAULT 'general',
      linked_type TEXT,
      linked_id INTEGER,
      description TEXT,
      uploaded_by TEXT,
      upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      tags TEXT,
      download_count INTEGER DEFAULT 0,
      document_type TEXT DEFAULT 'other',
      linked_sop_id INTEGER,
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      storage_path TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS batch_tests (
      id SERIAL PRIMARY KEY,
      batch_number TEXT NOT NULL,
      product_sku TEXT DEFAULT '',
      product_name TEXT DEFAULT '',
      test_date TEXT NOT NULL,
      tested_by TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      updated_by TEXT DEFAULT '',
      test_profile TEXT DEFAULT 'routine',
      lab_name TEXT DEFAULT '',
      lab_report_number TEXT DEFAULT '',
      sample_date TEXT DEFAULT '',
      report_date TEXT DEFAULT '',
      attachments TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batch_test_results (
      id SERIAL PRIMARY KEY,
      batch_test_id INTEGER NOT NULL REFERENCES batch_tests(id) ON DELETE CASCADE,
      test_type TEXT NOT NULL,
      test_name TEXT NOT NULL,
      target_value TEXT DEFAULT '',
      actual_value TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      pass_fail TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      test_category TEXT DEFAULT 'routine',
      target_min TEXT DEFAULT '',
      target_max TEXT DEFAULT '',
      comments TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS sop_files (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      uploaded_by TEXT DEFAULT '',
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      storage_path TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sop_forms (
      id SERIAL PRIMARY KEY,
      sop_id INTEGER NOT NULL REFERENCES sops(id),
      form_number TEXT NOT NULL,
      title TEXT NOT NULL,
      form_type TEXT DEFAULT 'record',
      description TEXT DEFAULT '',
      version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'draft',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_form_fields (
      id SERIAL PRIMARY KEY,
      sop_form_id INTEGER NOT NULL REFERENCES sop_forms(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      field_type TEXT DEFAULT 'text',
      field_options TEXT DEFAULT '[]',
      required INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      section_name TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_form_entries (
      id SERIAL PRIMARY KEY,
      sop_form_id INTEGER NOT NULL REFERENCES sop_forms(id) ON DELETE CASCADE,
      entry_data TEXT DEFAULT '{}',
      submitted_by TEXT DEFAULT '',
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      shift TEXT DEFAULT '',
      date TEXT NOT NULL,
      verified_by TEXT DEFAULT '',
      verified_at TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS planner_state (
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

    CREATE TABLE IF NOT EXISTS change_requests (
      id SERIAL PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      classification TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      initiator TEXT NOT NULL,
      food_safety_impact TEXT DEFAULT '{}',
      proposed_effective_date TEXT,
      actual_effective_date TEXT,
      affected_documents TEXT DEFAULT '[]',
      training_required INTEGER DEFAULT 0,
      is_emergency INTEGER DEFAULT 0,
      rejection_reason TEXT,
      monitoring_end_date TEXT,
      effectiveness_check_date TEXT,
      effectiveness_result TEXT,
      effectiveness_notes TEXT,
      approved_by TEXT,
      approved_at TEXT,
      closed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deviation_reports (
      id SERIAL PRIMARY KEY,
      report_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      classification TEXT,
      status TEXT NOT NULL DEFAULT 'reported',
      discovered_by TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      location TEXT,
      affected_batches TEXT DEFAULT '[]',
      affected_products TEXT DEFAULT '[]',
      immediate_action TEXT,
      is_ccp_deviation INTEGER DEFAULT 0,
      process_stopped INTEGER DEFAULT 0,
      product_on_hold INTEGER DEFAULT 0,
      root_cause_method TEXT,
      root_cause TEXT,
      scope_assessment TEXT,
      product_disposition TEXT,
      disposition_rationale TEXT,
      investigation_due_date TEXT,
      escalated_from_minor INTEGER DEFAULT 0,
      closed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS capas (
      id SERIAL PRIMARY KEY,
      capa_id TEXT UNIQUE NOT NULL,
      source_type TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      corrective_action TEXT NOT NULL,
      preventive_action TEXT NOT NULL,
      responsible_person TEXT NOT NULL,
      target_date TEXT NOT NULL,
      actual_completion_date TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      effectiveness_check_date TEXT,
      effectiveness_result TEXT,
      effectiveness_notes TEXT,
      linked_change_request_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qms_sequence (
      type TEXT NOT NULL,
      year INTEGER NOT NULL,
      next_number INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (type, year)
    );

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

    CREATE TABLE IF NOT EXISTS recalls (
      id SERIAL PRIMARY KEY,
      recall_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      classification TEXT,
      status TEXT NOT NULL DEFAULT 'initiated',
      trigger_type TEXT NOT NULL,
      trigger_description TEXT NOT NULL,
      affected_products TEXT DEFAULT '[]',
      affected_lot_codes TEXT DEFAULT '[]',
      affected_batch_ids TEXT DEFAULT '[]',
      root_cause TEXT,
      risk_assessment TEXT,
      total_quantity_produced INTEGER,
      total_quantity_shipped INTEGER,
      total_quantity_onsite INTEGER,
      total_quantity_accounted INTEGER,
      cfia_notified INTEGER DEFAULT 0,
      cfia_notified_at TEXT,
      cfia_contact_name TEXT,
      cfia_reference_number TEXT,
      customers_notified INTEGER DEFAULT 0,
      recall_notice_sent INTEGER DEFAULT 0,
      product_disposition TEXT,
      disposition_date TEXT,
      disposition_witnessed_by TEXT,
      linked_capa_id INTEGER,
      initiated_by TEXT NOT NULL,
      closed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recall_distribution (
      id SERIAL PRIMARY KEY,
      recall_id INTEGER NOT NULL REFERENCES recalls(id),
      customer_name TEXT NOT NULL,
      customer_address TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      customer_type TEXT,
      lot_codes_shipped TEXT DEFAULT '[]',
      quantity_shipped INTEGER NOT NULL DEFAULT 0,
      quantity_accounted INTEGER DEFAULT 0,
      notified INTEGER DEFAULT 0,
      notified_at TEXT,
      notified_method TEXT,
      action_taken TEXT,
      receipt_confirmed INTEGER DEFAULT 0,
      effective INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recall_sequence (
      year INTEGER PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS traceability_exercises (
      id SERIAL PRIMARY KEY,
      exercise_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      target_lot TEXT NOT NULL,
      target_description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      elapsed_minutes INTEGER,
      conducted_by TEXT NOT NULL,
      backward_trace TEXT DEFAULT '{}',
      forward_trace TEXT DEFAULT '{}',
      total_produced INTEGER,
      total_shipped INTEGER,
      total_onsite INTEGER,
      total_adjustments INTEGER DEFAULT 0,
      reconciliation_percent REAL,
      reconciled INTEGER DEFAULT 0,
      team_reachable_1hr INTEGER DEFAULT 0,
      evidence_complete INTEGER DEFAULT 0,
      gaps_identified TEXT,
      corrective_action TEXT,
      corrective_action_due TEXT,
      retest_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crisis_events (
      id SERIAL PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'moderate',
      reported_by TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      production_stopped INTEGER DEFAULT 0,
      product_held INTEGER DEFAULT 0,
      affected_areas TEXT DEFAULT '[]',
      affected_products TEXT DEFAULT '[]',
      food_safety_impact INTEGER DEFAULT 0,
      food_safety_assessment TEXT,
      recall_triggered INTEGER DEFAULT 0,
      linked_recall_id INTEGER,
      notifications_sent TEXT DEFAULT '[]',
      product_disposition TEXT,
      disposition_rationale TEXT,
      resolution TEXT,
      resolved_at TEXT,
      closed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crisis_sequence (
      year INTEGER PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS exercise_sequence (
      year INTEGER PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS qms_record_links (
      id SERIAL PRIMARY KEY,
      source_type VARCHAR(50) NOT NULL,
      source_id INTEGER NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id INTEGER NOT NULL,
      link_reason TEXT,
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(source_type, source_id, target_type, target_id)
    );

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

    CREATE TABLE IF NOT EXISTS environmental_samples (
      id SERIAL PRIMARY KEY,
      sample_id TEXT UNIQUE NOT NULL,
      sample_date TEXT NOT NULL,
      zone TEXT NOT NULL,
      location TEXT NOT NULL,
      surface_type TEXT DEFAULT '',
      sample_type TEXT NOT NULL DEFAULT 'routine',
      test_method TEXT DEFAULT 'swab',
      target_organism TEXT DEFAULT '',
      result TEXT DEFAULT 'pending',
      result_value TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      threshold TEXT DEFAULT '',
      pass_fail TEXT DEFAULT 'pending',
      collected_by TEXT NOT NULL,
      lab_name TEXT DEFAULT '',
      lab_report_number TEXT DEFAULT '',
      corrective_action TEXT DEFAULT '',
      linked_deviation_id INTEGER,
      notes TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS environmental_locations (
      id SERIAL PRIMARY KEY,
      location_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      area TEXT DEFAULT '',
      surface_type TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      sampling_frequency TEXT DEFAULT 'monthly',
      last_sampled TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS env_sample_sequence (
      year INTEGER PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_sop_files_sop_id ON sop_files(sop_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expire);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_documents_linked ON documents(linked_type, linked_id);
    CREATE INDEX IF NOT EXISTS idx_batch_tests_date ON batch_tests(test_date);
    CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(status);
    CREATE INDEX IF NOT EXISTS idx_batch_test_results_test_id ON batch_test_results(batch_test_id);
    CREATE INDEX IF NOT EXISTS idx_daily_tasks_category ON daily_tasks(category);
    CREATE INDEX IF NOT EXISTS idx_daily_task_completions_date ON daily_task_completions(date);
    CREATE INDEX IF NOT EXISTS idx_daily_task_completions_task ON daily_task_completions(daily_task_id);
    CREATE INDEX IF NOT EXISTS idx_sop_forms_sop_id ON sop_forms(sop_id);
    CREATE INDEX IF NOT EXISTS idx_sop_forms_status ON sop_forms(status);
    CREATE INDEX IF NOT EXISTS idx_sop_form_fields_form_id ON sop_form_fields(sop_form_id);
    CREATE INDEX IF NOT EXISTS idx_sop_form_entries_form_id ON sop_form_entries(sop_form_id);
    CREATE INDEX IF NOT EXISTS idx_sop_form_entries_date ON sop_form_entries(date);
    CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
    CREATE INDEX IF NOT EXISTS idx_change_requests_category ON change_requests(category);
    CREATE INDEX IF NOT EXISTS idx_deviation_reports_status ON deviation_reports(status);
    CREATE INDEX IF NOT EXISTS idx_deviation_reports_category ON deviation_reports(category);
    CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(status);
    CREATE INDEX IF NOT EXISTS idx_capas_source ON capas(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
    CREATE INDEX IF NOT EXISTS idx_pm_schedules_equipment ON pm_schedules(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_pm_schedules_next_due ON pm_schedules(next_due_date);
    CREATE INDEX IF NOT EXISTS idx_pm_completions_schedule ON pm_completions(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_recalls_status ON recalls(status);
    CREATE INDEX IF NOT EXISTS idx_recalls_type ON recalls(type);
    CREATE INDEX IF NOT EXISTS idx_recall_distribution_recall ON recall_distribution(recall_id);
    CREATE INDEX IF NOT EXISTS idx_traceability_exercises_status ON traceability_exercises(status);
    CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
    CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_events(severity);
    CREATE INDEX IF NOT EXISTS idx_record_links_source ON qms_record_links(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_record_links_target ON qms_record_links(target_type, target_id);
  `);
}

// ─── Initialize on import ────────────────────────────────────────────────────
try {
  await initTables();
  console.log('PostgreSQL connected and tables verified');
} catch (err) {
  console.error('PostgreSQL init error:', err.message);
  // Don't crash — tables likely already exist in Supabase
}

export function getDb() {
  return db;
}

export default db;
