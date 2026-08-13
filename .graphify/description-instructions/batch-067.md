# Node Description Batch 68 of 77

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

- "pages_operatordashboard_settingspanel": "SettingsPanel()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L611 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_statswidget": "StatsWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L84 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L23 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_statusdropdown": "StatusDropdown()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L235 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_timeago": "timeAgo()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L71 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_undotoast": "UndoToast()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L278 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_widget_config": "WIDGET_CONFIG" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L48 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_widgetcard": "WidgetCard()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L580 | neighbors=[OperatorDashboard.jsx]
- "pages_operatordashboard_workorderswidget": "WorkOrdersWidget()" | kind=code-symbol | source=client/src/pages/OperatorDashboard.jsx:L419 | neighbors=[OperatorDashboard.jsx]
- "pages_operatortasks_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L37 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasks_module_labels": "MODULE_LABELS" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L24 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasks_module_paths": "MODULE_PATHS" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L31 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasks_operatortasks": "OperatorTasks()" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L42 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasks_priority_colors": "PRIORITY_COLORS" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L10 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasks_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/OperatorTasks.jsx:L17 | neighbors=[OperatorTasks.jsx]
- "pages_operatortasksadmin_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L31 | neighbors=[OperatorTasksAdmin.jsx]
- "pages_operatortasksadmin_module_labels": "MODULE_LABELS" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L24 | neighbors=[OperatorTasksAdmin.jsx]
- "pages_operatortasksadmin_operatortasksadmin": "OperatorTasksAdmin()" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L36 | neighbors=[OperatorTasksAdmin.jsx]
- "pages_operatortasksadmin_priority_colors": "PRIORITY_COLORS" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L10 | neighbors=[OperatorTasksAdmin.jsx]
- "pages_operatortasksadmin_status_colors": "STATUS_COLORS" | kind=code-symbol | source=client/src/pages/OperatorTasksAdmin.jsx:L17 | neighbors=[OperatorTasksAdmin.jsx]
- "pages_picklistdetail_picklistdetail": "PickListDetail()" | kind=code-symbol | source=client/src/pages/PickListDetail.jsx:L15 | neighbors=[PickListDetail.jsx]
- "pages_picklistdetail_status_config": "STATUS_CONFIG" | kind=code-symbol | source=client/src/pages/PickListDetail.jsx:L8 | neighbors=[PickListDetail.jsx]
- "pages_picklists_status_config": "STATUS_CONFIG" | kind=code-symbol | source=client/src/pages/PickLists.jsx:L9 | neighbors=[PickLists.jsx]
- "pages_planner_batchrow": "BatchRow()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L580 | neighbors=[Planner.jsx]
- "pages_planner_demandsupplychart": "DemandSupplyChart()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L103 | neighbors=[Planner.jsx]
- "pages_planner_fermentationtab": "FermentationTab()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L1089 | neighbors=[Planner.jsx]
- "pages_planner_inventorycountmodal": "InventoryCountModal()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L699 | neighbors=[Planner.jsx]
- "pages_planner_inventorytab": "InventoryTab()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L469 | neighbors=[Planner.jsx]
- "pages_planner_metriccard": "MetricCard()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L86 | neighbors=[Planner.jsx]
- "pages_planner_monday": "monday()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L28 | neighbors=[Planner.jsx]
- "pages_planner_orderstab": "OrdersTab()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L767 | neighbors=[Planner.jsx]
- "pages_planner_planner": "Planner()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L134 | neighbors=[Planner.jsx]
- "pages_planner_pomodal": "POModal()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L969 | neighbors=[Planner.jsx]
- "pages_planner_pourrow": "PourRow()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L419 | neighbors=[Planner.jsx]
- "pages_planner_sku_labels": "SKU_LABELS" | kind=code-symbol | source=client/src/pages/Planner.jsx:L24 | neighbors=[Planner.jsx]
- "pages_planner_skubylabel": "skuByLabel()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L25 | neighbors=[Planner.jsx]
- "pages_planner_skus": "SKUS" | kind=code-symbol | source=client/src/pages/Planner.jsx:L15 | neighbors=[Planner.jsx]
- "pages_planner_tabbar": "TabBar()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L62 | neighbors=[Planner.jsx]
- "pages_planner_tabs": "TABS" | kind=code-symbol | source=client/src/pages/Planner.jsx:L54 | neighbors=[Planner.jsx]
- "pages_planner_weekdays": "WEEKDAYS" | kind=code-symbol | source=client/src/pages/Planner.jsx:L51 | neighbors=[Planner.jsx]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-067.json

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
