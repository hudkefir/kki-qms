# Node Description Batch 31 of 77

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

- "admin_suppliers_seedchecklistforsupplier": "seedChecklistForSupplier()" | kind=code-symbol | source=server/src/routes/admin/suppliers.js:L132 | neighbors=[suppliers.js, inferSupplierType()]
- "ai-assistant-jarvis": "Jarvis AI Assistant — Claude Sonnet 4.6 with 14 Tools" | kind=code-symbol | source=server/src/routes/shared/ai.js | neighbors=[@anthropic-ai/sdk — Claude API Integrat…, Backend: Express + PostgreSQL (Supabase)]
- "anthropic-sdk": "@anthropic-ai/sdk — Claude API Integration" | kind=entity | source=README.md | neighbors=[Jarvis AI Assistant — Claude Sonnet 4.6…, Backend: Express + PostgreSQL (Supabase)]
- "assets_index_cfxlhkch_9": "$9()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, ._update()]
- "assets_index_cfxlhkch_a5": "A5()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, o1()]
- "assets_index_cfxlhkch_aae": "aae()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L829 | neighbors=[index-CFxLHkCh.js, c3()]
- "assets_index_cfxlhkch_ade": "ade()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_afterdatasetsupdate": "afterDatasetsUpdate()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .push()]
- "assets_index_cfxlhkch_aj": "aj()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, Eoe()]
- "assets_index_cfxlhkch_ane": "Ane()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, B6()]
- "assets_index_cfxlhkch_aoe": "aoe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, AF()]
- "assets_index_cfxlhkch_ape": "ape" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, .splice()]
- "assets_index_cfxlhkch_aq_acquirecontext": ".acquireContext()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq(), bq()]
- "assets_index_cfxlhkch_aq_getmaximumsize": ".getMaximumSize()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq(), v9()]
- "assets_index_cfxlhkch_aq_isattached": ".isAttached()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq(), zN()]
- "assets_index_cfxlhkch_aq_removeeventlistener": ".removeEventListener()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aq(), jq()]
- "assets_index_cfxlhkch_are": "are()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, ire()]
- "assets_index_cfxlhkch_au_cachedscopes": "._cachedScopes()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, .getOptionScopes()]
- "assets_index_cfxlhkch_au_data": ".data()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, eT()]
- "assets_index_cfxlhkch_au_datasetanimationscopekeys": ".datasetAnimationScopeKeys()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, ._resolveAnimations()]
- "assets_index_cfxlhkch_au_datasetelementscopekeys": ".datasetElementScopeKeys()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, ._resolveElementOptions()]
- "assets_index_cfxlhkch_au_datasetscopekeys": ".datasetScopeKeys()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, .configure()]
- "assets_index_cfxlhkch_au_pluginscopekeys": ".pluginScopeKeys()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, jq()]
- "assets_index_cfxlhkch_au_update": ".update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[aU, .clearCache()]
- "assets_index_cfxlhkch_aue": "aue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L857 | neighbors=[index-CFxLHkCh.js, rt()]
- "assets_index_cfxlhkch_ay": "aY()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, defineProperty()]
- "assets_index_cfxlhkch_az": "az" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L67 | neighbors=[index-CFxLHkCh.js, Md()]
- "assets_index_cfxlhkch_b0e": "b0e()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L890 | neighbors=[index-CFxLHkCh.js, o0e()]
- "assets_index_cfxlhkch_b1": "B1()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L862 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_b7": "B7()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, concat()]
- "assets_index_cfxlhkch_bae": "bae" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, Mae()]
- "assets_index_cfxlhkch_bb_override": ".override()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[bB(), D0()]
- "assets_index_cfxlhkch_bb_route": ".route()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[bB(), zb()]
- "assets_index_cfxlhkch_bb_set": ".set()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[bB(), D0()]
- "assets_index_cfxlhkch_beforedatasetdraw": "beforeDatasetDraw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, U0()]
- "assets_index_cfxlhkch_beforedatasetsdraw": "beforeDatasetsDraw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, U0()]
- "assets_index_cfxlhkch_bfe": "Bfe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[index-CFxLHkCh.js, zfe()]
- "assets_index_cfxlhkch_bhe": "bhe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, Ir()]
- "assets_index_cfxlhkch_bn_endof": ".endOf()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[bN(), .determineDataLimits()]
- "assets_index_cfxlhkch_bn_formats": ".formats()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[bN(), .init()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-030.json

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
