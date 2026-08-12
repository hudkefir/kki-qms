# Node Description Batch 75 of 77

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

- "src_sqlite_backup_20260428_000033_database_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L7 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_getdb": "getDb()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L1512 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seedcomplaintsandccrs": "seedComplaintsAndCCRs()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L594 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seeddailytasks": "seedDailyTasks()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L766 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seeddailytasktemplates": "seedDailyTaskTemplates()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L822 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seeddatabase": "seedDatabase()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L477 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seedsopforms": "seedSOPForms()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L877 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_seedusers": "seedUsers()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L675 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_sopcontentcolumns": "sopContentColumns" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L411 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_database_userattrcols": "userAttrCols" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L436 | neighbors=[database.js]
- "src_sqlite_backup_20260428_000033_documentroutes_categorydirs": "categoryDirs" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L16 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L11 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L10 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L60 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_storage": "storage" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L37 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_tmpuploaddir": "tmpUploadDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L32 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_documentroutes_upload": "upload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L46 | neighbors=[documentRoutes.js]
- "src_sqlite_backup_20260428_000033_environmentalroutes_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/environmentalRoutes.js:L11 | neighbors=[environmentalRoutes.js]
- "src_sqlite_backup_20260428_000033_environmentalroutes_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/environmentalRoutes.js:L10 | neighbors=[environmentalRoutes.js]
- "src_sqlite_backup_20260428_000033_environmentalroutes_nextrecordnumber": "nextRecordNumber()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/environmentalRoutes.js:L74 | neighbors=[environmentalRoutes.js]
- "src_sqlite_backup_20260428_000033_environmentalroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/environmentalRoutes.js:L12 | neighbors=[environmentalRoutes.js]
- "src_sqlite_backup_20260428_000033_fileroutes_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L12 | neighbors=[fileRoutes.js]
- "src_sqlite_backup_20260428_000033_fileroutes_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L11 | neighbors=[fileRoutes.js]
- "src_sqlite_backup_20260428_000033_fileroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L50 | neighbors=[fileRoutes.js]
- "src_sqlite_backup_20260428_000033_fileroutes_storage": "storage" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L20 | neighbors=[fileRoutes.js]
- "src_sqlite_backup_20260428_000033_fileroutes_upload": "upload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L36 | neighbors=[fileRoutes.js]
- "src_sqlite_backup_20260428_000033_formroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/formRoutes.js:L7 | neighbors=[formRoutes.js]
- "src_sqlite_backup_20260428_000033_index_app": "app" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L37 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_clientdist": "clientDist" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L163 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L35 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L34 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_server": "server" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L38 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_sessiondb": "sessionDb" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L44 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_sqlitestore": "SqliteStore" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L42 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_index_uploadsdir": "uploadsDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L159 | neighbors=[index.js]
- "src_sqlite_backup_20260428_000033_maintenanceroutes_calcnextdue": "calcNextDue()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/maintenanceRoutes.js:L26 | neighbors=[maintenanceRoutes.js]
- "src_sqlite_backup_20260428_000033_maintenanceroutes_nextwonumber": "nextWONumber()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/maintenanceRoutes.js:L11 | neighbors=[maintenanceRoutes.js]
- "src_sqlite_backup_20260428_000033_maintenanceroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/maintenanceRoutes.js:L8 | neighbors=[maintenanceRoutes.js]
- "src_sqlite_backup_20260428_000033_plannerroutes": "plannerRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/plannerRoutes.js:L1 | neighbors=[router]
- "src_sqlite_backup_20260428_000033_plannerroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/plannerRoutes.js:L4 | neighbors=[plannerRoutes.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-074.json

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
