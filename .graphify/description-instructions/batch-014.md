# Node Description Batch 15 of 77

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

- "backup_backup_qms_expand": "expand()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L43 | neighbors=[backup_qms.py, _ensure_sa_active(), _gcloud_env(), resolve_domain_creds(), write_status()]
- "backup_backup_qms_write_status": "write_status()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L348 | neighbors=[backup_qms.py, main(), Persist a machine-readable status file …, expand(), log()]
- "components_formattedtext_formattedtext": "FormattedText()" | kind=code-symbol | source=client/src/components/FormattedText.jsx:L100 | neighbors=[FormattedText.jsx, isReferencesList(), isRolesTable(), parseReferences(), parseRolesTable()]
- "components_plannercalendar_daycard": "DayCard()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L162 | neighbors=[PlannerCalendar.jsx, binsRemainingColor(), dayTotalBins(), dayTotalCases(), hasMixedSizes()]
- "components_protectedroute": "ProtectedRoute.jsx" | kind=code-symbol | source=client/src/components/ProtectedRoute.jsx:L1 | neighbors=[AccessDenied.jsx, ProtectedRoute(), useAuth.jsx, useAuth(), App.jsx]
- "migrations_01_core": "01-core.sql" | kind=code-symbol | source=server/src/migrations/01-core.sql:L1 | neighbors=[audit_logs, documents, qms_record_links, sessions, users]
- "migrations_04_capa_deviations": "04-capa-deviations.sql" | kind=code-symbol | source=server/src/migrations/04-capa-deviations.sql:L1 | neighbors=[capa_action_items, capas, change_requests, deviation_reports, qms_sequence]
- "migrations_07_equipment": "07-equipment.sql" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L1 | neighbors=[equipment, pm_completions, pm_schedules, wo_sequence, work_orders]
- "migrations_08_recalls": "08-recalls.sql" | kind=code-symbol | source=server/src/migrations/08-recalls.sql:L1 | neighbors=[exercise_sequence, recall_distribution, recall_sequence, recalls, traceability_exercises]
- "migrations_09_crisis_environmental": "09-crisis-environmental.sql" | kind=code-symbol | source=server/src/migrations/09-crisis-environmental.sql:L1 | neighbors=[crisis_events, crisis_sequence, env_sample_sequence, environmental_locations, environmental_samples]
- "quality_dailytasks": "dailyTasks.js" | kind=code-symbol | source=server/src/routes/quality/dailyTasks.js:L1 | neighbors=[router, logAudit(), requireAuth(), requireRole(), requireWriteAccess()]
- "quality_environmental": "environmental.js" | kind=code-symbol | source=server/src/routes/quality/environmental.js:L1 | neighbors=[nextRecordNumber(), router, logAudit(), requireAuth(), requireWriteAccess()]
- "quality_forms": "forms.js" | kind=code-symbol | source=server/src/routes/quality/forms.js:L1 | neighbors=[router, logAudit(), requireRole(), requireWriteAccess(), broadcast()]
- "quality_print_capahtml": "capaHtml()" | kind=code-symbol | source=server/src/routes/quality/print.js:L85 | neighbors=[print.js, classificationBadge(), escHtml(), priorityBadge(), statusBadge()]
- "security-audit-report": "Security & Bug Audit Report" | kind=entity | source=BUG_REPORT.md | neighbors=[BUG-001: Stored XSS — No Server-Side In…, BUG-002: Path Traversal in SOP File Upl…, BUG-003: Stack Traces Leaked in Error R…, BUG-004: Hardcoded Session Secret, BUG-006: CORS Allows All Origins]
- "src_sqlite_backup_20260428_000033_dailytaskroutes": "dailyTaskRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/dailyTaskRoutes.js:L1 | neighbors=[logAudit(), requireAuth(), requireRole(), requireWriteAccess(), router]
- "src_sqlite_backup_20260428_000033_formroutes": "formRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/formRoutes.js:L1 | neighbors=[logAudit(), requireRole(), requireWriteAccess(), router, broadcast()]
- "admin_auth": "auth.js" | kind=code-symbol | source=server/src/routes/admin/auth.js:L1 | neighbors=[router, logAudit(), requireAuth(), requireRole()]
- "assets_index_cfxlhkch_0": "_0()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .push(), Qu(), RF()]
- "assets_index_cfxlhkch_7": "$7()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, .push(), Aie(), Pie()]
- "assets_index_cfxlhkch_a0": "a0()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L34 | neighbors=[index-CFxLHkCh.js, defineProperty(), Ud(), l$()]
- "assets_index_cfxlhkch_a1": "a1()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, t(), dee(), tee()]
- "assets_index_cfxlhkch_a2": "a2()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L890 | neighbors=[index-CFxLHkCh.js, d0e(), i0e(), o0e()]
- "assets_index_cfxlhkch_a3": "A3()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, .apply(), getOwnPropertyDescriptor(), gr()]
- "assets_index_cfxlhkch_a6": "A6()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L792 | neighbors=[index-CFxLHkCh.js, getOwnPropertyDescriptor(), pG(), set()]
- "assets_index_cfxlhkch_addbox": "addBox()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .push(), start(), sW()]
- "assets_index_cfxlhkch_aie": "Aie()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, $7(), .slice(), e1]
- "assets_index_cfxlhkch_ak": "ak()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .lineTo(), x$(), Y_()]
- "assets_index_cfxlhkch_ale": "ale()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L837 | neighbors=[index-CFxLHkCh.js, defineProperty(), ile(), gr()]
- "assets_index_cfxlhkch_applypatches": "applyPatches()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, a(), .slice(), s()]
- "assets_index_cfxlhkch_ase": "ase()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, defineProperty(), ise(), .constructor()]
- "assets_index_cfxlhkch_at": "aT()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, .getProps(), B0(), OU()]
- "assets_index_cfxlhkch_b5": "B5()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .apply(), getOwnPropertyDescriptor(), q5()]
- "assets_index_cfxlhkch_bd": "bd()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .push(), .slice(), f$()]
- "assets_index_cfxlhkch_bl": "Bl()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, b9(), l$(), v9()]
- "assets_index_cfxlhkch_bo": "bO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, tN(), z2(), lF()]
- "assets_index_cfxlhkch_bt_point": ".point()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[Bt(), .bezierCurveTo(), .lineTo(), .moveTo()]
- "assets_index_cfxlhkch_bw": "bW()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L709 | neighbors=[index-CFxLHkCh.js, .apply(), t(), .buildTicks()]
- "assets_index_cfxlhkch_c6": "C6()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L792 | neighbors=[index-CFxLHkCh.js, aO(), getPrototypeOf(), tv]
- "assets_index_cfxlhkch_cm": "cm()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .slice(), eq(), mr()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-014.json

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
