# Node Description Batch 46 of 77

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

- "src_migrate_checksum": "checksum()" | kind=code-symbol | source=server/src/migrate.js:L12 | neighbors=[migrate.js, runMigrations()]
- "src_sanitize_striphtml": "stripHtml()" | kind=code-symbol | source=server/src/sanitize.js:L7 | neighbors=[sanitize.js, sanitizeBody()]
- "src_smoketest_runsmoketests": "runSmokeTests()" | kind=code-symbol | source=server/src/smokeTest.js:L38 | neighbors=[diagnostics.js, smokeTest.js]
- "src_sopcontentreader_formattext": "formatText()" | kind=code-symbol | source=server/src/sopContentReader.js:L228 | neighbors=[sopContentReader.js, findField()]
- "src_sopcontentreader_generatesopdescription": "generateSOPDescription()" | kind=code-symbol | source=server/src/sopContentReader.js:L412 | neighbors=[sopContentReader.js, previewSOPUpdates()]
- "src_sopcontentreader_tabletotext": "tableToText()" | kind=code-symbol | source=server/src/sopContentReader.js:L111 | neighbors=[sopContentReader.js, htmlToText()]
- "src_sopdocumentrepair": "sopDocumentRepair.js" | kind=code-symbol | source=server/src/sopDocumentRepair.js:L1 | neighbors=[getSOPDocumentStatus(), repairSOPDocuments()]
- "src_sopdocumentrepair_repairsopdocuments": "repairSOPDocuments()" | kind=code-symbol | source=server/src/sopDocumentRepair.js:L10 | neighbors=[index.js, sopDocumentRepair.js]
- "src_sopparse_celltext": "cellText()" | kind=code-symbol | source=server/src/sopParse.js:L39 | neighbors=[sopParse.js, extractTitle()]
- "src_sopparse_docnumberfromfilename": "docNumberFromFilename()" | kind=code-symbol | source=server/src/sopParse.js:L116 | neighbors=[sopParse.js, parseSOPDocx()]
- "src_sopparse_high": "high()" | kind=code-symbol | source=server/src/sopParse.js:L31 | neighbors=[sopParse.js, parseSOPDocx()]
- "src_sopparse_normlabel": "normLabel()" | kind=code-symbol | source=server/src/sopParse.js:L52 | neighbors=[sopParse.js, extractHeaderTable()]
- "src_sopparse_review": "review()" | kind=code-symbol | source=server/src/sopParse.js:L34 | neighbors=[sopParse.js, parseSOPDocx()]
- "src_sopparse_totitlecase": "toTitleCase()" | kind=code-symbol | source=server/src/sopParse.js:L81 | neighbors=[sopParse.js, extractTitle()]
- "src_sqlite_backup_20260428_000033_auditmiddleware_sanitizeforlog": "sanitizeForLog()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditMiddleware.js:L107 | neighbors=[auditMiddleware.js, auditApiMiddleware()]
- "src_sqlite_backup_20260428_000033_authmiddleware_requirecontentaccess": "requireContentAccess()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authMiddleware.js:L41 | neighbors=[authMiddleware.js, changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes_capahtml": "capaHtml()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L87 | neighbors=[printRoutes.js, statusBadge()]
- "src_sqlite_backup_20260428_000033_printroutes_statusbadge": "statusBadge()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L24 | neighbors=[printRoutes.js, capaHtml()]
- "src_sqlite_backup_20260428_000033_sanitize_striphtml": "stripHtml()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sanitize.js:L7 | neighbors=[sanitize.js, sanitizeBody()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_extractauthorfromhtml": "extractAuthorFromHtml()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L283 | neighbors=[sopContentReader.js, readSOPContent()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_extractversionfromfilename": "extractVersionFromFilename()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L349 | neighbors=[sopContentReader.js, readSOPContent()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_extractversionfromhtml": "extractVersionFromHtml()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L261 | neighbors=[sopContentReader.js, readSOPContent()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_formattext": "formatText()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L228 | neighbors=[sopContentReader.js, findField()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_generatesopdescription": "generateSOPDescription()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L357 | neighbors=[sopContentReader.js, previewSOPUpdates()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_tabletotext": "tableToText()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L111 | neighbors=[sopContentReader.js, htmlToText()]
- "src_sqlite_backup_20260428_000033_sopdocumentrepair": "sopDocumentRepair.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopDocumentRepair.js:L1 | neighbors=[getSOPDocumentStatus(), repairSOPDocuments()]
- "src_sqlite_backup_20260428_000033_sopdocumentrepair_repairsopdocuments": "repairSOPDocuments()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopDocumentRepair.js:L10 | neighbors=[index.js, sopDocumentRepair.js]
- "src_sqlite_backup_20260428_000033_validateid_validatenumericparams": "validateNumericParams()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/validateId.js:L4 | neighbors=[index.js, validateId.js]
- "src_sqlite_backup_20260428_000033_websocket": "websocket.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/websocket.js:L1 | neighbors=[broadcast(), setupWebSocket()]
- "src_sqlite_backup_20260428_000033_websocket_setupwebsocket": "setupWebSocket()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/websocket.js:L5 | neighbors=[index.js, websocket.js]
- "src_validateid_validatenumericparams": "validateNumericParams()" | kind=code-symbol | source=server/src/validateId.js:L4 | neighbors=[index.js, validateId.js]
- "src_verify_schema_getexpectedtables": "getExpectedTables()" | kind=code-symbol | source=server/src/verify-schema.js:L21 | neighbors=[verify-schema.js, verify()]
- "src_verify_schema_verify": "verify()" | kind=code-symbol | source=server/src/verify-schema.js:L36 | neighbors=[verify-schema.js, getExpectedTables()]
- "src_websocket": "websocket.js" | kind=code-symbol | source=server/src/websocket.js:L1 | neighbors=[broadcast(), setupWebSocket()]
- "src_websocket_setupwebsocket": "setupWebSocket()" | kind=code-symbol | source=server/src/websocket.js:L5 | neighbors=[index.js, websocket.js]
- "supabase-storage": "Supabase Storage — Document & File Storage (qms-documents bucket)" | kind=entity | source=README.md | neighbors=[Backend: Express + PostgreSQL (Supabase), supabase.js — Supabase Storage Client]
- "utils_api": "api.js" | kind=code-symbol | source=client/src/utils/api.js:L1 | neighbors=[config, apiCall()]
- "admin_admin_auditeddelete": "auditedDelete()" | kind=code-symbol | source=server/src/routes/admin/admin.js:L49 | neighbors=[admin.js]
- "admin_admin_auditedupdate": "auditedUpdate()" | kind=code-symbol | source=server/src/routes/admin/admin.js:L14 | neighbors=[admin.js]
- "admin_admin_router": "router" | kind=code-symbol | source=server/src/routes/admin/admin.js:L8 | neighbors=[admin.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-045.json

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
