# Node Description Batch 47 of 77

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

- "admin_auth_router": "router" | kind=code-symbol | source=server/src/routes/admin/auth.js:L7 | neighbors=[auth.js]
- "admin_operators_computeoverdue": "computeOverdue()" | kind=code-symbol | source=server/src/routes/admin/operators.js:L8 | neighbors=[operators.js]
- "admin_operators_router": "router" | kind=code-symbol | source=server/src/routes/admin/operators.js:L5 | neighbors=[operators.js]
- "admin_operatortasks_computestatus": "computeStatus()" | kind=code-symbol | source=server/src/routes/admin/operatorTasks.js:L10 | neighbors=[operatorTasks.js]
- "admin_operatortasks_computestatuses": "computeStatuses()" | kind=code-symbol | source=server/src/routes/admin/operatorTasks.js:L21 | neighbors=[operatorTasks.js]
- "admin_operatortasks_router": "router" | kind=code-symbol | source=server/src/routes/admin/operatorTasks.js:L7 | neighbors=[operatorTasks.js]
- "admin_suppliers_checklist_templates": "CHECKLIST_TEMPLATES" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L104 | neighbors=[suppliers.js]
- "admin_suppliers_doc": "DOC" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L96 | neighbors=[suppliers.js]
- "admin_suppliers_router": "router" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L8 | neighbors=[suppliers.js]
- "admin_suppliers_supplierupload": "supplierUpload" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L402 | neighbors=[suppliers.js]
- "agents-workspace": "AGENTS.md — Agent Workspace & Memory System" | kind=entity | source=AGENTS.md | neighbors=[SOUL.md — Agent Identity & Core Truths]
- "assets_index_cfxlhkch_0e": "_0e()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L890 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_1": "$1" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L862 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_4": "_4()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L862 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_a0e": "a0e()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L890 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_a4": "a4" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L841 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_addangleaxis": "addAngleAxis()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L829 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_addradiusaxis": "addRadiusAxis()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L829 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_ae": "aE" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L187 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_aee": "aee()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_afe": "afe" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L871 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_afterdraw": "afterDraw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_afterevent": "afterEvent()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_afterinit": "afterInit()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_afterupdate": "afterUpdate()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_al": "AL()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L892 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_ame": "ame()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L864 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_aq_addeventlistener": ".addEventListener()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq()]
- "assets_index_cfxlhkch_aq_getdevicepixelratio": ".getDevicePixelRatio()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq()]
- "assets_index_cfxlhkch_aq_releasecontext": ".releaseContext()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq()]
- "assets_index_cfxlhkch_au_chartoptionscopes": ".chartOptionScopes()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_au_constructor": ".constructor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_au_options": ".options()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_au_platform": ".platform()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_au_plugins": ".plugins()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_au_type": ".type()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU]
- "assets_index_cfxlhkch_aw": "AW" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L710 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_aye": "aye" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L892 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_b4": "b4" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L862 | neighbors=[index-CFxLHkCh.js]
- "assets_index_cfxlhkch_bb_get": ".get()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[bB()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-046.json

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
