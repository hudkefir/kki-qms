# Node Description Batch 9 of 77

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

- "assets_index_cfxlhkch_vhe": "vhe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, Ir(), Che(), .pop(), .push(), K1()]
- "assets_index_cfxlhkch_wr": "Wr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, cpe, .slice(), .splice(), .unshift(), dpe()]
- "assets_index_cfxlhkch_yg": "yg()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L792 | neighbors=[index-CFxLHkCh.js, ev, ex(), s6(), wW(), bg()]
- "assets_index_cfxlhkch_zc_calculatelabelrotation": ".calculateLabelRotation()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, mk(), pk(), Xr(), ._getLabelSizes(), ._isVisible()]
- "assets_index_cfxlhkch_zc_computelabelsizes": "._computeLabelSizes()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .push(), jt(), mk(), ur(), ._resolveTickFontOptions()]
- "assets_index_cfxlhkch_zc_draw": ".draw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .drawBackground(), .drawBorder(), .drawGrid(), .drawLabels(), .drawTitle()]
- "assets_index_cfxlhkch_zc_drawtitle": ".drawTitle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .draw(), bs(), Ju(), qq(), Qr()]
- "assets_index_cfxlhkch_zc_fit": ".fit()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, pk(), ._calculatePadding(), ._getLabelSizes(), ._handleMargins(), ._isVisible()]
- "assets_index_cfxlhkch_zc_isvisible": "._isVisible()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .calculateLabelRotation(), .draw(), .fit(), .getLineWidthForValue(), .getMatchingVisibleMetas()]
- "assets_index_cfxlhkch_zc_resolvetickfontoptions": "._resolveTickFontOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[._getLabelSize(), .computeTickLimit(), Zc, ._computeLabelItems(), ._computeLabelSizes(), ._maxDigits()]
- "assets_index_cfxlhkch_zh_arc": ".arc()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[cx(), Hu, ix(), .pathSegment(), Pu(), tE()]
- "backup_backup_qms_log": "log()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L39 | neighbors=[backup_qms.py, backup_one(), dump_pg(), dump_supabase_rest(), main(), upload_and_verify()]
- "hooks_useapi_apipatch": "apiPatch()" | kind=code-symbol | source=client/src/hooks/useApi.js:L102 | neighbors=[useApi.js, BatchTestDetail.jsx, Fermentation.jsx, Planner.jsx, PlannerBatchDetail.jsx, PlannerPODetail.jsx]
- "production_fermentation": "fermentation.js" | kind=code-symbol | source=server/src/routes/production/fermentation.js:L1 | neighbors=[FIELDS, router, userCtx(), requireRole(), requireWriteAccess(), sanitizeBody()]
- "production_orders": "orders.js" | kind=code-symbol | source=server/src/routes/production/orders.js:L1 | neighbors=[FIELDS, nextOrderNumber(), router, userCtx(), requireWriteAccess(), sanitizeBody()]
- "production_taskboard": "taskboard.js" | kind=code-symbol | source=server/src/routes/production/taskboard.js:L1 | neighbors=[FIELDS, router, userCtx(), VALID_STATUSES, requireWriteAccess(), sanitizeBody()]
- "quality_maintenance": "maintenance.js" | kind=code-symbol | source=server/src/routes/quality/maintenance.js:L1 | neighbors=[calcNextDue(), nextWONumber(), router, logAudit(), requireWriteAccess(), sanitizeBody()]
- "shared_diagnostics": "diagnostics.js" | kind=code-symbol | source=server/src/routes/shared/diagnostics.js:L1 | neighbors=[_deployVerify(), deployVerifyHandler(), router, SERVER_START_TIME, requireRole(), checkDbHealth()]
- "src_sopcontentreader_readsopcontent": "readSOPContent()" | kind=code-symbol | source=server/src/sopContentReader.js:L292 | neighbors=[dashboard.js, sopContentReader.js, extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), findField()]
- "src_sqlite_backup_20260428_000033_adminroutes": "adminRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/adminRoutes.js:L1 | neighbors=[auditedDelete(), auditedUpdate(), router, logAudit(), requireRole(), sanitizeBody()]
- "src_sqlite_backup_20260428_000033_environmentalroutes": "environmentalRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/environmentalRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireWriteAccess(), __dirname, __filename, nextRecordNumber()]
- "src_sqlite_backup_20260428_000033_maintenanceroutes": "maintenanceRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/maintenanceRoutes.js:L1 | neighbors=[logAudit(), requireWriteAccess(), calcNextDue(), nextWONumber(), router, sanitizeBody()]
- "src_sqlite_backup_20260428_000033_sopcontentreader_readsopcontent": "readSOPContent()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sopContentReader.js:L292 | neighbors=[routes.js, sopContentReader.js, extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), findField()]
- "src_sqlite_backup_20260428_000033_sosroutes": "sosRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sosRoutes.js:L1 | neighbors=[requireAuth(), cache, getCached(), getSOSConfig(), router, setCache()]
- "src_supabase_deletefile": "deleteFile()" | kind=code-symbol | source=server/src/supabase.js:L55 | neighbors=[suppliers.js, documents.js, files.js, simpleDocs.js, batchTests.js, changeControls.js]
- "assets_index_cfxlhkch_8": "_8()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, P8(), S8(), v_(), w8(), ho()]
- "assets_index_cfxlhkch_af": "AF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, aoe(), Bi(), dO(), Is(), mn()]
- "assets_index_cfxlhkch_au_createresolver": ".createResolver()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, yk(), .resolveNamedOptions(), jq(), .configure(), ._resolveAnimations()]
- "assets_index_cfxlhkch_ba": "ba()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L1 | neighbors=[index-CFxLHkCh.js, .push(), ds(), ho(), lA(), Ol()]
- "assets_index_cfxlhkch_bb_describe": ".describe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[bB(), .constructor(), D0(), ib(), wq(), zb()]
- "assets_index_cfxlhkch_bk": "bk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .startOf(), .push(), Gu(), jt(), s()]
- "assets_index_cfxlhkch_bu": "Bu()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, .push(), .lineTo(), GA(), LP(), wf()]
- "assets_index_cfxlhkch_c8": "c8()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, b8(), d8(), j8(), qO(), o8()]
- "assets_index_cfxlhkch_cse": "cse()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, defineProperty(), dse(), getOwnPropertyDescriptor(), kse(), p7()]
- "assets_index_cfxlhkch_d2": "D2()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, .push(), Du(), Op(), Vj(), g0()]
- "assets_index_cfxlhkch_dde": "dde()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, j(), mt(), n(), Pr(), rt()]
- "assets_index_cfxlhkch_deleteproperty": "deleteProperty()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, Np(), ny(), ry(), sy(), .delete()]
- "assets_index_cfxlhkch_dpe": "dpe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, .pop(), .push(), .slice(), .splice(), Wr()]
- "assets_index_cfxlhkch_dx_parse": ".parse()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[dx, jt(), pW(), tt(), xW(), .getLabels()]
- "assets_index_cfxlhkch_e1": "e1" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Aie(), Iie(), Oie(), Pie(), Sie()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-008.json

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
