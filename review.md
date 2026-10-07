# QMS AI chat parity review

Implemented on `team/20261007-004944-delta-kki-qms-chat-parity`. ERP was read only via `git show origin/main:<path>`. No database connections, migrations, deployment, merge, or push were performed.

## Write-tool inventory

Every write tool passes through `handleToolUse` and `proposeAction`; proposing only inserts a pending-action row. QMS changes happen only through the user's explicit confirmation request.

| Tool | Minimum role | Handling |
| --- | --- | --- |
| `update_record_field` | manager | staged via ai_pending_actions |
| `update_action_item_status` | operator | staged via ai_pending_actions |
| `create_action_item` | manager | staged via ai_pending_actions |
| `add_action_item_note` | operator | staged via ai_pending_actions |
| `create_capa_from_deviation` | manager | staged via ai_pending_actions |
| `create_capa` | manager | staged via ai_pending_actions |
| `delete_capa` | admin | staged via ai_pending_actions |
| `link_records` | manager | staged via ai_pending_actions |
| `create_deviation` | manager | staged via ai_pending_actions |
| `update_deviation` | manager | staged via ai_pending_actions |

Manager includes admin; operator includes manager and admin. Both session and live role must permit proposing/confirming, and the live account must be active. The executor also checks the role defensively. Confirmation claims an owned, unexpired pending row with one `UPDATE ... RETURNING`; concurrent/replayed confirmations cannot execute again. Expiry is 30 minutes. Cancellation is owned and single-use. UUID route parameters are validated.

The existing executor retains its per-tool audit calls and existing broadcasts, which now happen after approval. An additional strict `ai_action_claimed` audit insert must succeed before execution; `ai_action_approved` records the outcome via the existing helper. All attribution uses the confirming user's request. The pending row durably stores the decision and result.

## Immediate read tools

- `consult_specialist`: immediate; its only database write is an audit row.
- `query_trends`: immediate.
- `draft_root_cause`: immediate; produces draft context.
- `auto_fill_capa`: immediate; produces a draft, not a saved CAPA.

## Migration and models

`server/src/migrations/38-ai-chat-parity.sql` adds idempotent `ai_pending_actions` and `ai_model_access` tables, using INTEGER user IDs and a session/created-at index. **Migration added, not run.** It must be applied through the normal migration process before these features are used.

The catalog uses Sonnet 5.5 by default and the gateway alias `opus-5-5` for admins. Per-user overrides narrow the catalog; premium access remains capped at admin even with an override or stale session. Model permission is checked before streaming and every model round. Explicit picker selection takes precedence over `QMS_AI_MODEL`; the existing configured Haiku fallback is unchanged. Kimi is excluded entirely.

**Opus gate decision:** enabled for admins without ERP's `AI_PREMIUM_MODELS` gate, following Hudson's supplied successful gateway verification. No deployment configuration was edited and this work did not call the gateway.

## Page sharing and history

Sharing defaults off and resets off on pathname changes. Only route/title and optional allowlisted record type/ID are sent when checked. Form scraping is removed. The server rejects unknown fields (including legacy `page` and `formData`), wrong types, invalid IDs/types, over-length fields, and payloads over 2 KB. Saved records and related records remain available when shared, with ERP redaction and an escaped untrusted-data boundary. Without sharing, no page/record data is added to the prompt; existing conversation text remains in history.

SSE cards support Approve/Cancel and terminal statuses; current status is restored from owned pending-action rows. Assistant message context retains proposals even when a later model round fails. In-memory history is keyed by user plus chat session to match database ownership.

## Necessary implementation adjustments

- Hash canonical JSON rather than raw insertion-order JSON: PostgreSQL JSONB reorders keys. Tests deliberately reorder stored keys and also verify tamper rejection.
- Node 26 rejects `node --test test/` as a module path. The test script uses `node --test test/*.test.js`.
- Prefer Sonnet as the default whenever allowed; if an admin override contains only Opus, use that allowed model rather than bypass the override with Sonnet. Empty access is rejected.
- The shared `logAudit` swallows errors. The strict pre-execution audit insert prevents mutation when audit storage is unavailable without editing unrelated audit code. Existing multi-query executors are not transactional; crashes or partial failures are never retried automatically. A claimed action can remain `running` after a process crash and requires record inspection.
- Tool-result turns group all parallel model calls into one assistant turn and one results turn, preserving the Messages API protocol. Response-close detection uses the response stream.
- The list-page context branch was unreachable in the original nesting; it now uses the same shared allowlist when opted in.

## Verification

- `cd server && npm ci`: initial default-cache install failed because of root-owned npm cache entries; sequential retry with `--cache /tmp/qms-chat-parity-npm-cache` passed (181 packages).
- `cd client && npm ci --cache /tmp/qms-chat-parity-npm-cache`: passed (284 packages). No lockfile changes.
- `cd server && npm test`: **34 tests, 34 passed, 0 failed**, including existing migration-parser tests, all ten staged writes, immediate reads, ownership/role/inactive checks, concurrent and repeated confirmation, audit attribution/failure, expiry/cancel, hash normalization/tampering, model access/fallback, client opt-in payloads, and actual router SSE/history tests. All database and gateway dependencies in router tests are intercepted before import; no network or database is used.
- Router raw-import check intentionally replaced with the plan's `node --check` fallback: `database-pg.js` runs migrations at import time. **Seven changed/new JS files passed syntax checking.** The router also imports successfully under the DB-less test hooks.
- `cd client && npm run build`: **2,616 modules transformed; build passed.** Existing Browserslist age and >500 KB chunk warnings remain. Generated `client/dist` output was preserved outside the repository and restored out of the change set.
- Client has no existing standalone test script; its payload tests run in the parity suite. Additional headless Chrome checks use the real sidebar, bundled with esbuild, and intercepted API responses; no application server/database/gateway is started. `node /tmp/qms-chat-parity-browser/check.mjs` passed all four groups: admin picker/opt-out/SSE cards/approve once; opt-in metadata/cancel/navigation reset; restored terminal history; single-model picker hidden/no browser errors. The temporary harness and Playwright install stay outside the repo.
- Final build after the last edits: `cd client && npm run build -- --outDir /tmp/qms-chat-parity-final-build` passed (2,616 modules). Output stays outside the worktree.
- Final script audit caught and corrected an over-broad replacement in `test:migrate`; its original command is preserved. `npm run test:migrate --workspace server` passed all 7 tests, and the full `npm test --workspace server` rerun passed all 34 tests.
- `git diff --check`: passed.

Live PostgreSQL/gateway behavior and migration application were intentionally not exercised. npm reported dependency audit findings (server: 15; client: 18); dependencies were not changed in this scoped task.
