# Node Description Batch 2 of 77

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

- "assets_index_cfxlhkch_hp": "Hp()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, .push(), ._calculateBarIndexPixels(), ._calculateBarValuePixels(), .draw(), ._getAxis()]
- "production_boms": "boms.js" | kind=code-symbol | source=server/src/routes/production/boms.js:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "pages_changerequestdetail": "ChangeRequestDetail.jsx" | kind=code-symbol | source=client/src/pages/ChangeRequestDetail.jsx:L1 | neighbors=[GmpFieldHelp.jsx, FieldHelp(), GMP_HELP, RecordInfoTooltip(), LoadingSpinner.jsx, Modal.jsx]
- "pages_recalldetail": "RecallDetail.jsx" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]
- "assets_index_cfxlhkch_au": "aU" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, ._cachedScopes(), .chartOptionScopes(), .clearCache(), .constructor(), .createResolver()]
- "pages_batchtesting": "BatchTesting.jsx" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "pages_equipmentdetail": "EquipmentDetail.jsx" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "pages_sopdetail": "SOPDetail.jsx" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L1 | neighbors=[FormattedText.jsx, LinkedDocuments.jsx, LoadingSpinner.jsx, Modal.jsx, SOPForms.jsx, StatusBadge.jsx]
- "assets_index_cfxlhkch_g0": "g0()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, Bj(), .push(), D2(), ho(), iA()]
- "backup_backup_qms": "backup_qms.py" | kind=code-symbol | source=scripts/backup/backup_qms.py:L1 | neighbors=[backup_one(), dump_domain(), dump_pg(), dump_supabase_rest(), _ensure_sa_active(), expand()]
- "pages_batchtesting_working": "BatchTesting-working.jsx" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "pages_fermentation": "Fermentation.jsx" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPatch(), apiPost()]
- "assets_index_cfxlhkch_po": "pO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, eO(), m$(), ab(), cu(), db()]
- "components_sopforms": "SOPForms.jsx" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L1 | neighbors=[EditFieldInline(), EntriesTable(), FIELD_TYPES, FieldTypeIcon(), FillOutForm(), FORM_TYPES]
- "pages_complaints": "Complaints.jsx" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L1 | neighbors=[CCRDetail.jsx, ComplaintDetail.jsx, LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost()]
- "pages_documentlibrary": "DocumentLibrary.jsx" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), useFetch()]
- "assets_index_cfxlhkch_cpe_splice": ".splice()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[ape, cpe, .setCursor(), dpe(), .init(), dxe()]
- "assets_index_cfxlhkch_pr": "Pr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L58 | neighbors=[index-CFxLHkCh.js, cue(), dde(), due(), ede(), eH()]
- "assets_index_cfxlhkch_ur": "ur()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, a9(), .update(), e9(), It(), Ju()]
- "src_sqlite_backup_20260428_000033_auditmiddleware_logaudit": "logAudit()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/auditMiddleware.js:L4 | neighbors=[adminRoutes.js, auditMiddleware.js, auditApiMiddleware(), auditRoutes.js, authRoutes.js, batchTestRoutes.js]
- "assets_index_cfxlhkch_bt": "Bt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, B2(), .areaEnd(), .areaStart(), .constructor(), .lineEnd()]
- "assets_index_cfxlhkch_tt": "tt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .parse(), H$(), ._calculateBarIndexPixels(), ._getAxis(), ._generate()]
- "pages_deviations": "Deviations.jsx" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L1 | neighbors=[DeviationDetail.jsx, LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), useFetch()]
- "src_sanitize_sanitizebody": "sanitizeBody()" | kind=code-symbol | source=server/src/sanitize.js:L21 | neighbors=[admin.js, suppliers.js, items.js, lots.js, boms.js, fermentation.js]
- "src_websocket_broadcast": "broadcast()" | kind=code-symbol | source=server/src/websocket.js:L18 | neighbors=[admin.js, operatorTasks.js, suppliers.js, boms.js, fermentation.js, flavouring.js]
- "assets_index_cfxlhkch_cpe_unshift": ".unshift()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[cpe, .push(), .setCursor(), E(), hle(), hW()]
- "assets_index_cfxlhkch_ho": "ho()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, ba(), f$(), g0(), gb(), _8()]
- "assets_index_cfxlhkch_jt": "jt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, bk(), .parse(), eq(), fW(), g9()]
- "assets_index_cfxlhkch_nr": "nr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, bf(), D(), Hs(), ic(), ks()]
- "assets_index_cfxlhkch_zc_update": ".update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, hk(), .afterBuildTicks(), .afterCalculateLabelRotation(), .afterDataLimits(), .afterFit()]
- "pages_changerequests": "ChangeRequests.jsx" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L1 | neighbors=[ChangeRequestDetail.jsx, LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), useFetch()]
- "pages_dailytasks": "DailyTasks.jsx" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPost(), apiPut(), useFetch(), useAuth.jsx]
- "src_authmiddleware_requireauth": "requireAuth()" | kind=code-symbol | source=server/src/authMiddleware.js:L3 | neighbors=[auth.js, operators.js, operatorTasks.js, documents.js, files.js, simpleDocs.js]
- "src_authmiddleware_requirerole": "requireRole()" | kind=code-symbol | source=server/src/authMiddleware.js:L15 | neighbors=[admin.js, auth.js, operatorTasks.js, suppliers.js, files.js, fermentation.js]
- "src_index": "index.js" | kind=code-symbol | source=server/src/index.js:L1 | neighbors=[deployVerifyHandler(), auditApiMiddleware(), requireAuth(), checkDbHealth(), app, clientDist]
- "assets_index_cfxlhkch_ar": "ar()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, b8(), e8(), F8(), gc(), ho()]
- "assets_index_cfxlhkch_cpe_pop": ".pop()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[ac(), bB(), cpe, .setCursor(), .shift(), dpe()]
- "assets_index_cfxlhkch_cpe_shift": ".shift()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[bge(), cpe, .pop(), .setCursor(), d0e(), Eu()]
- "assets_index_cfxlhkch_fl": "Fl()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, Bt(), G1(), jc(), Jj(), nN()]
- "assets_index_cfxlhkch_il": "Il()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Dj(), e5(), .basename(), .constructor(), .dirname()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-001.json

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
