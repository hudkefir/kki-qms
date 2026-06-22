import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import db from '../../database-pg.js';

const router = Router();

// ── AI Tool Definitions ────────────────────────────────────────────────────
// Table + field mappings for AI-driven record updates
const RECORD_TABLE_MAP = {
  capas: 'capas',
  deviations: 'deviation_reports',
  complaints: 'complaints',
  ccrs: 'ccrs',
  'change-control': 'change_requests',
};

const EDITABLE_FIELDS = {
  capas: [
    'description', 'root_cause_analysis', 'investigation_details', 'containment_action',
    'corrective_action', 'preventive_action', 'verification_method', 'effectiveness_notes',
    'risk_assessment', 'root_cause_method',
  ],
  deviations: [
    'description', 'root_cause', 'immediate_action', 'scope_assessment',
    'product_disposition', 'disposition_rationale', 'root_cause_method',
  ],
  complaints: [
    'description', 'investigation_details', 'root_cause', 'corrective_action',
    'immediate_action',
  ],
  ccrs: [
    'description', 'investigation_details', 'root_cause', 'corrective_action',
  ],
  'change-control': [
    'description', 'justification', 'risk_assessment', 'implementation_plan',
  ],
};

const AI_TOOLS = [
  {
    name: 'update_record_field',
    description: `Update a field on the QMS record the user is currently viewing. Use this when the user asks you to fill in, write, draft, or update a specific field. Only use for the record currently being viewed. Always confirm what you're writing before applying.`,
    input_schema: {
      type: 'object',
      properties: {
        record_type: {
          type: 'string',
          enum: ['capas', 'deviations', 'complaints', 'ccrs', 'change-control'],
          description: 'The type of record to update',
        },
        record_id: {
          type: 'string',
          description: 'The ID of the record to update (from the current context)',
        },
        field: {
          type: 'string',
          description: 'The field name to update (e.g., description, root_cause_analysis, corrective_action)',
        },
        value: {
          type: 'string',
          description: 'The new value to set for the field. Write in professional GMP style.',
        },
      },
      required: ['record_type', 'record_id', 'field', 'value'],
    },
  },
  {
    name: 'update_action_item_status',
    description: `Update the status of an existing action item/task on a CAPA. Use this when the user asks you to complete a task, mark something as done, start a task, or reopen a task. You can also update the description or assigned person.`,
    input_schema: {
      type: 'object',
      properties: {
        action_item_id: {
          type: 'integer',
          description: 'The ID of the action item to update',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed'],
          description: 'The new status for the action item',
        },
        notes: {
          type: 'string',
          description: 'Optional completion notes or update reason',
        },
      },
      required: ['action_item_id', 'status'],
    },
  },
  {
    name: 'create_action_item',
    description: `Create a task/action item on the CAPA the user is currently viewing. Use this when the user asks you to add a task, create an action item, assign work, or break down corrective/preventive actions into steps. You can create multiple action items by calling this tool multiple times.`,
    input_schema: {
      type: 'object',
      properties: {
        capa_id: {
          type: 'string',
          description: 'The ID of the CAPA to add the action item to (from the current context)',
        },
        title: {
          type: 'string',
          description: 'Short, clear title for the action item (e.g., "Retrain staff on SOP-042", "Calibrate pH meter")',
        },
        description: {
          type: 'string',
          description: 'Detailed description of what needs to be done. Write in professional GMP style.',
        },
        assigned_to: {
          type: 'string',
          description: 'Name or role of the person responsible (e.g., "QA Manager", "Production Lead", "Hudson"). If unknown, use "Unassigned".',
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format. If not specified by user, set a reasonable deadline based on urgency (7 days for routine, 2 days for critical).',
        },
      },
      required: ['capa_id', 'title', 'assigned_to'],
    },
  },
  {
    name: 'create_capa_from_deviation',
    description: `Create a CAPA (Corrective and Preventive Action) from a deviation report. Use this when the user asks to create a CAPA from a deviation, or wants to initiate corrective actions for a deviation. The tool auto-generates corrective and preventive actions from the deviation's root cause, description, and category. The user can optionally provide overrides for corrective_action, preventive_action, responsible_person, and target_date.`,
    input_schema: {
      type: 'object',
      properties: {
        deviation_id: {
          type: 'string',
          description: 'The ID of the deviation to create the CAPA from (numeric database ID)',
        },
        corrective_action: {
          type: 'string',
          description: 'Override corrective action text (optional — defaults to deviation root cause if available)',
        },
        preventive_action: {
          type: 'string',
          description: 'Override preventive action text (optional)',
        },
        responsible_person: {
          type: 'string',
          description: 'Override responsible person (optional — defaults to deviation investigator or discoverer)',
        },
        target_date: {
          type: 'string',
          description: 'Override target date in YYYY-MM-DD format (optional — defaults to 30 days from today)',
        },
      },
      required: ['deviation_id'],
    },
  },
];

