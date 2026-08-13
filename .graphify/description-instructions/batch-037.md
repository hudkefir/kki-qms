# Node Description Batch 38 of 77

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

- "assets_index_cfxlhkch_pl": "pl" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L716 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_pm": "Pm()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L716 | neighbors=[index-CFxLHkCh.js, .apply()]
- "assets_index_cfxlhkch_pp_draw": ".draw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[pp, .updateControlPoints()]
- "assets_index_cfxlhkch_pp_getmaxoverflow": ".getMaxOverflow()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[pp, .resolveDataElementOptions()]
- "assets_index_cfxlhkch_prepend": "prepend()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, concat()]
- "assets_index_cfxlhkch_pv": "pv()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, .apply()]
- "assets_index_cfxlhkch_py": "py()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, kp()]
- "assets_index_cfxlhkch_q0": "q0()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .draw()]
- "assets_index_cfxlhkch_qae": "Qae()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, Xae()]
- "assets_index_cfxlhkch_qb": "Qb" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L597 | neighbors=[index-CFxLHkCh.js, jt()]
- "assets_index_cfxlhkch_qd": "Qd" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_qe": "Qe" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L297 | neighbors=[index-CFxLHkCh.js, .push()]
- "assets_index_cfxlhkch_qee": "qee()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, bee()]
- "assets_index_cfxlhkch_qf": "qF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, kF()]
- "assets_index_cfxlhkch_qfe": "qfe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[index-CFxLHkCh.js, .constructor()]
- "assets_index_cfxlhkch_ql_addelements": ".addElements()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._dataCheck()]
- "assets_index_cfxlhkch_ql_constructor": ".constructor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .getMeta()]
- "assets_index_cfxlhkch_ql_destroy": "._destroy()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, jd()]
- "assets_index_cfxlhkch_ql_draw": ".draw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .push()]
- "assets_index_cfxlhkch_ql_getlabelandvalue": ".getLabelAndValue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .getParsed()]
- "assets_index_cfxlhkch_ql_getmeta": ".getMeta()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .constructor()]
- "assets_index_cfxlhkch_ql_getotherscale": "._getOtherScale()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .getMinMax()]
- "assets_index_cfxlhkch_ql_getscaleforid": ".getScaleForId()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .linkScales()]
- "assets_index_cfxlhkch_ql_includeoptions": ".includeOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .getSharedOptions()]
- "assets_index_cfxlhkch_ql_initialize": ".initialize()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, M0()]
- "assets_index_cfxlhkch_ql_insertelements": "._insertElements()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._resyncElements()]
- "assets_index_cfxlhkch_ql_ondatapop": "._onDataPop()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._sync()]
- "assets_index_cfxlhkch_ql_ondatashift": "._onDataShift()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._sync()]
- "assets_index_cfxlhkch_ql_ondatasplice": "._onDataSplice()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._sync()]
- "assets_index_cfxlhkch_ql_ondataunshift": "._onDataUnshift()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._sync()]
- "assets_index_cfxlhkch_ql_parseprimitivedata": ".parsePrimitiveData()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, .getLabels()]
- "assets_index_cfxlhkch_ql_removedatasethoverstyle": "._removeDatasetHoverStyle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._setStyle()]
- "assets_index_cfxlhkch_ql_removehoverstyle": ".removeHoverStyle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._setStyle()]
- "assets_index_cfxlhkch_ql_setdatasethoverstyle": "._setDatasetHoverStyle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._setStyle()]
- "assets_index_cfxlhkch_ql_sethoverstyle": ".setHoverStyle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, ._setStyle()]
- "assets_index_cfxlhkch_ql_updateindex": ".updateIndex()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Ql, jd()]
- "assets_index_cfxlhkch_qn": "qN()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_qne": "Qne()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, sse()]
- "assets_index_cfxlhkch_qo": "qO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L49 | neighbors=[index-CFxLHkCh.js, c8()]
- "assets_index_cfxlhkch_qse": "qse()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, l3()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-037.json

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
