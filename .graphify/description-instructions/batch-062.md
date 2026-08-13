# Node Description Batch 63 of 77

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

- "migrations_03_quality_ccr_complaints": "ccr_complaints" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L45 | neighbors=[03-quality.sql]
- "migrations_03_quality_ccrs": "ccrs" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L25 | neighbors=[03-quality.sql]
- "migrations_03_quality_complaints": "complaints" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L2 | neighbors=[03-quality.sql]
- "migrations_03_quality_corrective_actions": "corrective_actions" | kind=code-symbol | source=server/src/migrations/03-quality.sql:L51 | neighbors=[03-quality.sql]
- "migrations_04_capa_deviations_change_requests": "change_requests" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L2 | neighbors=[04-capa-deviations.sql]
- "migrations_04_capa_deviations_deviation_reports": "deviation_reports" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L29 | neighbors=[04-capa-deviations.sql]
- "migrations_04_capa_deviations_qms_sequence": "qms_sequence" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L93 | neighbors=[04-capa-deviations.sql]
- "migrations_05_daily_ops_inventory_counts": "inventory_counts" | kind=code-symbol | source=server/src/migrations/05-daily-ops.sql:L78 | neighbors=[05-daily-ops.sql]
- "migrations_06_taskboard_taskboard_audit": "taskboard_audit" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L56 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_taskboard_backups": "taskboard_backups" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L31 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_taskboard_state": "taskboard_state" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L50 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_taskboard_state_backups": "taskboard_state_backups" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L65 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_taskboard_tasks": "taskboard_tasks" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L2 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_announcements": "tb_announcements" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L95 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_daily_config": "tb_daily_config" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L102 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_operators": "tb_operators" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L71 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_process_templates": "tb_process_templates" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L111 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_sections": "tb_sections" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L81 | neighbors=[06-taskboard.sql]
- "migrations_06_taskboard_tb_settings": "tb_settings" | kind=code-symbol | source=server/src/migrations/06-taskboard.sql:L90 | neighbors=[06-taskboard.sql]
- "migrations_07_equipment_wo_sequence": "wo_sequence" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L80 | neighbors=[07-equipment.sql]
- "migrations_08_recalls_exercise_sequence": "exercise_sequence" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L93 | neighbors=[08-recalls.sql]
- "migrations_08_recalls_recall_sequence": "recall_sequence" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L58 | neighbors=[08-recalls.sql]
- "migrations_08_recalls_traceability_exercises": "traceability_exercises" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L63 | neighbors=[08-recalls.sql]
- "migrations_09_crisis_environmental_crisis_events": "crisis_events" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L2 | neighbors=[09-crisis-environmental.sql]
- "migrations_09_crisis_environmental_crisis_sequence": "crisis_sequence" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L30 | neighbors=[09-crisis-environmental.sql]
- "migrations_09_crisis_environmental_env_sample_sequence": "env_sample_sequence" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L75 | neighbors=[09-crisis-environmental.sql]
- "migrations_09_crisis_environmental_environmental_locations": "environmental_locations" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L61 | neighbors=[09-crisis-environmental.sql]
- "migrations_09_crisis_environmental_environmental_samples": "environmental_samples" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L35 | neighbors=[09-crisis-environmental.sql]
- "migrations_10_suppliers_supplier_sequence": "supplier_sequence" | kind=code-symbol | source=server/src/migrations/10-suppliers.sql:L45 | neighbors=[10-suppliers.sql]
- "migrations_11_planner_planner_announcements": "planner_announcements" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L114 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_fermentation": "planner_fermentation" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L37 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_fridge": "planner_fridge" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L89 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_inventory_counts": "planner_inventory_counts" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L71 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_pours": "planner_pours" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L53 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_settings": "planner_settings" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L83 | neighbors=[11-planner.sql]
- "migrations_11_planner_planner_state": "planner_state" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L121 | neighbors=[11-planner.sql]
- "migrations_12_chat": "12-chat.sql" | kind=code-symbol | source=server/src/migrations/12-chat.sql:L1 | neighbors=[chat_messages]
- "migrations_12_chat_chat_messages": "chat_messages" | kind=code-symbol | source=server/src/migrations/12-chat.sql:L2 | neighbors=[12-chat.sql]
- "migrations_34_harden_increment_version": "34-harden-increment-version.sql" | kind=code-symbol | source=server/src/migrations/34-harden-increment-version.sql:L1 | neighbors=[public.increment_version()]
- "migrations_34_harden_increment_version_public_increment_version": "public.increment_version()" | kind=code-symbol | source=server/src/migrations/34-harden-increment-version.sql:L22 | neighbors=[34-harden-increment-version.sql]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-062.json

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