// Execute AI tool calls
async function executeToolCall(toolName, toolInput, userId) {
  if (toolName === 'update_record_field') {
    const { record_type, record_id, field, value } = toolInput;

    // Validate record type
    const tableName = RECORD_TABLE_MAP[record_type];
    if (!tableName) {
      return { success: false, error: `Unknown record type: ${record_type}` };
    }

    // Validate field is editable
    const allowedFields = EDITABLE_FIELDS[record_type] || [];
    if (!allowedFields.includes(field)) {
      return { success: false, error: `Field "${field}" is not editable via AI for ${record_type}. Editable fields: ${allowedFields.join(', ')}` };
    }

    // Fetch current record
    const record = await db.get(`SELECT * FROM ${tableName} WHERE id = $1`, [record_id]);
    if (!record) {
      return { success: false, error: `Record not found: ${record_type} #${record_id}` };
    }

    const oldValue = record[field] || '';

    // Apply update
    await db.run(
      `UPDATE ${tableName} SET ${field} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [value, record_id]
    );

    // Log audit
    try {
      const idField = record_type === 'capas' ? 'capa_id'
        : record_type === 'deviations' ? 'report_id'
        : record_type === 'complaints' ? 'complaint_number'
        : record_type === 'ccrs' ? 'ccr_number'
        : 'id';
      await db.run(
        `INSERT INTO audit_log (action, table_name, record_id, record_identifier, user_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `ai_update_${record_type}`,
          tableName,
          record_id,
          record[idField] || record_id,
          userId || 'jarvis-ai',
          JSON.stringify({ field, old_value: oldValue, new_value: value, source: 'jarvis_ai' }),
        ]
      );
    } catch (auditErr) {
      console.error('AI audit log failed:', auditErr.message);
    }

    return {
      success: true,
      message: `Updated "${field}" on ${record_type} record.`,
      field,
      old_value: oldValue ? oldValue.substring(0, 100) + (oldValue.length > 100 ? '...' : '') : '(empty)',
    };
  }

  if (toolName === 'create_action_item') {
    const { capa_id, title, description, assigned_to, due_date } = toolInput;

    // Verify the CAPA exists
    const capa = await db.get('SELECT id, capa_id, title as capa_title, status FROM capas WHERE id = $1', [capa_id]);
    if (!capa) {
      return { success: false, error: `CAPA #${capa_id} not found` };
    }

    // Insert the action item
    const result = await db.run(
      `INSERT INTO capa_action_items (capa_id, title, description, assigned_to, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [capa_id, title, description || '', assigned_to, due_date || null]
    );

    // Log audit
    try {
      await db.run(
        `INSERT INTO audit_log (action, table_name, record_id, record_identifier, user_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'ai_create_action_item',
          'capa_action_items',
          capa_id,
          capa.capa_id || capa_id,
          userId || 'jarvis-ai',
          JSON.stringify({ title, description, assigned_to, due_date, source: 'jarvis_ai' }),
        ]
      );
    } catch (auditErr) {
      console.error('AI audit log failed:', auditErr.message);
    }

    return {
      success: true,
      message: `Created action item "${title}" assigned to ${assigned_to}${due_date ? ` (due ${due_date})` : ''}.`,
      title,
      assigned_to,
      due_date: due_date || 'not set',
    };
  }

  if (toolName === 'update_action_item_status') {
    const { action_item_id, status, notes } = toolInput;

    // Fetch the action item
    const item = await db.get('SELECT ai.*, c.capa_id as capa_identifier FROM capa_action_items ai JOIN capas c ON ai.capa_id = c.id WHERE ai.id = $1', [action_item_id]);
    if (!item) {
      return { success: false, error: `Action item #${action_item_id} not found` };
    }

    const oldStatus = item.status;

    // Build update query
    let updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    let params = [status];
    let paramIdx = 2;

    if (status === 'completed') {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updateFields.push(`completed_at = NULL`);
    }

    if (notes) {
      updateFields.push(`description = COALESCE(description, '') || $${paramIdx}`);
      params.push(`\n\n[AI Note: ${notes}]`);
      paramIdx++;
    }

    params.push(action_item_id);
    await db.run(
      `UPDATE capa_action_items SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
      params
    );

    // Audit log
    try {
      await db.run(
        `INSERT INTO audit_log (action, table_name, record_id, record_identifier, user_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'ai_update_action_item',
          'capa_action_items',
          item.capa_id,
          item.capa_identifier || item.capa_id,
          userId || 'jarvis-ai',
          JSON.stringify({ action_item_id, title: item.title, old_status: oldStatus, new_status: status, notes, source: 'jarvis_ai' }),
        ]
      );
    } catch (auditErr) {
      console.error('AI audit log failed:', auditErr.message);
    }

    return {
      success: true,
      message: `Task "${item.title}" status changed from ${oldStatus} to ${status}.`,
      title: item.title,
      old_status: oldStatus,
      new_status: status,
    };
  }

  if (toolName === 'create_capa_from_deviation') {
    const { deviation_id, corrective_action, preventive_action, responsible_person, target_date } = toolInput;

    // Fetch the deviation
    const dev = await db.get('SELECT * FROM deviation_reports WHERE id = $1', [deviation_id]);
    if (!dev) {
      return { success: false, error: `Deviation #${deviation_id} not found` };
    }

    // Parse affected items for description context
    let affBatches = [];
    let affProducts = [];
    try { affBatches = JSON.parse(dev.affected_batches || '[]'); } catch(e) {}
    try { affProducts = JSON.parse(dev.affected_products || '[]'); } catch(e) {}

    const batchInfo = affBatches.length > 0 ? `\nBatch(es): ${affBatches.join(', ')}` : '';
    const productInfo = affProducts.length > 0 ? `\nProduct(s): ${affProducts.join(', ')}` : '';
    const classInfo = dev.classification ? `\nClassification: ${dev.classification}` : '';

    // Auto-fill fields
    const capaTitle = `CAPA for ${dev.report_id}${affBatches.length > 0 ? ` (${affBatches[0]})` : ''} - ${dev.title || ''}`;
    const capaDescription = `Deviation ${dev.report_id}: ${dev.description || ''}${batchInfo}${productInfo}${classInfo}`.trim();

    // Auto-generate corrective action from deviation data
    let capaCorrectiveAction = corrective_action || '';
    if (!capaCorrectiveAction && dev.root_cause) {
      capaCorrectiveAction = `Root cause identified: ${dev.root_cause}\n\nCorrective action: Address the root cause by implementing immediate corrections to the process/procedure that led to this deviation.`;
      if (dev.immediate_action) {
        capaCorrectiveAction += `\n\nImmediate containment already taken: ${dev.immediate_action}`;
      }
    } else if (!capaCorrectiveAction && dev.description) {
      capaCorrectiveAction = `Investigate and correct the issue described in ${dev.report_id}: ${dev.description.substring(0, 200)}`;
    }

    // Auto-generate preventive action from root cause
    let capaPreventiveAction = preventive_action || '';
    if (!capaPreventiveAction && dev.root_cause) {
      const rootCauseSnippet = dev.root_cause.substring(0, 150) + (dev.root_cause.length > 150 ? '...' : '');
      capaPreventiveAction = `To prevent recurrence of the root cause (${rootCauseSnippet}):\n\n`;
      capaPreventiveAction += '1. Review and update applicable SOPs to address the identified gap\n';
      capaPreventiveAction += '2. Conduct targeted training for relevant personnel\n';
      capaPreventiveAction += '3. Implement additional monitoring/verification controls\n';
      capaPreventiveAction += '4. Verify effectiveness of corrective actions within 30 days';
    }
    const capaResponsible = responsible_person || dev.investigated_by || dev.discovered_by || '';
    const defaultTarget = new Date();
    defaultTarget.setDate(defaultTarget.getDate() + 30);
    const capaTargetDate = target_date || defaultTarget.toISOString().slice(0, 10);

    if (!capaResponsible) {
      return { success: false, error: 'Could not determine responsible person. Please provide a responsible_person.' };
    }

    // Generate CAPA ID using qms_sequence
    const year = new Date().getFullYear();
    const seqRow = await db.get('SELECT next_number FROM qms_sequence WHERE type = $1 AND year = $2', ['capa', year]);
    let num;
    if (seqRow) {
      num = seqRow.next_number;
      await db.run('UPDATE qms_sequence SET next_number = $1 WHERE type = $2 AND year = $3', [num + 1, 'capa', year]);
    } else {
      num = 1;
      await db.run('INSERT INTO qms_sequence (type, year, next_number) VALUES ($1, $2, $3)', ['capa', year, 2]);
    }
    const capa_id = `CAPA-${year}-${String(num).padStart(3, '0')}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const info = await db.run(`
      INSERT INTO capas (capa_id, source_type, source_id, corrective_action, preventive_action,
        responsible_person, target_date, title, description, created_at, updated_at)
      VALUES ($1, 'deviation', $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [capa_id, dev.id, capaCorrectiveAction, capaPreventiveAction,
      capaResponsible, capaTargetDate, capaTitle, capaDescription, now, now]);

    const created = await db.get('SELECT * FROM capas WHERE id = $1', [info.lastInsertRowid]);

    // Audit log
    try {
      await db.run(
        `INSERT INTO audit_log (action, table_name, record_id, record_identifier, user_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'ai_create_capa_from_deviation',
          'capas',
          created.id,
          capa_id,
          userId || 'jarvis-ai',
          JSON.stringify({ capa_id, deviation_id, deviation_report_id: dev.report_id, source: 'jarvis_ai' }),
        ]
      );
    } catch (auditErr) {
      console.error('AI audit log failed:', auditErr.message);
    }

    return {
      success: true,
      message: `Created ${capa_id} from deviation ${dev.report_id}. Title: "${capaTitle}". Responsible: ${capaResponsible}. Target date: ${capaTargetDate}.`,
      capa_id,
      capa_db_id: created.id,
      deviation_report_id: dev.report_id,
      responsible_person: capaResponsible,
      target_date: capaTargetDate,
    };
  }

  return { success: false, error: `Unknown tool: ${toolName}` };
}

// ── Jarvis Chat ─────────────────────────────────────────────────────────────
// In-memory conversation store keyed by session ID
// Each entry: { messages: [{role, content}], lastAccess: timestamp }
const chatSessions = new Map();

// Prune stale sessions every 30 minutes (keep max 2 hours)
const CHAT_SESSION_TTL = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of chatSessions) {
    if (now - session.lastAccess > CHAT_SESSION_TTL) chatSessions.delete(key);
  }
}, 30 * 60 * 1000);

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, the AI assistant embedded in the Quality Management System (QMS) for KEFIR Kultures Inc. (KKI).

## About KKI
- Small-batch kefir manufacturer based in Canada
- FDA-regulated facility operating under 21 CFR Part 117 (Preventive Controls for Human Food)
- GMP-compliant production environment
- Products: kefir beverages (dairy-based fermented milk products)

## Your Role
You help operators, quality staff, and managers with:
- GMP compliance questions and best practices
- CAPA management (Corrective and Preventive Actions)
- Deviation handling and investigation guidance
- Complaint processing and root cause analysis
- Batch record reviews and documentation
- Environmental monitoring interpretation
- SOP questions and documentation drafting
- Change control processes
- Supplier qualification
- Recall readiness and traceability
- FDA 21 CFR Part 117 regulatory requirements
- HACCP and food safety plan questions

## QMS Modules Available
The user can navigate to these sections: Dashboard, Complaints, CCRs (Customer Complaint Records), Deviations, CAPAs, Change Control, Batch Testing, Daily Tasks, SOP Library, Documents, Equipment, Maintenance, Recall Center, Suppliers, Analytics, Inventory Counts, Pick Lists, Planner, Fermentation.

## Communication Style
- Be concise and action-oriented — operators are busy
- Use plain language, avoid jargon unless the user uses it first
- When suggesting documentation text, write in professional GMP style (past tense for events, present tense for procedures)
- If the user asks about a specific record (deviation, CAPA, complaint), reference the record type and offer concrete next steps
- Provide regulatory citations (e.g., "per 21 CFR 117.150") when relevant
- If you don't know something specific to KKI's internal processes, say so and offer general GMP guidance instead

## Editing Records
When you are viewing a specific record (CAPA, deviation, complaint, CCR, or change control), you have the ability to **directly edit fields** using the update_record_field tool. Use this when:
- The user asks you to fill in, write, draft, or update a field
- The user says something like "fill in the root cause" or "write the corrective action"
- The user asks you to help complete a record

When editing, write in professional GMP documentation style:
- Past tense for events that occurred
- Present tense for procedures and controls
- Specific and factual — cite lot numbers, dates, and locations from the record data
- Do NOT fabricate data not present in the record

After editing a field, tell the user what you wrote and that they should refresh the page to see the updated value.

## Creating Action Items / Tasks
When viewing a CAPA, you can also **create action items** using the create_action_item tool. Use this when:
- The user asks you to add tasks, create action items, or assign work
- The user asks you to break down corrective or preventive actions into steps
- The user asks "what tasks should we create for this CAPA?"
- You recommend specific actions and the user says "add those as tasks"

When creating action items:
- Use clear, actionable titles (verb + object, e.g., "Retrain staff on SOP-042")
- Set realistic due dates based on urgency (2 days for critical, 7 days for routine, 14-30 days for systemic changes)
- Assign to specific people if known, otherwise use role titles (e.g., "QA Manager", "Production Lead")
- You can create multiple action items in sequence to break down complex corrective actions

## Completing / Updating Tasks
When viewing a CAPA, you can also **update action item status** using the update_action_item_status tool. Use this when:
- The user says "mark task X as done" or "complete that task"
- The user says "start working on task 2" (set to in_progress)
- The user says "reopen task 3" (set back to pending)
- The user references a task by its title or number and asks to change its status

The action items for the current CAPA are shown in your context under Related Records → actionItems. Match the user's request to the correct action_item_id from that list.

## Creating CAPAs from Deviations
When viewing a deviation, you can **create a CAPA directly** using the create_capa_from_deviation tool. Use this when:
- The user asks to create a CAPA from the current deviation
- The user says "initiate corrective actions" or "we need a CAPA for this"
- The user asks you to escalate a deviation to CAPA

The tool auto-generates corrective and preventive actions from the deviation's root cause, description, and category. You can also provide custom corrective_action and preventive_action text if the user specifies what they want.

## Important Rules
- Never fabricate lot numbers, batch IDs, test results, or specific KKI data
- Always recommend documenting actions in the QMS
- For critical food safety issues, always recommend immediate containment and escalation to management
- Use markdown formatting (headers, bold, lists) in your responses — the chat renders it properly
- Keep responses focused — 2-5 sentences for simple questions, more for complex topics`;

router.post('/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. ANTHROPIC_API_KEY is required.' });
    }

    const { messages, context, chatSessionId } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Build session key from user session + chat session
    const userId = req.session?.user?.id || null;
    const sessionKey = chatSessionId || `${userId || 'anon'}-${crypto.randomUUID()}`;

    // Get or create conversation history
    let session = chatSessions.get(sessionKey);
    if (!session) {
      session = { messages: [], lastAccess: Date.now() };
      chatSessions.set(sessionKey, session);
    }
    session.lastAccess = Date.now();

    // Append new user message(s) to history
    const lastMsg = messages[messages.length - 1];
    session.messages.push({ role: 'user', content: lastMsg.content });

    // Persist user message to DB
    if (userId) {
      try {
        await db.run(
          'INSERT INTO chat_messages (user_id, session_id, role, content, context) VALUES (?, ?, ?, ?, ?)',
          [userId, sessionKey, 'user', lastMsg.content, JSON.stringify(context || {})]
        );
      } catch (dbErr) {
        console.error('Failed to persist user chat message:', dbErr.message);
      }
    }

    // Cap history at 50 messages to prevent token overflow
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    // Build context-aware system prompt
    let systemPrompt = JARVIS_SYSTEM_PROMPT;
    if (context) {
      systemPrompt += `\n\n## Current Context\nThe user is currently on: ${context.page || 'unknown page'}`;
      if (context.recordType) systemPrompt += `\nRecord type: ${context.recordType}`;
      if (context.recordId) systemPrompt += `\nRecord ID: ${context.recordId}`;

      // Fetch actual record data from the database so Jarvis can see what the user is looking at
      if (context.recordType && context.recordId) {
        const tableMap = {
          'complaints': 'complaints',
          'deviations': 'deviation_reports',
          'capas': 'capas',
          'batch-tests': 'batch_tests',
          'suppliers': 'suppliers',
          'environmental': 'environmental_samples',
          'ccrs': 'ccrs',
          'change-control': 'change_requests',
          'equipment': 'equipment',
          'recalls': 'recalls',
          'sops': 'sops',
          'work-orders': 'work_orders',
          'daily-tasks': 'daily_tasks',
          'pick-lists': 'pick_lists',
          'inventory-counts': 'inventory_counts',
        };
        const tableName = tableMap[context.recordType];
        if (tableName) {
          try {
            const record = await db.get(`SELECT * FROM ${tableName} WHERE id = $1`, [context.recordId]);
            if (record) {
              systemPrompt += `\n\nThe user is currently viewing this record:\n${JSON.stringify(record, null, 2)}`;

              // Fetch related records
              try {
                const relatedRecords = {};

                // Type-specific relationships
                if (context.recordType === 'deviations') {
                  try {
                    const capas = await db.all(`SELECT id, title, status, source_type FROM capas WHERE source_type = 'deviation' AND source_id = $1`, [context.recordId]);
                    if (capas?.length) relatedRecords.capas = capas;
                  } catch (e) { /* non-fatal */ }

                  // Parse linked JSON arrays
                  const jsonFields = ['linked_complaints_json', 'linked_batch_tests_json', 'linked_sops_json'];
                  for (const field of jsonFields) {
                    if (record[field]) {
                      try {
                        const ids = typeof record[field] === 'string' ? JSON.parse(record[field]) : record[field];
                        if (Array.isArray(ids) && ids.length > 0) {
                          const fieldTableMap = {
                            'linked_complaints_json': 'complaints',
                            'linked_batch_tests_json': 'batch_tests',
                            'linked_sops_json': 'sops',
                          };
                          const ft = fieldTableMap[field];
                          if (ft) {
                            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
                            const linked = await db.all(`SELECT * FROM ${ft} WHERE id IN (${placeholders})`, ids);
                            if (linked?.length) relatedRecords[field.replace('_json', '')] = linked;
                          }
                        }
                      } catch (e) { /* non-fatal JSON parse */ }
                    }
                  }
                } else if (context.recordType === 'capas') {
                  if (record.source_type && record.source_id) {
                    try {
                      const sourceTable = tableMap[record.source_type] || tableMap[record.source_type + 's'];
                      if (sourceTable) {
                        const sourceRecord = await db.get(`SELECT * FROM ${sourceTable} WHERE id = $1`, [record.source_id]);
                        if (sourceRecord) relatedRecords.sourceRecord = { type: record.source_type, ...sourceRecord };
                      }
                    } catch (e) { /* non-fatal */ }
                  }
                  if (record.linked_change_request_id) {
                    try {
                      const cr = await db.get(`SELECT * FROM change_requests WHERE id = $1`, [record.linked_change_request_id]);
                      if (cr) relatedRecords.changeRequest = cr;
                    } catch (e) { /* non-fatal */ }
                  }
                  // Fetch existing action items so Jarvis knows what tasks already exist
                  try {
                    const actionItems = await db.all(`SELECT id, title, description, assigned_to, due_date, status, created_at FROM capa_action_items WHERE capa_id = $1 ORDER BY created_at ASC`, [context.recordId]);
                    if (actionItems?.length) relatedRecords.actionItems = actionItems;
                  } catch (e) { /* non-fatal */ }
                } else if (context.recordType === 'complaints') {
                  if (record.linked_ccr_id) {
                    try {
                      const ccr = await db.get(`SELECT * FROM ccrs WHERE id = $1`, [record.linked_ccr_id]);
                      if (ccr) relatedRecords.ccr = ccr;
                    } catch (e) { /* non-fatal */ }
                  }
                  try {
                    const capas = await db.all(`SELECT id, title, status, source_type FROM capas WHERE source_type = 'complaint' AND source_id = $1`, [context.recordId]);
                    if (capas?.length) relatedRecords.capas = capas;
                  } catch (e) { /* non-fatal */ }
                  try {
                    const devs = await db.all(`SELECT id, title, status FROM deviation_reports WHERE linked_complaints_json::text LIKE $1`, [`%${context.recordId}%`]);
                    if (devs?.length) relatedRecords.deviations = devs;
                  } catch (e) { /* non-fatal */ }
                } else if (context.recordType === 'ccrs') {
                  try {
                    const complaints = await db.all(`SELECT c.* FROM complaints c JOIN ccr_complaints cc ON c.id = cc.complaint_id WHERE cc.ccr_id = $1`, [context.recordId]);
                    if (complaints?.length) relatedRecords.complaints = complaints;
                  } catch (e) { /* non-fatal */ }
                } else if (context.recordType === 'change-control') {
                  try {
                    const capas = await db.all(`SELECT id, title, status FROM capas WHERE linked_change_request_id = $1 OR (source_type = 'change_request' AND source_id = $1)`, [context.recordId]);
                    if (capas?.length) relatedRecords.capas = capas;
                  } catch (e) { /* non-fatal */ }
                } else if (context.recordType === 'equipment') {
                  try {
                    const workOrders = await db.all(`SELECT * FROM work_orders WHERE equipment_id = $1`, [context.recordId]);
                    if (workOrders?.length) relatedRecords.workOrders = workOrders;
                  } catch (e) { /* non-fatal */ }
                } else if (context.recordType === 'environmental') {
                  if (record.linked_deviation_id) {
                    try {
                      const dev = await db.get(`SELECT * FROM deviation_reports WHERE id = $1`, [record.linked_deviation_id]);
                      if (dev) relatedRecords.deviation = dev;
                    } catch (e) { /* non-fatal */ }
                  }
                } else if (context.recordType === 'work-orders') {
                  if (record.equipment_id) {
                    try {
                      const eq = await db.get(`SELECT * FROM equipment WHERE id = $1`, [record.equipment_id]);
                      if (eq) relatedRecords.equipment = eq;
                    } catch (e) { /* non-fatal */ }
                  }
                  if (record.linked_deviation_id) {
                    try {
                      const dev = await db.get(`SELECT * FROM deviation_reports WHERE id = $1`, [record.linked_deviation_id]);
                      if (dev) relatedRecords.deviation = dev;
                    } catch (e) { /* non-fatal */ }
                  }
                }

                // Universal: qms_record_links for all types
                try {
                  const links = await db.all(
                    `SELECT * FROM qms_record_links WHERE (source_type = $1 AND source_id = $2) OR (target_type = $1 AND target_id = $2)`,
                    [context.recordType, context.recordId]
                  );
                  if (links?.length) relatedRecords.recordLinks = links;
                } catch (e) { /* non-fatal */ }

                if (Object.keys(relatedRecords).length > 0) {
                  systemPrompt += `\n\n## Related Records\n${JSON.stringify(relatedRecords, null, 2)}`;
                }
              } catch (relErr) {
                console.error('Failed to fetch related records for AI context:', relErr.message);
              }
            }
          } catch (dbErr) {
            console.error('Failed to fetch record data for AI context:', dbErr.message);
            // Non-fatal — continue without record data
          }
        } else if (context.recordType && !context.recordId) {
          // User is on a list page (e.g. /deviations) — fetch recent records summary
          const listTableMap = {
            'complaints': 'complaints',
            'deviations': 'deviation_reports',
            'capas': 'capas',
            'batch-tests': 'batch_tests',
            'suppliers': 'suppliers',
            'environmental': 'environmental_samples',
            'ccrs': 'ccrs',
            'change-control': 'change_requests',
            'equipment': 'equipment',
            'recalls': 'recalls',
            'sops': 'sops',
            'work-orders': 'work_orders',
            'daily-tasks': 'daily_tasks',
            'pick-lists': 'pick_lists',
            'inventory-counts': 'inventory_counts',
          };
          const listTable = listTableMap[context.recordType];
          if (listTable) {
            const titleColumnMap = {
              'complaints': 'complaint_number',
              'ccrs': 'ccr_number',
              'equipment': 'name',
              'suppliers': 'name',
              'sops': 'title',
              'batch-tests': 'batch_id',
              'environmental': 'location',
              'daily-tasks': 'task_name',
              'pick-lists': 'order_number',
              'inventory-counts': 'location',
            };
            const titleCol = titleColumnMap[context.recordType] || 'title';
            try {
              const records = await db.all(`SELECT id, ${titleCol} as title, status, created_at FROM ${listTable} ORDER BY created_at DESC LIMIT 15`);
              if (records?.length) {
                systemPrompt += `\n\nThe user is viewing the ${context.recordType} list. Recent records:\n${JSON.stringify(records, null, 2)}`;
              }
            } catch (dbErr) {
              console.error('Failed to fetch list records for AI context:', dbErr.message);
            }
          }
        }
      }

      // Append form data if the client sent current form state
      if (context && context.formData && Object.keys(context.formData).length > 0) {
        systemPrompt += `\n\n## Current Form State (includes unsaved edits)\n${JSON.stringify(context.formData, null, 2)}`;
      }
    }
    const userName = req.session?.user?.display_name || req.session?.user?.username || 'Operator';
    systemPrompt += `\n\nThe current user is: ${userName} (role: ${req.session?.user?.role || 'unknown'})`;

    // Stream response via SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Chat-Session-Id', sessionKey);
    res.flushHeaders();

    const client = new Anthropic({ apiKey });

    // Determine if we're on a record page where tools make sense
    const hasRecordContext = context?.recordType && context?.recordId && RECORD_TABLE_MAP[context.recordType];
    const toolsConfig = hasRecordContext ? { tools: AI_TOOLS } : {};

    // Tool use loop: stream text, execute tools, continue until done
    let conversationMessages = [...session.messages];
    let fullResponse = '';
    let toolsUsed = [];
    let maxToolRounds = 3; // prevent infinite loops
    let aborted = false;

    req.on('close', () => { aborted = true; });

    for (let round = 0; round < maxToolRounds; round++) {
      if (aborted) break;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: conversationMessages,
        ...toolsConfig,
      });

      // Process content blocks
      let hasToolUse = false;
      const assistantContent = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
          assistantContent.push(block);
          res.write(`data: ${JSON.stringify({ type: 'text', text: block.text })}\n\n`, 'utf-8');
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          assistantContent.push(block);

          // Notify frontend that a tool is being executed
          res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: block.name, field: block.input?.field })}\n\n`, 'utf-8');

          // Execute the tool
          try {
            const result = await executeToolCall(block.name, block.input, userId);
            toolsUsed.push({ tool: block.name, input: block.input, result });

            // Send tool result notification to frontend
            res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: block.name, result })}\n\n`, 'utf-8');

            // Add assistant message with tool use + tool result to conversation
            conversationMessages.push({ role: 'assistant', content: assistantContent });
            conversationMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              }],
            });
          } catch (toolErr) {
            console.error('Tool execution error:', toolErr.message);
            const errorResult = { success: false, error: toolErr.message };
            res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: block.name, result: errorResult })}\n\n`, 'utf-8');

            conversationMessages.push({ role: 'assistant', content: assistantContent });
            conversationMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(errorResult),
                is_error: true,
              }],
            });
          }
        }
      }

      // If no tool use, we're done
      if (!hasToolUse) {
        break;
      }
    }

    // Save assistant response to in-memory history (text only)
    if (fullResponse) {
      session.messages.push({ role: 'assistant', content: fullResponse });
    }
    // Persist assistant message to DB
    if (userId && fullResponse) {
      db.run(
        'INSERT INTO chat_messages (user_id, session_id, role, content, context) VALUES (?, ?, ?, ?, ?)',
        [userId, sessionKey, 'assistant', fullResponse, JSON.stringify(context || {})]
      ).catch(dbErr => console.error('Failed to persist assistant chat message:', dbErr.message));
    }
    res.write(`data: ${JSON.stringify({ type: 'done', chatSessionId: sessionKey, toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined })}\n\n`, 'utf-8');
    res.end();
  } catch (err) {
    console.error('Jarvis chat error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat failed: ' + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`, 'utf-8');
      res.end();
    }
  }
});

