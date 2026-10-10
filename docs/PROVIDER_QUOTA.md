# Shared provider quota

Built and tested locally. No production migration or deployment is performed by this change.

`consumeProviderQuota(env, {now = Date.now()})` in `worker/src/provider-quota.mjs` reserves one Twelve Data upstream request. All users, routes, and Worker isolates that use the same `MARKET_QUOTA_DB` D1 database share the same provider-only row. The table contains no user identifiers, account data, portfolios, tickers, or API keys.

The shared budget is **8 actual requests per UTC minute and 800 per UTC day**. Both windows are fixed: a minute resets at its exact UTC boundary; the day resets at 00:00 UTC. These are application safeguards, not a claim about provider billing windows or endpoint credit weights. Provider accounts may have additional limits, different reset timing, or external key usage; upstream 429 responses remain explicit quota failures. Daily exhaustion may persist until midnight even when a client receives a short retry hint.

The additive `0004_provider_quota.sql` migration creates one keyed row per provider. A single parameterized `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING` checks both remaining budgets and increments them atomically. A rejected admission returns no row and changes neither counter. An older clock window cannot roll counters back. This avoids the concurrent overspend that would occur with a separate read/check/update sequence. The implementation uses D1 `.prepare().bind().first()`, following [Cloudflare prepared statement documentation](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).

Result contract:

- Allowed: `{allowed:true, mode:'shared'|'local', minuteCount, dayCount}`.
- Exhausted: `{allowed:false, code:'PROVIDER_QUOTA', status:429, retryAfter}`.
- Configured database failure or invalid result: `{allowed:false, code:'PROVIDER_QUOTA_UNAVAILABLE', status:503}`.

The binding is optional to retain local development/test compatibility. When it is absent, an isolate-local bounded fallback enforces the same windows but cannot coordinate different isolates. **A configured but unavailable binding never falls back locally.** Deployment must supply `MARKET_QUOTA_DB` to every Worker that can make actual provider requests, pointing to the same migrated database. Existing per-user request admission remains independent of the provider budget.

Integration points:

- Provider adapter: consumes once after authenticated route/parameter checks and immediately before the Twelve Data fetch.
- Main market API direct-secret path: consumes once before direct upstream fetch. Calls through `MARKET_PROVIDER` are counted only by the downstream adapter, preventing double charging.
- Legacy quote endpoint: consumes once for each actual symbol fetch, including requests containing multiple symbols. Partial quote results carry per-symbol quota errors and an HTTP 429; configured storage failures return HTTP 503. External 429 is handled before attempting to parse provider JSON.
- Cached market responses and coalesced in-flight requests spend no additional provider budget. Failures after an actual request still spend its reservation; no unlimited retry or compensating refund is introduced.

Tests use signed JWTs and actual SQLite through Python, rather than relying only on a map pretending to enforce SQL semantics. Coverage includes independent concurrent connections, the minute and daily limits, UTC window resets, denied-call immutability, clock rollback protection, local fallback, corrupted/unavailable D1 results, direct/bound call counts, cache hits, multi-symbol legacy calls, and non-JSON external 429 responses.

Local result: `node --test worker/provider-quota.test.mjs worker/provider-adapter.test.mjs worker/market-api.test.mjs` passed **25 tests, 0 failed**, including 9 new quota tests. The concurrent SQLite scenario launches 24 independent connections and admits exactly 8; the daily scenario admits 800 across 100 minute windows, rejects additional same-day requests without changing counters, then admits a new request after UTC midnight. Actual Cloudflare binding deployment and migration application remain separate release gates.

Lessons:

- Quota belongs to the provider account, so per-user or isolate-only counters cannot protect a shared key across concurrent Worker isolates.
- Put admission at the actual external-fetch boundary. Charging both the app Worker and its service-bound provider adapter would spend two credits for one provider request.
- A minute reset must preserve the daily count; a rejected minute or daily admission must increment neither counter.
- Handle provider HTTP 429 before JSON parsing. Provider error bodies need not be JSON, and parsing first could conceal a quota failure.
- A missing optional development binding and a configured production database failure require different behavior: bounded local compatibility versus a closed service error.

## Background admission reservation

Migration 0006 adds background counters to the same shared provider row. Background RPC admission is one atomic UPSERT and stops at four minute admissions, 300 background/day or 600 total/day, preserving interactive capacity within the original eight/800 limits. It requires D1 and never uses local fallback. Existing interactive calls reset obsolete background counters with normal UTC window rollover. See [background contract](BACKGROUND_ALERT_IMPLEMENTATION.md).
