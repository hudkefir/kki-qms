# Node Description Batch 11 of 77

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

- "assets_index_cfxlhkch_sk": "sk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, nk(), .first(), .closePath(), .lineTo(), .moveTo()]
- "assets_index_cfxlhkch_t8": "t8()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, ar(), .push(), .stringify(), Ui(), WO()]
- "assets_index_cfxlhkch_te": "tE()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L72 | neighbors=[index-CFxLHkCh.js, .arc(), .closePath(), .lineTo(), .moveTo(), .rect()]
- "assets_index_cfxlhkch_tk": "tk()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, ._resolveElementOptions(), bs(), concat(), Qr(), wt()]
- "assets_index_cfxlhkch_ub": "Ub()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, oO(), u_(), Fl(), Wb(), .lineTo()]
- "assets_index_cfxlhkch_uh": "uh()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, defineProperty(), ere(), getOwnPropertyDescriptor(), mt(), pe()]
- "assets_index_cfxlhkch_v9": "v9()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .getMaximumSize(), b9(), Bl(), Ei(), lx()]
- "assets_index_cfxlhkch_wb": "Wb()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, f$(), Ub(), .apply(), .bezierCurveTo(), .lineTo()]
- "assets_index_cfxlhkch_wm": "wM()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, Il(), .apply(), .push(), .slice(), hm()]
- "assets_index_cfxlhkch_wt": "wt()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, fq(), tk(), update(), wk(), ur()]
- "assets_index_cfxlhkch_xi": "Xi()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L702 | neighbors=[index-CFxLHkCh.js, .resolveNamedOptions(), e9(), lU(), mE, rE]
- "assets_index_cfxlhkch_zc_converttickstolabels": "._convertTicksToLabels()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[Zc, .splice(), jt(), .afterTickToLabelConversion(), .beforeTickToLabelConversion(), .update()]
- "assets_index_cfxlhkch_zc_getpixelfordecimal": ".getPixelForDecimal()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[.getPixelForValue(), ._calculateBarValuePixels(), .getPixelForValue(), .getPixelForValue(), Zc, ml()]
- "assets_index_cfxlhkch_zh_rect": ".rect()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L770 | neighbors=[bf(), Hu, Qu(), tE(), tU(), zH]
- "assets_index_cfxlhkch_zj": "Zj()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, Fi(), hA(), oF(), ad(), .push()]
- "assets_index_cfxlhkch_zw": "zW()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L716 | neighbors=[index-CFxLHkCh.js, .apply(), .push(), .slice(), gT(), yT()]
- "backup_backup_qms_backup_one": "backup_one()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L284 | neighbors=[backup_qms.py, dump_domain(), log(), resolve_domain_creds(), upload_and_verify(), main()]
- "backup_backup_qms_dump_pg": "dump_pg()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L103 | neighbors=[backup_qms.py, dump_domain(), _find_pg_dump(), log(), _table_patterns(), Logical (plain-SQL) pg_dump, gzipped. `…]
- "backup_backup_qms_dump_supabase_rest": "dump_supabase_rest()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L192 | neighbors=[backup_qms.py, dump_domain(), _fetch_table(), _list_tables(), log(), _scope_tables()]
- "backup_backup_qms_main": "main()" | kind=code-symbol | source=scripts/backup/backup_qms.py:L308 | neighbors=[backup_qms.py, backup_one(), load_config(), log(), require_bucket(), write_status()]
- "components_batchtestrecommendations": "BatchTestRecommendations.jsx" | kind=code-symbol | source=client/src/components/BatchTestRecommendations.jsx:L1 | neighbors=[BatchTestRecommendations(), getPriorityLevel(), PRIORITY_THRESHOLDS, PROFILE_LABELS, useApi.js, useFetch()]
- "components_gmpfieldhelp_fieldhelp": "FieldHelp()" | kind=code-symbol | source=client/src/components/GmpFieldHelp.jsx:L7 | neighbors=[GmpFieldHelp.jsx, CAPADetail.jsx, CCRDetail.jsx, ChangeRequestDetail.jsx, ComplaintDetail.jsx, DeviationDetail.jsx]
- "components_gmpfieldhelp_gmp_help": "GMP_HELP" | kind=code-symbol | source=client/src/components/GmpFieldHelp.jsx:L52 | neighbors=[GmpFieldHelp.jsx, CAPADetail.jsx, CCRDetail.jsx, ChangeRequestDetail.jsx, ComplaintDetail.jsx, DeviationDetail.jsx]
- "components_gmpfieldhelp_recordinfotooltip": "RecordInfoTooltip()" | kind=code-symbol | source=client/src/components/GmpFieldHelp.jsx:L15 | neighbors=[GmpFieldHelp.jsx, CAPADetail.jsx, CCRDetail.jsx, ChangeRequestDetail.jsx, ComplaintDetail.jsx, DeviationDetail.jsx]
- "components_statusbadge": "StatusBadge.jsx" | kind=code-symbol | source=client/src/components/StatusBadge.jsx:L1 | neighbors=[AUDIT_STYLES, LABELS, STATUS_STYLES, StatusBadge(), SOPDetail.jsx, SOPLibrary.jsx]
- "migrations_02_sops_sops": "sops" | kind=code-symbol | source=server/src/migrations/02-sops.sql:L2 | neighbors=[02-sops.sql, sop_attachments, sop_comments, sop_files, sop_forms, sop_revisions]
- "production_flavouring": "flavouring.js" | kind=code-symbol | source=server/src/routes/production/flavouring.js:L1 | neighbors=[FIELDS, router, userCtx(), requireWriteAccess(), sanitizeBody(), broadcast()]
- "production_pours": "pours.js" | kind=code-symbol | source=server/src/routes/production/pours.js:L1 | neighbors=[FIELDS, router, userCtx(), requireWriteAccess(), sanitizeBody(), broadcast()]
- "quality_complaints": "complaints.js" | kind=code-symbol | source=server/src/routes/quality/complaints.js:L1 | neighbors=[router, logAudit(), requireRole(), requireWriteAccess(), sanitizeBody(), broadcast()]
- "scripts_seed_audit_checklist": "seed-audit-checklist.js" | kind=code-symbol | source=scripts/seed-audit-checklist.js:L1 | neighbors=[checklistItems, db, __dirname, getItemStatus(), seed(), sopId()]
- "services_workflowservice_workflowserviceimpl": "WorkflowServiceImpl" | kind=code-symbol | source=server/src/services/WorkflowService.js:L139 | neighbors=[WorkflowService.js, .constructor(), .getAvailableTransitions(), .getWorkflow(), .registerWorkflow(), .transition()]
- "src_requestlogger": "requestLogger.js" | kind=code-symbol | source=server/src/requestLogger.js:L1 | neighbors=[__dirname, LOG_DIR, logFile(), pad(), requestLogger(), stamp()]
- "src_sqlite_backup_20260428_000033_complaintroutes": "complaintRoutes.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/complaintRoutes.js:L1 | neighbors=[logAudit(), requireRole(), requireWriteAccess(), router, sanitizeBody(), broadcast()]
- "src_sqlite_backup_20260428_000033_requestlogger": "requestLogger.js" | kind=code-symbol | source=server/src-sqlite-backup-20260428-000033/requestLogger.js:L1 | neighbors=[__dirname, LOG_DIR, logFile(), pad(), requestLogger(), stamp()]
- "assets_index_cfxlhkch_aa": "aA()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L37 | neighbors=[index-CFxLHkCh.js, km(), Oi(), Op(), iA()]
- "assets_index_cfxlhkch_age": "age()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L877 | neighbors=[index-CFxLHkCh.js, .push(), ige(), lge(), sge()]
- "assets_index_cfxlhkch_am": "AM()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L827 | neighbors=[index-CFxLHkCh.js, .apply(), clamp(), .slice(), g5()]
- "assets_index_cfxlhkch_an": "aN()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L38 | neighbors=[index-CFxLHkCh.js, n(), pe(), E(), Tb()]
- "assets_index_cfxlhkch_b": "$b()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L40 | neighbors=[index-CFxLHkCh.js, .push(), t(), D(), o$()]
- "assets_index_cfxlhkch_b0": "B0()" | kind=code-symbol | source=client/dist/assets/index-CFxLHkCh.js:L707 | neighbors=[index-CFxLHkCh.js, aT(), .inRange(), .inXRange(), .inYRange()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: /Users/hudsonbay/Projects/kki-qms/.graphify/description-instructions/batch-010.json

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
