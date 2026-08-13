# Node Description Batch 71 of 77

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

- "production_productiondashboard_badge": "Badge()" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L36 | neighbors=[ProductionDashboard.jsx]
- "production_productiondashboard_fermentation_status_styles": "FERMENTATION_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L10 | neighbors=[ProductionDashboard.jsx]
- "production_productiondashboard_order_status_styles": "ORDER_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L18 | neighbors=[ProductionDashboard.jsx]
- "production_productiondashboard_productiondashboard": "ProductionDashboard()" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L45 | neighbors=[ProductionDashboard.jsx]
- "production_productiondashboard_task_status_styles": "TASK_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L30 | neighbors=[ProductionDashboard.jsx]
- "production_productionorders_next_states": "NEXT_STATES" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L25 | neighbors=[ProductionOrders.jsx]
- "production_productionorders_productionorders": "ProductionOrders()" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L45 | neighbors=[ProductionOrders.jsx]
- "production_productionorders_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L7 | neighbors=[ProductionOrders.jsx]
- "production_productionorders_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L12 | neighbors=[ProductionOrders.jsx]
- "production_productionorders_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L37 | neighbors=[ProductionOrders.jsx]
- "production_productiontaskboard_productiontaskboard": "ProductionTaskboard()" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L25 | neighbors=[ProductionTaskboard.jsx]
- "production_productiontaskboard_section_options": "SECTION_OPTIONS" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L14 | neighbors=[ProductionTaskboard.jsx]
- "production_productiontaskboard_section_order": "SECTION_ORDER" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L15 | neighbors=[ProductionTaskboard.jsx]
- "production_productiontaskboard_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L7 | neighbors=[ProductionTaskboard.jsx]
- "production_productiontaskboard_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L8 | neighbors=[ProductionTaskboard.jsx]
- "production_productiontaskboard_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L17 | neighbors=[ProductionTaskboard.jsx]
- "production_taskboard_fields": "FIELDS" | kind=code-symbol | source=server/src/routes/production/taskboard.js:L10 | neighbors=[taskboard.js]
- "production_taskboard_router": "router" | kind=code-symbol | source=server/src/routes/production/taskboard.js:L8 | neighbors=[taskboard.js]
- "production_taskboard_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/taskboard.js:L13 | neighbors=[taskboard.js]
- "production_taskboard_valid_statuses": "VALID_STATUSES" | kind=code-symbol | source=server/src/routes/production/taskboard.js:L11 | neighbors=[taskboard.js]
- "qms-maintenance-plan": "QMS System Maintenance & Monitoring Plan" | kind=entity | source=QMS_MAINTENANCE_PLAN.md | neighbors=[KKI QMS — Quality Management System]
- "qms-system-assessment": "QMS System Assessment — Fully Operational & Monitored" | kind=entity | source=QMS_SYSTEM_ASSESSMENT.md | neighbors=[KKI QMS — Quality Management System]
- "quality_batchtests_cfia_micro_tests": "CFIA_MICRO_TESTS" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L203 | neighbors=[batchTests.js]
- "quality_batchtests_coaupload": "coaUpload" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L13 | neighbors=[batchTests.js]
- "quality_batchtests_fda_tests": "FDA_TESTS" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L213 | neighbors=[batchTests.js]
- "quality_batchtests_parsecoapdf": "parseCOAPdf()" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L27 | neighbors=[batchTests.js]
- "quality_batchtests_router": "router" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L231 | neighbors=[batchTests.js]
- "quality_batchtests_routine_tests": "ROUTINE_TESTS" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L190 | neighbors=[batchTests.js]
- "quality_batchtests_test_profiles": "TEST_PROFILES" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L222 | neighbors=[batchTests.js]
- "quality_changecontrols_adddeviationsystemcomment": "addDeviationSystemComment()" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L675 | neighbors=[changeControls.js]
- "quality_changecontrols_capaupload": "capaUpload" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L11 | neighbors=[changeControls.js]
- "quality_changecontrols_deviationupload": "deviationUpload" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L22 | neighbors=[changeControls.js]
- "quality_changecontrols_nextid": "nextId()" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L90 | neighbors=[changeControls.js]
- "quality_changecontrols_router": "router" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L33 | neighbors=[changeControls.js]
- "quality_complaints_router": "router" | kind=code-symbol | source=server/src/routes/quality/complaints.js:L8 | neighbors=[complaints.js]
- "quality_dailytasks_router": "router" | kind=code-symbol | source=server/src/routes/quality/dailyTasks.js:L6 | neighbors=[dailyTasks.js]
- "quality_dashboard_router": "router" | kind=code-symbol | source=server/src/routes/quality/dashboard.js:L11 | neighbors=[dashboard.js]
- "quality_dashboard_slugifycategory": "slugifyCategory()" | kind=code-symbol | source=server/src/routes/quality/dashboard.js:L259 | neighbors=[dashboard.js]
- "quality_environmental_nextrecordnumber": "nextRecordNumber()" | kind=code-symbol | source=server/src/routes/quality/environmental.js:L67 | neighbors=[environmental.js]
- "quality_environmental_router": "router" | kind=code-symbol | source=server/src/routes/quality/environmental.js:L5 | neighbors=[environmental.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-070.json

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
