# Node Description Batch 65 of 77

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

- "pages_capadetail_audittrailsection": "AuditTrailSection()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L801 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_batch_status_colors": "BATCH_STATUS_COLORS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L113 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_card": "Card()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L168 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_collapsiblesection": "CollapsibleSection()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L258 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_editablecard": "EditableCard()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L178 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_formatdatetime": "formatDateTime()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L143 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_formatfilesize": "formatFileSize()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L159 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_lifecycle_steps": "LIFECYCLE_STEPS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L127 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_linkpicker": "LinkPicker()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L756 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_root_cause_descriptions": "ROOT_CAUSE_DESCRIPTIONS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L39 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_root_cause_labels": "ROOT_CAUSE_LABELS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L34 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_rootcausestructuredform": "RootCauseStructuredForm()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L863 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_source_colors": "SOURCE_COLORS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L84 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_stage_gates": "STAGE_GATES" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L554 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L22 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L32 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_structuredreadonly": "StructuredReadOnly()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L1336 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_tabs": "TABS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L119 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_update_type_colors": "UPDATE_TYPE_COLORS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L97 | neighbors=[CAPADetail.jsx]
- "pages_capadetail_update_type_options": "UPDATE_TYPE_OPTIONS" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L105 | neighbors=[CAPADetail.jsx]
- "pages_capas_capa_category_config": "CAPA_CATEGORY_CONFIG" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L43 | neighbors=[CAPAs.jsx]
- "pages_capas_capa_status_labels": "CAPA_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L23 | neighbors=[CAPAs.jsx]
- "pages_capas_capa_status_options": "CAPA_STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L10 | neighbors=[CAPAs.jsx]
- "pages_capas_capa_status_styles": "CAPA_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L12 | neighbors=[CAPAs.jsx]
- "pages_capas_capas": "CAPAs()" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L172 | neighbors=[CAPAs.jsx]
- "pages_capas_capastatusbadge": "CAPAStatusBadge()" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L141 | neighbors=[CAPAs.jsx]
- "pages_capas_empty_form": "EMPTY_FORM" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L150 | neighbors=[CAPAs.jsx]
- "pages_capas_source_labels": "SOURCE_LABELS" | kind=code-symbol | source=client/src/pages/CAPAs.jsx:L34 | neighbors=[CAPAs.jsx]
- "pages_ccrdetail_action_status_styles": "ACTION_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/CCRDetail.jsx:L17 | neighbors=[CCRDetail.jsx]
- "pages_ccrdetail_ccrdetail": "CCRDetail()" | kind=code-symbol | source=client/src/pages/CCRDetail.jsx:L24 | neighbors=[CCRDetail.jsx]
- "pages_ccrs_ccr_status_styles": "CCR_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L13 | neighbors=[CCRs.jsx]
- "pages_ccrs_ccrs": "CCRs()" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L39 | neighbors=[CCRs.jsx]
- "pages_changerequestdetail_capa_status_styles": "CAPA_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/ChangeRequestDetail.jsx:L15 | neighbors=[ChangeRequestDetail.jsx]
- "pages_changerequestdetail_changerequestdetail": "ChangeRequestDetail()" | kind=code-symbol | source=client/src/pages/ChangeRequestDetail.jsx:L23 | neighbors=[ChangeRequestDetail.jsx]
- "pages_changerequests_cc_status_styles": "CC_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L12 | neighbors=[ChangeRequests.jsx]
- "pages_changerequests_changerequests": "ChangeRequests()" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L137 | neighbors=[ChangeRequests.jsx]
- "pages_changerequests_classification_styles": "CLASSIFICATION_STYLES" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L112 | neighbors=[ChangeRequests.jsx]
- "pages_changerequests_cr_category_config": "CR_CATEGORY_CONFIG" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L40 | neighbors=[ChangeRequests.jsx]
- "pages_complaintdetail_complaintdetail": "ComplaintDetail()" | kind=code-symbol | source=client/src/pages/ComplaintDetail.jsx:L17 | neighbors=[ComplaintDetail.jsx]
- "pages_complaints_complaints": "Complaints()" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L67 | neighbors=[Complaints.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-064.json

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
