# QMS Upgrade & Stability Plan

**Date:** 2026-05-01
**Author:** Jarvis (analysis from Apr 30 session)
**Status:** Planning

---

## Root Cause Analysis

Cloud Run is stateless — anything written to local disk inside the container is lost on restart/redeploy. The QMS app has been migrated toward Postgres/Cloud SQL, but SQLite leftovers remain in the codebase.

### Known Issues

- **ECONNREFUSED 127.0.0.1:5432** — At least one code path/config is still trying localhost incorrectly
- **Dual DB codepaths** — Some routes may still import `database.js` instead of `database-pg.js`, sending data to a local `.db` file that vanishes on container replacement
- **Schema init failures** — SQLite-specific DDL like `datetime('now')` can fail on Postgres, causing tables to never be created correctly
- **Connection/config race on startup** — App may start before DB connectivity is ready, falling back or booting into degraded mode
- **Silent write failures** — Inserts that fail silently or are caught and ignored mean no way to know if data was ever committed

### Why Data Disappears

The system currently lacks hard guarantees that:
- Every write goes to one durable database
- Every read comes from that same database
- The app fails closed if DB is unavailable or schema is invalid
- Deployments are blocked if migrations/config are broken

The app can still start in a partially broken state and "pretend" to save data.

---

## Upgrade Plan (7 Layers)

### 1. Single Persistence Layer

- `database-pg.js` as the sole source of truth
- Delete or quarantine SQLite modules (`database.js`, `better-sqlite3`)
- Add CI check — fail build if repo contains imports of:
  - `better-sqlite3`
  - `database.js`
  - SQLite-only SQL like `datetime('now')`, `last_insert_rowid()`, `PRAGMA`

### 2. Startup "Fail Closed" Health Gate

On boot:
- Verify DB connection
- Verify expected tables exist
- Verify a simple read/write transaction works
- **If any check fails, exit the process**

Better to crash immediately than serve a broken app that "pretends" to save.

### 3. Real Migrations

Use a migration system (Drizzle, Knex, Prisma, or simple SQL runner):
- Prevents ad hoc `CREATE TABLE IF NOT EXISTS` blobs scattered in route files
- Versioned, repeatable, auditable

### 4. Write Audit Trail

For every create/update/delete:
- Log the table, record ID, actor, timestamp
- Optionally write to an `audit_log` table

Then if "data disappeared," you can answer:
- Was it ever written?
- Was it deleted?
- Did the write fail?
- Which revision handled it?

### 5. Backups + Export

For Cloud SQL:
- Enable automated backups
- Enable point-in-time recovery
- Add nightly export of key tables to GCS

Protects against true DB loss, separate from app bugs.

### 6. Deploy Verification

After each deploy, automatically run:
- Login smoke test
- Create test record
- Fetch test record
- Verify it persists after a new revision or instance recycle

Catches "works in memory, disappears later" immediately.

### 7. Admin Diagnostics Page

Build a hidden admin page showing:
- Current app revision
- Connected DB host/database
- Migration version
- Table counts
- Last successful write timestamp
- Latest DB errors

Makes future debugging much faster.

---

## Target Architecture

| Component | Current | Target |
|-----------|---------|--------|
| Frontend/API | Cloud Run | Cloud Run (no change) |
| Primary DB | Mixed SQLite + Postgres | Cloud SQL Postgres only |
| Migrations | Ad hoc CREATE TABLE in routes | Versioned migration tool |
| Files/uploads | Local disk (lost on restart) | Google Cloud Storage |
| Backups | None | Cloud SQL automated + periodic GCS exports |
| Observability | Minimal | Structured logs + alerting on DB errors |
| CI guardrails | None | Block SQLite codepaths from merging |

---

## Progress Tracking

- [x] Replace `datetime('now')` → `CURRENT_TIMESTAMP` in all route files (72 replacements, May 1)
- [ ] Remove all `database.js` / SQLite imports from production code
- [ ] Implement startup health gate
- [ ] Set up migration system
- [ ] Add write audit trail
- [ ] Enable Cloud SQL backups
- [ ] Build deploy verification script
- [ ] Build admin diagnostics page
- [ ] Move file uploads to GCS
- [ ] Add CI guardrails
