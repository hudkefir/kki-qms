# Node Description Batch 44 of 77

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

- "pages_batchtestdetail_batchtestdetail": "BatchTestDetail()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L316 | neighbors=[BatchTestDetail.jsx, groupResults()]
- "pages_batchtestdetail_certificateofanalysis": "CertificateOfAnalysis()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L165 | neighbors=[BatchTestDetail.jsx, groupResults()]
- "pages_batchtestdetail_gettestdisplay": "getTestDisplay()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L43 | neighbors=[BatchTestDetail.jsx, TestTooltip()]
- "pages_batchtestdetail_testtooltip": "TestTooltip()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L48 | neighbors=[BatchTestDetail.jsx, getTestDisplay()]
- "pages_batchtesting_certificateofanalysis": "CertificateOfAnalysis()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L113 | neighbors=[BatchTesting.jsx, groupResults()]
- "pages_batchtesting_groupresults": "groupResults()" | kind=code-symbol | source=client/src/pages/BatchTesting.jsx:L92 | neighbors=[BatchTesting.jsx, CertificateOfAnalysis()]
- "pages_batchtesting_working_certificateofanalysis": "CertificateOfAnalysis()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L110 | neighbors=[BatchTesting-working.jsx, groupResults()]
- "pages_batchtesting_working_groupresults": "groupResults()" | kind=code-symbol | source=client/src/pages/BatchTesting-working.jsx:L89 | neighbors=[BatchTesting-working.jsx, CertificateOfAnalysis()]
- "pages_capadetail_datepill": "DatePill()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L3187 | neighbors=[CAPADetail.jsx, formatDate()]
- "pages_capadetail_lifecyclebar": "LifecycleBar()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L606 | neighbors=[CAPADetail.jsx, lifecycleIndex()]
- "pages_capadetail_statuslabel": "statusLabel()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L149 | neighbors=[CAPADetail.jsx, CAPADetail()]
- "pages_ccrs_ccr_status_labels": "CCR_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L21 | neighbors=[CCRDetail.jsx, CCRs.jsx]
- "pages_ccrs_ccr_status_options": "CCR_STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L11 | neighbors=[CCRDetail.jsx, CCRs.jsx]
- "pages_ccrs_ccrstatusbadge": "CCRStatusBadge()" | kind=code-symbol | source=client/src/pages/CCRs.jsx:L29 | neighbors=[CCRDetail.jsx, CCRs.jsx]
- "pages_changerequests_category_labels": "CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L34 | neighbors=[ChangeRequestDetail.jsx, ChangeRequests.jsx]
- "pages_changerequests_cc_status_labels": "CC_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L23 | neighbors=[ChangeRequestDetail.jsx, ChangeRequests.jsx]
- "pages_changerequests_cc_status_options": "CC_STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L10 | neighbors=[ChangeRequestDetail.jsx, ChangeRequests.jsx]
- "pages_changerequests_ccstatusbadge": "CCStatusBadge()" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L118 | neighbors=[ChangeRequestDetail.jsx, ChangeRequests.jsx]
- "pages_changerequests_classificationbadge": "ClassificationBadge()" | kind=code-symbol | source=client/src/pages/ChangeRequests.jsx:L126 | neighbors=[ChangeRequestDetail.jsx, ChangeRequests.jsx]
- "pages_complaints_issue_types": "ISSUE_TYPES" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L18 | neighbors=[ComplaintDetail.jsx, Complaints.jsx]
- "pages_complaints_product_options": "PRODUCT_OPTIONS" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L11 | neighbors=[ComplaintDetail.jsx, Complaints.jsx]
- "pages_complaints_severity_options": "SEVERITY_OPTIONS" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L23 | neighbors=[ComplaintDetail.jsx, Complaints.jsx]
- "pages_complaints_status_labels": "STATUS_LABELS" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L41 | neighbors=[ComplaintDetail.jsx, Complaints.jsx]
- "pages_complaints_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/Complaints.jsx:L24 | neighbors=[ComplaintDetail.jsx, Complaints.jsx]
- "pages_dashboard_dashboard": "Dashboard()" | kind=code-symbol | source=client/src/pages/Dashboard.jsx:L26 | neighbors=[Dashboard.jsx, getDaysUntilAudit()]
- "pages_dashboard_getdaysuntilaudit": "getDaysUntilAudit()" | kind=code-symbol | source=client/src/pages/Dashboard.jsx:L20 | neighbors=[Dashboard.jsx, Dashboard()]
- "pages_deviations_dev_category_labels": "DEV_CATEGORY_LABELS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L29 | neighbors=[DeviationDetail.jsx, Deviations.jsx]
- "pages_deviations_dev_status_labels": "DEV_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L20 | neighbors=[DeviationDetail.jsx, Deviations.jsx]
- "pages_deviations_dev_status_options": "DEV_STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L11 | neighbors=[DeviationDetail.jsx, Deviations.jsx]
- "pages_deviations_devclassificationbadge": "DevClassificationBadge()" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L168 | neighbors=[DeviationDetail.jsx, Deviations.jsx]
- "pages_deviations_devstatusbadge": "DevStatusBadge()" | kind=code-symbol | source=client/src/pages/Deviations.jsx:L160 | neighbors=[DeviationDetail.jsx, Deviations.jsx]
- "pages_documentlibrary_documentlibrary": "DocumentLibrary()" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L89 | neighbors=[DocumentLibrary.jsx, useDebounce()]
- "pages_documentlibrary_usedebounce": "useDebounce()" | kind=code-symbol | source=client/src/pages/DocumentLibrary.jsx:L13 | neighbors=[DocumentLibrary.jsx, DocumentLibrary()]
- "pages_equipment_equipmentstatusbadge": "EquipmentStatusBadge()" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L27 | neighbors=[Equipment.jsx, EquipmentDetail.jsx]
- "pages_equipment_status_labels": "STATUS_LABELS" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L16 | neighbors=[Equipment.jsx, EquipmentDetail.jsx]
- "pages_inventorycounts_getlocaldatetime": "getLocalDatetime()" | kind=code-symbol | source=client/src/pages/InventoryCounts.jsx:L19 | neighbors=[InventoryCounts.jsx, InventoryCounts()]
- "pages_inventorycounts_inventorycounts": "InventoryCounts()" | kind=code-symbol | source=client/src/pages/InventoryCounts.jsx:L25 | neighbors=[InventoryCounts.jsx, getLocalDatetime()]
- "pages_picklists_getlocaldatetime": "getLocalDatetime()" | kind=code-symbol | source=client/src/pages/PickLists.jsx:L16 | neighbors=[PickLists.jsx, PickLists()]
- "pages_picklists_picklists": "PickLists()" | kind=code-symbol | source=client/src/pages/PickLists.jsx:L22 | neighbors=[PickLists.jsx, getLocalDatetime()]
- "pages_planner_addbatchmodal": "AddBatchModal()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L634 | neighbors=[Planner.jsx, fmt()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-043.json

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
