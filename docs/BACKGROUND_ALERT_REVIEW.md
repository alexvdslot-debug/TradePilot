# Background alerts review — completed source review

**VERDICT: PASS** for the completed implementation source and targeted tests. The historical discovery notes below are closed by the final fix recheck. Deployment and actual activation remain separate parent acceptance steps; both deployment configurations keep the global switch disabled. No source edits, server/build, external requests or production mutations by reviewer.

## Reviewed boundaries

- `background-provider.mjs` exposes a named WorkerEntrypoint RPC with public fetch returning 404. Adapter public HTTP remains Access-authenticated. RPC never accepts/forwards an owner JWT: exact input shape permits only fixed 5-minute candle requests or whitelisted exchange status.
- `backgroundProviderRead` checks the global switch, shared quota database and secret availability before fetching. Server disabled defaults are explicit. Provider payloads remain byte-bounded, allowlisted and error-filtered; no API key/diagnostics are relayed.
- Background quota uses the same provider row and atomic write as interactive callers. One admission immediately precedes each actual upstream call; no additional scheduler-side increment. Global 8/minute and 800/day limits remain; background is bounded to four/minute and 300/day and stops when shared day usage reaches 600, reserving capacity for interactive requests. Failed quota storage fails closed.
- Scheduler has an exclusive expiring lease, lexical cursor, at most 20 tasks and two unique symbols, shared feeds per symbol/exchange. Selection and reread require owner background opt-in; commit requires the same owner's version, opt-in still true and unexpired matching lease. CAS retries reread fresh owner state. No stale selection snapshot is written.
- Missing/expired entitlement returns before lease acquisition or provider calls. `normalizeCandles` and existing `checkAlerts` validate source identity, fresh entitlement/display rights, regular completed candle, current exchange status and exact threshold provenance. One-shot updates disable the alert and persist source/time/price for the next visit; no invented push delivery.
- UI distinguishes saving an opt-in preference from active service capability; disabled/unverified/opted-out states have explicit copy. No Web Push/email or guaranteed capture of every crossing is promised.
- Migration 0006 only adds background quota counters and scheduler metadata. Existing ledger/account rows are not rewritten by the SQL. Both Worker deployments need this schema before new quota code runs; deployment/migration evidence belongs to parent.

## Minor resilience observation sent to builder

Release update does not inspect affected row count; an expired/replaced lease can return an otherwise successful run status after zero rows changed. Existing commit lease guard prevents unsafe writes. In the catch-return path, a release failure mutates the original result but not its already-created spread copy (which is already error). Test lease expiry/loss and report run outcome consistently; this is not an ownership bypass.

## Evidence

Independent targeted run: provider-quota and provider-adapter tests **20 passed, zero failed**. Both background modules pass syntax checks. No new scheduler-specific test file existed at the moment of inspection; builder is creating it. This evidence does not prove scheduled production execution, private RPC deployment, migration application or current provider rights.

## Lessons

Background privilege belongs in a private service entrypoint, not fabricated user authentication. Quota admission must be atomic across foreground/background and occur once immediately before the actual upstream call. Opt-in needs a commit-time guard as well as selection filtering. Scheduled cursor/lease bounds protect fairness and safe writes but do not guarantee detection of every transient price move. UI should state preference, readiness and actual delivery separately. Missing entitlement should block work before consuming quota, and test completion—not source plausibility—is the final review gate.

## Blocker discovered during scheduler test review

A valid-format nonexistent/delisted symbol in the first selected task causes provider failure before cursor advancement. The outer catch aborts the run and releases the unchanged cursor. Every next run therefore selects the same failing alert first, indefinitely preventing later owners from evaluation. Alert state validates symbol format, not provider availability, so this is reachable with ordinary owner input. Sent to root and builder immediately. Isolate symbol-specific permanent failures and advance fairness cursor while continuing within the bounded batch; quota/configuration failures can remain global stop conditions. Add repeated-run first-bad-symbol plus second-valid-owner regression. No false trigger or unsafe write is caused, but the service fails its multi-owner fairness contract.

Concurrent builder fix observed: release failure/zero affected rows now has explicit lease-loss/database reporting with a test. That earlier resilience note is closed in source. Scheduler tests now exist and are being independently run; initial absence was a timing snapshot.

## Final fix recheck and verdict

Builder announced completion. Scheduler now catches symbol-specific PROVIDER_UNAVAILABLE/INVALID_PROVIDER_DATA, stores a failed-symbol sentinel within the run, counts it against the two-symbol bound, advances the durable cursor and continues later owners. Global quota/storage/configuration failures still stop without false trigger. The first-bad-owner/second-valid-owner test proves the later alert triggers, the bad owner's version stays unchanged, and subsequent runs remain bounded. Poison-symbol blocker closed.

Release failure and zero affected rows return explicit error with safe code; no diagnostic leakage. Blocker list: none remaining in this scoped review. Security flags: no new owner impersonation, public privilege route, secret leakage or cross-account write identified.

Independent final run: **32/32 tests passed** across actual-SQLite scheduler (12), provider quota (12) and provider adapter (8), zero failed. Syntax checks passed earlier. Builder additionally reports four NL/EN background-preference UI tests passed; attributed evidence, not independently rerun. No build/server/browser/production action by reviewer. Checked worker/wrangler.toml and worker/provider.wrangler.toml both set BACKGROUND_ALERTS_ENABLED=false; this review does not authorize silently activating the feature. Deployment must preserve private named binding, shared quota schema and disabled switches. Verified provider entitlement is still necessary for any later enabled run.

Final lesson: a bounded cursor is not fair if one bad symbol always aborts before advancement. Per-symbol failure isolation must count failed work against the same resource bound and retain global quota fail-closed behavior. The actual-SQLite repeated-run regression closes this failure more meaningfully than a mocked happy path.

## Regular-window quota correction recheck

**VERDICT: PASS** for the new conservative scheduling filter. Enabled overnight/weekend cron invocations previously could spend background credits despite being unable to trigger regular-session alerts. Production remained globally disabled, so no actual budget was consumed by that old schedule.

`inBackgroundCheckWindow` uses Intl America/New_York with weekday and h23 time, admitting weekdays 09:35 inclusive through 16:00 exclusive. `runBackgroundAlerts` validates the timestamp and skips outside that window before accessing DB, quota binding or provider RPC. This is expressly only a quota-saving admission filter: entitlement and authoritative current provider-open gates remain unchanged, and holidays/early closes are not asserted open from the local clock.

Independent scheduler rerun **14/14 passed**, zero failures. Tests use throwing binding getters to prove zero off-hours database/quota/RPC access; cover weekends, overnight, premarket, 09:34:59, 16:00, afterhours, both DST transitions and a holiday clock match that remains blocked without entitlement. Additional independent EST/EDT fixtures confirmed 09:35 and 15:59:59 admitted, 16:00 rejected in January and July. No build/deploy/server or source edits performed.

Security flags: no new concern. Activation/deployment and actual provider rights remain separate parent acceptance. Lesson: quota reservation alone does not prevent wasting a bounded budget overnight. Time-based admission can save work without substituting a local calendar for verified current market evidence.
