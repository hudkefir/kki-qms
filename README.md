# KKI QMS — Quality Management / Document Control System

Quality Management System for **Kefir Kultures Inc.** Built for GMP / SQF audit
readiness (initial SGS audit: April 23, 2026). Covers controlled documents, SOPs,
suppliers, deviations/CAPA, batch tests, and audit prep — with a Part 11-style
e-signature and audit trail.

> **Build #153** · default branch `main` · version 1.0.0

## Quick Start

```bash
npm install                          # root deps
cd server && npm install && cd ..    # server deps
cp .env.example .env                 # then fill in values (see .env.example)
npm run dev
```

- Frontend: http://localhost:5174
- Backend: http://localhost:3002
- Network access: http://<host-ip>:5174

You will need a PostgreSQL database. In production this is **Supabase Postgres**;
locally you can point the `PG_*` vars at a Docker Postgres. See `.env.example` for
every required variable.

## Architecture

- **Frontend**: React + Vite + TailwindCSS (port 5174)
- **Backend**: Express (port 3002) + WebSocket (`ws`) for live updates
- **Database**: PostgreSQL via `pg` (Supabase Postgres in prod). Sessions persisted
  with `connect-pg-simple`.
- **File/document storage**: Supabase Storage (`@supabase/supabase-js`)
- **Auth**: session-based, passwords hashed with bcrypt
- **AI assistant (QMS Jarvis)**: `@anthropic-ai/sdk`
- **Inventory integration**: SOS Inventory API (optional)
- **Deployment**: Google Cloud Run, us-east1 (`K_SERVICE` / `K_REVISION` are set by the platform)

> An older SQLite path survives only as `server/src/database.js.DEPRECATED_SQLITE`
> and is **not** used. The live datastore is PostgreSQL.

## Features

- **Dashboard**: SOP stats, audit readiness %, countdown to audit, priority actions
- **SOP Library**: searchable/filterable SOP table with status tracking. Tier A
  parse-on-upload pre-fills SOP metadata from the uploaded document (Build #153).
- **Document Control**: controlled documents, versioning, approvals, audit trail
- **Suppliers**: type-aware document checklists (ingredient / packaging / distributor)
- **Deviations & CAPA**: investigation, disposition, CAPA workflow
- **Batch Tests**: QC result capture and printing
- **Audit Prep**: gap analysis, traffic-light indicators, print-friendly views

## Production

```bash
npm run build
npm start
```

Deployed to Cloud Run (us-east1). See `CHANGELOG.md` for release history.

## License & IP

© Kefir Kultures Inc. **Proprietary — all rights reserved.** This repository contains
KKI's compliance core (controlled-document schema, e-signature and audit-chain logic).
No permission is granted to use, copy, modify, or distribute without written consent
from Kefir Kultures Inc. Public visibility does not grant a license.

No secrets are committed — `.env` is gitignored; all keys live outside the repo.
