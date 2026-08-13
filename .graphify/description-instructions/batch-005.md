# Node Description Batch 6 of 77

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

- "assets_index_cfxlhkch_km": "km()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L697 | neighbors=[index-CFxLHkCh.js, aA(), .apply(), .slice(), Ig(), ll()]
- "assets_index_cfxlhkch_ks": "ks()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .slice(), defineProperty(), getOwnPropertyDescriptor(), .freeze(), nr()]
- "assets_index_cfxlhkch_ku": "Ku()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, D0(), cv(), nT(), ur(), .closePath()]
- "assets_index_cfxlhkch_lp": "LP()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L9 | neighbors=[index-CFxLHkCh.js, Bu(), .push(), .unshift(), dfe(), Iu()]
- "assets_index_cfxlhkch_lr": "Lr" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .add(), .constructor(), .divide(), .isNaN(), .multiply()]
- "assets_index_cfxlhkch_pu": "Pu()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, g0(), LP(), jf(), pe(), Ti()]
- "assets_index_cfxlhkch_ql_resolveanimations": "._resolveAnimations()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .createResolver(), .datasetAnimationScopeKeys(), .getOptionScopes(), .freeze(), .getDataset()]
- "assets_index_cfxlhkch_r": "r_()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, ac(), .splice(), Di(), En(), gs()]
- "assets_index_cfxlhkch_rd": "rD()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, qV(), .slice(), defineProperty(), fC(), getOwnPropertyDescriptor()]
- "assets_index_cfxlhkch_so": "sO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, defineProperty(), Es(), Eu(), getOwnPropertyDescriptor(), mi()]
- "assets_index_cfxlhkch_tb": "Tb()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, fO(), ac(), aN(), En(), iN()]
- "assets_index_cfxlhkch_u": "u_()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, Fl(), ic(), nT(), pe(), s9()]
- "assets_index_cfxlhkch_wi": "Wi()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L697 | neighbors=[index-CFxLHkCh.js, Eb(), o$(), ob(), eae(), g7()]
- "assets_index_cfxlhkch_xd": "xd()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, a(), .push(), Nm(), .constructor(), .draw()]
- "assets_index_cfxlhkch_xo_update": ".update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[xO(), nq(), .calculateTotal(), .getMaxBorderWidth(), .getMaxOffset(), ._getRingWeight()]
- "assets_index_cfxlhkch_zc_computelabelitems": "._computeLabelItems()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, bs(), .push(), ur(), ._getLabelSizes(), ._getXAxisLabelAlignment()]
- "assets_index_cfxlhkch_zc_getmatchingvisiblemetas": ".getMatchingVisibleMetas()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[._getStacks(), K9(), .getDataTimestamps(), Qu(), _z, Zc]
- "components_ccrwizard": "CCRWizard.jsx" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L1 | neighbors=[CCRWizard(), LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS, STEPS, WORKSTREAM_PARTNERS, useApi.js]
- "components_plannercalendar": "PlannerCalendar.jsx" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L1 | neighbors=[binsRemainingColor(), DayCard(), dayTotalBins(), dayTotalCases(), getSkuByCode(), hasMixedSizes()]
- "migrations_05_daily_ops": "05-daily-ops.sql" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L1 | neighbors=[daily_task_completions, daily_task_template_items, daily_task_templates, daily_tasks, inventory_counts, operator_task_comments]
- "pages_inventorycountdetail": "InventoryCountDetail.jsx" | kind=code-symbol | source=client/src/pages/InventoryCountDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiDelete(), apiPut(), useFetch(), useAuth.jsx]
- "pages_soplibrary": "SOPLibrary.jsx" | kind=code-symbol | source=client/src/pages/SOPLibrary.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, StatusBadge.jsx, useApi.js, apiPost(), useFetch()]
- "production_productiondashboard": "ProductionDashboard.jsx" | kind=code-symbol | source=client/src/pages/production/ProductionDashboard.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, useFetch(), Badge(), FERMENTATION_STATUS_STYLES, ORDER_STATUS_STYLES]
- "quality_recalls": "recalls.js" | kind=code-symbol | source=server/src/routes/quality/recalls.js:L1 | neighbors=[nextCrisisId(), nextExerciseId(), nextRecallId(), router, logAudit(), requireRole()]
- "services_eventbus_eventbusimpl": "EventBusImpl" | kind=code-symbol | source=server/src/services/EventBus.js:L32 | neighbors=[EventBus.js, .constructor(), .emit(), .history(), .listenerCounts(), .off()]
- "services_workflowservice": "WorkflowService.js" | kind=code-symbol | source=server/src/services/WorkflowService.js:L1 | neighbors=[BATCH_WORKFLOW, CAPA_WORKFLOW, CHANGE_REQUEST_WORKFLOW, DEVIATION_WORKFLOW, requiresApprover(), requiresQCPass()]
- "src_sopparse_parsesopdocx": "parseSOPDocx()" | kind=code-symbol | source=server/src/sopParse.js:L125 | neighbors=[files.js, sopParse.js, docNumberFromFilename(), extractHeaderTable(), extractTitle(), high()]
- "src_sqlite_backup_20260428_000033_recallroutes": "recallRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/recallRoutes.js:L1 | neighbors=[logAudit(), requireRole(), requireWriteAccess(), nextCrisisId(), nextExerciseId(), nextRecallId()]
- "src_sqlite_backup_20260428_000033_sanitize_sanitizebody": "sanitizeBody()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/sanitize.js:L21 | neighbors=[adminRoutes.js, changeControlRoutes.js, complaintRoutes.js, maintenanceRoutes.js, recallRoutes.js, routes.js]
- "src_sqlite_backup_20260428_000033_websocket_broadcast": "broadcast()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/websocket.js:L18 | neighbors=[adminRoutes.js, changeControlRoutes.js, complaintRoutes.js, formRoutes.js, maintenanceRoutes.js, recallRoutes.js]
- "admin_operatortasks": "operatorTasks.js" | kind=code-symbol | source=server/src/routes/admin/operatorTasks.js:L1 | neighbors=[computeStatus(), computeStatuses(), router, logAudit(), requireAuth(), requireContentAccess()]
- "assets_index_cfxlhkch_ab": "ab()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, .apply(), ib(), Ki(), n(), XP()]
- "assets_index_cfxlhkch_bj": "Bj()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, g0(), gb(), gM(), Nm(), v2()]
- "assets_index_cfxlhkch_bs": "bs()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .update(), pk(), Sh(), tk(), update()]
- "assets_index_cfxlhkch_ch": "ch()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, Cd(), .slice(), L2(), OT(), pe()]
- "assets_index_cfxlhkch_cpe_setcursor": ".setCursor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[cpe, .pop(), .push(), .pushMany(), .splice(), .shift()]
- "assets_index_cfxlhkch_e": "E()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L25 | neighbors=[index-CFxLHkCh.js, ac(), aN(), Bj(), .slice(), .unshift()]
- "assets_index_cfxlhkch_e9": "e9()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .push(), DN(), .stringify(), r9(), t9()]
- "assets_index_cfxlhkch_ep": "ep()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L9 | neighbors=[index-CFxLHkCh.js, a(), .push(), HL(), Oj(), r0()]
- "assets_index_cfxlhkch_getprototypeof": "getPrototypeOf()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, c$(), C6(), j(), .register(), lN()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-005.json

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
