# Private portfolio and journal state

Status: built and locally tested; migration and production deployment are not applied by this implementation.

`privateStateApi(request, env)` serves `GET /api/v1/state` and `PUT /api/v1/state`. The Worker entry point must call it before the existing settings API, which rejects unknown `/api/v1` paths. It uses the existing exported Access JWT verifier. D1 ownership comes exclusively from the verified issuer/subject pair, with parameterized queries and no request-selected user ID.

The full snapshot contains exactly `version`, `events`, `watchlist`, `journal`, `alerts`, and `preferences`. Defaults contain empty collections and `{allowMargin:false,costMethod:'average'}`. Watchlists and alerts are limited to 50 items, journals to 500 entries and ledgers to 2,000 events. Monetary inputs are decimal strings; the ledger module validates accounting semantics, including duplicate event IDs, available cash, and overselling. Journal text is bounded and rejects HTML delimiters and control characters. Alerts carry one validated nullable UTC trigger timestamp; this endpoint sends no external notifications.

PUT requires a same-origin Origin header, `x-tradepilot-csrf: 1`, JSON content type, and a verified Access token. Requests are read incrementally with a maximum of 200,000 UTF-8 bytes. GET rejects a supplied foreign Origin. Responses are JSON, `no-store`, and `nosniff`. Invalid authentication returns 401; origin/CSRF failures 403; invalid state 400; oversized body 413; unsupported media 415. Missing service configuration and storage failures return a structured 503 without internal database details.

`0003_private_state.sql` adds a user-owned table without altering existing settings or transactions. A conditional `UPDATE ... WHERE user_id=? AND version=?` increments versions atomically. Competing saves receive 409; clients must reload and deliberately reapply a change rather than silently overwrite another snapshot. Successful saves return the exact committed snapshot, avoiding an additional read that might already reflect a subsequent writer.

Local verification:

- `node --test worker/private-state.test.mjs`: 7 passed, 0 failed. Uses genuinely signed RSA JWTs with a test JWKS fetch and an in-memory D1 adapter. Covers persistence, A/B isolation, competing/stale saves, CSRF, origin, forged tokens, schemas, invalid ledger events, payload bounds, and storage failures.
- SQLite migration smoke: 5 passed, 0 failed. Applies all migrations twice and checks preserved users, owner foreign keys, valid JSON, and conditional version updates.
- Syntax checks for the implementation and test module passed.

Production gates remain authenticated end-to-end API checks, actual D1 migration application, frontend save/reload/conflict handling, and deployment verification. Snapshot persistence is deliberately the initial contract; it does not implement record-level merges, scheduled background alerts, broker execution, or external notification delivery.

Lessons captured during implementation:

- The requested `~/.Codex/rules/security.md` and `database.md` were unavailable. Existing Access verification and project security requirements remain enforced; this report does not claim those absent files were reviewed.
- Repository code lives under `TradePilot/`, while the supplied root is a project mirror. Synced `sources/` remain untouched.
- Reuse ledger validation for ledger identifiers. CSV import permits dots and colons in event IDs, so a narrower backend ID rule would incorrectly reject valid imports; journal and alert identifiers retain their own bounded schema.
- Return the committed save snapshot directly. Re-reading after an atomic update could otherwise report a later writer's state as the caller's own save.
