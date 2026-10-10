# Bounded background price alerts

## Implemented contract

`runBackgroundAlerts(env,{now})` in `worker/src/background-alerts.mjs` is called only by the main Worker's scheduled handler. The native Cron Trigger runs every five minutes in UTC. The main global switch `BACKGROUND_ALERTS_ENABLED` defaults to the literal string `false`. Disabled invocations return without reading owner records or fetching market data. Native scheduled handlers are the platform mechanism, rather than an HTTP scheduler endpoint. [Cloudflare Cron documentation](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

Account consent is the distinct boolean `preferences.backgroundAlerts`, default false. Existing five-key preference JSON remains valid: the authenticated API supplies false when absent. Legacy five-key PATCH preserves a previously saved explicit background choice rather than resetting it. `inAppAlerts` keeps its existing foreground meaning. GET/PATCH settings include a safe `backgroundAlertsStatus` capability containing active, code, delivery=`stored_in_app`, cadenceMinutes=5. Codes distinguish disabled, unconfigured, entitlement unverified, opted out and ready; ready means eligible periodic evaluation, not guaranteed detection.

Delivery is a stored unread bell notice seen at the owner's next authenticated visit. This does not implement Web Push, email or external messaging. Settings and alert copy explain the separate opt-in and inactive server state in Dutch and English. No browser permissions are requested.

## Internal provider path

`worker/background-provider.mjs` reexports the existing provider public fetch and exposes the named `BackgroundMarket` WorkerEntrypoint. The main `BACKGROUND_MARKET` service binding names that entrypoint; `.read({kind:'candles',symbol})` and `.read({kind:'status',exchange})` are its only custom method and allowed argument shapes. Candle interval is fixed at five minutes. Its HTTP fetch returns 404. Public adapter paths still require a verified owner Access JWT; no owner JWT is stored, fabricated or forwarded by the scheduler. Native service RPC makes this capability available through a binding rather than a public URL. [Cloudflare RPC documentation](https://developers.cloudflare.com/workers/runtime-apis/rpc/), [RPC visibility/security](https://developers.cloudflare.com/workers/runtime-apis/rpc/visibility/)

The provider independently requires its own global switch and the existing provider secret/shared quota binding. Credential values stay in that Worker. Bounded response streaming, existing request timeout and sanitized provider error codes are reused. No new credentials are introduced. `worker/provider.wrangler.toml` points at the wrapper and defaults the provider switch false. Release-payload provider modules include the wrapper plus its transitive auth/quality/quota dependencies.

## Admission and consistency

Migration 0006 adds two background counters to `provider_quota` and one non-owner `alert_scheduler` lease/cursor row. It changes no account, preference, transaction or alert data. Apply once through the migration process before publishing code that references the added columns; the ALTER statements are intentionally not replayable.

Background and foreground requests share one atomic SQLite UPSERT per actual provider request. Background additionally requires shared D1 (no local fallback), at most four background/total admissions before background stops in a minute, at most 300 background requests per UTC day, and fewer than 600 total daily requests before another background admission. Global totals remain eight per minute and 800 per day. This leaves at least four minute slots and 200 daily slots for interactive admission; external key use is outside these counters and provider 429 remains explicit. Interactive window changes reset expired background counters in the same write. [D1 prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)

The scheduler obtains an atomic two-minute lease. The durable cursor orders `(user_id,symbol)` tasks, with at most 20 candidates and two distinct symbols per invocation. Each unique symbol is fetched once within that invocation; exchange status is reused only within the run. At most four upstream requests are possible. A finite candidate page and durable wraparound prevent a single owner's large list from always taking the first slots. Alerts are not guaranteed checks every five minutes: quota, ownership population and evidence may cause longer gaps. They evaluate recent completed candles, not every intrabar threshold crossing.

Provider-unavailable or malformed individual symbols are isolated, counted as skips and advance the cursor. They never trigger a notification. Quota and configuration/DB failures stop safely without committing false triggers. A broken first symbol cannot indefinitely starve a later owner's valid symbol.

Owner state is reread immediately before evaluation. Full snapshot validation and the unchanged `checkAlerts()` contract apply: verified source, current unexpired realtime entitlement, numeric zero delay, verified display rights, authoritative fresh open exchange status, and valid fresh completed regular candles. Missing entitlement prevents any upstream fetch. General Basic-account documentation is not sufficient evidence.

A trigger writes only that owner's fresh validated snapshot, increments both JSON/DB versions and requires the expected owner version, current opt-in and current lease token in its UPDATE conditions. A conflict gets up to three reevaluations from current state. Concurrent opt-out prevents the write; unrelated transaction/journal edits remain intact. A stale UI PUT consequently gets a normal 409 and must refetch without discarding its unsaved edits. One-shot disable plus persisted trigger provenance prevents repeated delivery across runs. Lease-loss/release failures are explicitly reported rather than silently appearing successful.

## Verification and remaining activation prerequisites

Tests use actual SQLite prepared statements through Python, independent connections and real signed JWTs for settings. Coverage includes trusted triggers, shared-symbol fanout, cross-owner opt-out/isolation, concurrent leases, expired leases, durable cursor rotation, racing account opt-out, snapshot conflicts, malformed data, poison-symbol fairness, release failure, exact shared quota admission, interactive reservation, external 429, and public RPC rejection. The focused browser test fully intercepts local source assets and therefore starts no server and performs no build/deployment.

Current targeted results: scheduler 12/12; provider quota 12/12; provider adapter 8/8; settings API 7/7; background settings browser smoke 4/4 (Chromium and WebKit). Existing alert evidence tests 8/8 remain unchanged. Syntax checks pass for the wrapper, main UI and scheduler. Parent release work performs native Worker bundle checks, full integrated tests, migration and disabled deployment; these are not asserted by Node-only tests of the RPC core.

Activation requires both global switches enabled, the named service binding, applied migration and valid account-specific market entitlement. Current production entitlement is unverified and switches remain false. No production state was modified by this implementation.

## Lessons recorded

- Scheduled execution has no owner Access JWT. Use a dedicated native service capability; never recycle interactive authentication as a cron credential.
- Shared global limits alone let background work exhaust interactive capacity. Apply additional background counts and reservation predicates in the same admission write.
- Additive ALTER migrations run once. An old test replaying the entire schema twice failed after the additive migration; corrected fixture setup applies baseline and additive migrations once, matching deployment behavior.
- Snapshot CAS handles deduplication, but background writes make version conflicts routine. Preserve owner edits and reevaluate against fresh state rather than resubmit an obsolete full snapshot.
- A per-symbol error is not a scheduler-wide failure. Review found a poison-symbol starvation path; bounded skip-and-advance behavior and a cross-owner regression now prevent it.
- Capability display must separate saving consent from activating execution. A checked checkbox with disabled server configuration remains clearly labeled inactive.
- Checking a release result's affected rows catches a lost lease; a reported success cannot hide failed cleanup.
