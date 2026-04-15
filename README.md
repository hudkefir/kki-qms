# KKI QMS - Document Control System

QA Document Control System for Kefir Kultures Inc. Built for GMP/SQF audit preparation (SGS audit: April 23, 2026).

## Quick Start

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5174
- Backend: http://localhost:3002
- Network access: http://<mac-mini-ip>:5174

## Architecture

- **Frontend**: React + Vite + TailwindCSS (port 5174)
- **Backend**: Express + SQLite (port 3002)
- **Real-time**: WebSocket for live updates
- **Database**: SQLite via better-sqlite3 (auto-created at `server/data/qms.db`)

## Features

- **Dashboard**: SOP stats, audit readiness %, countdown to audit, priority action items
- **SOP Library**: Searchable, filterable table of all 28 SOPs with status tracking
- **SOP Detail**: Version history, revisions, comments, audit checklist, edit capabilities
- **Audit Prep**: Gap analysis, traffic light indicators, category breakdown, print-friendly

## SOP Status Tracking

- **Clean** (21 SOPs): Audit-ready, active
- **Needs Costco Strip** (9 SOPs): In review, requires cleanup
- **Not Yet Built** (2 SOPs): Blockers - Process Flow & Personnel Flow Diagrams

## Production

```bash
npm run build
npm start
```
