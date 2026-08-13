# Node Description Batch 21 of 77

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

- "backup_backup_qms_upload_and_verify": "upload_and_verify()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L261 | neighbors=[backup_qms.py, backup_one(), _ensure_sa_active(), log()]
- "components_aisuggestbutton": "AiSuggestButton.jsx" | kind=code-symbol | source=client/src/components/AiSuggestButton.jsx:L1 | neighbors=[AiSuggestButton(), CAPADetail.jsx, ComplaintDetail.jsx, DeviationDetail.jsx]
- "deployment-cloud-run": "Deployment: Google Cloud Run (us-east1)" | kind=entity | source=.github/CICD-SETUP.md | neighbors=[Cloudflare Professional QMS Setup Check…, CI/CD: GitHub Actions Auto-Deploy, Dockerfile — Cloud Run Container Config…, KKI QMS — Quality Management System]
- "frontend-stack": "Frontend: React + Vite + TailwindCSS" | kind=entity | source=README.md | neighbors=[KKI QMS — Quality Management System, UI BUG: Field Name Mismatches (costco_s…, UI Functional Test Report — All Critica…, Visual Test Report — 12 Pages Tested, A…]
- "inventory_picks": "picks.js" | kind=code-symbol | source=server/src/routes/inventory/picks.js:L1 | neighbors=[router, sosApiFetch(), logAudit(), requireWriteAccess()]
- "inventory_sos_getaccesstoken": "getAccessToken()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L116 | neighbors=[sos.js, ensureTable(), refreshToken(), sosApiFetch()]
- "inventory_sos_sosapifetch": "sosApiFetch()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L127 | neighbors=[picks.js, sos.js, getAccessToken(), refreshToken()]
- "inventory_stock": "stock.js" | kind=code-symbol | source=server/src/routes/inventory/stock.js:L1 | neighbors=[router, SKU_CATALOG, logAudit(), requireWriteAccess()]
- "migrations_02_sops_sop_forms": "sop_forms" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L70 | neighbors=[02-sops.sql, sop_form_entries, sop_form_fields, sops]
- "migrations_07_equipment_equipment": "equipment" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L2 | neighbors=[07-equipment.sql, pm_completions, pm_schedules, work_orders]
- "pages_capadetail_capadetail": "CAPADetail()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L1538 | neighbors=[CAPADetail.jsx, formatDate(), lifecycleIndex(), statusLabel()]
- "pages_complaints_complaintstatusbadge": "ComplaintStatusBadge()" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L57 | neighbors=[CCRDetail.jsx, ComplaintDetail.jsx, Complaints.jsx, Dashboard.jsx]
- "pages_complaints_severitybadge": "SeverityBadge()" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L49 | neighbors=[CCRDetail.jsx, ComplaintDetail.jsx, Complaints.jsx, Dashboard.jsx]
- "pages_documentguide": "DocumentGuide.jsx" | kind=code-symbol | source=client/src/pages/DocumentGuide.jsx:L1 | neighbors=[DOC_TYPES, DocumentGuide(), STEPS, App.jsx]
- "pages_login": "Login.jsx" | kind=code-symbol | source=client/src/pages/Login.jsx:L1 | neighbors=[useAuth.jsx, useAuth(), Login(), App.jsx]
- "pages_planner_fmt": "fmt()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L41 | neighbors=[Planner.jsx, AddBatchModal(), AddGRPModal(), ScheduleTab()]
- "pages_recallcenter_helptip": "HelpTip()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L115 | neighbors=[CrisisDetail.jsx, RecallCenter.jsx, RecallDetail.jsx, TraceabilityDetail.jsx]
- "pages_recallcenter_helptoggle": "HelpToggle()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L103 | neighbors=[CrisisDetail.jsx, RecallCenter.jsx, RecallDetail.jsx, TraceabilityDetail.jsx]
- "services_auditservice": "AuditService.js" | kind=code-symbol | source=server/src/services/AuditService.js:L1 | neighbors=[AuditService, AuditServiceImpl, diff(), safeStringify()]
- "services_auditservice_auditserviceimpl": "AuditServiceImpl" | kind=code-symbol | source=server/src/services/AuditService.js:L69 | neighbors=[AuditService.js, .getHistory(), .getRecentActivity(), .logMutation()]
- "shared_audit": "audit.js" | kind=code-symbol | source=server/src/routes/shared/audit.js:L1 | neighbors=[router, logAudit(), requireAuth(), requireRole()]
- "src_auditmiddleware_auditapimiddleware": "auditApiMiddleware()" | kind=code-symbol | source=server/src/auditMiddleware.js:L32 | neighbors=[auditMiddleware.js, logAudit(), sanitizeForLog(), index.js]
- "src_authmiddleware": "authMiddleware.js" | kind=code-symbol | source=server/src/authMiddleware.js:L1 | neighbors=[requireAuth(), requireContentAccess(), requireRole(), requireWriteAccess()]
- "src_config": "config.js" | kind=code-symbol | source=client/src/config.js:L1 | neighbors=[BuildVersion.jsx, ChatSidebar.jsx, config, isCloudflarePages]
- "src_migrate": "migrate.js" | kind=code-symbol | source=server/src/migrate.js:L1 | neighbors=[checksum(), __dirname, __filename, runMigrations()]
- "src_requestlogger_requestlogger": "requestLogger()" | kind=code-symbol | source=server/src/requestLogger.js:L21 | neighbors=[index.js, requestLogger.js, logFile(), stamp()]
- "src_sopcontentreader_findfield": "findField()" | kind=code-symbol | source=server/src/sopContentReader.js:L239 | neighbors=[sopContentReader.js, formatText(), readSOPContent(), readSOPContentFromBuffer()]
- "src_sopcontentreader_parsehtmlsections": "parseHtmlSections()" | kind=code-symbol | source=server/src/sopContentReader.js:L60 | neighbors=[sopContentReader.js, htmlToText(), readSOPContent(), readSOPContentFromBuffer()]
- "src_sopparse_extracttitle": "extractTitle()" | kind=code-symbol | source=server/src/sopParse.js:L71 | neighbors=[sopParse.js, cellText(), toTitleCase(), parseSOPDocx()]
- "src_sqlite_backup_20260428_000033_auditmiddleware_auditapimiddleware": "auditApiMiddleware()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditMiddleware.js:L32 | neighbors=[auditMiddleware.js, logAudit(), sanitizeForLog(), index.js]
- "src_sqlite_backup_20260428_000033_auditroutes": "auditRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditRoutes.js:L1 | neighbors=[logAudit(), router, requireAuth(), requireRole()]
- "src_sqlite_backup_20260428_000033_authmiddleware": "authMiddleware.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authMiddleware.js:L1 | neighbors=[requireAuth(), requireContentAccess(), requireRole(), requireWriteAccess()]
- "src_sqlite_backup_20260428_000033_authroutes": "authRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireRole(), router]
- "src_sqlite_backup_20260428_000033_requestlogger_requestlogger": "requestLogger()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L21 | neighbors=[index.js, requestLogger.js, logFile(), stamp()]
- "src_supabase": "supabase.js" | kind=code-symbol | source=server/src/supabase.js:L1 | neighbors=[deleteFile(), downloadFile(), getSignedUrl(), uploadFile()]
- "src_verify_schema": "verify-schema.js" | kind=code-symbol | source=server/src/verify-schema.js:L1 | neighbors=[__dirname, __filename, getExpectedTables(), verify()]
- "supabase-postgres": "Supabase PostgreSQL — Production Database" | kind=entity | source=README.md | neighbors=[Backend: Express + PostgreSQL (Supabase), database-pg.js — PostgreSQL Connection …, Production Planner Migration to QMS Rea…, QMS Upgrade & Stability Plan — Single P…]
- "admin_operators": "operators.js" | kind=code-symbol | source=server/src/routes/admin/operators.js:L1 | neighbors=[computeOverdue(), router, requireAuth()]
- "assets_index_cfxlhkch_5": "_5()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .apply(), getOwnPropertyDescriptor()]
- "assets_index_cfxlhkch_a8": "a8()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, l8(), rz()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-020.json

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
