# Graph Report - .  (2026-07-30)

## Corpus Check
- 232 files · ~427,520 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3066 nodes · 6195 edges · 200 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: calls: 2528 · contains: 2355 · imports: 499 · method: 453 · imports_from: 279 · references: 29 · rationale_for: 7 · documents: 5 · bug_in: 4 · uses: 4 · affects: 3 · re_exports: 3 · targets: 2 · abstracts: 1 · assigned_to: 1 · authenticates_with: 1 · configures: 1 · connects_to: 1 · deployed_to: 1 · documents_config_for: 1 · documents_release: 1 · feature_migration_for: 1 · feature_of: 1 · implements: 1 · instructions_for: 1 · integrates: 1 · interfaces_with: 1 · legal_notice_for: 1 · maintenance_for: 1 · monitoring_for: 1 · proposes_upgrade_for: 1 · provides_access_to: 1 · status_report_for: 1 · test_results_for: 1 · tests: 1 · triggered_by: 1 · written_for: 1


## Input Scope
- Requested: tracked
- Resolved: tracked (source: cli)
- Included files: 232 · Candidates: 274
- Excluded: 260 untracked · 28144 ignored · 0 sensitive · 0 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `b313ce7`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `defineProperty()` - 86 edges
2. `getOwnPropertyDescriptor()` - 81 edges
3. `Zc` - 71 edges
4. `useFetch()` - 58 edges
5. `Ql` - 54 edges
6. `t()` - 49 edges
7. `pe()` - 45 edges
8. `apiPost()` - 45 edges
9. `f$()` - 42 edges
10. `s()` - 39 edges

## Surprising Connections (you probably didn't know these)
- `Backend: Express + PostgreSQL (Supabase)` --implements--> `Jarvis AI Assistant — Claude Sonnet 4.6 with 14 Tools`  [EXTRACTED]
  README.md → server/src/routes/shared/ai.js
- `Jarvis AI Assistant — Claude Sonnet 4.6 with 14 Tools` --uses--> `@anthropic-ai/sdk — Claude API Integration`  [EXTRACTED]
  server/src/routes/shared/ai.js → README.md
- `database-pg.js — PostgreSQL Connection Pool & Abstraction` --abstracts--> `Supabase PostgreSQL — Production Database`  [EXTRACTED]
  server/src/database-pg.js → README.md
- `supabase.js — Supabase Storage Client` --interfaces_with--> `Supabase Storage — Document & File Storage (qms-documents bucket)`  [EXTRACTED]
  server/src/supabase.js → README.md
