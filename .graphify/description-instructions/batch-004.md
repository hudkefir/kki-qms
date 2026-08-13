# Node Description Batch 5 of 77

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

- "assets_index_cfxlhkch_en": "En()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, n(), f$(), FF(), ho(), lF()]
- "assets_index_cfxlhkch_eu": "Eu()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, .shift(), defineProperty(), fd(), getOwnPropertyDescriptor(), o3()]
- "assets_index_cfxlhkch_fo": "fO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, Bi(), Du(), Fi(), gN(), jr()]
- "assets_index_cfxlhkch_gp": "GP()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, bf(), .constructor(), .draw(), .getCenterPoint(), .getRange()]
- "assets_index_cfxlhkch_hp_calculatebarindexpixels": "._calculateBarIndexPixels()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), ._getAxis(), ._getAxisCount(), .getFirstScaleIdForIndexAxis(), ._getStackCount(), ._getStackIndex()]
- "assets_index_cfxlhkch_hp_updateelements": ".updateElements()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), eq(), ._calculateBarIndexPixels(), ._calculateBarValuePixels(), ._getRuler(), jt()]
- "assets_index_cfxlhkch_kf": "kF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, el(), FA(), hF(), ic(), .register()]
- "assets_index_cfxlhkch_lf": "lF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, .apply(), bc(), bO(), En(), gO()]
- "assets_index_cfxlhkch_ob": "ob()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, kA(), E0(), En(), gs(), Hp()]
- "assets_index_cfxlhkch_pk": "pk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, bs(), .first(), Qr(), ur(), .closePath()]
- "assets_index_cfxlhkch_ql_resolvedataelementoptions": ".resolveDataElementOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[.updateElements(), .getMaxOverflow(), .updateElements(), Ql, .getSharedOptions(), .getStyle()]
- "assets_index_cfxlhkch_ql_resolveelementoptions": "._resolveElementOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .resolveDataElementOptions(), .resolveDatasetElementOptions(), .datasetElementScopeKeys(), .getOptionScopes(), .resolveNamedOptions()]
- "assets_index_cfxlhkch_rf": "RF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, _0(), .apply(), cN(), Is(), mh()]
- "assets_index_cfxlhkch_tn": "tN()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, bO(), lF(), Bt(), el(), FA()]
- "assets_index_cfxlhkch_update": "update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, bs(), concat(), Gd(), hq(), mq()]
- "assets_index_cfxlhkch_vm": "vm()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, fO(), iO(), Is(), m$(), nr()]
- "assets_index_cfxlhkch_wf": "wf()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, aO(), lN(), No(), rO(), aq()]
- "assets_index_cfxlhkch_xe": "xE" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L527 | neighbors=[index-CFxLHkCh.js, a(), .acquireContext(), .addEventListener(), .getDevicePixelRatio(), .getMaximumSize()]
- "assets_index_cfxlhkch_xr": "Xr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, Eb(), fU(), Kb(), mk(), .initOffsets()]
- "assets_index_cfxlhkch_ys": "ys()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, cO(), GA(), iO(), lO(), N0()]
- "assets_index_cfxlhkch_zc_getlabels": ".getLabels()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[.buildTicks(), .determineDataLimits(), .init(), .parse(), Gu(), k$()]
- "assets_index_cfxlhkch_zs_getprops": ".getProps()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aT(), aU, .getCenterPoint(), .inRange(), .getCenterPoint(), k$()]
- "components_taskcreator": "TaskCreator.jsx" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L1 | neighbors=[formatDate(), PRIORITY_COLORS, STATUS_COLORS, STATUS_ICONS, TaskCreator(), useApi.js]
- "inventory_lots": "lots.js" | kind=code-symbol | source=server/src/routes/inventory/lots.js:L1 | neighbors=[ALLOWED_TRANSITIONS, MUTABLE_FIELDS, router, userCtx(), VALID_LOT_TYPES, VALID_QA_STATUSES]
- "inventory_sos": "sos.js" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L1 | neighbors=[cache, ensureTable(), getAccessToken(), getCached(), postRefresh(), refreshToken()]
- "kki-qms-project": "KKI QMS — Quality Management System" | kind=entity | source=README.md | neighbors=[Build #153 — 2026-07-05: SOP Parse-on-U…, Claude Code Worker Instructions for KKI…, Cost-Optimized QMS Monitoring — 6-Hour …, Backend: Express + PostgreSQL (Supabase), Deployment: Google Cloud Run (us-east1), Frontend: React + Vite + TailwindCSS]
- "migrations_11_planner": "11-planner.sql" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L1 | neighbors=[planner_announcements, planner_batches, planner_fermentation, planner_fridge, planner_inventory_counts, planner_pick_records]
- "pages_picklistdetail": "PickListDetail.jsx" | kind=code-symbol | source=client/src/pages/PickListDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiDelete(), apiPut(), useFetch(), useAuth.jsx]
- "src_database_pg": "database-pg.js" | kind=code-symbol | source=server/src/database-pg.js:L1 | neighbors=[checkDbHealth(), convertPlaceholders(), convertSql(), db, __dirname, __filename]
- "src_sqlite_backup_20260428_000033_documentroutes": "documentRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/documentRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireWriteAccess(), categoryDirs, __dirname, __filename]
- "src_sqlite_backup_20260428_000033_fileroutes": "fileRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/fileRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireRole(), requireWriteAccess(), __dirname, __filename]
- "src_sqlite_backup_20260428_000033_simpledocroutes": "simpleDocRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/simpleDocRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireWriteAccess(), sanitizeFilename(), categoryDirs, generateSOPDescription()]
- "src_sqlite_backup_20260428_000033_supplierroutes": "supplierRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/supplierRoutes.js:L1 | neighbors=[logAudit(), requireRole(), requireWriteAccess(), sanitizeBody(), __dirname_s, __filename_s]
- "assets_index_cfxlhkch_eb": "Eb()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .slice(), vE(), Wi(), Xr(), .setTimeout()]
- "assets_index_cfxlhkch_el": "el()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, .slice(), s(), hN(), ic(), Is()]
- "assets_index_cfxlhkch_es": "Es()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, createDraft(), defineProperty(), finishDraft(), Hs(), Pc]
- "assets_index_cfxlhkch_fge": "fge()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[index-CFxLHkCh.js, a(), bge(), concat(), .push(), .splice()]
- "assets_index_cfxlhkch_ir": "Ir()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, bhe(), ghe(), jhe(), Nhe(), vhe()]
- "assets_index_cfxlhkch_is": "Is()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, AF(), eO(), el(), pe(), vm()]
- "assets_index_cfxlhkch_j": "j()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L25 | neighbors=[index-CFxLHkCh.js, Ah, dde(), .slice(), getPrototypeOf(), n()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-004.json

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
