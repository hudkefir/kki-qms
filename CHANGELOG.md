# QMS Changelog

All notable changes to the KKI QMS system are documented here.
Format: `## Build #N — YYYY-MM-DD` with bullet points per change.

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
