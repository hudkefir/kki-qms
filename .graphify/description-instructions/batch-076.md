# Node Description Batch 77 of 77

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

- "src_sqlite_backup_20260428_000033_validateid_validateidandaction": "validateIdAndAction" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/validateId.js:L20 | neighbors=[validateId.js]
- "src_supabase_getsignedurl": "getSignedUrl()" | kind=code-symbol | source=server/src/supabase.js:L69 | neighbors=[supabase.js]
- "src_validateid_validateid": "validateId" | kind=code-symbol | source=server/src/validateId.js:L17 | neighbors=[validateId.js]
- "src_validateid_validateidandaction": "validateIdAndAction" | kind=code-symbol | source=server/src/validateId.js:L20 | neighbors=[validateId.js]
- "src_verify_schema_dirname": "__dirname" | kind=code-symbol | source=server/src/verify-schema.js:L18 | neighbors=[verify-schema.js]
- "src_verify_schema_filename": "__filename" | kind=code-symbol | source=server/src/verify-schema.js:L17 | neighbors=[verify-schema.js]
- "supabase-client": "supabase.js — Supabase Storage Client" | kind=code-symbol | source=server/src/supabase.js | neighbors=[Supabase Storage — Document & File Stor…]
- "ui-bug-dead-buttons": "UI BUG: Dead Buttons — documentRoutes.js Never Mounted" | kind=entity | source=UI_TEST_REPORT.md | neighbors=[Backend: Express + PostgreSQL (Supabase)]
- "ui-bug-field-mismatch": "UI BUG: Field Name Mismatches (costco_status vs costco_cleanup_status)" | kind=entity | source=UI_TEST_REPORT.md | neighbors=[Frontend: React + Vite + TailwindCSS]
- "ui-test-report": "UI Functional Test Report — All Critical Issues Fixed" | kind=entity | source=UI_TEST_REPORT.md | neighbors=[Frontend: React + Vite + TailwindCSS]
- "utils_api_apicall": "apiCall()" | kind=code-symbol | source=client/src/utils/api.js:L4 | neighbors=[api.js]
- "visual-test-report": "Visual Test Report — 12 Pages Tested, All Passed" | kind=entity | source=VISUAL_TEST_REPORT.md | neighbors=[Frontend: React + Vite + TailwindCSS]
- "changelog-build-134": "Build #134 — 2026-06-13: Supplier Document Download/Delete Fixes" | kind=entity | source=CHANGELOG.md
- "changelog-build-136": "Build #136 — 2026-06-14: Supplier Checklist Type-Aware Seeding" | kind=entity | source=CHANGELOG.md
- "client_postcss_config": "postcss.config.js" | kind=code-symbol | source=client/postcss.config.js:L1
- "client_tailwind_config": "tailwind.config.js" | kind=code-symbol | source=client/tailwind.config.js:L1
- "client_vite_config": "vite.config.js" | kind=code-symbol | source=client/vite.config.js:L1
- "gitignore": ".gitignore — Secrets & Build Artifacts" | kind=code-symbol | source=.gitignore
- "migrations_13_rca_structured": "13-rca-structured.sql" | kind=code-symbol | source=server/src/migrations/13-rca-structured.sql:L1
- "migrations_17_archive_flags": "17-archive-flags.sql" | kind=code-symbol | source=server/src/migrations/17-archive-flags.sql:L1
- "migrations_19_sop_approval_gate": "19-sop-approval-gate.sql" | kind=code-symbol | source=server/src/migrations/19-sop-approval-gate.sql:L1
- "migrations_20_sop_approval_backfill": "20-sop-approval-backfill.sql" | kind=code-symbol | source=server/src/migrations/20-sop-approval-backfill.sql:L1
- "migrations_31_add_migration_example": "31-add-migration-example.sql" | kind=code-symbol | source=server/src/migrations/31-add-migration-example.sql:L1
- "migrations_32_drop_sops_increment_version_trigger": "32-drop-sops-increment-version-trigger.sql" | kind=code-symbol | source=server/src/migrations/32-drop-sops-increment-version-trigger.sql:L1
- "migrations_33_sop_files_is_current": "33-sop-files-is-current.sql" | kind=code-symbol | source=server/src/migrations/33-sop-files-is-current.sql:L1
- "routes_index": "index.js" | kind=code-symbol | source=server/src/routes/index.js:L1

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-076.json

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
