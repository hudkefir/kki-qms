# Node Description Batch 34 of 77

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

- "assets_index_cfxlhkch_gw_parse": ".parse()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[gW, jt()]
- "assets_index_cfxlhkch_gx": "gx()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, av()]
- "assets_index_cfxlhkch_gz": "gz" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L172 | neighbors=[index-CFxLHkCh.js, s()]
- "assets_index_cfxlhkch_h0e": "h0e()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L890 | neighbors=[index-CFxLHkCh.js, m0e]
- "assets_index_cfxlhkch_hae": "hae()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L829 | neighbors=[index-CFxLHkCh.js, qie()]
- "assets_index_cfxlhkch_hce": "hce()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, pce()]
- "assets_index_cfxlhkch_he_animateoptions": "._animateOptions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[hE, ._createAnimations()]
- "assets_index_cfxlhkch_he_update": ".update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[hE, ._createAnimations()]
- "assets_index_cfxlhkch_hhe": "Hhe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L865 | neighbors=[index-CFxLHkCh.js, Wc()]
- "assets_index_cfxlhkch_hk_getdecimalforvalue": ".getDecimalForValue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[hk(), Ph()]
- "assets_index_cfxlhkch_hle": "hle()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, .unshift()]
- "assets_index_cfxlhkch_hn": "hN()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, el()]
- "assets_index_cfxlhkch_hne": "Hne()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Wne()]
- "assets_index_cfxlhkch_hp_draw": ".draw()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), .getParsed()]
- "assets_index_cfxlhkch_hp_getlabelandvalue": ".getLabelAndValue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), .getParsed()]
- "assets_index_cfxlhkch_hp_initialize": ".initialize()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), .getDataset()]
- "assets_index_cfxlhkch_hp_parsearraydata": ".parseArrayData()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), rk()]
- "assets_index_cfxlhkch_hp_parseprimitivedata": ".parsePrimitiveData()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Hp(), rk()]
- "assets_index_cfxlhkch_hr": "Hr()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, f$()]
- "assets_index_cfxlhkch_hre": "hre()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, pre()]
- "assets_index_cfxlhkch_hse": "Hse()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, wse()]
- "assets_index_cfxlhkch_ht": "HT()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, rV()]
- "assets_index_cfxlhkch_hv": "hv()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, .apply()]
- "assets_index_cfxlhkch_hz": "hz" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L117 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_i9_cancel": ".cancel()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), .tick()]
- "assets_index_cfxlhkch_i9_constructor": ".constructor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), vh()]
- "assets_index_cfxlhkch_i9_notify": "._notify()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), n()]
- "assets_index_cfxlhkch_i9_tick": ".tick()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), .cancel()]
- "assets_index_cfxlhkch_i9_update": ".update()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), vh()]
- "assets_index_cfxlhkch_i9_wait": ".wait()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[i9(), r9()]
- "assets_index_cfxlhkch_ide": "ide()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, rt()]
- "assets_index_cfxlhkch_ie": "iE" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L282 | neighbors=[index-CFxLHkCh.js, n()]
- "assets_index_cfxlhkch_iee": "iee()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .apply()]
- "assets_index_cfxlhkch_ij": "iJ()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .apply()]
- "assets_index_cfxlhkch_il_constructor": ".constructor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[Il(), qfe()]
- "assets_index_cfxlhkch_il_extname": ".extname()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[Il(), qy()]
- "assets_index_cfxlhkch_il_fail": ".fail()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[Il(), .message()]
- "assets_index_cfxlhkch_il_info": ".info()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[Il(), .message()]
- "assets_index_cfxlhkch_im": "IM()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, jz]
- "assets_index_cfxlhkch_ip": "iP()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L871 | neighbors=[index-CFxLHkCh.js, lfe()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-033.json

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
