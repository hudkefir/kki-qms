# Node Description Batch 7 of 77

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

- "assets_index_cfxlhkch_ghe": "ghe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, .pop(), .push(), K1(), khe(), kme()]
- "assets_index_cfxlhkch_gs": "gs()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, defineProperty(), getOwnPropertyDescriptor(), i3(), pe(), ho()]
- "assets_index_cfxlhkch_gu": "Gu()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, bk(), .push(), cx(), .getLabels(), ._generate()]
- "assets_index_cfxlhkch_hs": "Hs()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, Es(), Fb(), nr(), pe(), Su()]
- "assets_index_cfxlhkch_i9": "i9()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .active(), .cancel(), .constructor(), ._notify(), .tick()]
- "assets_index_cfxlhkch_ka": "kA()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, g0(), .push(), It(), ob(), rA()]
- "assets_index_cfxlhkch_l": "l$()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, a0(), Bl(), s(), Ud(), .delete()]
- "assets_index_cfxlhkch_l8": "l8()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, a8(), .componentDidCatch(), .constructor(), .getDerivedStateFromError(), .getDerivedStateFromProps()]
- "assets_index_cfxlhkch_mx_generate": "._generate()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[mx, .diff(), .startOf(), Gu(), .getDataTimestamps(), ._getLabelCapacity()]
- "assets_index_cfxlhkch_mx_getdatatimestamps": ".getDataTimestamps()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[._generate(), ._getTimestampsForTable(), mx, ._generate(), concat(), .normalize()]
- "assets_index_cfxlhkch_qk": "qk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, .buildTicks(), ._generate(), .push(), .slice(), kx()]
- "assets_index_cfxlhkch_ql_setstyle": "._setStyle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._removeDatasetHoverStyle(), .removeHoverStyle(), ._setDatasetHoverStyle(), .setHoverStyle(), .getSharedOptions()]
- "assets_index_cfxlhkch_ql_sync": "._sync()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._onDataPop(), ._onDataPush(), ._onDataShift(), ._onDataSplice(), ._onDataUnshift()]
- "assets_index_cfxlhkch_qr": "Qr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .draw(), .update(), pk(), tt(), tk()]
- "assets_index_cfxlhkch_vo": "vO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, lF(), cN(), .push(), It(), qi()]
- "assets_index_cfxlhkch_vs": "Vs()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .constructor(), .delete(), .get(), .has(), .set()]
- "assets_index_cfxlhkch_xw": "xW()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, .parse(), ag(), cg(), .freeze(), Om()]
- "assets_index_cfxlhkch_yc": "yc()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, ho(), ob(), r_(), Tb(), concat()]
- "assets_index_cfxlhkch_yq": "yq" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .constructor(), ._createDescriptors(), ._descriptors(), .invalidate(), .notify()]
- "assets_index_cfxlhkch_zc_getlabelsizes": "._getLabelSizes()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .calculateLabelRotation(), ._computeLabelItems(), .fit(), hk(), ._computeLabelSizes()]
- "assets_index_cfxlhkch_zc_getuserbounds": ".getUserBounds()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[.determineDataLimits(), Eb(), .handleTickRangeOptions(), .determineDataLimits(), q9(), Zc]
- "components_formattedtext": "FormattedText.jsx" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L1 | neighbors=[FormattedText(), isReferencesList(), isRolesTable(), parseReferences(), parseRolesTable(), renderInline()]
- "components_gmpfieldhelp": "GmpFieldHelp.jsx" | kind=code-symbol | source=client/src/components/GmpFieldHelp.jsx:L1 | neighbors=[FieldHelp(), GMP_HELP, RecordInfoTooltip(), CAPADetail.jsx, CCRDetail.jsx, ChangeRequestDetail.jsx]
- "documents_documents": "documents.js" | kind=code-symbol | source=server/src/routes/documents/documents.js:L1 | neighbors=[router, upload, logAudit(), requireAuth(), requireWriteAccess(), deleteFile()]
- "inventory_items": "items.js" | kind=code-symbol | source=server/src/routes/inventory/items.js:L1 | neighbors=[MUTABLE_FIELDS, router, userCtx(), VALID_ITEM_TYPES, logAudit(), requireAuth()]
- "legacy_planner": "planner.js" | kind=code-symbol | source=server/src/routes/legacy/planner.js:L1 | neighbors=[adjustBatchesForVariance(), computeReadyDate(), init(), router, safeParse(), SKU_LABELS]
- "migrations_02_sops": "02-sops.sql" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L1 | neighbors=[sop_attachments, sop_comments, sop_files, sop_form_entries, sop_form_fields, sop_forms]
- "migrations_03_quality": "03-quality.sql" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L1 | neighbors=[audit_checklist, batch_test_results, batch_tests, ccr_complaints, ccrs, complaints]
- "pages_analytics": "Analytics.jsx" | kind=code-symbol | source=client/src/pages/Analytics.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, useFetch(), Analytics(), CHART_BORDERS, CHART_COLORS]
- "pages_sopcategoriesadmin": "SOPCategoriesAdmin.jsx" | kind=code-symbol | source=client/src/pages/SOPCategoriesAdmin.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiDelete(), apiPost(), apiPut(), useFetch()]
- "production_pouringschedule": "PouringSchedule.jsx" | kind=code-symbol | source=client/src/pages/production/PouringSchedule.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), useFetch()]
- "src_sopcontentreader_readsopcontentfrombuffer": "readSOPContentFromBuffer()" | kind=code-symbol | source=server/src/sopContentReader.js:L350 | neighbors=[dashboard.js, sopContentReader.js, extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), findField()]
- "src_sqlite_backup_20260428_000033_routes": "routes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/routes.js:L1 | neighbors=[logAudit(), requireRole(), requireWriteAccess(), router, sanitizeBody(), previewSOPUpdates()]
- "src_supabase_downloadfile": "downloadFile()" | kind=code-symbol | source=server/src/supabase.js:L40 | neighbors=[suppliers.js, documents.js, files.js, simpleDocs.js, batchTests.js, changeControls.js]
- "src_supabase_uploadfile": "uploadFile()" | kind=code-symbol | source=server/src/supabase.js:L23 | neighbors=[suppliers.js, documents.js, files.js, simpleDocs.js, batchTests.js, changeControls.js]
- "admin_admin": "admin.js" | kind=code-symbol | source=server/src/routes/admin/admin.js:L1 | neighbors=[auditedDelete(), auditedUpdate(), router, logAudit(), requireRole(), sanitizeBody()]
- "assets_index_cfxlhkch_ac": "ac()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, cg(), .pop(), kx(), E(), r_()]
- "assets_index_cfxlhkch_ag": "ag()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, Om(), ownKeys(), Kd, kx(), wd()]
- "assets_index_cfxlhkch_au_getoptionscopes": ".getOptionScopes()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, ._cachedScopes(), .push(), jq(), .configure(), ._resolveAnimations()]
- "assets_index_cfxlhkch_au_resolvenamedoptions": ".resolveNamedOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, .createResolver(), lU(), s(), Xi(), yk()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-006.json

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
