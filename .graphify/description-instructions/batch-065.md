# Node Description Batch 66 of 77

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

- "pages_complaints_severity_styles": "SEVERITY_STYLES" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L26 | neighbors=[Complaints.jsx]
- "pages_complaints_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L33 | neighbors=[Complaints.jsx]
- "pages_crisisdetail_crisisdetail": "CrisisDetail()" | kind=code-symbol | source=client/src/pages/CrisisDetail.jsx:L23 | neighbors=[CrisisDetail.jsx]
- "pages_crisisdetail_notification_contacts": "NOTIFICATION_CONTACTS" | kind=code-symbol | source=client/src/pages/CrisisDetail.jsx:L12 | neighbors=[CrisisDetail.jsx]
- "pages_dailytasks_category_colors": "CATEGORY_COLORS" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L18 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_category_order": "CATEGORY_ORDER" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L36 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_dailytasks": "DailyTasks()" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L44 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_default_cat": "DEFAULT_CAT" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L30 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_formattime": "formatTime()" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L38 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_getcat": "getCat()" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L32 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_kanbancolumn": "KanbanColumn()" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L1081 | neighbors=[DailyTasks.jsx]
- "pages_dailytasks_shift_options": "SHIFT_OPTIONS" | kind=code-symbol | source=client/src/pages/DailyTasks.jsx:L12 | neighbors=[DailyTasks.jsx]
- "pages_deviationdetail_capa_status_styles": "CAPA_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L16 | neighbors=[DeviationDetail.jsx]
- "pages_deviationdetail_deviationdetail": "DeviationDetail()" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L41 | neighbors=[DeviationDetail.jsx]
- "pages_deviationdetail_disposition_labels": "DISPOSITION_LABELS" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L24 | neighbors=[DeviationDetail.jsx]
- "pages_deviationdetail_disposition_styles": "DISPOSITION_STYLES" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L29 | neighbors=[DeviationDetail.jsx]
- "pages_deviationdetail_root_cause_labels": "ROOT_CAUSE_LABELS" | kind=code-symbol | source=client/src/pages/DeviationDetail.jsx:L37 | neighbors=[DeviationDetail.jsx]
- "pages_deviations_category_fields": "CATEGORY_FIELDS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L78 | neighbors=[Deviations.jsx]
- "pages_deviations_dev_category_descriptions": "DEV_CATEGORY_DESCRIPTIONS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L61 | neighbors=[Deviations.jsx]
- "pages_deviations_dev_category_icons": "DEV_CATEGORY_ICONS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L45 | neighbors=[Deviations.jsx]
- "pages_deviations_dev_status_styles": "DEV_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L12 | neighbors=[Deviations.jsx]
- "pages_deviations_deviations": "Deviations()" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L179 | neighbors=[Deviations.jsx]
- "pages_documentguide_doc_types": "DOC_TYPES" | kind=code-symbol | source=client/src/pages/DocumentGuide.jsx:L12 | neighbors=[DocumentGuide.jsx]
- "pages_documentguide_documentguide": "DocumentGuide()" | kind=code-symbol | source=client/src/pages/DocumentGuide.jsx:L161 | neighbors=[DocumentGuide.jsx]
- "pages_documentguide_steps": "STEPS" | kind=code-symbol | source=client/src/pages/DocumentGuide.jsx:L117 | neighbors=[DocumentGuide.jsx]
- "pages_documentlibrary_category_options": "CATEGORY_OPTIONS" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L22 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_doc_type_colors": "DOC_TYPE_COLORS" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L43 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_document_type_options": "DOCUMENT_TYPE_OPTIONS" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L30 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_formatfilesize": "formatFileSize()" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L68 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_getfileicon": "getFileIcon()" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L76 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_ispdf": "isPdf()" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L85 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_sort_options": "SORT_OPTIONS" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L60 | neighbors=[DocumentLibrary.jsx]
- "pages_documentlibrary_version_type_options": "VERSION_TYPE_OPTIONS" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L55 | neighbors=[DocumentLibrary.jsx]
- "pages_emailscan_emailscan": "EmailScan()" | kind=code-symbol | source=client/src/pages/EmailScan.jsx:L6 | neighbors=[EmailScan.jsx]
- "pages_equipment_equipment": "Equipment()" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L37 | neighbors=[Equipment.jsx]
- "pages_equipment_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L10 | neighbors=[Equipment.jsx]
- "pages_equipmentdetail_category_labels": "CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L12 | neighbors=[EquipmentDetail.jsx]
- "pages_equipmentdetail_equipmentdetail": "EquipmentDetail()" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L44 | neighbors=[EquipmentDetail.jsx]
- "pages_equipmentdetail_getduecolor": "getDueColor()" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L33 | neighbors=[EquipmentDetail.jsx]
- "pages_fermentation_agebadge": "AgeBadge()" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L45 | neighbors=[Fermentation.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-065.json

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
