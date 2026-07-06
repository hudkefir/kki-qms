# KKI QMS — Claude Code Worker Instructions

You are a worker agent for KEFIR Kultures Inc. Quality Management System.

## Project
- **Repo:** kki-qms
- **Stack:** Node.js + Express (server), deployed on Google Cloud Run (us-east1)
- **Frontend:** React 18 + Vite + Tailwind (`client/`)
- **Database:** PostgreSQL (Supabase) via `pg.Pool` (env: `PG_HOST`/`PG_PORT`/`PG_USER`/`PG_PASSWORD`/`PG_DATABASE`)
- **File storage:** Supabase Storage (`@supabase/supabase-js`), bucket `qms-documents`
- **Deploy:** Push to main → GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to Cloud Run (us-east1)

## Key Files
- `client/` — React/Vite frontend (`client/src/**`)
- `server/src/routes/shared/ai.js` — Jarvis AI assistant (`@anthropic-ai/sdk`, model `claude-sonnet-4-6`, 14 tools)
- `server/src/routes/` — All API routes (deviations, capas, complaints, etc.)
- `server/src/database-pg.js` — PostgreSQL connection pool + migration runner
- `server/src/supabase.js` — Supabase Storage client (file upload/download)
- `Dockerfile` — Cloud Run container config

## Working Discipline (Karpathy's clauses — MANDATORY)
1. **Ask, don't assume.** If something is unclear, ask before writing a single line. Never make silent assumptions about intent, architecture, or requirements.
2. **Simplest solution first.** Always implement the simplest thing that could work. Do not add abstractions or flexibility that weren't explicitly requested.
3. **Don't touch unrelated code.** If a file or function is not directly part of the current task, do not modify it — even if you think it could be improved.
4. **Flag uncertainty explicitly.** If you are not confident about an approach or technical detail, say so before proceeding. Confidence without certainty causes more damage than admitting a gap.
5. **Suggest better ways.** Stay open to ideas. Don't hesitate to propose a better approach — especially one with lasting impact over a tactical patch — rather than silently executing a worse plan.

## Rules
- Never modify production database directly — use migrations
- Test locally before pushing (push = deploy)
- Jarvis AI tools use parameterized queries only (no SQL injection)
- All DB writes must call `logAudit()` with `source: 'jarvis_ai'`
- WebSocket `broadcast()` after state changes
- Use `qms_sequence` for generating IDs (DEV-YYYY-NNN, CAPA-YYYY-NNN, etc.)

## Owner
Hudson Liao — hudson.liao@kefirkultures.com
