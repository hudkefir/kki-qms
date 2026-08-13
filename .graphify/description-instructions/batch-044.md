# Node Description Batch 45 of 77

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
For an entity node (any other kind — e.g. a person, place, event, object),
describe what the entity is and its role, grounded in its type, its
relations (neighbors) and the provided citations/evidence — e.g.
"Lady Carfax, a wealthy heiress who disappears en route to Lausanne.".
Ground entity descriptions in the citations/evidence when present; do not
speculate beyond the context, so a node with no supporting context may be
left out of the reply.
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "pages_planner_adddays": "addDays()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L36 | neighbors=[Planner.jsx, ScheduleTab()]
- "pages_planner_addgrpmodal": "AddGRPModal()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L1309 | neighbors=[Planner.jsx, fmt()]
- "pages_planner_dayname": "dayName()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L47 | neighbors=[Planner.jsx, DayCard()]
- "pages_planner_weekheader": "WeekHeader()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L368 | neighbors=[Planner.jsx, fmtShort()]
- "pages_plannerpodetail_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L27 | neighbors=[PlannerPODetail.jsx, PlannerPODetail()]
- "pages_plannerpodetail_formatdatetime": "formatDateTime()" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L32 | neighbors=[PlannerPODetail.jsx, PlannerPODetail()]
- "pages_recallcenter_classification_labels": "CLASSIFICATION_LABELS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L31 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_recallcenter_crisis_status_styles": "CRISIS_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L62 | neighbors=[CrisisDetail.jsx, RecallCenter.jsx]
- "pages_recallcenter_crisis_type_labels": "CRISIS_TYPE_LABELS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L69 | neighbors=[CrisisDetail.jsx, RecallCenter.jsx]
- "pages_recallcenter_exercise_status_styles": "EXERCISE_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L44 | neighbors=[RecallCenter.jsx, TraceabilityDetail.jsx]
- "pages_recallcenter_exercise_type_labels": "EXERCISE_TYPE_LABELS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L51 | neighbors=[RecallCenter.jsx, TraceabilityDetail.jsx]
- "pages_recallcenter_recall_status_labels": "RECALL_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L15 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_recallcenter_recall_status_options": "RECALL_STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L14 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_recallcenter_recallclassificationbadge": "RecallClassificationBadge()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L84 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_recallcenter_recallstatusbadge": "RecallStatusBadge()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L76 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_recallcenter_severitybadge": "SeverityBadge()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L93 | neighbors=[CrisisDetail.jsx, RecallCenter.jsx]
- "pages_recallcenter_trigger_labels": "TRIGGER_LABELS" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L38 | neighbors=[RecallCenter.jsx, RecallDetail.jsx]
- "pages_sopdetail_previewmajor": "previewMajor()" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L53 | neighbors=[SOPDetail.jsx, previewNextVersion()]
- "pages_sopdetail_previewminor": "previewMinor()" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L45 | neighbors=[SOPDetail.jsx, previewNextVersion()]
- "qms-upgrade-plan": "QMS Upgrade & Stability Plan — Single Persistence Layer" | kind=entity | source=QMS_UPGRADE_PLAN.md | neighbors=[Backend: Express + PostgreSQL (Supabase), Supabase PostgreSQL — Production Databa…]
- "quality_print_classificationbadge": "classificationBadge()" | kind=code-symbol | source=server/src/routes/quality/print.js:L66 | neighbors=[print.js, capaHtml()]
- "quality_print_eschtml": "escHtml()" | kind=code-symbol | source=server/src/routes/quality/print.js:L80 | neighbors=[print.js, capaHtml()]
- "quality_print_prioritybadge": "priorityBadge()" | kind=code-symbol | source=server/src/routes/quality/print.js:L73 | neighbors=[print.js, capaHtml()]
- "quality_print_statusbadge": "statusBadge()" | kind=code-symbol | source=server/src/routes/quality/print.js:L17 | neighbors=[print.js, capaHtml()]
- "quality_taskboard": "taskboard.js" | kind=code-symbol | source=server/src/routes/quality/taskboard.js:L1 | neighbors=[autoBackupTasks(), router]
- "services_auditservice_auditservice": "AuditService" | kind=code-symbol | source=server/src/services/AuditService.js:L168 | neighbors=[AuditService.js, index.js]
- "services_auditservice_diff": "diff()" | kind=code-symbol | source=server/src/services/AuditService.js:L27 | neighbors=[AuditService.js, .logMutation()]
- "services_auditservice_safestringify": "safeStringify()" | kind=code-symbol | source=server/src/services/AuditService.js:L61 | neighbors=[AuditService.js, .logMutation()]
- "services_eventbus": "EventBus.js" | kind=code-symbol | source=server/src/services/EventBus.js:L1 | neighbors=[EventBus, EventBusImpl]
- "services_eventbus_eventbus": "EventBus" | kind=code-symbol | source=server/src/services/EventBus.js:L133 | neighbors=[EventBus.js, index.js]
- "services_eventbus_eventbusimpl_emit": ".emit()" | kind=code-symbol | source=server/src/services/EventBus.js:L77 | neighbors=[EventBusImpl, ._record()]
- "services_eventbus_eventbusimpl_record": "._record()" | kind=code-symbol | source=server/src/services/EventBus.js:L121 | neighbors=[EventBusImpl, .emit()]
- "services_workflowservice_workflowservice": "WorkflowService" | kind=code-symbol | source=server/src/services/WorkflowService.js:L240 | neighbors=[index.js, WorkflowService.js]
- "shared_ai_executetoolcall": "executeToolCall()" | kind=code-symbol | source=server/src/routes/shared/ai.js:L342 | neighbors=[ai.js, toLinkType()]
- "shared_ai_tolinktype": "toLinkType()" | kind=code-symbol | source=server/src/routes/shared/ai.js:L41 | neighbors=[ai.js, executeToolCall()]
- "shared_diagnostics_deployverify": "_deployVerify()" | kind=code-symbol | source=server/src/routes/shared/diagnostics.js:L188 | neighbors=[diagnostics.js, deployVerifyHandler()]
- "src_auditmiddleware_sanitizeforlog": "sanitizeForLog()" | kind=code-symbol | source=server/src/auditMiddleware.js:L107 | neighbors=[auditMiddleware.js, auditApiMiddleware()]
- "src_config_config": "config" | kind=code-symbol | source=client/src/config.js:L9 | neighbors=[config.js, api.js]
- "src_database_pg_convertplaceholders": "convertPlaceholders()" | kind=code-symbol | source=server/src/database-pg.js:L30 | neighbors=[database-pg.js, convertSql()]
- "src_database_pg_convertsql": "convertSql()" | kind=code-symbol | source=server/src/database-pg.js:L37 | neighbors=[database-pg.js, convertPlaceholders()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-044.json

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
