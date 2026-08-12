# Node Description Batch 61 of 77

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

- "components_plannercalendar_plannercalendar": "PlannerCalendar()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L244 | neighbors=[PlannerCalendar.jsx]
- "components_plannercalendar_skus": "SKUS" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L3 | neighbors=[PlannerCalendar.jsx]
- "components_protectedroute_protectedroute": "ProtectedRoute()" | kind=code-symbol | source=client/src/components/ProtectedRoute.jsx:L12 | neighbors=[ProtectedRoute.jsx]
- "components_recordlinker_recordlinker": "RecordLinker()" | kind=code-symbol | source=client/src/components/RecordLinker.jsx:L31 | neighbors=[RecordLinker.jsx]
- "components_recordlinker_suggestion_icons": "SUGGESTION_ICONS" | kind=code-symbol | source=client/src/components/RecordLinker.jsx:L20 | neighbors=[RecordLinker.jsx]
- "components_recordlinker_type_config": "TYPE_CONFIG" | kind=code-symbol | source=client/src/components/RecordLinker.jsx:L10 | neighbors=[RecordLinker.jsx]
- "components_sopforms_editfieldinline": "EditFieldInline()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L322 | neighbors=[SOPForms.jsx]
- "components_sopforms_entriestable": "EntriesTable()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L531 | neighbors=[SOPForms.jsx]
- "components_sopforms_field_types": "FIELD_TYPES" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L10 | neighbors=[SOPForms.jsx]
- "components_sopforms_fieldtypeicon": "FieldTypeIcon()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L343 | neighbors=[SOPForms.jsx]
- "components_sopforms_filloutform": "FillOutForm()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L358 | neighbors=[SOPForms.jsx]
- "components_sopforms_form_types": "FORM_TYPES" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L21 | neighbors=[SOPForms.jsx]
- "components_sopforms_formbuilder": "FormBuilder()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L156 | neighbors=[SOPForms.jsx]
- "components_sopforms_formfieldinput": "FormFieldInput()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L456 | neighbors=[SOPForms.jsx]
- "components_sopforms_formlist": "FormList()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L39 | neighbors=[SOPForms.jsx]
- "components_sopforms_sopforms": "SOPForms()" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L662 | neighbors=[SOPForms.jsx]
- "components_sopforms_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/components/SOPForms.jsx:L29 | neighbors=[SOPForms.jsx]
- "components_statusbadge_audit_styles": "AUDIT_STYLES" | kind=code-symbol | source=client/src/components/StatusBadge.jsx:L11 | neighbors=[StatusBadge.jsx]
- "components_statusbadge_labels": "LABELS" | kind=code-symbol | source=client/src/components/StatusBadge.jsx:L18 | neighbors=[StatusBadge.jsx]
- "components_statusbadge_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/components/StatusBadge.jsx:L3 | neighbors=[StatusBadge.jsx]
- "components_statusbadge_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/components/StatusBadge.jsx:L30 | neighbors=[StatusBadge.jsx]
- "components_taskcreator_formatdate": "formatDate()" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L28 | neighbors=[TaskCreator.jsx]
- "components_taskcreator_priority_colors": "PRIORITY_COLORS" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L7 | neighbors=[TaskCreator.jsx]
- "components_taskcreator_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L14 | neighbors=[TaskCreator.jsx]
- "components_taskcreator_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L21 | neighbors=[TaskCreator.jsx]
- "components_taskcreator_taskcreator": "TaskCreator()" | kind=code-symbol | source=client/src/components/TaskCreator.jsx:L33 | neighbors=[TaskCreator.jsx]
- "cost-optimized-monitoring": "Cost-Optimized QMS Monitoring — 6-Hour Intervals" | kind=entity | source=COST_OPTIMIZED_MONITORING.md | neighbors=[KKI QMS — Quality Management System]
- "database-pg": "database-pg.js — PostgreSQL Connection Pool & Abstraction" | kind=code-symbol | source=server/src/database-pg.js | neighbors=[Supabase PostgreSQL — Production Databa…]
- "docker-config": "Dockerfile — Cloud Run Container Configuration" | kind=code-symbol | source=Dockerfile | neighbors=[Deployment: Google Cloud Run (us-east1)]
- "documents_documents_router": "router" | kind=code-symbol | source=server/src/routes/documents/documents.js:L23 | neighbors=[documents.js]
- "documents_documents_upload": "upload" | kind=code-symbol | source=server/src/routes/documents/documents.js:L9 | neighbors=[documents.js]
- "documents_files_bumpmajor": "bumpMajor()" | kind=code-symbol | source=server/src/routes/documents/files.js:L54 | neighbors=[files.js]
- "documents_files_bumpversion": "bumpVersion()" | kind=code-symbol | source=server/src/routes/documents/files.js:L37 | neighbors=[files.js]
- "documents_files_compareversions": "compareVersions()" | kind=code-symbol | source=server/src/routes/documents/files.js:L70 | neighbors=[files.js]
- "documents_files_router": "router" | kind=code-symbol | source=server/src/routes/documents/files.js:L81 | neighbors=[files.js]
- "documents_files_safeheaderfilename": "safeHeaderFilename()" | kind=code-symbol | source=server/src/routes/documents/files.js:L26 | neighbors=[files.js]
- "documents_files_upload": "upload" | kind=code-symbol | source=server/src/routes/documents/files.js:L11 | neighbors=[files.js]
- "documents_simpledocs_generatesopdescription": "generateSOPDescription()" | kind=code-symbol | source=server/src/routes/documents/simpleDocs.js:L64 | neighbors=[simpleDocs.js]
- "documents_simpledocs_router": "router" | kind=code-symbol | source=server/src/routes/documents/simpleDocs.js:L11 | neighbors=[simpleDocs.js]
- "documents_simpledocs_upload": "upload" | kind=code-symbol | source=server/src/routes/documents/simpleDocs.js:L15 | neighbors=[simpleDocs.js]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-060.json

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
