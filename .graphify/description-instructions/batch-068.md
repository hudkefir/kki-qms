# Node Description Batch 69 of 77

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

- "pages_plannerbatchdetail_plannerbatchdetail": "PlannerBatchDetail()" | kind=code-symbol | source=client/src/pages/PlannerBatchDetail.jsx:L27 | neighbors=[PlannerBatchDetail.jsx]
- "pages_plannerbatchdetail_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/pages/PlannerBatchDetail.jsx:L18 | neighbors=[PlannerBatchDetail.jsx]
- "pages_plannerbatchdetail_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/PlannerBatchDetail.jsx:L10 | neighbors=[PlannerBatchDetail.jsx]
- "pages_plannerbatchdetail_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/PlannerBatchDetail.jsx:L12 | neighbors=[PlannerBatchDetail.jsx]
- "pages_plannerpodetail_sku_labels": "SKU_LABELS" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L19 | neighbors=[PlannerPODetail.jsx]
- "pages_plannerpodetail_skus": "SKUS" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L10 | neighbors=[PlannerPODetail.jsx]
- "pages_plannerpodetail_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/PlannerPODetail.jsx:L21 | neighbors=[PlannerPODetail.jsx]
- "pages_recallcenter_classification_styles": "CLASSIFICATION_STYLES" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L32 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_crisis_severity_styles": "CRISIS_SEVERITY_STYLES" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L55 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_crisistab": "CrisisTab()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L732 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_dashboardtab": "DashboardTab()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L298 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_recall_status_styles": "RECALL_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L20 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_recallcenter": "RecallCenter()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L133 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_recallstab": "RecallsTab()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L416 | neighbors=[RecallCenter.jsx]
- "pages_recallcenter_traceabilitytab": "TraceabilityTab()" | kind=code-symbol | source=client/src/pages/RecallCenter.jsx:L608 | neighbors=[RecallCenter.jsx]
- "pages_recalldetail_classification_guidance": "CLASSIFICATION_GUIDANCE" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L38 | neighbors=[RecallDetail.jsx]
- "pages_recalldetail_recalldetail": "RecallDetail()" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L64 | neighbors=[RecallDetail.jsx]
- "pages_recalldetail_status_guidance": "STATUS_GUIDANCE" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L27 | neighbors=[RecallDetail.jsx]
- "pages_recalldetail_statusprogressbar": "StatusProgressBar()" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L44 | neighbors=[RecallDetail.jsx]
- "pages_recalldetail_timelineitem": "TimelineItem()" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L641 | neighbors=[RecallDetail.jsx]
- "pages_recalldetail_workflow_stages": "WORKFLOW_STAGES" | kind=code-symbol | source=client/src/pages/RecallDetail.jsx:L16 | neighbors=[RecallDetail.jsx]
- "pages_sopcategoriesadmin_sopcategoriesadmin": "SOPCategoriesAdmin()" | kind=code-symbol | source=client/src/pages/SOPCategoriesAdmin.jsx:L7 | neighbors=[SOPCategoriesAdmin.jsx]
- "pages_sopdetail_audit_statuses": "AUDIT_STATUSES" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L82 | neighbors=[SOPDetail.jsx]
- "pages_sopdetail_sopdetail": "SOPDetail()" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L84 | neighbors=[SOPDetail.jsx]
- "pages_sopdetail_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L81 | neighbors=[SOPDetail.jsx]
- "pages_sopdetail_tabs": "TABS" | kind=code-symbol | source=client/src/pages/SOPDetail.jsx:L72 | neighbors=[SOPDetail.jsx]
- "pages_soplibrary_soplibrary": "SOPLibrary()" | kind=code-symbol | source=client/src/pages/SOPLibrary.jsx:L25 | neighbors=[SOPLibrary.jsx]
- "pages_soplibrary_status_options": "STATUS_OPTIONS" | kind=code-symbol | source=client/src/pages/SOPLibrary.jsx:L23 | neighbors=[SOPLibrary.jsx]
- "pages_supplierdetail_risk_config": "RISK_CONFIG" | kind=code-symbol | source=client/src/pages/SupplierDetail.jsx:L16 | neighbors=[SupplierDetail.jsx]
- "pages_supplierdetail_status_config": "STATUS_CONFIG" | kind=code-symbol | source=client/src/pages/SupplierDetail.jsx:L9 | neighbors=[SupplierDetail.jsx]
- "pages_supplierdetail_supplierdetail": "SupplierDetail()" | kind=code-symbol | source=client/src/pages/SupplierDetail.jsx:L22 | neighbors=[SupplierDetail.jsx]
- "pages_suppliers_risk_config": "RISK_CONFIG" | kind=code-symbol | source=client/src/pages/Suppliers.jsx:L16 | neighbors=[Suppliers.jsx]
- "pages_suppliers_status_config": "STATUS_CONFIG" | kind=code-symbol | source=client/src/pages/Suppliers.jsx:L9 | neighbors=[Suppliers.jsx]
- "pages_suppliers_suppliers": "Suppliers()" | kind=code-symbol | source=client/src/pages/Suppliers.jsx:L22 | neighbors=[Suppliers.jsx]
- "pages_traceabilitydetail_traceabilitydetail": "TraceabilityDetail()" | kind=code-symbol | source=client/src/pages/TraceabilityDetail.jsx:L12 | neighbors=[TraceabilityDetail.jsx]
- "pages_usermanagement_role_colors": "ROLE_COLORS" | kind=code-symbol | source=client/src/pages/UserManagement.jsx:L9 | neighbors=[UserManagement.jsx]
- "pages_usermanagement_role_descriptions": "ROLE_DESCRIPTIONS" | kind=code-symbol | source=client/src/pages/UserManagement.jsx:L15 | neighbors=[UserManagement.jsx]
- "pages_usermanagement_roles": "ROLES" | kind=code-symbol | source=client/src/pages/UserManagement.jsx:L8 | neighbors=[UserManagement.jsx]
- "pages_usermanagement_usermanagement": "UserManagement()" | kind=code-symbol | source=client/src/pages/UserManagement.jsx:L22 | neighbors=[UserManagement.jsx]
- "pages_workorderdetail_priority_styles": "PRIORITY_STYLES" | kind=code-symbol | source=client/src/pages/WorkOrderDetail.jsx:L12 | neighbors=[WorkOrderDetail.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-068.json

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
