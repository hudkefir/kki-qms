# Node Description Batch 72 of 77

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

- "quality_forms_router": "router" | kind=code-symbol | source=server/src/routes/quality/forms.js:L7 | neighbors=[forms.js]
- "quality_links_getrecordinfo": "getRecordInfo()" | kind=code-symbol | source=server/src/routes/quality/links.js:L321 | neighbors=[links.js]
- "quality_links_router": "router" | kind=code-symbol | source=server/src/routes/quality/links.js:L5 | neighbors=[links.js]
- "quality_maintenance_calcnextdue": "calcNextDue()" | kind=code-symbol | source=server/src/routes/quality/maintenance.js:L26 | neighbors=[maintenance.js]
- "quality_maintenance_nextwonumber": "nextWONumber()" | kind=code-symbol | source=server/src/routes/quality/maintenance.js:L11 | neighbors=[maintenance.js]
- "quality_maintenance_router": "router" | kind=code-symbol | source=server/src/routes/quality/maintenance.js:L8 | neighbors=[maintenance.js]
- "quality_print_basehtml": "baseHtml()" | kind=code-symbol | source=server/src/routes/quality/print.js:L28 | neighbors=[print.js]
- "quality_print_company": "COMPANY" | kind=code-symbol | source=server/src/routes/quality/print.js:L9 | neighbors=[print.js]
- "quality_print_createcapadoc": "createCAPADoc()" | kind=code-symbol | source=server/src/routes/quality/print.js:L538 | neighbors=[print.js]
- "quality_print_fetchcaparelateddata": "fetchCapaRelatedData()" | kind=code-symbol | source=server/src/routes/quality/print.js:L294 | neighbors=[print.js]
- "quality_print_router": "router" | kind=code-symbol | source=server/src/routes/quality/print.js:L7 | neighbors=[print.js]
- "quality_recalls_nextcrisisid": "nextCrisisId()" | kind=code-symbol | source=server/src/routes/quality/recalls.js:L39 | neighbors=[recalls.js]
- "quality_recalls_nextexerciseid": "nextExerciseId()" | kind=code-symbol | source=server/src/routes/quality/recalls.js:L25 | neighbors=[recalls.js]
- "quality_recalls_nextrecallid": "nextRecallId()" | kind=code-symbol | source=server/src/routes/quality/recalls.js:L11 | neighbors=[recalls.js]
- "quality_recalls_router": "router" | kind=code-symbol | source=server/src/routes/quality/recalls.js:L8 | neighbors=[recalls.js]
- "quality_taskboard_autobackuptasks": "autoBackupTasks()" | kind=code-symbol | source=server/src/routes/quality/taskboard.js:L794 | neighbors=[taskboard.js]
- "quality_taskboard_router": "router" | kind=code-symbol | source=server/src/routes/quality/taskboard.js:L5 | neighbors=[taskboard.js]
- "read-update-bug-author": "BUG: Author Extraction Picks Up Garbage Text" | kind=entity | source=READ_UPDATE_REPORT.md | neighbors=[Read & Update Feature — SOP Content Ext…]
- "read-update-bug-sections": "BUG: Purpose and Scope Sections Not Extracted" | kind=entity | source=READ_UPDATE_REPORT.md | neighbors=[Read & Update Feature — SOP Content Ext…]
- "scripts_seed_audit_checklist_checklistitems": "checklistItems" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L32 | neighbors=[seed-audit-checklist.js]
- "scripts_seed_audit_checklist_db": "db" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L17 | neighbors=[seed-audit-checklist.js]
- "scripts_seed_audit_checklist_dirname": "__dirname" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L12 | neighbors=[seed-audit-checklist.js]
- "scripts_seed_audit_checklist_getitemstatus": "getItemStatus()" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L166 | neighbors=[seed-audit-checklist.js]
- "scripts_seed_audit_checklist_seed": "seed()" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L174 | neighbors=[seed-audit-checklist.js]
- "scripts_seed_audit_checklist_sopid": "sopId()" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L26 | neighbors=[seed-audit-checklist.js]
- "services_auditservice_auditserviceimpl_gethistory": ".getHistory()" | kind=code-symbol | source=server/src/services/AuditService.js:L133 | neighbors=[AuditServiceImpl]
- "services_auditservice_auditserviceimpl_getrecentactivity": ".getRecentActivity()" | kind=code-symbol | source=server/src/services/AuditService.js:L152 | neighbors=[AuditServiceImpl]
- "services_eventbus_eventbusimpl_constructor": ".constructor()" | kind=code-symbol | source=server/src/services/EventBus.js:L33 | neighbors=[EventBusImpl]
- "services_eventbus_eventbusimpl_history": ".history()" | kind=code-symbol | source=server/src/services/EventBus.js:L98 | neighbors=[EventBusImpl]
- "services_eventbus_eventbusimpl_listenercounts": ".listenerCounts()" | kind=code-symbol | source=server/src/services/EventBus.js:L107 | neighbors=[EventBusImpl]
- "services_eventbus_eventbusimpl_off": ".off()" | kind=code-symbol | source=server/src/services/EventBus.js:L62 | neighbors=[EventBusImpl]
- "services_eventbus_eventbusimpl_on": ".on()" | kind=code-symbol | source=server/src/services/EventBus.js:L46 | neighbors=[EventBusImpl]
- "services_eventbus_eventbusimpl_reset": ".reset()" | kind=code-symbol | source=server/src/services/EventBus.js:L116 | neighbors=[EventBusImpl]
- "services_workflowservice_batch_workflow": "BATCH_WORKFLOW" | kind=code-symbol | source=server/src/services/WorkflowService.js:L84 | neighbors=[WorkflowService.js]
- "services_workflowservice_capa_workflow": "CAPA_WORKFLOW" | kind=code-symbol | source=server/src/services/WorkflowService.js:L101 | neighbors=[WorkflowService.js]
- "services_workflowservice_change_request_workflow": "CHANGE_REQUEST_WORKFLOW" | kind=code-symbol | source=server/src/services/WorkflowService.js:L124 | neighbors=[WorkflowService.js]
- "services_workflowservice_deviation_workflow": "DEVIATION_WORKFLOW" | kind=code-symbol | source=server/src/services/WorkflowService.js:L113 | neighbors=[WorkflowService.js]
- "services_workflowservice_requiresapprover": "requiresApprover()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L75 | neighbors=[WorkflowService.js]
- "services_workflowservice_requiresqcpass": "requiresQCPass()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L45 | neighbors=[WorkflowService.js]
- "services_workflowservice_requiresverification": "requiresVerification()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L60 | neighbors=[WorkflowService.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-071.json

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
