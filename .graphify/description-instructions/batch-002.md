# Node Description Batch 3 of 77

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

- "assets_index_cfxlhkch_n2_freeze": ".freeze()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[DL(), ks(), ml(), N2(), .parse(), .process()]
- "assets_index_cfxlhkch_n2_stringify": ".stringify()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[cE, cN(), cue(), e9(), Ge, i8()]
- "assets_index_cfxlhkch_zh_lineto": ".lineTo()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[ak(), .point(), Bu(), cx(), Hu, ix()]
- "components_linkeddocuments": "LinkedDocuments.jsx" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L1 | neighbors=[CATEGORY_COLORS, formatDateTime(), formatFileSize(), getFileIcon(), isDocx(), isPdf()]
- "documents_files": "files.js" | kind=code-symbol | source=server/src/routes/documents/files.js:L1 | neighbors=[bumpMajor(), bumpVersion(), compareVersions(), router, safeHeaderFilename(), upload]
- "pages_capas": "CAPAs.jsx" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]
- "pages_crisisdetail": "CrisisDetail.jsx" | kind=code-symbol | source=client/src/pages/CrisisDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]
- "pages_maintenance": "Maintenance.jsx" | kind=code-symbol | source=client/src/pages/Maintenance.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), useFetch(), useAuth.jsx]
- "production_fermentationschedule": "FermentationSchedule.jsx" | kind=code-symbol | source=client/src/pages/production/FermentationSchedule.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "src_sopcontentreader": "sopContentReader.js" | kind=code-symbol | source=server/src/sopContentReader.js:L1 | neighbors=[extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), FIELD_KEYWORDS, findField(), formatText()]
- "src_sqlite_backup_20260428_000033_batchtestroutes": "batchTestRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/batchTestRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireRole(), requireWriteAccess(), CFIA_MICRO_TESTS, coaStorage]
- "src_sqlite_backup_20260428_000033_database": "database.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/database.js:L1 | neighbors=[batchTestNewCols, CATEGORY_COLORS, db, dbPath, __dirname, __filename]
- "admin_suppliers": "suppliers.js" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L1 | neighbors=[CHECKLIST_TEMPLATES, DOC, inferSupplierType(), router, seedChecklistForSupplier(), supplierUpload]
- "assets_index_cfxlhkch_cpe": "cpe" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, .constructor(), .get(), .length(), .pop(), .push()]
- "assets_index_cfxlhkch_d9": "d9()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .add(), .constructor(), ._getAnims(), .has(), .listen()]
- "assets_index_cfxlhkch_ic": "ic()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .apply(), cu(), defineProperty(), el(), getOwnPropertyDescriptor()]
- "assets_index_cfxlhkch_la": "lA()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, ba(), gb(), .constructor(), .draw(), .first()]
- "assets_index_cfxlhkch_o": "o$()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, a(), $b(), En(), Eu(), ho()]
- "pages_equipment": "Equipment.jsx" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), useFetch()]
- "pages_plannerbatchdetail": "PlannerBatchDetail.jsx" | kind=code-symbol | source=client/src/pages/PlannerBatchDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPatch(), apiPut()]
- "pages_plannerpodetail": "PlannerPODetail.jsx" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L1 | neighbors=[FIFOAllocation.jsx, LoadingSpinner.jsx, useApi.js, apiDelete(), apiPatch(), apiPut()]
- "pages_supplierdetail": "SupplierDetail.jsx" | kind=code-symbol | source=client/src/pages/SupplierDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPatch(), apiPost()]
- "pages_workorderdetail": "WorkOrderDetail.jsx" | kind=code-symbol | source=client/src/pages/WorkOrderDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]
- "production_productiontaskboard": "ProductionTaskboard.jsx" | kind=code-symbol | source=client/src/pages/production/ProductionTaskboard.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "quality_batchtests": "batchTests.js" | kind=code-symbol | source=server/src/routes/quality/batchTests.js:L1 | neighbors=[CFIA_MICRO_TESTS, coaUpload, FDA_TESTS, parseCOAPdf(), router, ROUTINE_TESTS]
- "quality_changecontrols": "changeControls.js" | kind=code-symbol | source=server/src/routes/quality/changeControls.js:L1 | neighbors=[addDeviationSystemComment(), capaUpload, deviationUpload, nextId(), router, logAudit()]
- "src_sqlite_backup_20260428_000033_authmiddleware_requirewriteaccess": "requireWriteAccess()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authMiddleware.js:L28 | neighbors=[authMiddleware.js, batchTestRoutes.js, changeControlRoutes.js, complaintRoutes.js, dailyTaskRoutes.js, documentRoutes.js]
- "src_sqlite_backup_20260428_000033_index": "index.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/index.js:L1 | neighbors=[auditApiMiddleware(), requireAuth(), app, clientDist, __dirname, __filename]
- "src_sqlite_backup_20260428_000033_sopcontentreader": "sopContentReader.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L1 | neighbors=[extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), FIELD_KEYWORDS, findField(), formatText()]
- "assets_index_cfxlhkch_dx": "dx" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, defineProperty(), .buildTicks(), .configure(), .constructor(), .determineDataLimits()]
- "assets_index_cfxlhkch_eo": "eO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, .push(), Gj(), Is(), Nc(), pe()]
- "assets_index_cfxlhkch_gw": "gW" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, .buildTicks(), .computeTickLimit(), .configure(), .constructor(), .getLabelForValue()]
- "assets_index_cfxlhkch_ql_getdataset": ".getDataset()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[._calculateBarIndexPixels(), .initialize(), iW(), Ql, .buildOrUpdateElements(), .configure()]
- "assets_index_cfxlhkch_vs_delete": ".delete()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[Cq(), .remove(), deleteProperty(), hJ(), j2(), l$()]
- "components_recordlinker": "RecordLinker.jsx" | kind=code-symbol | source=client/src/components/RecordLinker.jsx:L1 | neighbors=[Modal.jsx, RecordLinker(), SUGGESTION_ICONS, TYPE_CONFIG, useApi.js, apiDelete()]
- "migrations_06_taskboard": "06-taskboard.sql" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L1 | neighbors=[taskboard_audit, taskboard_backups, taskboard_state, taskboard_state_backups, taskboard_tasks, taskboard_template_items]
- "pages_ccrs": "CCRs.jsx" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L1 | neighbors=[CCRDetail.jsx, CCRWizard.jsx, LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost()]
- "pages_journal": "Journal.jsx" | kind=code-symbol | source=client/src/pages/Journal.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiDelete(), apiPost(), apiPut(), useFetch()]
- "pages_operatortasks": "OperatorTasks.jsx" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPost(), apiPut(), useFetch(), useAuth.jsx]
- "pages_traceabilitydetail": "TraceabilityDetail.jsx" | kind=code-symbol | source=client/src/pages/TraceabilityDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-002.json

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
