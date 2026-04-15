# KKI QMS Security & Bug Audit Report

**Date:** 2026-03-31
**Tester:** Automated API security testing via curl
**Target:** http://localhost:3002 (admin/admin123)

---

## CRITICAL

### BUG-001: Stored XSS — No Server-Side Input Sanitization
**Severity:** CRITICAL
**Description:** Script tags and arbitrary HTML are stored raw in the database. A complaint created with `<script>alert("XSS")</script>` in the description field is stored and returned verbatim by the API. While React escapes by default, any use of `dangerouslySetInnerHTML`, non-React consumers (CSV export, PDF reports, email notifications), or future API integrations would execute injected scripts.
**Repro:**
```bash
curl -b cookies.txt -X POST http://localhost:3002/api/complaints \
  -H 'Content-Type: application/json' \
  -d '{"date_received":"2026-03-31","description":"<script>alert(1)</script>","severity":"low","source":"customer"}'
# Fetching the complaint returns the raw script tags
curl -b cookies.txt http://localhost:3002/api/complaints | grep '<script>'
```
**Affected:** All text fields on complaints, SOPs, CCRs, documents, user display names
**Fix:** Sanitize HTML tags from all user text input on the server side before storage.

### BUG-002: Path Traversal in SOP File Upload
**Severity:** CRITICAL
**Description:** `fileRoutes.js:28` uses `file.originalname` directly as the disk filename with no sanitization. An attacker can upload a file named `../../server/src/index.js.pdf` to overwrite server files. The file is written to `join(documentsDir, file.originalname)` — `path.join` does NOT prevent traversal.
**Repro:**
```bash
curl -b cookies.txt -X POST http://localhost:3002/api/sops/1/upload \
  -F "file=@malicious.pdf;filename=../../etc/evil.pdf"
```
**Affected:** `fileRoutes.js:28` (SOP uploads), `simpleDocRoutes.js:43` (document uploads — partially mitigated by timestamp prefix but `../../` in originalname still traverses)
**Fix:** Strip path separators and `..` sequences from filenames; use `path.basename()`.

---

## HIGH

### BUG-003: Stack Traces Leaked in Error Responses
**Severity:** HIGH
**Description:** Multer errors return full HTML pages with stack traces exposing internal file paths (`/Users/kefirbot/Projects/kki-qms/node_modules/multer/...`). All catch blocks across routes return `err.message` directly, which can leak database schema details, constraint names, and file paths.
**Repro:**
```bash
curl -b cookies.txt -X POST http://localhost:3002/api/documents/upload \
  -F "wrongfield=@test.pdf" -F "category=General"
# Returns full stack trace in HTML
```
**Affected:** Every `catch (err) { res.status(500).json({ error: err.message }) }` across all route files, plus unhandled multer errors.
**Fix:** Add global error handler; return generic messages in production; log details server-side only.

### BUG-004: Hardcoded Session Secret
**Severity:** HIGH
**Description:** `index.js:52` uses `secret: 'kki-qms-session-secret-2026'` — a hardcoded, guessable session secret. Anyone with this secret can forge valid session cookies and impersonate any user including admin.
**Repro:** Visible in source code at `server/src/index.js:52`.
**Fix:** Use environment variable `SESSION_SECRET` with a cryptographically random fallback.

### BUG-005: Server Error Log Contains Full Stack Traces
**Severity:** HIGH
**Description:** `logs/server.err` contains detailed stack traces with internal file paths, module versions, and system directory structure. If this file is accidentally served or exposed, it provides an attacker with a complete map of the application internals.
**Affected:** `logs/server.err` — 29.5KB of stack traces.
**Fix:** Ensure log files are never served statically; add `logs/` to `.gitignore`; consider structured logging.

---

## MEDIUM

### BUG-006: CORS Allows All Origins
**Severity:** MEDIUM
**Description:** `index.js:34-40` allows any origin via `callback(null, true)`. Combined with `credentials: true`, this means any website can make authenticated API requests on behalf of a logged-in user (CSRF via CORS).
**Repro:** Any external website can call `fetch('http://localhost:3002/api/sops', {credentials:'include'})` and read the response.
**Fix:** Whitelist specific origins (localhost dev ports, production domain, Cloudflare tunnel URLs).

### BUG-007: No Rate Limiting on Login Endpoint
**Severity:** MEDIUM
**Description:** `POST /api/auth/login` has no rate limiting or account lockout. An attacker can brute-force passwords indefinitely.
**Fix:** Add express-rate-limit to the login endpoint (e.g., 5 attempts per minute per IP).

---

## LOW

### BUG-008: Complaint Severity Rejects Non-Enum Values Without Helpful Error
**Severity:** LOW
**Description:** Posting a complaint with `severity: "minor"` returns a raw SQLite CHECK constraint error: `"CHECK constraint failed: severity IN ('low','medium','high','critical')"`. This leaks the DB schema.
**Repro:**
```bash
curl -b cookies.txt -X POST http://localhost:3002/api/complaints \
  -H 'Content-Type: application/json' \
  -d '{"date_received":"2026-03-31","severity":"minor","source":"customer"}'
```
**Fix:** Validate severity server-side before the DB query; return user-friendly error.

---

## PASSED (No Issues Found)

| Test | Result |
|------|--------|
| SQL Injection (`search='`, `OR 1=1--`, `UNION SELECT`) | PASS — Parameterized queries throughout |
| Role Enforcement (viewer cannot PUT/POST/DELETE) | PASS — All write operations blocked for viewer role |
| Empty/Null Payloads | PASS — Required fields validated; proper 400 errors |
| Duplicate Complaint Numbers | PASS — UNIQUE constraint prevents duplicates |
| Dashboard Accuracy | PASS — Dashboard totals match API list counts (both report 37) |
| Numeric ID Validation | PASS — Global middleware rejects non-numeric IDs |
