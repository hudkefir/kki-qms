# Node Description Batch 60 of 77

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
LANGUAGE: each entry has a `lang=` marker giving the language of its source.
Write that entry's description in EXACTLY that language. Do not translate to
a single common language — match each node's source language individually.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "assets_index_cfxlhkch_zr": "Zr" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L227 | neighbors=[index-CFxLHkCh.js] | lang=en
- "assets_index_cfxlhkch_zs_constructor": ".constructor()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[zs] | lang=en
- "assets_index_cfxlhkch_zy": "ZY()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js] | lang=en
- "backup_backup_qms_rationale_104": "Logical (plain-SQL) pg_dump, gzipped. `conn` is a libpq URL string or a     dict" | kind=entity | source=scripts/backup/backup_qms.py:L104 | neighbors=[dump_pg()] | lang=pt
- "backup_backup_qms_rationale_155": "PostgREST root returns an OpenAPI doc whose `definitions` keys are tables." | kind=entity | source=scripts/backup/backup_qms.py:L155 | neighbors=[_list_tables()] | lang=en
- "backup_backup_qms_rationale_168": "Restrict to a single domain's tables via include_prefixes / include_tables." | kind=entity | source=scripts/backup/backup_qms.py:L168 | neighbors=[_scope_tables()] | lang=en
- "backup_backup_qms_rationale_245": "Activate the backup service account inside an isolated gcloud config     (does n" | kind=entity | source=scripts/backup/backup_qms.py:L245 | neighbors=[_ensure_sa_active()] | lang=en
- "backup_backup_qms_rationale_349": "Persist a machine-readable status file (mirrors the production job's     /tmp/kk" | kind=entity | source=scripts/backup/backup_qms.py:L349 | neighbors=[write_status()] | lang=en
- "backup_backup_qms_rationale_61": "Return a dict with one of: pg (conn dict)  OR  db_url  OR  (project_url, secret_" | kind=entity | source=scripts/backup/backup_qms.py:L61 | neighbors=[resolve_domain_creds()] | lang=en
- "backup_backup_qms_rationale_94": "pg_dump -t patterns mirroring _scope_tables: prefix -> 'prefix*', exact -> name." | kind=entity | source=scripts/backup/backup_qms.py:L94 | neighbors=[_table_patterns()] | lang=en
- "backup_test_backup": "test_backup.py" | kind=code-symbol | source=scripts/backup/test_backup.py:L1 | neighbors=[main()] | lang=en
- "backup_test_backup_main": "main()" | kind=code-symbol | source=scripts/backup/test_backup.py:L19 | neighbors=[test_backup.py] | lang=en
- "bug-003-stack-traces": "BUG-003: Stack Traces Leaked in Error Responses" | kind=entity | source=BUG_REPORT.md | neighbors=[Security & Bug Audit Report] | lang=en
- "bug-006-cors-all-origins": "BUG-006: CORS Allows All Origins" | kind=entity | source=BUG_REPORT.md | neighbors=[Security & Bug Audit Report] | lang=en
- "changelog-build-153": "Build #153 — 2026-07-05: SOP Parse-on-Upload, Public Repo" | kind=entity | source=CHANGELOG.md | neighbors=[KKI QMS — Quality Management System] | lang=en
- "cloudflare-setup": "Cloudflare Professional QMS Setup Checklist" | kind=entity | source=CLOUDFLARE_SETUP_CHECKLIST.md | neighbors=[Deployment: Google Cloud Run (us-east1)] | lang=en
- "components_accessdenied_accessdenied": "AccessDenied()" | kind=code-symbol | source=client/src/components/AccessDenied.jsx:L5 | neighbors=[AccessDenied.jsx] | lang=en
- "components_aisuggestbutton_aisuggestbutton": "AiSuggestButton()" | kind=code-symbol | source=client/src/components/AiSuggestButton.jsx:L4 | neighbors=[AiSuggestButton.jsx] | lang=en
- "components_batchtestrecommendations_batchtestrecommendations": "BatchTestRecommendations()" | kind=code-symbol | source=client/src/components/BatchTestRecommendations.jsx:L29 | neighbors=[BatchTestRecommendations.jsx] | lang=en
- "components_batchtestrecommendations_getprioritylevel": "getPriorityLevel()" | kind=code-symbol | source=client/src/components/BatchTestRecommendations.jsx:L22 | neighbors=[BatchTestRecommendations.jsx] | lang=en
- "components_batchtestrecommendations_priority_thresholds": "PRIORITY_THRESHOLDS" | kind=code-symbol | source=client/src/components/BatchTestRecommendations.jsx:L16 | neighbors=[BatchTestRecommendations.jsx] | lang=en
- "components_batchtestrecommendations_profile_labels": "PROFILE_LABELS" | kind=code-symbol | source=client/src/components/BatchTestRecommendations.jsx:L9 | neighbors=[BatchTestRecommendations.jsx] | lang=en
- "components_buildversion_buildversion": "BuildVersion()" | kind=code-symbol | source=client/src/components/BuildVersion.jsx:L4 | neighbors=[BuildVersion.jsx] | lang=en
- "components_ccrwizard_ccrwizard": "CCRWizard()" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L45 | neighbors=[CCRWizard.jsx] | lang=en
- "components_ccrwizard_likelihood_options": "LIKELIHOOD_OPTIONS" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L28 | neighbors=[CCRWizard.jsx] | lang=en
- "components_ccrwizard_severity_options": "SEVERITY_OPTIONS" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L21 | neighbors=[CCRWizard.jsx] | lang=en
- "components_ccrwizard_steps": "STEPS" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L11 | neighbors=[CCRWizard.jsx] | lang=en
- "components_ccrwizard_workstream_partners": "WORKSTREAM_PARTNERS" | kind=code-symbol | source=client/src/components/CCRWizard.jsx:L36 | neighbors=[CCRWizard.jsx] | lang=en
- "components_chatsidebar_chatsidebar": "ChatSidebar()" | kind=code-symbol | source=client/src/components/ChatSidebar.jsx:L8 | neighbors=[ChatSidebar.jsx] | lang=en
- "components_fifoallocation_fifoallocation": "FIFOAllocation()" | kind=code-symbol | source=client/src/components/FIFOAllocation.jsx:L3 | neighbors=[FIFOAllocation.jsx] | lang=en
- "components_formattedtext_renderinline": "renderInline()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L3 | neighbors=[FormattedText.jsx] | lang=en
- "components_inventorycount_inventorycount": "InventoryCount()" | kind=code-symbol | source=client/src/components/InventoryCount.jsx:L7 | neighbors=[InventoryCount.jsx] | lang=en
- "components_inventorycount_sku_labels": "SKU_LABELS" | kind=code-symbol | source=client/src/components/InventoryCount.jsx:L5 | neighbors=[InventoryCount.jsx] | lang=en
- "components_linkeddocuments_category_colors": "CATEGORY_COLORS" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L6 | neighbors=[LinkedDocuments.jsx] | lang=en
- "components_linkeddocuments_formatdatetime": "formatDateTime()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L22 | neighbors=[LinkedDocuments.jsx] | lang=en
- "components_linkeddocuments_formatfilesize": "formatFileSize()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L14 | neighbors=[LinkedDocuments.jsx] | lang=en
- "components_linkeddocuments_getfileicon": "getFileIcon()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L28 | neighbors=[LinkedDocuments.jsx] | lang=en
- "components_loadingspinner_loadingspinner": "LoadingSpinner()" | kind=code-symbol | source=client/src/components/LoadingSpinner.jsx:L3 | neighbors=[LoadingSpinner.jsx] | lang=en
- "components_modal_modal": "Modal()" | kind=code-symbol | source=client/src/components/Modal.jsx:L9 | neighbors=[Modal.jsx] | lang=en
- "components_modal_size_classes": "SIZE_CLASSES" | kind=code-symbol | source=client/src/components/Modal.jsx:L4 | neighbors=[Modal.jsx] | lang=en

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-059.json

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
