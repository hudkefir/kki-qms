# QMS Changelog

All notable changes to the KKI QMS system are documented here.
Format: `## Build #N — YYYY-MM-DD` with bullet points per change.

---

## Build #153 — 2026-07-05

- Merged the `feat/sop-parse-on-upload` branch into `main` — **Tier A parse-on-upload pre-fill for SOP intake**. Uploading an SOP document now auto-extracts and pre-fills metadata (`server/src/sopParse.js`, ~228 lines), wired into `SOPLibrary.jsx`, `documents/files.js`, and the quality `dashboard.js`.
- Repository made **public** on GitHub (`hudkefir/kki-qms`) for external collaboration. No secrets are exposed — `.env` is gitignored and no credentials are tracked.
- Documentation refresh:
  - `README.md` corrected to reflect the real stack — **PostgreSQL (Supabase) + Supabase Storage + Cloud Run**, React/Vite frontend, `@anthropic-ai/sdk` AI assistant. (Prior README incorrectly described a SQLite/`better-sqlite3` datastore, which is deprecated and unused.)
  - Added `.env.example` documenting every required environment variable (names only, no values).
  - Added a proprietary License & IP notice.

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
