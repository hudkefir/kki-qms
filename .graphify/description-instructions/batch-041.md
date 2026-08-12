# Node Description Batch 42 of 77

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

- "assets_index_cfxlhkch_zc_getpadding": ".getPadding()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[pq(), Zc]
- "assets_index_cfxlhkch_zc_getxaxislabelalignment": "._getXAxisLabelAlignment()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, ._computeLabelItems()]
- "assets_index_cfxlhkch_zc_handlemargins": "._handleMargins()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .fit()]
- "assets_index_cfxlhkch_zc_setdimensions": ".setDimensions()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .update()]
- "assets_index_cfxlhkch_zoe": "zoe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, foe]
- "assets_index_cfxlhkch_zp": "zP()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L17 | neighbors=[index-CFxLHkCh.js, It()]
- "assets_index_cfxlhkch_zq": "zq()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .getContext()]
- "assets_index_cfxlhkch_zre": "Zre()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Jre()]
- "assets_index_cfxlhkch_zs_hasvalue": ".hasValue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[zs, Gu()]
- "assets_index_cfxlhkch_zs_tooltipposition": ".tooltipPosition()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[zs, .getProps()]
- "assets_index_cfxlhkch_zt": "zT()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[index-CFxLHkCh.js, a()]
- "assets_index_cfxlhkch_zue": "zue()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L862 | neighbors=[index-CFxLHkCh.js, .slice()]
- "assets_index_cfxlhkch_zz": "zz" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L672 | neighbors=[index-CFxLHkCh.js, .slice()]
- "backup_backup_qms_find_pg_dump": "_find_pg_dump()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L131 | neighbors=[backup_qms.py, dump_pg()]
- "backup_backup_qms_load_config": "load_config()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L47 | neighbors=[backup_qms.py, main()]
- "backup_backup_qms_require_bucket": "require_bucket()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L52 | neighbors=[backup_qms.py, main()]
- "bug-001-xss": "BUG-001: Stored XSS — No Server-Side Input Sanitization" | kind=entity | source=BUG_REPORT.md | neighbors=[Backend: Express + PostgreSQL (Supabase), Security & Bug Audit Report]
- "bug-002-path-traversal": "BUG-002: Path Traversal in SOP File Upload" | kind=entity | source=BUG_REPORT.md | neighbors=[Backend: Express + PostgreSQL (Supabase), Security & Bug Audit Report]
- "bug-004-hardcoded-secret": "BUG-004: Hardcoded Session Secret" | kind=entity | source=BUG_REPORT.md | neighbors=[Backend: Express + PostgreSQL (Supabase), Security & Bug Audit Report]
- "claude-instructions": "Claude Code Worker Instructions for KKI QMS" | kind=entity | source=CLAUDE.md | neighbors=[Hudson Liao — Project Owner, KKI QMS — Quality Management System]
- "components_fifoallocation": "FIFOAllocation.jsx" | kind=code-symbol | source=client/src/components/FIFOAllocation.jsx:L1 | neighbors=[FIFOAllocation(), PlannerPODetail.jsx]
- "components_formattedtext_isreferenceslist": "isReferencesList()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L24 | neighbors=[FormattedText.jsx, FormattedText()]
- "components_formattedtext_isrolestable": "isRolesTable()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L18 | neighbors=[FormattedText.jsx, FormattedText()]
- "components_formattedtext_parsereferences": "parseReferences()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L83 | neighbors=[FormattedText.jsx, FormattedText()]
- "components_formattedtext_parserolestable": "parseRolesTable()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L29 | neighbors=[FormattedText.jsx, FormattedText()]
- "components_plannercalendar_binsremainingcolor": "binsRemainingColor()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L18 | neighbors=[PlannerCalendar.jsx, DayCard()]
- "components_plannercalendar_daytotalbins": "dayTotalBins()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L24 | neighbors=[PlannerCalendar.jsx, DayCard()]
- "components_plannercalendar_daytotalcases": "dayTotalCases()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L32 | neighbors=[PlannerCalendar.jsx, DayCard()]
- "components_plannercalendar_pourrow": "PourRow()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L51 | neighbors=[PlannerCalendar.jsx, getSkuByCode()]
- "github-actions-workflow": "CI/CD: GitHub Actions Auto-Deploy" | kind=code-symbol | source=.github/workflows/deploy.yml | neighbors=[Deployment: Google Cloud Run (us-east1), GCP Service Account — github-deploy for…]
- "hooks_useapi_apiget": "apiGet()" | kind=code-symbol | source=client/src/hooks/useApi.js:L36 | neighbors=[useApi.js, CAPADetail.jsx]
- "hooks_useauth_authprovider": "AuthProvider()" | kind=code-symbol | source=client/src/hooks/useAuth.jsx:L5 | neighbors=[useAuth.jsx, main.jsx]
- "hooks_usewebsocket": "useWebSocket.js" | kind=code-symbol | source=client/src/hooks/useWebSocket.js:L1 | neighbors=[useWebSocket(), App.jsx]
- "hudson-liao": "Hudson Liao — Project Owner" | kind=entity | source=CLAUDE.md | neighbors=[Claude Code Worker Instructions for KKI…, KKI Pending Tasks — Veronica's Labels T…]
- "inventory_sos_ensuretable": "ensureTable()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L27 | neighbors=[sos.js, getAccessToken()]
- "migrations_02_sops_sop_attachments": "sop_attachments" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L40 | neighbors=[02-sops.sql, sops]
- "migrations_02_sops_sop_comments": "sop_comments" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L49 | neighbors=[02-sops.sql, sops]
- "migrations_02_sops_sop_files": "sop_files" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L57 | neighbors=[02-sops.sql, sops]
- "migrations_02_sops_sop_form_entries": "sop_form_entries" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L96 | neighbors=[02-sops.sql, sop_forms]
- "migrations_02_sops_sop_form_fields": "sop_form_fields" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L84 | neighbors=[02-sops.sql, sop_forms]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-041.json

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
