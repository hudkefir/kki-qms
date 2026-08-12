# Node Description Batch 62 of 77

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

- "documents_simpledocs_validcategories": "validCategories" | kind=code-symbol | source=server/src/routes/documents/simpleDocs.js:L13 | neighbors=[simpleDocs.js]
- "env-example": ".env.example — Environment Variables Documentation" | kind=entity | source=.env.example | neighbors=[Backend: Express + PostgreSQL (Supabase)]
- "gcp-service-account": "GCP Service Account — github-deploy for Cloud Run" | kind=entity | source=.github/CICD-SETUP.md | neighbors=[CI/CD: GitHub Actions Auto-Deploy]
- "hooks_useauth_authcontext": "AuthContext" | kind=code-symbol | source=client/src/hooks/useAuth.jsx:L3 | neighbors=[useAuth.jsx]
- "hooks_usewebsocket_usewebsocket": "useWebSocket()" | kind=code-symbol | source=client/src/hooks/useWebSocket.js:L3 | neighbors=[useWebSocket.js]
- "inventory_items_mutable_fields": "MUTABLE_FIELDS" | kind=code-symbol | source=server/src/routes/inventory/items.js:L42 | neighbors=[items.js]
- "inventory_items_router": "router" | kind=code-symbol | source=server/src/routes/inventory/items.js:L19 | neighbors=[items.js]
- "inventory_items_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/inventory/items.js:L26 | neighbors=[items.js]
- "inventory_items_valid_item_types": "VALID_ITEM_TYPES" | kind=code-symbol | source=server/src/routes/inventory/items.js:L34 | neighbors=[items.js]
- "inventory_lots_allowed_transitions": "ALLOWED_TRANSITIONS" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L50 | neighbors=[lots.js]
- "inventory_lots_mutable_fields": "MUTABLE_FIELDS" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L61 | neighbors=[lots.js]
- "inventory_lots_router": "router" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L20 | neighbors=[lots.js]
- "inventory_lots_userctx": "userCtx()" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L27 | neighbors=[lots.js]
- "inventory_lots_valid_lot_types": "VALID_LOT_TYPES" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L35 | neighbors=[lots.js]
- "inventory_lots_valid_qa_statuses": "VALID_QA_STATUSES" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L38 | neighbors=[lots.js]
- "inventory_picks_router": "router" | kind=code-symbol | source=server/src/routes/inventory/picks.js:L11 | neighbors=[picks.js]
- "inventory_sos_cache": "cache" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L11 | neighbors=[sos.js]
- "inventory_sos_getcached": "getCached()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L13 | neighbors=[sos.js]
- "inventory_sos_postrefresh": "postRefresh()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L56 | neighbors=[sos.js]
- "inventory_sos_router": "router" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L4 | neighbors=[sos.js]
- "inventory_sos_setcache": "setCache()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L19 | neighbors=[sos.js]
- "inventory_stock_router": "router" | kind=code-symbol | source=server/src/routes/inventory/stock.js:L6 | neighbors=[stock.js]
- "inventory_stock_sku_catalog": "SKU_CATALOG" | kind=code-symbol | source=server/src/routes/inventory/stock.js:L9 | neighbors=[stock.js]
- "legacy_journal": "journal.js" | kind=code-symbol | source=server/src/routes/legacy/journal.js:L1 | neighbors=[router]
- "legacy_journal_router": "router" | kind=code-symbol | source=server/src/routes/legacy/journal.js:L4 | neighbors=[journal.js]
- "legacy_planner_adjustbatchesforvariance": "adjustBatchesForVariance()" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L703 | neighbors=[planner.js]
- "legacy_planner_computereadydate": "computeReadyDate()" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L129 | neighbors=[planner.js]
- "legacy_planner_init": "init()" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L8 | neighbors=[planner.js]
- "legacy_planner_router": "router" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L5 | neighbors=[planner.js]
- "legacy_planner_safeparse": "safeParse()" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L137 | neighbors=[planner.js]
- "legacy_planner_sku_labels": "SKU_LABELS" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L124 | neighbors=[planner.js]
- "legacy_planner_skus": "SKUS" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L115 | neighbors=[planner.js]
- "license-ip": "License & IP Notice — Proprietary KKI Code" | kind=entity | source=README.md | neighbors=[KKI QMS — Quality Management System]
- "migrations_00_migration_tracking": "00-migration-tracking.sql" | kind=code-symbol | source=server/src/migrations/00-migration-tracking.sql:L1 | neighbors=[schema_migrations]
- "migrations_00_migration_tracking_schema_migrations": "schema_migrations" | kind=code-symbol | source=server/src/migrations/00-migration-tracking.sql:L3 | neighbors=[00-migration-tracking.sql]
- "migrations_01_core_audit_logs": "audit_logs" | kind=code-symbol | source=server/src/migrations/01-core.sql:L19 | neighbors=[01-core.sql]
- "migrations_01_core_documents": "documents" | kind=code-symbol | source=server/src/migrations/01-core.sql:L36 | neighbors=[01-core.sql]
- "migrations_01_core_qms_record_links": "qms_record_links" | kind=code-symbol | source=server/src/migrations/01-core.sql:L58 | neighbors=[01-core.sql]
- "migrations_01_core_sessions": "sessions" | kind=code-symbol | source=server/src/migrations/01-core.sql:L13 | neighbors=[01-core.sql]
- "migrations_01_core_users": "users" | kind=code-symbol | source=server/src/migrations/01-core.sql:L2 | neighbors=[01-core.sql]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-061.json

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
