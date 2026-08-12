# Node Description Batch 70 of 77

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

- "pages_workorderdetail_workorderdetail": "WorkOrderDetail()" | kind=code-symbol | source=client/src/pages/WorkOrderDetail.jsx:L18 | neighbors=[WorkOrderDetail.jsx]
- "pending-tasks": "KKI Pending Tasks — Veronica's Labels Task" | kind=entity | source=PENDING_TASKS.md | neighbors=[Hudson Liao — Project Owner]
- "planner-reference": "Production Planner Reference — Standalone HTML App" | kind=code-symbol | source=planner-source-reference.html | neighbors=[Production Planner Migration to QMS Rea…]
- "production_boms_bom_fields": "BOM_FIELDS" | kind=code-symbol | source=server/src/routes/production/boms.js:L10 | neighbors=[boms.js]
- "production_boms_bomdetailrow": "BOMDetailRow()" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L183 | neighbors=[boms.js]
- "production_boms_boms": "BOMs()" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L25 | neighbors=[boms.js]
- "production_boms_item_types": "ITEM_TYPES" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L14 | neighbors=[boms.js]
- "production_boms_line_fields": "LINE_FIELDS" | kind=code-symbol | source=server/src/routes/production/boms.js:L11 | neighbors=[boms.js]
- "production_boms_router": "router" | kind=code-symbol | source=server/src/routes/production/boms.js:L8 | neighbors=[boms.js]
- "production_boms_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L7 | neighbors=[boms.js]
- "production_boms_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L8 | neighbors=[boms.js]
- "production_boms_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L17 | neighbors=[boms.js]
- "production_boms_units": "UNITS" | kind=code-symbol | source=client/src/pages/production/BOMs.jsx:L15 | neighbors=[boms.js]
- "production_boms_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/boms.js:L14 | neighbors=[boms.js]
- "production_boms_valid_statuses": "VALID_STATUSES" | kind=code-symbol | source=server/src/routes/production/boms.js:L12 | neighbors=[boms.js]
- "production_dashboard": "dashboard.js" | kind=code-symbol | source=server/src/routes/production/dashboard.js:L1 | neighbors=[router]
- "production_dashboard_router": "router" | kind=code-symbol | source=server/src/routes/production/dashboard.js:L4 | neighbors=[dashboard.js]
- "production_fermentation_fields": "FIELDS" | kind=code-symbol | source=server/src/routes/production/fermentation.js:L25 | neighbors=[fermentation.js]
- "production_fermentation_router": "router" | kind=code-symbol | source=server/src/routes/production/fermentation.js:L8 | neighbors=[fermentation.js]
- "production_fermentation_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/fermentation.js:L31 | neighbors=[fermentation.js]
- "production_fermentationschedule_fermentationschedule": "FermentationSchedule()" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L33 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_field": "Field()" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L290 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_input": "Input()" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L280 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_next_status_map": "NEXT_STATUS_MAP" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L25 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L7 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L9 | neighbors=[FermentationSchedule.jsx]
- "production_fermentationschedule_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L17 | neighbors=[FermentationSchedule.jsx]
- "production_flavouring_fields": "FIELDS" | kind=code-symbol | source=server/src/routes/production/flavouring.js:L10 | neighbors=[flavouring.js]
- "production_flavouring_router": "router" | kind=code-symbol | source=server/src/routes/production/flavouring.js:L8 | neighbors=[flavouring.js]
- "production_flavouring_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/flavouring.js:L15 | neighbors=[flavouring.js]
- "production_index": "index.js" | kind=code-symbol | source=server/src/routes/production/index.js:L1 | neighbors=[router]
- "production_index_router": "router" | kind=code-symbol | source=server/src/routes/production/index.js:L10 | neighbors=[index.js]
- "production_orders_fields": "FIELDS" | kind=code-symbol | source=server/src/routes/production/orders.js:L33 | neighbors=[orders.js]
- "production_orders_nextordernumber": "nextOrderNumber()" | kind=code-symbol | source=server/src/routes/production/orders.js:L49 | neighbors=[orders.js]
- "production_orders_router": "router" | kind=code-symbol | source=server/src/routes/production/orders.js:L8 | neighbors=[orders.js]
- "production_orders_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/orders.js:L38 | neighbors=[orders.js]
- "production_pouringschedule_pouringschedule": "PouringSchedule()" | kind=code-symbol | source=client/src/pages/production/PouringSchedule.jsx:L7 | neighbors=[PouringSchedule.jsx]
- "production_pours_fields": "FIELDS" | kind=code-symbol | source=server/src/routes/production/pours.js:L10 | neighbors=[pours.js]
- "production_pours_router": "router" | kind=code-symbol | source=server/src/routes/production/pours.js:L8 | neighbors=[pours.js]
- "production_pours_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/production/pours.js:L15 | neighbors=[pours.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-069.json

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
