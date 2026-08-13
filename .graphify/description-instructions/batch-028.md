# Node Description Batch 29 of 77

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

- "assets_index_cfxlhkch_zd": "zD()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L789 | neighbors=[index-CFxLHkCh.js, nv(), Qs()]
- "assets_index_cfxlhkch_ze": "Ze" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L247 | neighbors=[index-CFxLHkCh.js, nU(), tt()]
- "assets_index_cfxlhkch_zf": "ZF()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, gN(), l0()]
- "assets_index_cfxlhkch_zfe": "zfe()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[index-CFxLHkCh.js, .path(), Bfe()]
- "assets_index_cfxlhkch_zge": "zge()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L879 | neighbors=[index-CFxLHkCh.js, fge(), .slice()]
- "assets_index_cfxlhkch_zm": "Zm()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L9 | neighbors=[index-CFxLHkCh.js, clamp(), ep()]
- "assets_index_cfxlhkch_zne": "Zne()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Jne(), ese()]
- "assets_index_cfxlhkch_zo": "ZO()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L67 | neighbors=[index-CFxLHkCh.js, defineProperty(), getOwnPropertyDescriptor()]
- "assets_index_cfxlhkch_zv": "ZV()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L781 | neighbors=[index-CFxLHkCh.js, .apply(), t()]
- "backup_backup_qms_fetch_table": "_fetch_table()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L178 | neighbors=[backup_qms.py, dump_supabase_rest(), _rest_get()]
- "backup_backup_qms_gcloud_env": "_gcloud_env()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L237 | neighbors=[backup_qms.py, _ensure_sa_active(), expand()]
- "backup_backup_qms_rest_get": "_rest_get()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L141 | neighbors=[backup_qms.py, _fetch_table(), _list_tables()]
- "backup_backup_qms_scope_tables": "_scope_tables()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L167 | neighbors=[backup_qms.py, dump_supabase_rest(), Restrict to a single domain's tables vi…]
- "backup_backup_qms_table_patterns": "_table_patterns()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L93 | neighbors=[backup_qms.py, dump_pg(), pg_dump -t patterns mirroring _scope_ta…]
- "components_accessdenied": "AccessDenied.jsx" | kind=code-symbol | source=client/src/components/AccessDenied.jsx:L1 | neighbors=[AccessDenied(), ProtectedRoute.jsx, App.jsx]
- "components_buildversion": "BuildVersion.jsx" | kind=code-symbol | source=client/src/components/BuildVersion.jsx:L1 | neighbors=[BuildVersion(), config.js, App.jsx]
- "components_chatsidebar": "ChatSidebar.jsx" | kind=code-symbol | source=client/src/components/ChatSidebar.jsx:L1 | neighbors=[ChatSidebar(), config.js, App.jsx]
- "components_inventorycount": "InventoryCount.jsx" | kind=code-symbol | source=client/src/components/InventoryCount.jsx:L1 | neighbors=[InventoryCount(), SKU_LABELS, Modal.jsx]
- "components_linkeddocuments_isdocx": "isDocx()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L40 | neighbors=[LinkedDocuments.jsx, isPreviewable(), LinkedDocuments()]
- "components_linkeddocuments_ispdf": "isPdf()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L36 | neighbors=[LinkedDocuments.jsx, isPreviewable(), LinkedDocuments()]
- "components_linkeddocuments_ispreviewable": "isPreviewable()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L45 | neighbors=[LinkedDocuments.jsx, isDocx(), isPdf()]
- "components_linkeddocuments_linkeddocuments": "LinkedDocuments()" | kind=code-symbol | source=client/src/components/LinkedDocuments.jsx:L49 | neighbors=[LinkedDocuments.jsx, isDocx(), isPdf()]
- "components_plannercalendar_getskubycode": "getSkuByCode()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L14 | neighbors=[PlannerCalendar.jsx, hasMixedSizes(), PourRow()]
- "components_plannercalendar_hasmixedsizes": "hasMixedSizes()" | kind=code-symbol | source=client/src/components/PlannerCalendar.jsx:L42 | neighbors=[PlannerCalendar.jsx, DayCard(), getSkuByCode()]
- "inventory_sos_refreshtoken": "refreshToken()" | kind=code-symbol | source=server/src/routes/inventory/sos.js:L78 | neighbors=[sos.js, getAccessToken(), sosApiFetch()]
- "migrations_07_equipment_pm_completions": "pm_completions" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L36 | neighbors=[07-equipment.sql, equipment, pm_schedules]
- "migrations_07_equipment_pm_schedules": "pm_schedules" | kind=code-symbol | source=server/src/migrations/07-equipment.sql:L21 | neighbors=[07-equipment.sql, pm_completions, equipment]
- "migrations_10_suppliers": "10-suppliers.sql" | kind=code-symbol | source=server/src/migrations/10-suppliers.sql:L1 | neighbors=[supplier_reviews, supplier_sequence, suppliers]
- "migrations_11_planner_planner_pick_records": "planner_pick_records" | kind=code-symbol | source=server/src/migrations/11-planner.sql:L102 | neighbors=[11-planner.sql, planner_batches, planner_purchase_orders]
- "pages_auditlogs": "AuditLogs.jsx" | kind=code-symbol | source=client/src/pages/AuditLogs.jsx:L1 | neighbors=[ACTION_COLORS, AuditLogs(), App.jsx]
- "pages_batchtestdetail_groupresults": "groupResults()" | kind=code-symbol | source=client/src/pages/BatchTestDetail.jsx:L146 | neighbors=[BatchTestDetail.jsx, BatchTestDetail(), CertificateOfAnalysis()]
- "pages_capadetail_formatdate": "formatDate()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L138 | neighbors=[CAPADetail.jsx, CAPADetail(), DatePill()]
- "pages_capadetail_lifecycleindex": "lifecycleIndex()" | kind=code-symbol | source=client/src/pages/CAPADetail.jsx:L154 | neighbors=[CAPADetail.jsx, CAPADetail(), LifecycleBar()]
- "pages_emailscan": "EmailScan.jsx" | kind=code-symbol | source=client/src/pages/EmailScan.jsx:L1 | neighbors=[LoadingSpinner.jsx, EmailScan(), App.jsx]
- "pages_equipment_frequency_labels": "FREQUENCY_LABELS" | kind=code-symbol | source=client/src/pages/Equipment.jsx:L22 | neighbors=[Equipment.jsx, EquipmentDetail.jsx, Maintenance.jsx]
- "pages_equipmentdetail_wo_status_labels": "WO_STATUS_LABELS" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L26 | neighbors=[EquipmentDetail.jsx, Maintenance.jsx, WorkOrderDetail.jsx]
- "pages_equipmentdetail_wo_status_styles": "WO_STATUS_STYLES" | kind=code-symbol | source=client/src/pages/EquipmentDetail.jsx:L18 | neighbors=[EquipmentDetail.jsx, Maintenance.jsx, WorkOrderDetail.jsx]
- "pages_planner_daycard": "DayCard()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L380 | neighbors=[Planner.jsx, dayName(), fmtShort()]
- "pages_planner_fmtshort": "fmtShort()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L44 | neighbors=[Planner.jsx, DayCard(), WeekHeader()]
- "pages_planner_scheduletab": "ScheduleTab()" | kind=code-symbol | source=client/src/pages/Planner.jsx:L182 | neighbors=[Planner.jsx, addDays(), fmt()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-028.json

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
