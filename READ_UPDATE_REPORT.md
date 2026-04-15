# Read & Update Feature — Full Investigation Report

**Date:** 2026-03-31
**Tested on:** SOP #1 (KK-SOP-00100 — Good Documentation Practices)

---

## 1. Feature Overview

The "Read & Update" feature extracts structured content from linked `.docx` files and proposes updates to the SOP database record. It uses the `mammoth` library to extract raw text, then applies regex patterns to identify sections (Purpose, Scope, Procedure, etc.), version, and author.

### UX Flow
1. User clicks green **"Read & Update"** button (top-right of SOP detail page, visible only to users with write access)
2. Frontend POSTs to `/api/sops/:id/read-content`
3. Backend finds the linked document in the `documents` table, reads the `.docx` file from disk, extracts content via `mammoth`, and generates a diff preview
4. A modal ("SOP Content Analysis") displays:
   - Document filename and extraction status
   - Warnings for missing sections
   - Side-by-side "Current" vs "Proposed" for each field that would change
5. User clicks **"Apply Updates"** to confirm
6. Frontend POSTs to `/api/sops/:id/apply-content` with the proposed changes
7. SOP record is updated in the database

---

## 2. What Works

| Area | Status | Notes |
|------|--------|-------|
| Button visibility | OK | Only shown to users with `canWrite()` permission |
| API endpoint `/read-content` | OK | Returns 200 with extraction data |
| Document linking | OK | Finds linked doc in `documents` table (doc ID 3 for SOP 1) |
| File on disk | OK | `/Users/kefirbot/KKI/QMS/SOPs/KK-SOP-00100_Good_Documentation_Practices_v0.9.docx` exists (41KB) |
| Mammoth text extraction | OK | Successfully extracts raw text from the .docx file |
| Modal UI | OK | Clean design with current/proposed diff view, warnings display |
| Apply Updates endpoint | OK | Successfully updates DB fields |
| Auto-repair logic | OK | If no document record exists, backend tries to find matching file by `sop_number` and auto-links it |
| Filename repair | OK | If filename in DB doesn't match disk, backend tries fuzzy matching |

---

## 3. Bugs Found

### BUG 1 (Critical): Author extraction picks up garbage text

**Impact:** Corrupts the `owner` field in the database
**What happened:** The `AUTHOR_PATTERNS` regex matched `Prepared By` in the document header, but the text after it was:
> `Hudson Liao\n\nApproved By\n\nJimmy Tran / QA Manager (HACCP Certified)\n\nClassification\n\nConfidential\n\n\n\nThis document is the property of Kefir Kultures Inc. Unauthorized reproduction or distribution is prohibited.`

The `cleanExtractedText()` function collapsed newlines into spaces, producing:
> `"ized reproduction or distribution is prohibited."`

as the proposed owner (truncated from the end of the concatenated string).

**Root cause:** `sopContentReader.js:52` — The author regex `/prepared\s*by\s*:?\s*(.*?)(?=\n|date|version|$)/i` uses `$` in the lookahead, which matches end of string in single-line mode. The mammoth output doesn't have consistent `\n` at the boundaries — the extracted text uses `\n\n` as separators, but the regex only looks for single `\n`. With the `/s` flag absent, `.` doesn't match newlines, so the `(.*?)` captures too much when multi-line content follows.

**After applying:** Owner was set to `"ized reproduction or distribution is prohibited."` — I manually restored it to `"Hudson Liao"`.

### BUG 2 (Major): Purpose and Scope sections not extracted

**Impact:** The two most important SOP fields cannot be populated
**Warnings displayed:**
- "Could not extract purpose section"
- "Could not extract scope section"

**Root cause:** `sopContentReader.js:10-20` — The section regex patterns assume sections are separated by single newlines, but the mammoth-extracted text uses `\n\n` (double newlines) between sections. The patterns like:
```regex
/purpose\s*:?\s*(.*?)(?=\n(?:scope|...))/si
```
require the lookahead to find `\n` immediately followed by another section name. But in the actual text, it's `\n\n1  Purpose\n\nThis Standard Operating Procedure...` — the section headers include numbering and different formatting.

Additionally, the document uses numbered headings (`1  Purpose`, `2  Scope`) which don't match the patterns expecting `purpose:` or `1. purpose:`.

### BUG 3 (Major): Version not extracted from document content

**Impact:** Version stays at `0.9` even though the document contains `Version 0.9.1`
**What happened:** The version was correctly extracted from the filename (`v0.9` from `_v0.9.docx`), but the document itself contains `Version 0.9.1` in the header table. The filename version takes priority (line 87-92), so the newer version is ignored.

