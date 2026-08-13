# Node Description Batch 74 of 77

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

- "src_migrate_filename": "__filename" | kind=code-symbol | source=server/src/migrate.js:L6 | neighbors=[migrate.js]
- "src_requestlogger_dirname": "__dirname" | kind=code-symbol | source=server/src/requestLogger.js:L5 | neighbors=[requestLogger.js]
- "src_requestlogger_log_dir": "LOG_DIR" | kind=code-symbol | source=server/src/requestLogger.js:L6 | neighbors=[requestLogger.js]
- "src_smoketest_critical_endpoints": "CRITICAL_ENDPOINTS" | kind=code-symbol | source=server/src/smokeTest.js:L16 | neighbors=[smokeTest.js]
- "src_smoketest_ismainmodule": "isMainModule" | kind=code-symbol | source=server/src/smokeTest.js:L159 | neighbors=[smokeTest.js]
- "src_sopcontentreader_field_keywords": "FIELD_KEYWORDS" | kind=code-symbol | source=server/src/sopContentReader.js:L40 | neighbors=[sopContentReader.js]
- "src_sopcontentreader_heading_to_field": "HEADING_TO_FIELD" | kind=code-symbol | source=server/src/sopContentReader.js:L21 | neighbors=[sopContentReader.js]
- "src_sopcontentreader_version_patterns": "VERSION_PATTERNS" | kind=code-symbol | source=server/src/sopContentReader.js:L49 | neighbors=[sopContentReader.js]
- "src_sopdocumentrepair_getsopdocumentstatus": "getSOPDocumentStatus()" | kind=code-symbol | source=server/src/sopDocumentRepair.js:L94 | neighbors=[sopDocumentRepair.js]
- "src_sopparse_months": "MONTHS" | kind=code-symbol | source=server/src/sopParse.js:L26 | neighbors=[sopParse.js]
- "src_sqlite_backup_20260428_000033_adminroutes_auditeddelete": "auditedDelete()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/adminRoutes.js:L49 | neighbors=[adminRoutes.js]
- "src_sqlite_backup_20260428_000033_adminroutes_auditedupdate": "auditedUpdate()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/adminRoutes.js:L14 | neighbors=[adminRoutes.js]
- "src_sqlite_backup_20260428_000033_adminroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/adminRoutes.js:L8 | neighbors=[adminRoutes.js]
- "src_sqlite_backup_20260428_000033_auditroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditRoutes.js:L6 | neighbors=[auditRoutes.js]
- "src_sqlite_backup_20260428_000033_authroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authRoutes.js:L7 | neighbors=[authRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_cfia_micro_tests": "CFIA_MICRO_TESTS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L219 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_coastorage": "coaStorage" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L20 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_coaupload": "coaUpload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L29 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L12 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_fda_tests": "FDA_TESTS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L229 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L11 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_parsecoapdf": "parseCOAPdf()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L43 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L247 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_routine_tests": "ROUTINE_TESTS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L206 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_test_profiles": "TEST_PROFILES" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L238 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_batchtestroutes_uploadsdir": "uploadsDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L15 | neighbors=[batchTestRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_capastorage": "capaStorage" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L19 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_capaupload": "capaUpload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L28 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_capauploadsdir": "capaUploadsDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L16 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_dirname_cc": "__dirname_cc" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L13 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_filename_cc": "__filename_cc" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L12 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_nextid": "nextId()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L55 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L39 | neighbors=[changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_complaintroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/complaintRoutes.js:L8 | neighbors=[complaintRoutes.js]
- "src_sqlite_backup_20260428_000033_dailytaskroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/dailyTaskRoutes.js:L6 | neighbors=[dailyTaskRoutes.js]
- "src_sqlite_backup_20260428_000033_database_batchtestnewcols": "batchTestNewCols" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L456 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_category_colors": "CATEGORY_COLORS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L813 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_db": "db" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L16 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_dbpath": "dbPath" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L15 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L8 | neighbors=[database.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-073.json

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
