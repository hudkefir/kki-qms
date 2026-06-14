# QMS Changelog

All notable changes to the KKI QMS system are documented here.
Format: `## Build #N — YYYY-MM-DD` with bullet points per change.

---

## Build #136 — 2026-06-14

- Supplier checklist seeding is now type-aware. New suppliers (and empty-checklist re-seeds) get the document set appropriate to their inferred type: ingredient = Eval + COA + Food Safety (SQF) + COI; packaging = Eval + Product Spec + COI; distributor = Eval only; full set as fallback. Type inferred from products_supplied / notes / name.
- Backfilled existing suppliers: packaging suppliers (Atlas, Impackaging) and distributors (KeHE, UNFI CA/US, Purity, Horizon, Satau) had the generic 5-item required set narrowed to their type via the `required` flag (28 items set to N/A) so green-check % reflects only docs that actually apply. No rows deleted, no completions touched; hand-curated ingredient suppliers left untouched.

---

## Build #134 — 2026-06-13

- Fixed supplier document download (500 error) — handler referenced undefined `join`/`supplierDocsDir` (dead local-disk code); now streams from Supabase Storage via `downloadFile`, matching the documents/changeControls modules
- Fixed supplier document delete — was prepending a bogus `supplier-docs/` prefix so storage objects were never actually removed; now deletes the real stored path

---

## Build #123 — 2026-06-04

- Enlarged deviation investigation, disposition, and CAPA modals (size="lg", wider textareas)
- Added build version tracking — build number, commit hash, and timestamp now display correctly
- Added this changelog system
- Fixed "Build unknown" issue caused by .git exclusion in Docker builds