**Root cause:** `sopContentReader.js:86-104` — `extractVersion()` checks filename first and returns immediately if found, never checking the document body which has the more accurate version.

### BUG 4 (Moderate): Description falls back to generic text

**Impact:** Useful description is replaced with boilerplate
**What happened:** Since neither `purpose` nor `scope` were extracted (Bug 2), `generateSOPDescription()` falls back to:
> "Standard Operating Procedure for quality management system compliance."

This generic string replaced the previous description that had been manually set.

### BUG 5 (Minor): Procedure extraction captures wrong content

**Impact:** Procedure field gets content from the wrong section
**What happened:** The procedure regex captured text from the "Definitions" section instead of the actual procedure (Section 6). The extracted procedure text starts with: `"consisting of 2 people where one person verbally states results obtained from performing a task..."` — this is from the definition of "Dual Verification."

### BUG 6 (Minor): No user confirmation for individual fields

**Impact:** Users must accept or reject ALL proposed changes — no per-field control
**What happened:** The "Apply Updates" button sends all proposed changes at once. The UI shows the diff per field, but there's no checkbox or toggle to exclude specific fields. This means accepting a correct version update forces accepting a corrupted owner update too.

---

## 4. Filesystem Check

**Directory:** `/Users/kefirbot/KKI/QMS/SOPs/`

| File | Size |
|------|------|
| KK-SOP-00100_Good_Documentation_Practices_v0.9.docx | 41KB |
| KK-SOP-00101_Handwritten_and_Electronic_Signatures_v0.9.1.docx | 31KB |
| KK-SOP-00102_Training_Roster_v0.9.1.docx | 36KB |
| KK-SOP-00200_Food_Safety_Policy_v0.9.2.docx | 35KB |
| KK-SOP-00201_Employee_Sanitation_and_Hygiene_Standards_v0.9.docx | 37KB |
| KK-SOP-00202_Food_Handling_Fundamentals_v0_9_1.docx | 38KB |
| KK-SOP-00205_Housekeeping_and_Sanitation_Program_v1.0.docx | 47KB |
| KK-SOP-00206_Production_Critical_Control_Points_v0.9.docx | 50KB |

Also present: `evil.docx` (5 bytes), `test.pdf` (14 bytes), `sop-1/` directory, and empty subdirectories (Active/, Archived/, Drafts/, In Review/).

All 8 legitimate `.docx` files are linked in the `documents` table to SOPs 1-8.

---

## 5. Database Check

All 8 SOPs have linked documents:

| Doc ID | Filename | Linked SOP ID |
|--------|----------|---------------|
| 3 | KK-SOP-00100_Good_Documentation_Practices_v0.9.docx | 1 |
| 4 | KK-SOP-00101_Handwritten_and_Electronic_Signatures_v0.9.1.docx | 2 |
| 8 | KK-SOP-00102_Training_Roster_v0.9.1.docx | 3 |
| 9 | KK-SOP-00200_Food_Safety_Policy_v0.9.2.docx | 4 |
| 10 | KK-SOP-00201_Employee_Sanitation_and_Hygiene_Standards_v0.9.docx | 5 |
| 19 | KK-SOP-00202_Food_Handling_Fundamentals_v0_9_1.docx | 6 |
| 6 | KK-SOP-00205_Housekeeping_and_Sanitation_Program_v1.0.docx | 7 |
| 15 | KK-SOP-00206_Production_Critical_Control_Points_v0.9.docx | 8 |

---

## 6. Screenshots

- `screenshots/read-update-result.png` — Modal showing extraction results with warnings and proposed updates
- `screenshots/read-update-applied.png` — SOP detail page after apply, showing corrupted owner field

---

## 7. Recommended Fixes (Priority Order)

1. **Fix author extraction regex** — Use a more bounded pattern that stops at the next field label (e.g., `Approved By`, `Classification`), not at `$` or `\n`
2. **Fix section extraction for numbered headings** — Add patterns for `\d+\s+Purpose`, `\d+\s+Scope` etc. with `\n\n` separators
3. **Fix version priority** — Check document body first, fall back to filename; or compare and prefer the higher version
4. **Add per-field selection** — Let users toggle individual updates on/off with checkboxes before applying
5. **Add a dry-run safety net** — Don't apply changes that would replace non-empty fields with shorter/generic content
6. **Validate extracted author** — Reject author strings longer than ~50 chars or containing sentences
