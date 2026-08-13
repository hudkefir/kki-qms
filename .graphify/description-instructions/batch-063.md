# Node Description Batch 64 of 77

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

- "migrations_35_sop_categories": "35-sop-categories.sql" | kind=code-symbol | source=server/src/migrations/35-sop-categories.sql:L1 | neighbors=[sop_categories]
- "migrations_35_sop_categories_sop_categories": "sop_categories" | kind=code-symbol | source=server/src/migrations/35-sop-categories.sql:L8 | neighbors=[35-sop-categories.sql]
- "pages_analytics_chart_borders": "CHART_BORDERS" | kind=code-symbol | source=client/src/pages/Analytics.jsx:L28 | neighbors=[Analytics.jsx]
- "pages_analytics_chart_colors": "CHART_COLORS" | kind=code-symbol | source=client/src/pages/Analytics.jsx:L17 | neighbors=[Analytics.jsx]
- "pages_auditlogs_action_colors": "ACTION_COLORS" | kind=code-symbol | source=client/src/pages/AuditLogs.jsx:L4 | neighbors=[AuditLogs.jsx]
- "pages_auditlogs_auditlogs": "AuditLogs()" | kind=code-symbol | source=client/src/pages/AuditLogs.jsx:L48 | neighbors=[AuditLogs.jsx]
- "pages_auditprep_audit_statuses": "AUDIT_STATUSES" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L24 | neighbors=[AuditPrep.jsx]
- "pages_auditprep_statusdot": "StatusDot()" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L573 | neighbors=[AuditPrep.jsx]
- "pages_auditprep_trafficlight": "TrafficLight()" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L578 | neighbors=[AuditPrep.jsx]
- "pages_batchtestdetail_category_labels": "CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L88 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_category_order": "CATEGORY_ORDER" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L98 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_getcategorystatus": "getCategoryStatus()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L139 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_getresultbg": "getResultBg()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L120 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_getresultcolor": "getResultColor()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L100 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_profile_labels": "PROFILE_LABELS" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L81 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L13 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L20 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtestdetail_test_display": "TEST_DISPLAY" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L28 | neighbors=[BatchTestDetail.jsx]
- "pages_batchtesting_batchtesting": "BatchTesting()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L280 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_category_labels": "CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L33 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_category_order": "CATEGORY_ORDER" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L43 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_getcategorystatus": "getCategoryStatus()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L85 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_getresultbg": "getResultBg()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L66 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_getresultcolor": "getResultColor()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L45 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_profile_labels": "PROFILE_LABELS" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L26 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L12 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L19 | neighbors=[BatchTesting.jsx]
- "pages_batchtesting_working_batchtesting": "BatchTesting()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L277 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_category_labels": "CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L30 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_category_order": "CATEGORY_ORDER" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L40 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_getcategorystatus": "getCategoryStatus()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L82 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_getresultbg": "getResultBg()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L63 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_getresultcolor": "getResultColor()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L42 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_profile_labels": "PROFILE_LABELS" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L23 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L11 | neighbors=[BatchTesting-working.jsx]
- "pages_batchtesting_working_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L17 | neighbors=[BatchTesting-working.jsx]
- "pages_capadetail_action_status_colors": "ACTION_STATUS_COLORS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L287 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_action_status_next": "ACTION_STATUS_NEXT" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L294 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_actionitemnotes": "ActionItemNotes()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L300 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_actionitemssection": "ActionItemsSection()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L371 | neighbors=[CAPADetail.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-063.json

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
