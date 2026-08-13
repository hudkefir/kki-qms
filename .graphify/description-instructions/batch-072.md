# Node Description Batch 73 of 77

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

- "services_workflowservice_workflowserviceimpl_constructor": ".constructor()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L140 | neighbors=[WorkflowServiceImpl]
- "services_workflowservice_workflowserviceimpl_getavailabletransitions": ".getAvailableTransitions()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L180 | neighbors=[WorkflowServiceImpl]
- "services_workflowservice_workflowserviceimpl_getworkflow": ".getWorkflow()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L170 | neighbors=[WorkflowServiceImpl]
- "services_workflowservice_workflowserviceimpl_registerworkflow": ".registerWorkflow()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L149 | neighbors=[WorkflowServiceImpl]
- "services_workflowservice_workflowserviceimpl_transition": ".transition()" | kind=code-symbol | source=server/src/services/WorkflowService.js:L198 | neighbors=[WorkflowServiceImpl]
- "shared_ai_ai_tools": "AI_TOOLS" | kind=code-symbol | source=server/src/routes/shared/ai.js:L70 | neighbors=[ai.js]
- "shared_ai_chatsessions": "chatSessions" | kind=code-symbol | source=server/src/routes/shared/ai.js:L1229 | neighbors=[ai.js]
- "shared_ai_editable_fields": "EDITABLE_FIELDS" | kind=code-symbol | source=server/src/routes/shared/ai.js:L48 | neighbors=[ai.js]
- "shared_ai_field_prompts": "FIELD_PROMPTS" | kind=code-symbol | source=server/src/routes/shared/ai.js:L1872 | neighbors=[ai.js]
- "shared_ai_link_type_table_map": "LINK_TYPE_TABLE_MAP" | kind=code-symbol | source=server/src/routes/shared/ai.js:L22 | neighbors=[ai.js]
- "shared_ai_record_table_map": "RECORD_TABLE_MAP" | kind=code-symbol | source=server/src/routes/shared/ai.js:L12 | neighbors=[ai.js]
- "shared_ai_record_type_to_link_type": "RECORD_TYPE_TO_LINK_TYPE" | kind=code-symbol | source=server/src/routes/shared/ai.js:L31 | neighbors=[ai.js]
- "shared_ai_router": "router" | kind=code-symbol | source=server/src/routes/shared/ai.js:L8 | neighbors=[ai.js]
- "shared_aichat": "aiChat.js" | kind=code-symbol | source=server/src/routes/shared/aiChat.js:L1 | neighbors=[router]
- "shared_aichat_router": "router" | kind=code-symbol | source=server/src/routes/shared/aiChat.js:L4 | neighbors=[aiChat.js]
- "shared_audit_router": "router" | kind=code-symbol | source=server/src/routes/shared/audit.js:L6 | neighbors=[audit.js]
- "shared_diagnostics_router": "router" | kind=code-symbol | source=server/src/routes/shared/diagnostics.js:L6 | neighbors=[diagnostics.js]
- "shared_diagnostics_server_start_time": "SERVER_START_TIME" | kind=code-symbol | source=server/src/routes/shared/diagnostics.js:L7 | neighbors=[diagnostics.js]
- "shared_email": "email.js" | kind=code-symbol | source=server/src/routes/shared/email.js:L1 | neighbors=[router]
- "shared_email_router": "router" | kind=code-symbol | source=server/src/routes/shared/email.js:L3 | neighbors=[email.js]
- "soul-identity": "SOUL.md — Agent Identity & Core Truths" | kind=entity | source=SOUL.md | neighbors=[AGENTS.md — Agent Workspace & Memory Sy…]
- "src_app_app": "App()" | kind=code-symbol | source=client/src/App.jsx:L92 | neighbors=[App.jsx]
- "src_app_datetimeclock": "DateTimeClock()" | kind=code-symbol | source=client/src/App.jsx:L72 | neighbors=[App.jsx]
- "src_app_role_colors": "ROLE_COLORS" | kind=code-symbol | source=client/src/App.jsx:L65 | neighbors=[App.jsx]
- "src_config_iscloudflarepages": "isCloudflarePages" | kind=code-symbol | source=client/src/config.js:L3 | neighbors=[config.js]
- "src_database_pg_db": "db" | kind=code-symbol | source=server/src/database-pg.js:L63 | neighbors=[database-pg.js]
- "src_database_pg_dirname": "__dirname" | kind=code-symbol | source=server/src/database-pg.js:L8 | neighbors=[database-pg.js]
- "src_database_pg_filename": "__filename" | kind=code-symbol | source=server/src/database-pg.js:L7 | neighbors=[database-pg.js]
- "src_database_pg_flattenparams": "flattenParams()" | kind=code-symbol | source=server/src/database-pg.js:L51 | neighbors=[database-pg.js]
- "src_database_pg_getdb": "getDb()" | kind=code-symbol | source=server/src/database-pg.js:L193 | neighbors=[database-pg.js]
- "src_database_pg_pool": "pool" | kind=code-symbol | source=server/src/database-pg.js:L11 | neighbors=[database-pg.js]
- "src_index_app": "app" | kind=code-symbol | source=server/src/index.js:L62 | neighbors=[index.js]
- "src_index_clientdist": "clientDist" | kind=code-symbol | source=server/src/index.js:L266 | neighbors=[index.js]
- "src_index_dirname": "__dirname" | kind=code-symbol | source=server/src/index.js:L51 | neighbors=[index.js]
- "src_index_filename": "__filename" | kind=code-symbol | source=server/src/index.js:L50 | neighbors=[index.js]
- "src_index_pgstore": "PgStore" | kind=code-symbol | source=server/src/index.js:L67 | neighbors=[index.js]
- "src_index_server": "server" | kind=code-symbol | source=server/src/index.js:L63 | neighbors=[index.js]
- "src_index_uploadsdir": "uploadsDir" | kind=code-symbol | source=server/src/index.js:L262 | neighbors=[index.js]
- "src_index_versioninfo": "versionInfo" | kind=code-symbol | source=server/src/index.js:L54 | neighbors=[index.js]
- "src_migrate_dirname": "__dirname" | kind=code-symbol | source=server/src/migrate.js:L7 | neighbors=[migrate.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-072.json

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
