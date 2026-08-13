# Node Description Batch 30 of 77

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

- "pages_plannerpodetail_plannerpodetail": "PlannerPODetail()" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L38 | neighbors=[PlannerPODetail.jsx, formatDate(), formatDateTime()]
- "pages_sopdetail_previewnextversion": "previewNextVersion()" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L62 | neighbors=[SOPDetail.jsx, previewMajor(), previewMinor()]
- "planner-migration-task": "Production Planner Migration to QMS React+Supabase" | kind=entity | source=claude-planner-prompt.txt | neighbors=[KKI QMS — Quality Management System, Production Planner Reference — Standalo…, Supabase PostgreSQL — Production Databa…]
- "quality_links": "links.js" | kind=code-symbol | source=server/src/routes/quality/links.js:L1 | neighbors=[getRecordInfo(), router, logAudit()]
- "read-update-feature": "Read & Update Feature — SOP Content Extraction" | kind=entity | source=READ_UPDATE_REPORT.md | neighbors=[BUG: Author Extraction Picks Up Garbage…, BUG: Purpose and Scope Sections Not Ext…, Backend: Express + PostgreSQL (Supabase)]
- "services_auditservice_auditserviceimpl_logmutation": ".logMutation()" | kind=code-symbol | source=server/src/services/AuditService.js:L85 | neighbors=[AuditServiceImpl, diff(), safeStringify()]
- "services_index": "index.js" | kind=code-symbol | source=server/src/services/index.js:L1 | neighbors=[AuditService, EventBus, WorkflowService]
- "shared_diagnostics_deployverifyhandler": "deployVerifyHandler()" | kind=code-symbol | source=server/src/routes/shared/diagnostics.js:L184 | neighbors=[diagnostics.js, _deployVerify(), index.js]
- "src_auditmiddleware": "auditMiddleware.js" | kind=code-symbol | source=server/src/auditMiddleware.js:L1 | neighbors=[auditApiMiddleware(), logAudit(), sanitizeForLog()]
- "src_authmiddleware_requirecontentaccess": "requireContentAccess()" | kind=code-symbol | source=server/src/authMiddleware.js:L41 | neighbors=[operatorTasks.js, changeControls.js, authMiddleware.js]
- "src_database_pg_checkdbhealth": "checkDbHealth()" | kind=code-symbol | source=server/src/database-pg.js:L160 | neighbors=[diagnostics.js, database-pg.js, index.js]
- "src_main": "main.jsx" | kind=code-symbol | source=client/src/main.jsx:L1 | neighbors=[useAuth.jsx, AuthProvider(), App.jsx]
- "src_migrate_runmigrations": "runMigrations()" | kind=code-symbol | source=server/src/migrate.js:L23 | neighbors=[database-pg.js, migrate.js, checksum()]
- "src_requestlogger_logfile": "logFile()" | kind=code-symbol | source=server/src/requestLogger.js:L16 | neighbors=[requestLogger.js, pad(), requestLogger()]
- "src_requestlogger_pad": "pad()" | kind=code-symbol | source=server/src/requestLogger.js:L9 | neighbors=[requestLogger.js, logFile(), stamp()]
- "src_requestlogger_stamp": "stamp()" | kind=code-symbol | source=server/src/requestLogger.js:L11 | neighbors=[requestLogger.js, requestLogger(), pad()]
- "src_sanitize": "sanitize.js" | kind=code-symbol | source=server/src/sanitize.js:L1 | neighbors=[sanitizeBody(), sanitizeFilename(), stripHtml()]
- "src_sanitize_sanitizefilename": "sanitizeFilename()" | kind=code-symbol | source=server/src/sanitize.js:L34 | neighbors=[files.js, simpleDocs.js, sanitize.js]
- "src_smoketest": "smokeTest.js" | kind=code-symbol | source=server/src/smokeTest.js:L1 | neighbors=[CRITICAL_ENDPOINTS, isMainModule, runSmokeTests()]
- "src_sopcontentreader_extractauthorfromhtml": "extractAuthorFromHtml()" | kind=code-symbol | source=server/src/sopContentReader.js:L283 | neighbors=[sopContentReader.js, readSOPContent(), readSOPContentFromBuffer()]
- "src_sopcontentreader_extractversionfromfilename": "extractVersionFromFilename()" | kind=code-symbol | source=server/src/sopContentReader.js:L404 | neighbors=[sopContentReader.js, readSOPContent(), readSOPContentFromBuffer()]
- "src_sopcontentreader_extractversionfromhtml": "extractVersionFromHtml()" | kind=code-symbol | source=server/src/sopContentReader.js:L261 | neighbors=[sopContentReader.js, readSOPContent(), readSOPContentFromBuffer()]
- "src_sopcontentreader_htmltotext": "htmlToText()" | kind=code-symbol | source=server/src/sopContentReader.js:L164 | neighbors=[sopContentReader.js, tableToText(), parseHtmlSections()]
- "src_sopcontentreader_previewsopupdates": "previewSOPUpdates()" | kind=code-symbol | source=server/src/sopContentReader.js:L422 | neighbors=[dashboard.js, sopContentReader.js, generateSOPDescription()]
- "src_sopparse_extractheadertable": "extractHeaderTable()" | kind=code-symbol | source=server/src/sopParse.js:L55 | neighbors=[sopParse.js, normLabel(), parseSOPDocx()]
- "src_sopparse_isplaceholder": "isPlaceholder()" | kind=code-symbol | source=server/src/sopParse.js:L91 | neighbors=[sopParse.js, normalizeDate(), parseSOPDocx()]
- "src_sopparse_normalizedate": "normalizeDate()" | kind=code-symbol | source=server/src/sopParse.js:L101 | neighbors=[sopParse.js, isPlaceholder(), parseSOPDocx()]
- "src_sqlite_backup_20260428_000033_auditmiddleware": "auditMiddleware.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditMiddleware.js:L1 | neighbors=[auditApiMiddleware(), logAudit(), sanitizeForLog()]
- "src_sqlite_backup_20260428_000033_requestlogger_logfile": "logFile()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L16 | neighbors=[requestLogger.js, pad(), requestLogger()]
- "src_sqlite_backup_20260428_000033_requestlogger_pad": "pad()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L9 | neighbors=[requestLogger.js, logFile(), stamp()]
- "src_sqlite_backup_20260428_000033_requestlogger_stamp": "stamp()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L11 | neighbors=[requestLogger.js, requestLogger(), pad()]
- "src_sqlite_backup_20260428_000033_sanitize": "sanitize.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sanitize.js:L1 | neighbors=[sanitizeBody(), sanitizeFilename(), stripHtml()]
- "src_sqlite_backup_20260428_000033_sanitize_sanitizefilename": "sanitizeFilename()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sanitize.js:L34 | neighbors=[fileRoutes.js, sanitize.js, simpleDocRoutes.js]
- "src_sqlite_backup_20260428_000033_sopcontentreader_findfield": "findField()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L239 | neighbors=[sopContentReader.js, formatText(), readSOPContent()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_htmltotext": "htmlToText()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L164 | neighbors=[sopContentReader.js, tableToText(), parseHtmlSections()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_parsehtmlsections": "parseHtmlSections()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L60 | neighbors=[sopContentReader.js, htmlToText(), readSOPContent()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_previewsopupdates": "previewSOPUpdates()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L367 | neighbors=[routes.js, sopContentReader.js, generateSOPDescription()]
- "src_sqlite_backup_20260428_000033_validateid": "validateId.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/validateId.js:L1 | neighbors=[validateId, validateIdAndAction, validateNumericParams()]
- "src_validateid": "validateId.js" | kind=code-symbol | source=server/src/validateId.js:L1 | neighbors=[validateId, validateIdAndAction, validateNumericParams()]
- "admin_suppliers_infersuppliertype": "inferSupplierType()" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L116 | neighbors=[suppliers.js, seedChecklistForSupplier()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-029.json

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
