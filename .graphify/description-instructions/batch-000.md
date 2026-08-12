# Node Description Batch 1 of 77

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

- "assets_index_cfxlhkch": "index-CFxLHkCh.js" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L1 | neighbors=[index-CFxLHkCh.js, _0(), _0e(), $1, _4(), _5()]
- "assets_index_cfxlhkch_cpe_slice": ".slice()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[a(), ade(), Aie(), AM(), applyPatches(), aq()]
- "assets_index_cfxlhkch_cpe_push": ".push()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[_0(), $7(), addBox(), afterDatasetsUpdate(), age(), .getOptionScopes()]
- "assets_index_cfxlhkch_bb_apply": ".apply()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[_5(), A3(), ab(), AM(), as(), B5()]
- "assets_index_cfxlhkch_defineproperty": "defineProperty()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, a0(), ale(), aO(), aq(), ase()]
- "assets_index_cfxlhkch_getownpropertydescriptor": "getOwnPropertyDescriptor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, _5(), A3(), A6(), aO(), as()]
- "assets_index_cfxlhkch_zc": "Zc" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .apply(), getOwnPropertyDescriptor(), .afterAutoSkip(), .afterBuildTicks(), .afterCalculateLabelRotation()]
- "hooks_useapi": "useApi.js" | kind=code-symbol | source=client/src/hooks/useApi.js:L1 | neighbors=[BatchTestRecommendations.jsx, CCRWizard.jsx, LinkedDocuments.jsx, RecordLinker.jsx, SOPForms.jsx, TaskCreator.jsx]
- "src_app": "App.jsx" | kind=code-symbol | source=client/src/App.jsx:L1 | neighbors=[AccessDenied.jsx, BuildVersion.jsx, ChatSidebar.jsx, ProtectedRoute.jsx, useAuth.jsx, useAuth()]
- "hooks_useapi_usefetch": "useFetch()" | kind=code-symbol | source=client/src/hooks/useApi.js:L3 | neighbors=[BatchTestRecommendations.jsx, CCRWizard.jsx, LinkedDocuments.jsx, RecordLinker.jsx, SOPForms.jsx, TaskCreator.jsx]
- "assets_index_cfxlhkch_ql": "Ql" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L92 | neighbors=[index-CFxLHkCh.js, .addElements(), .applyStack(), .buildOrUpdateElements(), .configure(), .constructor()]
- "components_loadingspinner": "LoadingSpinner.jsx" | kind=code-symbol | source=client/src/components/LoadingSpinner.jsx:L1 | neighbors=[LoadingSpinner(), Analytics.jsx, AuditPrep.jsx, BatchTestDetail.jsx, BatchTesting.jsx, BatchTesting-working.jsx]
- "assets_index_cfxlhkch_t": "t()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L25 | neighbors=[index-CFxLHkCh.js, a1(), $b(), bW(), ch(), de()]
- "pages_capadetail": "CAPADetail.jsx" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L1 | neighbors=[AiSuggestButton.jsx, FormattedText.jsx, GmpFieldHelp.jsx, FieldHelp(), GMP_HELP, RecordInfoTooltip()]
- "assets_index_cfxlhkch_pe": "pe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L33 | neighbors=[index-CFxLHkCh.js, a(), aN(), B2(), bf(), cb()]
- "hooks_useapi_apipost": "apiPost()" | kind=code-symbol | source=client/src/hooks/useApi.js:L49 | neighbors=[CCRWizard.jsx, RecordLinker.jsx, SOPForms.jsx, TaskCreator.jsx, useApi.js, BatchTesting.jsx]
- "assets_index_cfxlhkch_f": "f$()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, bc(), bd(), Bt(), cb(), ch()]
- "assets_index_cfxlhkch_s": "s()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L1 | neighbors=[index-CFxLHkCh.js, applyPatches(), .resolveNamedOptions(), bk(), c$(), eH()]
- "components_modal": "Modal.jsx" | kind=code-symbol | source=client/src/components/Modal.jsx:L1 | neighbors=[InventoryCount.jsx, Modal(), SIZE_CLASSES, RecordLinker.jsx, BatchTestDetail.jsx, BatchTesting.jsx]
- "assets_index_cfxlhkch_rt": "rt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L58 | neighbors=[index-CFxLHkCh.js, Ah, aue(), c4, cue(), dde()]
- "hooks_useapi_apiput": "apiPut()" | kind=code-symbol | source=client/src/hooks/useApi.js:L71 | neighbors=[SOPForms.jsx, TaskCreator.jsx, useApi.js, AuditPrep.jsx, BatchTestDetail.jsx, BatchTesting.jsx]
- "hooks_useauth": "useAuth.jsx" | kind=code-symbol | source=client/src/hooks/useAuth.jsx:L1 | neighbors=[LinkedDocuments.jsx, ProtectedRoute.jsx, SOPForms.jsx, AuthContext, AuthProvider(), useAuth()]
- "pages_planner": "Planner.jsx" | kind=code-symbol | source=client/src/pages/Planner.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPatch(), apiPost()]
- "assets_index_cfxlhkch_n": "n()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L1 | neighbors=[index-CFxLHkCh.js, ab(), aN(), dde(), ede(), En()]
- "hooks_useauth_useauth": "useAuth()" | kind=code-symbol | source=client/src/hooks/useAuth.jsx:L64 | neighbors=[LinkedDocuments.jsx, ProtectedRoute.jsx, SOPForms.jsx, useAuth.jsx, AuditPrep.jsx, BatchTestDetail.jsx]
- "assets_index_cfxlhkch_mt": "mt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L67 | neighbors=[index-CFxLHkCh.js, bz, c4, dde(), de(), due()]
- "pages_operatordashboard": "OperatorDashboard.jsx" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L1 | neighbors=[LoadingSpinner.jsx, useApi.js, apiPost(), apiPut(), useFetch(), useAuth.jsx]
- "assets_index_cfxlhkch_a": "a()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L25 | neighbors=[index-CFxLHkCh.js, .slice(), o$(), pe(), xd(), applyPatches()]
- "hooks_useapi_apidelete": "apiDelete()" | kind=code-symbol | source=client/src/hooks/useApi.js:L89 | neighbors=[RecordLinker.jsx, SOPForms.jsx, useApi.js, BatchTestDetail.jsx, BatchTesting.jsx, BatchTesting-working.jsx]
- "pages_recallcenter": "RecallCenter.jsx" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L1 | neighbors=[CrisisDetail.jsx, LoadingSpinner.jsx, Modal.jsx, useApi.js, apiPost(), useFetch()]
- "assets_index_cfxlhkch_concat": "concat()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, aO(), AX(), B7(), .apply(), .slice()]
- "src_auditmiddleware_logaudit": "logAudit()" | kind=code-symbol | source=server/src/auditMiddleware.js:L4 | neighbors=[admin.js, auth.js, operatorTasks.js, suppliers.js, documents.js, files.js]
- "pages_ccrdetail": "CCRDetail.jsx" | kind=code-symbol | source=client/src/pages/CCRDetail.jsx:L1 | neighbors=[GmpFieldHelp.jsx, FieldHelp(), GMP_HELP, RecordInfoTooltip(), LinkedDocuments.jsx, LoadingSpinner.jsx]
- "pages_complaintdetail": "ComplaintDetail.jsx" | kind=code-symbol | source=client/src/pages/ComplaintDetail.jsx:L1 | neighbors=[AiSuggestButton.jsx, GmpFieldHelp.jsx, FieldHelp(), GMP_HELP, RecordInfoTooltip(), LinkedDocuments.jsx]
- "pages_deviationdetail": "DeviationDetail.jsx" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L1 | neighbors=[AiSuggestButton.jsx, GmpFieldHelp.jsx, FieldHelp(), GMP_HELP, RecordInfoTooltip(), LoadingSpinner.jsx]
- "assets_index_cfxlhkch_kq": "kq()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, a(), da(), defineProperty(), .add(), .addControllers()]
- "assets_index_cfxlhkch_mx": "mx" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, hX(), .afterAutoSkip(), .beforeLayout(), .buildTicks(), .constructor()]
- "assets_index_cfxlhkch_xo": "xO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, eO(), nr(), Eb(), jr(), .componentDidCatch()]
- "pages_batchtestdetail": "BatchTestDetail.jsx" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L1 | neighbors=[LoadingSpinner.jsx, Modal.jsx, useApi.js, apiDelete(), apiPatch(), apiPut()]
- "src_authmiddleware_requirewriteaccess": "requireWriteAccess()" | kind=code-symbol | source=server/src/authMiddleware.js:L28 | neighbors=[suppliers.js, documents.js, files.js, simpleDocs.js, items.js, lots.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-000.json

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
