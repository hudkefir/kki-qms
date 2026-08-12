# Node Description Batch 4 of 77

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

- "pages_usermanagement": "UserManagement.jsx" | kind=code-symbol | source=client/src/pages/UserManagement.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), apiPut(), useFetch()]
- "production_productionorders": "ProductionOrders.jsx" | kind=code-symbol | source=client/src/pages/production/ProductionOrders.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), apiPut()]
- "src_sopparse": "sopParse.js" | kind=code-symbol | source=server/src/sopParse.js:L1 | neighbors=[readSOPContentFromBuffer(), cellText(), docNumberFromFilename(), extractHeaderTable(), extractTitle(), high()]
- "src_sqlite_backup_20260428_000033_authmiddleware_requirerole": "requireRole()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authMiddleware.js:L15 | neighbors=[adminRoutes.js, auditRoutes.js, authMiddleware.js, authRoutes.js, batchTestRoutes.js, changeControlRoutes.js]
- "src_sqlite_backup_20260428_000033_changecontrolroutes": "changeControlRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/changeControlRoutes.js:L1 | neighbors=[logAudit(), requireContentAccess(), requireRole(), requireWriteAccess(), capaStorage, capaUpload]
- "assets_index_cfxlhkch_bf": "bf()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, GP(), nr(), pe(), Ss(), Uo()]
- "assets_index_cfxlhkch_ds": "ds()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, ba(), C0(), .apply(), getOwnPropertyDescriptor(), gN()]
- "assets_index_cfxlhkch_ff": "FF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, bc(), Bt(), En(), jc(), Jj()]
- "assets_index_cfxlhkch_fu": "fU()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, cx(), .constructor(), .draw(), .getCenterPoint(), .getRange()]
- "assets_index_cfxlhkch_it": "It()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, B2(), f$(), gO(), ur(), jO()]
- "assets_index_cfxlhkch_ll": "ll()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, bM(), hm(), i1(), km(), l1()]
- "assets_index_cfxlhkch_n2": "N2()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, .constructor(), .copy(), .data(), .freeze(), .parse()]
- "assets_index_cfxlhkch_oo": "oO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, defineProperty(), Fl(), getOwnPropertyDescriptor(), hA(), ic()]
- "assets_index_cfxlhkch_ql_getparsed": ".getParsed()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[._calculateBarIndexPixels(), ._calculateBarValuePixels(), .draw(), .getLabelAndValue(), ._getRuler(), ._getStacks()]
- "backend-stack": "Backend: Express + PostgreSQL (Supabase)" | kind=entity | source=README.md | neighbors=[Jarvis AI Assistant — Claude Sonnet 4.6…, @anthropic-ai/sdk — Claude API Integrat…, Supabase PostgreSQL — Production Databa…, Supabase Storage — Document & File Stor…, BUG-001: Stored XSS — No Server-Side In…, BUG-002: Path Traversal in SOP File Upl…]
- "pages_inventorycounts": "InventoryCounts.jsx" | kind=code-symbol | source=client/src/pages/InventoryCounts.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), useFetch()]
- "pages_operatortasksadmin": "OperatorTasksAdmin.jsx" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPut(), useFetch(), useAuth.jsx, useAuth()]
- "pages_picklists": "PickLists.jsx" | kind=code-symbol | source=client/src/pages/PickLists.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPost(), useFetch()]
- "quality_print": "print.js" | kind=code-symbol | source=server/src/routes/quality/print.js:L1 | neighbors=[baseHtml(), capaHtml(), classificationBadge(), COMPANY, createCAPADoc(), escHtml()]
- "shared_ai": "ai.js" | kind=code-symbol | source=server/src/routes/shared/ai.js:L1 | neighbors=[AI_TOOLS, chatSessions, EDITABLE_FIELDS, executeToolCall(), FIELD_PROMPTS, LINK_TYPE_TABLE_MAP]
- "src_sqlite_backup_20260428_000033_authmiddleware_requireauth": "requireAuth()" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/authMiddleware.js:L3 | neighbors=[auditRoutes.js, authMiddleware.js, authRoutes.js, batchTestRoutes.js, dailyTaskRoutes.js, documentRoutes.js]
- "src_sqlite_backup_20260428_000033_printroutes": "printRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/printRoutes.js:L1 | neighbors=[requireAuth(), baseHtml(), capaHtml(), COMPANY, createCAPADoc(), __dirname]
- "assets_index_cfxlhkch_aq": "aq()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .acquireContext(), .addEventListener(), .getDevicePixelRatio(), .getMaximumSize(), .isAttached()]
- "assets_index_cfxlhkch_bb": "bB()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .apply(), .constructor(), .describe(), .get(), .override()]
- "assets_index_cfxlhkch_bn": "bN()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .add(), .constructor(), .diff(), .endOf(), .format()]
- "assets_index_cfxlhkch_hk": "hk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .push(), .buildLookupTable(), .constructor(), ._generate(), .getDecimalForValue()]
- "assets_index_cfxlhkch_kq_each": "._each()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[kq(), .add(), .addControllers(), .addElements(), .addPlugins(), .addScales()]
- "assets_index_cfxlhkch_mn": "mn()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, AF(), fO(), iO(), m$(), .constructor()]
- "assets_index_cfxlhkch_zh": "zH" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, .arc(), .arcTo(), .bezierCurveTo(), .closePath(), .constructor()]
- "assets_index_cfxlhkch_zh_closepath": ".closePath()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[.lineEnd(), cx(), Hu, Ku(), pk(), Pu()]
- "assets_index_cfxlhkch_zh_moveto": ".moveTo()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[.point(), cx(), Hu, Ju(), nU(), pk()]
- "documents_simpledocs": "simpleDocs.js" | kind=code-symbol | source=server/src/routes/documents/simpleDocs.js:L1 | neighbors=[generateSOPDescription(), router, upload, validCategories, logAudit(), requireAuth()]
- "pages_auditprep": "AuditPrep.jsx" | kind=code-symbol | source=client/src/pages/AuditPrep.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPut(), useFetch(), useAuth.jsx, useAuth()]
- "pages_dashboard": "Dashboard.jsx" | kind=code-symbol | source=client/src/pages/Dashboard.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, useFetch(), useAuth.jsx, useAuth(), Complaints.jsx]
- "pages_mytasks": "MyTasks.jsx" | kind=code-symbol | source=client/src/pages/MyTasks.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPut(), useFetch(), useAuth.jsx, useAuth()]
- "pages_suppliers": "Suppliers.jsx" | kind=code-symbol | source=client/src/pages/Suppliers.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), useFetch(), useAuth.jsx]
- "quality_dashboard": "dashboard.js" | kind=code-symbol | source=server/src/routes/quality/dashboard.js:L1 | neighbors=[router, slugifyCategory(), logAudit(), requireRole(), requireWriteAccess(), sanitizeBody()]
- "assets_index_cfxlhkch_ao": "aO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, bg(), C6(), concat(), defineProperty(), getOwnPropertyDescriptor()]
- "assets_index_cfxlhkch_c": "c$()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, a(), .slice(), defineProperty(), getOwnPropertyDescriptor(), getPrototypeOf()]
- "assets_index_cfxlhkch_cx": "cx()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, defineProperty(), fU(), ng, .arc(), .closePath()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-003.json

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