// Get chat history for current user (most recent session)
router.get('/ai/chat/history', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.json({ messages: [], chatSessionId: null });

    // Find the most recent session for this user
    const latest = await db.get(
      'SELECT session_id FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (!latest) return res.json({ messages: [], chatSessionId: null });

    // Load all messages from that session (max 100)
    const rows = await db.all(
      'SELECT role, content, created_at FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 100',
      [userId, latest.session_id]
    );

    // Re-hydrate the in-memory session so streaming continues to work
    const sessionMessages = rows.map(r => ({ role: r.role, content: r.content }));
    chatSessions.set(latest.session_id, { messages: sessionMessages, lastAccess: Date.now() });

    res.json({
      messages: rows.map(r => ({ role: r.role, content: r.content, created_at: r.created_at })),
      chatSessionId: latest.session_id,
    });
  } catch (err) {
    console.error('Chat history error:', err.message);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// Clear chat history
router.delete('/ai/chat', async (req, res) => {
  const { chatSessionId } = req.body || {};
  if (chatSessionId) {
    chatSessions.delete(chatSessionId);
    // Clear from DB too
    const userId = req.session?.user?.id;
    if (userId) {
      try {
        await db.run('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?', [userId, chatSessionId]);
      } catch (dbErr) {
        console.error('Failed to clear chat history from DB:', dbErr.message);
      }
    }
  }
  res.json({ ok: true });
});

const SYSTEM_PROMPT = `You are Jarvis, an AI assistant for KEFIR Kultures Inc. (KKI), a food manufacturing company that produces kefir products. You help quality assurance staff write clear, professional GMP-compliant documentation for their Quality Management System (QMS).

Your suggestions should be:
- Concise and professional
- GMP/food-safety appropriate language
- Specific to kefir/dairy manufacturing when relevant
- Written in past tense for descriptions of what happened
- Actionable for root causes and corrective actions

Do NOT include headers, bullet points, or markdown formatting. Write in plain paragraph form. Keep suggestions to 2-4 sentences unless the context warrants more detail.`;

const FIELD_PROMPTS = {
  description: 'Write a clear, factual description of this quality event based on the context provided. Focus on: what happened, when, where, what product/lot was affected, and who discovered it.',
  root_cause: 'Based on the description and context, suggest a likely root cause analysis. Consider: equipment, process, personnel, materials, environment, and method factors. Be specific about the most probable cause.',
  root_cause_analysis: 'Based on the description and context, write a thorough root cause analysis. Use the investigation method if specified. Consider: equipment, process, personnel, materials, environment factors. Identify the most probable root cause and contributing factors.',
  containment_action: 'Suggest an appropriate immediate containment action for this quality event. Focus on: isolating affected product, preventing further occurrence, and protecting the consumer.',
  corrective_action: 'Suggest a corrective action to address the root cause. Focus on: what specific changes to make, who is responsible, and how to verify the fix works.',
  preventive_action: 'Suggest a preventive action to prevent recurrence. Focus on: systemic changes, training, process improvements, or monitoring enhancements.',
  investigation: 'Write investigation findings based on the context provided. Document what was examined, what evidence was found, and what conclusions were drawn.',
};

router.post('/ai/suggest', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. ANTHROPIC_API_KEY is required.' });
    }

    const { field, context, recordType } = req.body;
    if (!field || !context) {
      return res.status(400).json({ error: 'Missing field or context' });
    }

    const fieldPrompt = FIELD_PROMPTS[field] || `Suggest appropriate content for the "${field}" field based on the context provided.`;

    const userMessage = `Record type: ${recordType || 'quality event'}

Context:
${Object.entries(context)
  .filter(([, v]) => v && String(v).trim())
  .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}

Task: ${fieldPrompt}`;

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const suggestion = message.content[0]?.text || '';
    res.json({ suggestion });
  } catch (err) {
    console.error('AI suggest error:', err.message);
    res.status(500).json({ error: 'AI suggestion failed: ' + err.message });
  }
});

export default router;