- `BUG-001: Stored XSS — No Server-Side Input Sanitization` --affects--> `Backend: Express + PostgreSQL (Supabase)`  [EXTRACTED]
  BUG_REPORT.md → README.md

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (137): $1, a4, aE, afe, AW, aye, b4, bp (+129 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (52): FieldHelp(), GMP_HELP, RecordInfoTooltip(), SUGGESTION_ICONS, TYPE_CONFIG, apiDelete(), ACTION_STATUS_COLORS, ACTION_STATUS_NEXT (+44 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (30): AuthContext, AuthProvider(), useAuth(), AUDIT_STATUSES, AuditPrep(), getDaysUntilAudit(), CATEGORY_COLORS, CATEGORY_ORDER (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (17): bN(), bW(), deleteProperty(), get(), hk(), mx, Np(), ny() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (2): Zc, zq()

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (49): $7(), ade(), Aie(), axe, B1(), bue(), dme(), dz() (+41 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (21): bB(), beforeDatasetDraw(), beforeDatasetsDraw(), beforeDraw(), c9(), cv(), D0(), d9() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (16): aq(), b9(), Bl(), bq(), ck(), D6(), Ei(), gq (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (45): Ah, aue(), bz, c4, dde(), due(), ede(), fde (+37 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (41): ab(), ad(), AF(), aoe(), Bi(), cu(), D(), Dj() (+33 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (6): ek(), jd(), M0(), q9(), Ql, z9()

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (21): PRIORITY_COLORS, STATUS_COLORS, STATUS_ICONS, apiGet(), apiPatch(), apiPut(), FLAVOURS, STATUS_ICONS (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (39): Jarvis AI Assistant — Claude Sonnet 4.6 with 14 Tools, @anthropic-ai/sdk — Claude API Integration, Backend: Express + PostgreSQL (Supabase), BUG-001: Stored XSS — No Server-Side Input Sanitization, BUG-002: Path Traversal in SOP File Upload, BUG-003: Stack Traces Leaked in Error Responses, BUG-004: Hardcoded Session Secret, BUG-006: CORS Allows All Origins (+31 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (38): _5(), a1(), bc(), bE(), bM(), bv(), cJ(), dae() (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (18): router, FIELDS, router, FIELDS, router, FIELDS, router, FIELDS (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (34): afterDatasetsUpdate(), bk(), Cp, D2(), dataset(), E2(), efe(), eye() (+26 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (15): Analytics(), CHART_BORDERS, CHART_COLORS, chartOptions(), ACTION_COLORS, DOC_TYPES, STEPS, FERMENTATION_STATUS_STYLES (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (27): _0(), ape, cpe, dpe(), dxe(), fE, H1, Hb() (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (36): a(), ag(), applyPatches(), bge(), c$(), dq(), eH(), fge() (+28 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (12): aT(), av(), B0(), fU(), GP(), gx(), OU(), q0() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (27): addBox(), Ane(), B6(), bs(), dT, fq(), Gd(), Ju() (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (34): aO(), AX(), bg(), C6(), cre(), createDraft(), dre(), ev (+26 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (12): AuditService, AuditServiceImpl, diff(), safeStringify(), EventBus, EventBusImpl, BATCH_WORKFLOW, CAPA_WORKFLOW (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (34): aY(), bee(), cS(), defineProperty(), ere(), f5(), fx(), hX() (+26 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (20): NOTIFICATION_CONTACTS, CLASSIFICATION_LABELS, CLASSIFICATION_STYLES, CRISIS_SEVERITY_STYLES, CRISIS_STATUS_STYLES, CRISIS_TYPE_LABELS, EXERCISE_STATUS_STYLES, EXERCISE_TYPE_LABELS (+12 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (7): $9(), Hp(), I0(), iW(), rk(), rq(), tt()

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (28): a0(), $b(), bae, Cd(), ch(), Cq(), de(), hJ() (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (30): ba(), Bu(), cO(), dfe(), g0(), GA(), getPrototypeOf(), Iu() (+22 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (18): router, upload, router, upload, router, upload, validCategories, CFIA_MICRO_TESTS (+10 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (16): cx(), Hu, ix(), J0(), ng, nU(), pk(), sk() (+8 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (8): aU, eT(), jq(), lU(), mE, rE, Xi(), yk()

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (27): extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), FIELD_KEYWORDS, findField(), formatText(), generateSOPDescription(), HEADING_TO_FIELD (+19 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (27): Ahe(), bhe(), Che(), cm(), eq(), ghe(), Ir(), j6() (+19 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (27): backup_one(), dump_domain(), dump_pg(), dump_supabase_rest(), _ensure_sa_active(), expand(), _fetch_table(), _find_pg_dump() (+19 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS, STEPS, WORKSTREAM_PARTNERS, apiPost(), useFetch(), EquipmentStatusBadge(), FREQUENCY_LABELS (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (13): FIELD_TYPES, FORM_TYPES, STATUS_COLORS, AUDIT_STYLES, LABELS, STATUS_STYLES, AUDIT_STATUSES, previewMajor() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (6): ALL_STATUSES, MODULE_LABELS, MODULE_PATHS, PRIORITY_COLORS, STATUS_COLORS, WIDGET_CONFIG

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (13): AddBatchModal(), addDays(), AddGRPModal(), DayCard(), dayName(), fmt(), fmtShort(), ScheduleTab() (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (12): router, requireWriteAccess(), router, router, router, router, router, sanitizeBody() (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (20): _deployVerify(), deployVerifyHandler(), router, SERVER_START_TIME, checkDbHealth(), app, clientDist, __dirname (+12 more)

### Community 40 - "Community 40"
Cohesion: 0.08
Nodes (11): SKU_LABELS, SIZE_CLASSES, ROLE_COLORS, ROLE_DESCRIPTIONS, ROLES, NEXT_STATUS_MAP, STATUS_OPTIONS, STATUS_STYLES (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (23): AM(), clamp(), displayable(), eJ(), ep(), formatHsl(), g5(), gge() (+15 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (21): A3(), as(), B5(), bce(), D3(), getOwnPropertyDescriptor(), gr(), i3() (+13 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (20): B7(), concat(), F3(), Fae(), foe, gae(), kle(), lee() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (3): jr(), nq(), xO()

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (8): router, SKU_LABELS, SKUS, router, router, auditApiMiddleware(), logAudit(), sanitizeForLog()

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (8): router, router, router, router, router, requireAuth(), requireContentAccess(), requireRole()

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (16): bO(), el(), FA(), gO(), hN(), It(), jO(), k0() (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (12): Bt(), FF(), Fl(), FP, G1(), jc(), jge(), Jj() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (11): router, requireAuth(), requireContentAccess(), requireRole(), router, router, __dirname, __filename (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (8): batchTestNewCols, CATEGORY_COLORS, db, dbPath, __dirname, __filename, sopContentColumns, userAttrCols

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (12): app, clientDist, __dirname, __filename, server, sessionDb, SqliteStore, uploadsDir (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (15): B2(), bf(), cb(), cF(), db(), dF(), lb(), pe() (+7 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (15): bd(), cA(), dh(), f$(), f2(), h2(), Hr(), Ki() (+7 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (5): Bfe(), Il(), qfe(), qy(), zfe()

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (15): C0(), ds(), Ef(), f0(), gN(), iq(), l0(), lq() (+7 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (7): cse(), dse(), Hse(), kse(), Lr, p7(), wse()

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (6): g9(), K9(), mJ(), Vs(), y9(), _z

### Community 58 - "Community 58"
Cohesion: 0.16
Nodes (11): BatchTestDetail(), CATEGORY_LABELS, CATEGORY_ORDER, CertificateOfAnalysis(), getTestDisplay(), groupResults(), PROFILE_LABELS, STATUS_COLORS (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (14): extractAuthorFromHtml(), extractVersionFromFilename(), extractVersionFromHtml(), FIELD_KEYWORDS, findField(), formatText(), generateSOPDescription(), HEADING_TO_FIELD (+6 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (14): Bj(), g2(), gb(), iA(), j2(), kA(), Lj(), nA() (+6 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (5): Hy(), N2(), Ofe(), pfe(), Vy()

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (13): taskboard_audit, taskboard_backups, taskboard_state, taskboard_state_backups, taskboard_tasks, taskboard_template_items, taskboard_templates, tb_announcements (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (10): convertPlaceholders(), convertSql(), db, __dirname, __filename, pool, checksum(), __dirname (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (13): constructor(), Es(), Eu(), fd(), finishDraft(), o3(), Pc, setAutoFreeze() (+5 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (13): Di(), E0(), En(), gs(), ho(), jE(), JP(), nb() (+5 more)

### Community 66 - "Community 66"
Cohesion: 0.15
Nodes (2): ml(), ux

### Community 67 - "Community 67"
Cohesion: 0.18
Nodes (3): dx, hW(), pW()

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (6): router, router, SKU_CATALOG, router, router, requireWriteAccess()

### Community 69 - "Community 69"
Cohesion: 0.22
Nodes (9): CAPA_STATUS_STYLES, CATEGORY_LABELS, CC_STATUS_LABELS, CC_STATUS_OPTIONS, CC_STATUS_STYLES, CCStatusBadge(), CLASSIFICATION_STYLES, ClassificationBadge() (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (8): BOM_FIELDS, ITEM_TYPES, LINE_FIELDS, router, STATUS_OPTIONS, STATUS_STYLES, UNITS, VALID_STATUSES

### Community 71 - "Community 71"
Cohesion: 0.23
Nodes (12): ar(), b8(), e8(), iF(), iz(), k8(), oz(), q8() (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.20
Nodes (5): fW(), gW, jt(), p5(), Qb

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (7): CATEGORY_LABELS, CATEGORY_ORDER, CertificateOfAnalysis(), groupResults(), PROFILE_LABELS, STATUS_COLORS, STATUS_ICONS

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (7): CATEGORY_LABELS, CATEGORY_ORDER, CertificateOfAnalysis(), groupResults(), PROFILE_LABELS, STATUS_COLORS, STATUS_ICONS

### Community 75 - "Community 75"
Cohesion: 0.17
Nodes (10): CFIA_MICRO_TESTS, coaStorage, coaUpload, __dirname, FDA_TESTS, __filename, router, ROUTINE_TESTS (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (7): capaHtml(), COMPANY, __dirname, __filename, router, statusBadge(), tmpDir

### Community 77 - "Community 77"
Cohesion: 0.24
Nodes (11): aA(), eae(), g7(), ib(), km(), l3(), Oi(), Op() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (10): cE, cue(), DN(), e9(), Ge, i8(), jM(), P0() (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.22
Nodes (2): nk(), tq()

### Community 80 - "Community 80"
Cohesion: 0.22
Nodes (10): planner_announcements, planner_batches, planner_fermentation, planner_fridge, planner_inventory_counts, planner_pick_records, planner_pours, planner_purchase_orders (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.20
Nodes (7): CATEGORY_OPTIONS, DOC_TYPE_COLORS, DOCUMENT_TYPE_OPTIONS, DocumentLibrary(), SORT_OPTIONS, useDebounce(), VERSION_TYPE_OPTIONS

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (7): capaHtml(), classificationBadge(), COMPANY, escHtml(), priorityBadge(), router, statusBadge()

### Community 83 - "Community 83"
Cohesion: 0.20
Nodes (10): AI_TOOLS, chatSessions, EDITABLE_FIELDS, executeToolCall(), FIELD_PROMPTS, LINK_TYPE_TABLE_MAP, RECORD_TABLE_MAP, RECORD_TYPE_TO_LINK_TYPE (+2 more)

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (10): ac(), aN(), cg(), E(), iN(), Kj(), kx(), Nl() (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.20
Nodes (10): bX(), ese(), ID(), Jne(), jX(), Qne(), rse(), sse() (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.27
Nodes (3): i9(), r9(), vh()

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (8): binsRemainingColor(), DayCard(), dayTotalBins(), dayTotalCases(), getSkuByCode(), hasMixedSizes(), PourRow(), SKUS

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (6): cache, ensureTable(), getAccessToken(), refreshToken(), router, sosApiFetch()

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (9): daily_task_completions, daily_task_template_items, daily_task_templates, daily_tasks, inventory_counts, operator_task_comments, operator_tasks, pick_list_items (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (9): die(), Eie(), hH(), k3(), Kr(), mie(), S3(), Tie() (+1 more)

### Community 91 - "Community 91"
Cohesion: 0.25
Nodes (1): pp

### Community 92 - "Community 92"
Cohesion: 0.22
Nodes (1): xE

### Community 93 - "Community 93"
Cohesion: 0.22
Nodes (2): config, isCloudflarePages

### Community 94 - "Community 94"
Cohesion: 0.33
Nodes (5): CATEGORY_COLORS, isDocx(), isPdf(), isPreviewable(), LinkedDocuments()

### Community 95 - "Community 95"
Cohesion: 0.42
Nodes (8): sop_attachments, sop_comments, sop_files, sop_form_entries, sop_form_fields, sop_forms, sop_revisions, sops

### Community 96 - "Community 96"
Cohesion: 0.28
Nodes (8): audit_checklist, batch_test_results, batch_tests, ccr_complaints, ccrs, complaints, corrective_actions, sops

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (6): CAPA_CATEGORY_CONFIG, CAPA_STATUS_LABELS, CAPA_STATUS_OPTIONS, CAPA_STATUS_STYLES, EMPTY_FORM, SOURCE_LABELS

### Community 98 - "Community 98"
Cohesion: 0.28
Nodes (6): auditApiMiddleware(), logAudit(), sanitizeForLog(), __dirname, __filename, router

### Community 99 - "Community 99"
Cohesion: 0.25
Nodes (8): _8(), P8(), S8(), v_(), w8(), Wu(), x9(), z8()

### Community 100 - "Community 100"
Cohesion: 0.29
Nodes (8): a2(), b0e(), c0e(), d0e(), i0e(), l0e(), o0e(), oge()

### Community 101 - "Community 101"
Cohesion: 0.25
Nodes (3): a8(), l8(), rz()

### Community 102 - "Community 102"
Cohesion: 0.25
Nodes (7): dW(), Kb(), mk(), oc(), uW(), Xr(), y8()

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (6): capaStorage, capaUpload, capaUploadsDir, __dirname_cc, __filename_cc, router

### Community 104 - "Community 104"
Cohesion: 0.25
Nodes (7): categoryDirs, __dirname, __filename, router, storage, tmpUploadDir, upload

### Community 105 - "Community 105"
Cohesion: 0.33
Nodes (6): CHECKLIST_TEMPLATES, DOC, inferSupplierType(), router, seedChecklistForSupplier(), supplierUpload

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (7): a9(), ak(), I2(), O9(), rA(), x$(), Y_()

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (7): c8(), d8(), F8(), j8(), M8(), o8(), qO()

### Community 108 - "Community 108"
Cohesion: 0.43
Nodes (7): cN(), mh(), RF(), up(), vO(), xN(), zl()

### Community 109 - "Community 109"
Cohesion: 0.29
Nodes (7): ege(), fhe(), fpe, jfe(), Jg(), tge(), whe()

### Community 110 - "Community 110"
Cohesion: 0.48
Nodes (1): yq

### Community 111 - "Community 111"
Cohesion: 0.48
Nodes (5): FormattedText(), isReferencesList(), isRolesTable(), parseReferences(), parseRolesTable()

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (5): ALLOWED_TRANSITIONS, MUTABLE_FIELDS, router, VALID_LOT_TYPES, VALID_QA_STATUSES

### Community 113 - "Community 113"
Cohesion: 0.29
Nodes (1): TAG_COLORS

### Community 114 - "Community 114"
Cohesion: 0.29
Nodes (3): checklistItems, db, __dirname

### Community 115 - "Community 115"
Cohesion: 0.48
Nodes (6): __dirname, LOG_DIR, logFile(), pad(), requestLogger(), stamp()

### Community 116 - "Community 116"
Cohesion: 0.48
Nodes (6): __dirname, LOG_DIR, logFile(), pad(), requestLogger(), stamp()

### Community 117 - "Community 117"
Cohesion: 0.29
Nodes (5): categoryDirs, router, storage, tmpUploadDir, upload

### Community 118 - "Community 118"
Cohesion: 0.29
Nodes (2): cache, router

### Community 119 - "Community 119"
Cohesion: 0.33
Nodes (6): aae(), c3(), cae(), oae(), $P(), Sae()

### Community 120 - "Community 120"
Cohesion: 0.33
Nodes (6): age(), ige(), lge(), nge(), sge(), xge()

### Community 121 - "Community 121"
Cohesion: 0.33
Nodes (6): are(), da(), e5(), ire(), lre(), Y6()

### Community 122 - "Community 122"
Cohesion: 0.33
Nodes (5): DL(), fC(), ks(), qV(), rD()

### Community 123 - "Community 123"
Cohesion: 0.47
Nodes (1): hE

### Community 124 - "Community 124"
Cohesion: 0.33
Nodes (5): audit_logs, documents, qms_record_links, sessions, users

### Community 125 - "Community 125"
Cohesion: 0.40
Nodes (5): capa_action_items, capas, change_requests, deviation_reports, qms_sequence

### Community 126 - "Community 126"
Cohesion: 0.60
Nodes (5): equipment, pm_completions, pm_schedules, wo_sequence, work_orders

### Community 127 - "Community 127"
Cohesion: 0.40
Nodes (5): exercise_sequence, recall_distribution, recall_sequence, recalls, traceability_exercises

### Community 128 - "Community 128"
Cohesion: 0.33
Nodes (5): crisis_events, crisis_sequence, env_sample_sequence, environmental_locations, environmental_samples

### Community 129 - "Community 129"
Cohesion: 0.33
Nodes (3): capaUpload, deviationUpload, router

### Community 130 - "Community 130"
Cohesion: 0.33
Nodes (5): __dirname_s, __filename_s, router, supplierDocsDir, supplierUpload

### Community 131 - "Community 131"
Cohesion: 0.40
Nodes (5): A6(), hG(), mG(), pG(), Qc

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (5): ap(), Fj(), gc(), Ji(), mo()

### Community 133 - "Community 133"
Cohesion: 0.40
Nodes (5): cT(), em(), eW(), tW(), zu()

### Community 134 - "Community 134"
Cohesion: 0.40
Nodes (5): E3(), Rm(), T3(), woe(), Y7()

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (5): fne(), Gne(), pne(), xne(), Yne()

### Community 136 - "Community 136"
Cohesion: 0.40
Nodes (5): g3(), jae(), Nae(), vae(), y3()

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (5): jee(), pee(), ri, vee(), wee()

### Community 138 - "Community 138"
Cohesion: 0.40
Nodes (5): n9(), nT(), s9(), u_(), xb()

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (2): PRIORITY_THRESHOLDS, PROFILE_LABELS

### Community 140 - "Community 140"
Cohesion: 0.40
Nodes (3): MUTABLE_FIELDS, router, VALID_ITEM_TYPES

### Community 141 - "Community 141"
Cohesion: 0.50
Nodes (4): __dirname, __filename, getExpectedTables(), verify()

### Community 142 - "Community 142"
Cohesion: 0.50
Nodes (3): ase(), ise(), lse()

### Community 143 - "Community 143"
Cohesion: 0.50
Nodes (4): cW(), Dk(), lW(), oW()

### Community 144 - "Community 144"
Cohesion: 0.50
Nodes (4): cye(), iye(), rye(), uye()

### Community 145 - "Community 145"
Cohesion: 0.67
Nodes (4): gT(), wN, yT(), zW()

### Community 146 - "Community 146"
Cohesion: 0.50
Nodes (4): Hhe(), Qg, Wc(), XF()

### Community 147 - "Community 147"
Cohesion: 0.50
Nodes (4): hre(), mre(), pre(), ure()

### Community 148 - "Community 148"
Cohesion: 0.50
Nodes (4): jce(), Nce(), vce(), Wce()

### Community 149 - "Community 149"
Cohesion: 0.50
Nodes (4): Kie(), P3(), tr(), Wie()

### Community 150 - "Community 150"
Cohesion: 0.50
Nodes (1): Lt()

### Community 151 - "Community 151"
Cohesion: 0.67
Nodes (3): supplier_reviews, supplier_sequence, suppliers

### Community 152 - "Community 152"
Cohesion: 0.67
Nodes (3): ale(), ile(), lle()

### Community 153 - "Community 153"
Cohesion: 0.67
Nodes (3): cge(), e0e(), k0e()

### Community 154 - "Community 154"
Cohesion: 0.67
Nodes (2): Dd(), q1

### Community 155 - "Community 155"
Cohesion: 0.67
Nodes (3): fse(), gse(), yse()

### Community 156 - "Community 156"
Cohesion: 0.67
Nodes (3): jle(), lE, vle()

### Community 157 - "Community 157"
Cohesion: 0.67
Nodes (3): nF(), Pae(), v3()

### Community 158 - "Community 158"
Cohesion: 0.67
Nodes (3): ov(), tU(), xk()

### Community 159 - "Community 159"
Cohesion: 1.00
Nodes (2): deviation_attachments, deviation_reports

### Community 160 - "Community 160"
Cohesion: 1.00
Nodes (2): deviation_comments, deviation_reports

### Community 161 - "Community 161"
Cohesion: 1.00
Nodes (2): deviation_approvals, deviation_reports

### Community 162 - "Community 162"
Cohesion: 1.00
Nodes (2): capa_action_item_notes, capa_action_items

### Community 163 - "Community 163"
Cohesion: 0.67
Nodes (1): router

### Community 164 - "Community 164"
Cohesion: 1.00
Nodes (2): AGENTS.md — Agent Workspace & Memory System, SOUL.md — Agent Identity & Core Truths

### Community 165 - "Community 165"
Cohesion: 1.00
Nodes (2): A5(), o1()

### Community 166 - "Community 166"
Cohesion: 1.00
Nodes (2): aj(), Eoe()

### Community 167 - "Community 167"
Cohesion: 1.00
Nodes (2): az, Md()

### Community 168 - "Community 168"
Cohesion: 1.00
Nodes (2): Cne(), Sne()

### Community 169 - "Community 169"
Cohesion: 1.00
Nodes (2): cY(), uY()

### Community 170 - "Community 170"
Cohesion: 1.00
Nodes (2): dhe, phe

### Community 171 - "Community 171"
Cohesion: 1.00
Nodes (2): Ece(), Tce()

### Community 172 - "Community 172"
Cohesion: 1.00
Nodes (2): eY(), tY()

### Community 173 - "Community 173"
Cohesion: 1.00
Nodes (2): fk(), rU()

### Community 174 - "Community 174"
Cohesion: 1.00
Nodes (2): gie(), ooe()

### Community 175 - "Community 175"
Cohesion: 1.00
Nodes (2): GY(), XY()

### Community 176 - "Community 176"
Cohesion: 1.00
Nodes (2): h0e(), m0e

### Community 177 - "Community 177"
Cohesion: 1.00
Nodes (2): hae(), qie()

### Community 178 - "Community 178"
Cohesion: 1.00
Nodes (2): hce(), pce()

### Community 179 - "Community 179"
Cohesion: 1.00
Nodes (2): IM(), jz

### Community 180 - "Community 180"
Cohesion: 1.00
Nodes (2): j3(), Tae()

### Community 181 - "Community 181"
Cohesion: 1.00
Nodes (2): Kre(), Yre()

### Community 182 - "Community 182"
Cohesion: 1.00
Nodes (2): l9(), W_()

### Community 183 - "Community 183"
Cohesion: 1.00
Nodes (2): LM(), xee()

### Community 184 - "Community 184"
Cohesion: 1.00
Nodes (2): mse(), use()

### Community 185 - "Community 185"
Cohesion: 1.00
Nodes (2): NJ(), yM()

### Community 186 - "Community 186"
Cohesion: 1.00
Nodes (2): nx(), wX()

### Community 188 - "Community 188"
Cohesion: 1.00
Nodes (1): router

### Community 189 - "Community 189"
Cohesion: 1.00
Nodes (1): schema_migrations

### Community 190 - "Community 190"
Cohesion: 1.00
Nodes (1): chat_messages

### Community 192 - "Community 192"
Cohesion: 1.00
Nodes (1): sop_categories

### Community 193 - "Community 193"
Cohesion: 1.00
Nodes (1): router

### Community 194 - "Community 194"
Cohesion: 1.00
Nodes (1): router

### Community 195 - "Community 195"
Cohesion: 1.00
Nodes (1): router

### Community 196 - "Community 196"
Cohesion: 1.00
Nodes (1): router

### Community 197 - "Community 197"
Cohesion: 1.00
Nodes (1): router

### Community 198 - "Community 198"
Cohesion: 1.00
Nodes (1): router

### Community 199 - "Community 199"
Cohesion: 1.00
Nodes (1): Build #134 — 2026-06-13: Supplier Document Download/Delete Fixes

### Community 200 - "Community 200"
Cohesion: 1.00
Nodes (1): Build #136 — 2026-06-14: Supplier Checklist Type-Aware Seeding

### Community 204 - "Community 204"
Cohesion: 1.00
Nodes (1): .gitignore — Secrets & Build Artifacts

## Knowledge Gaps
- **572 isolated node(s):** `qt`, `rl`, `ez`, `St`, `eE` (+567 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 4`** (2 nodes): `Zc`, `zq()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (2 nodes): `ml()`, `ux`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (2 nodes): `nk()`, `tq()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `pp`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `xE`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (2 nodes): `config`, `isCloudflarePages`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `yq`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `TAG_COLORS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (2 nodes): `cache`, `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `hE`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `PRIORITY_THRESHOLDS`, `PROFILE_LABELS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (1 nodes): `Lt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (2 nodes): `Dd()`, `q1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `deviation_attachments`, `deviation_reports`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (2 nodes): `deviation_comments`, `deviation_reports`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `deviation_approvals`, `deviation_reports`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (2 nodes): `capa_action_item_notes`, `capa_action_items`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (2 nodes): `AGENTS.md — Agent Workspace & Memory System`, `SOUL.md — Agent Identity & Core Truths`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (2 nodes): `A5()`, `o1()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (2 nodes): `aj()`, `Eoe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (2 nodes): `az`, `Md()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (2 nodes): `Cne()`, `Sne()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (2 nodes): `cY()`, `uY()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (2 nodes): `dhe`, `phe`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (2 nodes): `Ece()`, `Tce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (2 nodes): `eY()`, `tY()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (2 nodes): `fk()`, `rU()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (2 nodes): `gie()`, `ooe()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (2 nodes): `GY()`, `XY()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (2 nodes): `h0e()`, `m0e`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (2 nodes): `hae()`, `qie()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (2 nodes): `hce()`, `pce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (2 nodes): `IM()`, `jz`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (2 nodes): `j3()`, `Tae()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 181`** (2 nodes): `Kre()`, `Yre()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 182`** (2 nodes): `l9()`, `W_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (2 nodes): `LM()`, `xee()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (2 nodes): `mse()`, `use()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (2 nodes): `NJ()`, `yM()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 186`** (2 nodes): `nx()`, `wX()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 188`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 189`** (1 nodes): `schema_migrations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 190`** (1 nodes): `chat_messages`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 192`** (1 nodes): `sop_categories`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 194`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 195`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 196`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 197`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 198`** (1 nodes): `router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 199`** (1 nodes): `Build #134 — 2026-06-13: Supplier Document Download/Delete Fixes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 200`** (1 nodes): `Build #136 — 2026-06-14: Supplier Checklist Type-Aware Seeding`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (1 nodes): `.gitignore — Secrets & Build Artifacts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Zc` connect `Community 4` to `Community 0`, `Community 13`, `Community 42`, `Community 66`, `Community 79`, `Community 29`, `Community 20`, `Community 67`, `Community 57`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Ql` connect `Community 10` to `Community 0`, `Community 91`, `Community 30`, `Community 57`, `Community 25`, `Community 67`, `Community 44`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `requireWriteAccess()` connect `Community 68` to `Community 105`, `Community 28`, `Community 140`, `Community 112`, `Community 70`, `Community 14`, `Community 129`, `Community 46`, `Community 45`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `qt`, `rl`, `ez` to the rest of the system?**
  _572 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.005305039787798408 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03827160493827161 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.046536224219989424 - nodes in this community are weakly interconnected._