# Node Description Batch 67 of 77

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

- "pages_fermentation_daysbetween": "daysBetween()" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L38 | neighbors=[Fermentation.jsx]
- "pages_fermentation_fermentation": "Fermentation()" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L62 | neighbors=[Fermentation.jsx]
- "pages_fermentation_flavours": "FLAVOURS" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L8 | neighbors=[Fermentation.jsx]
- "pages_fermentation_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L57 | neighbors=[Fermentation.jsx]
- "pages_fermentation_status_icons": "STATUS_ICONS" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L22 | neighbors=[Fermentation.jsx]
- "pages_fermentation_status_labels": "STATUS_LABELS" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L16 | neighbors=[Fermentation.jsx]
- "pages_fermentation_status_styles": "STATUS_STYLES" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L10 | neighbors=[Fermentation.jsx]
- "pages_fermentation_statusbadge": "StatusBadge()" | kind=code-symbol | source=client/src/pages/Fermentation.jsx:L28 | neighbors=[Fermentation.jsx]
- "pages_inventorycountdetail_inventorycountdetail": "InventoryCountDetail()" | kind=code-symbol | source=client/src/pages/InventoryCountDetail.jsx:L8 | neighbors=[InventoryCountDetail.jsx]
- "pages_inventorycounts_sku_options": "SKU_OPTIONS" | kind=code-symbol | source=client/src/pages/InventoryCounts.jsx:L9 | neighbors=[InventoryCounts.jsx]
- "pages_journal_formatfull": "formatFull()" | kind=code-symbol | source=client/src/pages/Journal.jsx:L18 | neighbors=[Journal.jsx]
- "pages_journal_journal": "Journal()" | kind=code-symbol | source=client/src/pages/Journal.jsx:L48 | neighbors=[Journal.jsx]
- "pages_journal_parsetags": "parseTags()" | kind=code-symbol | source=client/src/pages/Journal.jsx:L26 | neighbors=[Journal.jsx]
- "pages_journal_tag_colors": "TAG_COLORS" | kind=code-symbol | source=client/src/pages/Journal.jsx:L31 | neighbors=[Journal.jsx]
- "pages_journal_tagcolor": "tagColor()" | kind=code-symbol | source=client/src/pages/Journal.jsx:L42 | neighbors=[Journal.jsx]
- "pages_journal_timeago": "timeAgo()" | kind=code-symbol | source=client/src/pages/Journal.jsx:L6 | neighbors=[Journal.jsx]
- "pages_login_login": "Login()" | kind=code-symbol | source=client/src/pages/Login.jsx:L5 | neighbors=[Login.jsx]
- "pages_maintenance_maintenance": "Maintenance()" | kind=code-symbol | source=client/src/pages/Maintenance.jsx:L20 | neighbors=[Maintenance.jsx]
- "pages_maintenance_priority_styles": "PRIORITY_STYLES" | kind=code-symbol | source=client/src/pages/Maintenance.jsx:L14 | neighbors=[Maintenance.jsx]
- "pages_mytasks_isoverdue": "isOverdue()" | kind=code-symbol | source=client/src/pages/MyTasks.jsx:L16 | neighbors=[MyTasks.jsx]
- "pages_mytasks_mytasks": "MyTasks()" | kind=code-symbol | source=client/src/pages/MyTasks.jsx:L20 | neighbors=[MyTasks.jsx]
- "pages_mytasks_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/MyTasks.jsx:L8 | neighbors=[MyTasks.jsx]
- "pages_mytasks_status_next": "STATUS_NEXT" | kind=code-symbol | source=client/src/pages/MyTasks.jsx:L14 | neighbors=[MyTasks.jsx]
- "pages_operatordashboard_activitywidget": "ActivityWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L540 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_all_statuses": "ALL_STATUSES" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L229 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_batcheswidget": "BatchesWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L512 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_capaitemswidget": "CAPAItemsWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L300 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_confirmcompletedialog": "ConfirmCompleteDialog()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L260 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_dailytaskswidget": "DailyTasksWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L450 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_emptywidget": "EmptyWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L570 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L60 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_formattime": "formatTime()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L65 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_module_labels": "MODULE_LABELS" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L40 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_module_paths": "MODULE_PATHS" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L32 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_modulebreakdown": "ModuleBreakdown()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L109 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_operatordashboard": "OperatorDashboard()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L667 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_operatortaskswidget": "OperatorTasksWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L145 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_picklistswidget": "PickListsWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L484 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_pmtaskswidget": "PMTasksWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L385 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_priority_colors": "PRIORITY_COLORS" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L14 | neighbors=[OperatorDashboard.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-066.json

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
