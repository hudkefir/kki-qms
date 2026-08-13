# Node Description Batch 43 of 77

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "migrations_02_sops_sop_revisions": "sop_revisions" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L30 | neighbors=[02-sops.sql, sops]
- "migrations_03_quality_audit_checklist": "audit_checklist" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L66 | neighbors=[03-quality.sql, sops]
- "migrations_03_quality_batch_test_results": "batch_test_results" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L99 | neighbors=[03-quality.sql, batch_tests]
- "migrations_03_quality_batch_tests": "batch_tests" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L78 | neighbors=[03-quality.sql, batch_test_results]
- "migrations_03_quality_sops": "sops" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L68 | neighbors=[03-quality.sql, audit_checklist]
- "migrations_04_capa_deviations_capa_action_items": "capa_action_items" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L80 | neighbors=[04-capa-deviations.sql, capas]
- "migrations_04_capa_deviations_capas": "capas" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L61 | neighbors=[04-capa-deviations.sql, capa_action_items]
- "migrations_05_daily_ops_daily_task_completions": "daily_task_completions" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L16 | neighbors=[05-daily-ops.sql, daily_tasks]
- "migrations_05_daily_ops_daily_task_template_items": "daily_task_template_items" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L42 | neighbors=[05-daily-ops.sql, daily_task_templates]
- "migrations_05_daily_ops_daily_task_templates": "daily_task_templates" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L34 | neighbors=[05-daily-ops.sql, daily_task_template_items]
- "migrations_05_daily_ops_daily_tasks": "daily_tasks" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L2 | neighbors=[05-daily-ops.sql, daily_task_completions]
- "migrations_05_daily_ops_operator_task_comments": "operator_task_comments" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L70 | neighbors=[05-daily-ops.sql, operator_tasks]
- "migrations_05_daily_ops_operator_tasks": "operator_tasks" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L53 | neighbors=[05-daily-ops.sql, operator_task_comments]
- "migrations_05_daily_ops_pick_list_items": "pick_list_items" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L109 | neighbors=[05-daily-ops.sql, pick_lists]
- "migrations_05_daily_ops_pick_lists": "pick_lists" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L94 | neighbors=[05-daily-ops.sql, pick_list_items]
- "migrations_06_taskboard_taskboard_template_items": "taskboard_template_items" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L38 | neighbors=[06-taskboard.sql, taskboard_templates]
- "migrations_06_taskboard_taskboard_templates": "taskboard_templates" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L23 | neighbors=[06-taskboard.sql, taskboard_template_items]
- "migrations_07_equipment_work_orders": "work_orders" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L50 | neighbors=[07-equipment.sql, equipment]
- "migrations_08_recalls_recall_distribution": "recall_distribution" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L36 | neighbors=[08-recalls.sql, recalls]
- "migrations_08_recalls_recalls": "recalls" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L2 | neighbors=[08-recalls.sql, recall_distribution]
- "migrations_10_suppliers_supplier_reviews": "supplier_reviews" | kind=code-symbol | source=server/src/migrations/10-suppliers.sql:L27 | neighbors=[10-suppliers.sql, suppliers]
- "migrations_10_suppliers_suppliers": "suppliers" | kind=code-symbol | source=server/src/migrations/10-suppliers.sql:L2 | neighbors=[10-suppliers.sql, supplier_reviews]
- "migrations_11_planner_planner_batches": "planner_batches" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L2 | neighbors=[11-planner.sql, planner_pick_records]
- "migrations_11_planner_planner_purchase_orders": "planner_purchase_orders" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L22 | neighbors=[11-planner.sql, planner_pick_records]
- "migrations_14_deviation_attachments": "14-deviation-attachments.sql" | kind=code-symbol | source=server/src/migrations/14-deviation-attachments.sql:L1 | neighbors=[deviation_attachments, deviation_reports]
- "migrations_14_deviation_attachments_deviation_attachments": "deviation_attachments" | kind=code-symbol | source=server/src/migrations/14-deviation-attachments.sql:L1 | neighbors=[14-deviation-attachments.sql, deviation_reports]
- "migrations_14_deviation_attachments_deviation_reports": "deviation_reports" | kind=code-symbol | source=server/src/migrations/14-deviation-attachments.sql:L3 | neighbors=[14-deviation-attachments.sql, deviation_attachments]
- "migrations_15_deviation_comments": "15-deviation-comments.sql" | kind=code-symbol | source=server/src/migrations/15-deviation-comments.sql:L1 | neighbors=[deviation_comments, deviation_reports]
- "migrations_15_deviation_comments_deviation_comments": "deviation_comments" | kind=code-symbol | source=server/src/migrations/15-deviation-comments.sql:L1 | neighbors=[15-deviation-comments.sql, deviation_reports]
- "migrations_15_deviation_comments_deviation_reports": "deviation_reports" | kind=code-symbol | source=server/src/migrations/15-deviation-comments.sql:L3 | neighbors=[15-deviation-comments.sql, deviation_comments]
- "migrations_16_deviation_approvals": "16-deviation-approvals.sql" | kind=code-symbol | source=server/src/migrations/16-deviation-approvals.sql:L1 | neighbors=[deviation_approvals, deviation_reports]
- "migrations_16_deviation_approvals_deviation_approvals": "deviation_approvals" | kind=code-symbol | source=server/src/migrations/16-deviation-approvals.sql:L1 | neighbors=[16-deviation-approvals.sql, deviation_reports]
- "migrations_16_deviation_approvals_deviation_reports": "deviation_reports" | kind=code-symbol | source=server/src/migrations/16-deviation-approvals.sql:L3 | neighbors=[16-deviation-approvals.sql, deviation_approvals]
- "migrations_18_capa_action_item_notes": "18-capa-action-item-notes.sql" | kind=code-symbol | source=server/src/migrations/18-capa-action-item-notes.sql:L1 | neighbors=[capa_action_item_notes, capa_action_items]
- "migrations_18_capa_action_item_notes_capa_action_item_notes": "capa_action_item_notes" | kind=code-symbol | source=server/src/migrations/18-capa-action-item-notes.sql:L1 | neighbors=[18-capa-action-item-notes.sql, capa_action_items]
- "migrations_18_capa_action_item_notes_capa_action_items": "capa_action_items" | kind=code-symbol | source=server/src/migrations/18-capa-action-item-notes.sql:L3 | neighbors=[18-capa-action-item-notes.sql, capa_action_item_notes]
- "pages_analytics_analytics": "Analytics()" | kind=code-symbol | source=client/src/pages/Analytics.jsx:L44 | neighbors=[Analytics.jsx, chartOptions()]
- "pages_analytics_chartoptions": "chartOptions()" | kind=code-symbol | source=client/src/pages/Analytics.jsx:L30 | neighbors=[Analytics.jsx, Analytics()]
- "pages_auditprep_auditprep": "AuditPrep()" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L32 | neighbors=[AuditPrep.jsx, getDaysUntilAudit()]
- "pages_auditprep_getdaysuntilaudit": "getDaysUntilAudit()" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L26 | neighbors=[AuditPrep.jsx, AuditPrep()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-042.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
