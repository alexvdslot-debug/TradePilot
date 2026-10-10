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

## B7 journal and foreground alert contracts

Journal rows may now include an optional `eventIds` array. Older rows retain their original shape. Links must refer to existing BUY/SELL ledger events for the same symbol. Duplicate links and assigning an event to multiple plans are rejected. A failed linkage validation does not advance the snapshot version or change stored state. Deleting a journal plan must leave its ledger events intact; a subsequent snapshot can deliberately omit that journal row.

`app/journal.mjs` exports `validateJournalLinks(journal, events)` and `journalStatistics(journal, events, {allowMargin, method})`. Statistics use the ledger's opt-in per-sale average-cost realizations, including actual same-currency broker fees. Only executed/reviewed plans with a linked BUY/SELL cycle that closes to zero shares qualify; unlinked, planned, incomplete, and sell-before-buy cycles are excluded. An unrelated purchase still affects portfolio average cost, so accounting uses the complete ledger before attributing realized sale results to plans. Cross-currency trade fees remain separate currency balances; mixed-currency results do not produce an invented converted total or a win/loss classification. Planned entry/stop/target prices never enter realized statistics.

The statistics result contains `trades`, `closedCount`, `excludedCount`, `wins`, `losses`, `breakeven`, `mixedCurrencyCount`, `winRate` (null when no classified closed trades), `netByCurrency` (EUR/USD decimal strings), and `method`. Individual trade results include `journalId`, `symbol`, `currency`, `eventIds`, `closedAt`, `netByCurrency`, and `outcome` (`profit`, `loss`, `breakeven`, or `mixed_currency`).

`app/alerts.mjs` exports:

- `checkAlerts(alerts, feeds, {now})`: returns `{alerts, changed, messages}`. `feeds` can be a Map, object keyed by symbol, or array. It does not fetch data or send notifications. Messages are structured with `code: 'PRICE_ALERT_TRIGGERED'` for UI translation.
- `resetAlert(alert)`: explicit owner re-arm, clearing trigger provenance and read acknowledgement.
- `markAlertRead(alert, {now})`: acknowledges a triggered notification; a never-triggered alert remains unchanged.

Alert evaluation requires server-fetched, nonstale USD/UTC candle data with a verified source, verified boolean realtime status, numeric zero delay, and verified display rights. `entitlementVerified` must be true; verification/expiry timestamps and volume coverage must satisfy the existing `entitlementMetadata` evidence contract, including a nonexpired maximum-30-day verification period. Current market status must authoritatively confirm open trading for the same provider/exchange (`basis:'provider_market_state'`, `scope:'current_exchange_status'`, `stale:false`) with a timestamp at most 90 seconds old (and no more than 60 seconds ahead for clock skew). Historical clock classification alone cannot trigger a notification. Bars must have valid positive OHLC data, volume, canonical timestamps and contiguous intervals within a New York session date. The latest closed candle is used, must classify as regular trading, and may be at most two intervals old. Still-forming bars cannot produce a trigger. Threshold comparisons are inclusive (`above >=`, `below <=`) and use scaled integers. A trigger disables the alert and stores `triggeredAt`, nullable `readAt`, and `triggerPrice`/`triggerAsOf`/`triggerSource`. Repeated evaluations do not create a second notification until an owner explicitly re-arms it.

The backend accepts legacy alerts without acknowledgement/provenance fields and validates these optional fields when present. Provenance fields are all-or-none; the source is bounded plain text, price is a decimal string, and observation/read timestamps must be logically consistent with the trigger. No background delivery, browser permission request, email, push, or broker execution is introduced.

B7 lessons:

- Per-plan P&L must reuse full-portfolio accounting, since unrelated lots affect the average cost allocated to a linked sale. Per-plan replay would give misleading results.
- Cross-currency broker fees prevent a defensible scalar win/loss classification without historical FX; preserve separate currency results instead.
- A newest candle may still be forming. Evaluate the previous completed candle rather than using the provisional close or discarding an otherwise reliable feed.
- Overnight gaps are expected; validate contiguous intervals within a trading session date rather than rejecting an entire multi-day feed.
- Schema/source normalization is distinct from verified realtime entitlement or current market status. A normalized provider payload alone must not activate notifications.
- Review correction: the initial alert gate checked realtime/delay flags but omitted explicit display rights, entitlement expiry, and authoritative current market status. Alert evaluation now reuses the market-quality entitlement, completed-bar, and historical-session helpers and independently requires current provider-confirmed open status. Unknown, expired, closed, or stale evidence leaves alerts unchanged.

B7 local verification: `node --test tests/journal.test.mjs tests/alerts.test.mjs worker/private-state.test.mjs` passed 20 tests, 0 failed (6 journal, 5 alerts, 9 private-state). These are local unit/API integration checks; frontend workflows, production persistence, and production alert evaluation require separate end-to-end verification. An initial journal run preceded the ledger's pending opt-in realization extension and failed on its absent output; rerunning after that dependency became available passed all journal scenarios.

Alert review correction verification: `node --test tests/alerts.test.mjs` passed **8 tests, 0 failed**, including explicit refusal for missing/expired entitlement, unverified display rights/source, unknown/closed/current status, stale status, wrong provider/exchange, and nonauthoritative clock evidence.
