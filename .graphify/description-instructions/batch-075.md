# Node Description Batch 76 of 77

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

- "src_sqlite_backup_20260428_000033_printroutes_basehtml": "baseHtml()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L35 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_company": "COMPANY" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L16 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_createcapadoc": "createCAPADoc()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L310 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L11 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_filename": "__filename" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L10 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_generatepdf": "generatePdf()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L71 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L12 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_sendpdf": "sendPdf()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L81 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_tmpdir": "tmpDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L13 | neighbors=[printRoutes.js]
- "src_sqlite_backup_20260428_000033_recallroutes_nextcrisisid": "nextCrisisId()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/recallRoutes.js:L39 | neighbors=[recallRoutes.js]
- "src_sqlite_backup_20260428_000033_recallroutes_nextexerciseid": "nextExerciseId()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/recallRoutes.js:L25 | neighbors=[recallRoutes.js]
- "src_sqlite_backup_20260428_000033_recallroutes_nextrecallid": "nextRecallId()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/recallRoutes.js:L11 | neighbors=[recallRoutes.js]
- "src_sqlite_backup_20260428_000033_recallroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/recallRoutes.js:L8 | neighbors=[recallRoutes.js]
- "src_sqlite_backup_20260428_000033_requestlogger_dirname": "__dirname" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L5 | neighbors=[requestLogger.js]
- "src_sqlite_backup_20260428_000033_requestlogger_log_dir": "LOG_DIR" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L6 | neighbors=[requestLogger.js]
- "src_sqlite_backup_20260428_000033_routes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/routes.js:L11 | neighbors=[routes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_categorydirs": "categoryDirs" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L15 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_generatesopdescription": "generateSOPDescription()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L98 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L11 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_storage": "storage" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L39 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_tmpuploaddir": "tmpUploadDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L34 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_simpledocroutes_upload": "upload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L49 | neighbors=[simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_sopcontentreader_field_keywords": "FIELD_KEYWORDS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L40 | neighbors=[sopContentReader.js]
- "src_sqlite_backup_20260428_000033_sopcontentreader_heading_to_field": "HEADING_TO_FIELD" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L21 | neighbors=[sopContentReader.js]
- "src_sqlite_backup_20260428_000033_sopcontentreader_version_patterns": "VERSION_PATTERNS" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L49 | neighbors=[sopContentReader.js]
- "src_sqlite_backup_20260428_000033_sopdocumentrepair_getsopdocumentstatus": "getSOPDocumentStatus()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopDocumentRepair.js:L94 | neighbors=[sopDocumentRepair.js]
- "src_sqlite_backup_20260428_000033_sosroutes_cache": "cache" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L8 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_sosroutes_getcached": "getCached()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L11 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_sosroutes_getsosconfig": "getSOSConfig()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L23 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_sosroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L5 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_sosroutes_setcache": "setCache()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L18 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_sosroutes_sosapifetch": "sosApiFetch()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L33 | neighbors=[sosRoutes.js]
- "src_sqlite_backup_20260428_000033_supplierroutes_dirname_s": "__dirname_s" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L261 | neighbors=[supplierRoutes.js]
- "src_sqlite_backup_20260428_000033_supplierroutes_filename_s": "__filename_s" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L260 | neighbors=[supplierRoutes.js]
- "src_sqlite_backup_20260428_000033_supplierroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L8 | neighbors=[supplierRoutes.js]
- "src_sqlite_backup_20260428_000033_supplierroutes_supplierdocsdir": "supplierDocsDir" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L262 | neighbors=[supplierRoutes.js]
- "src_sqlite_backup_20260428_000033_supplierroutes_supplierupload": "supplierUpload" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L265 | neighbors=[supplierRoutes.js]
- "src_sqlite_backup_20260428_000033_taskboardroutes": "taskboardRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/taskboardRoutes.js:L1 | neighbors=[router]
- "src_sqlite_backup_20260428_000033_taskboardroutes_router": "router" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/taskboardRoutes.js:L5 | neighbors=[taskboardRoutes.js]
- "src_sqlite_backup_20260428_000033_validateid_validateid": "validateId" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/validateId.js:L17 | neighbors=[validateId.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-075.json

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
