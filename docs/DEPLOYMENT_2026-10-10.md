# TradePilot Pro deployment — 10 October 2026

## Earlier release — 07:54 UTC
- Application: https://tradepilot-pro-api.alexvdslot.workers.dev/app/
- Branch: tradepilot-pro-rebuild. Tested/deployed code commit: aba9363c4cef960a25fba0d496a618408da447cf.
- App Worker version: 43c3af7e-9886-4b20-bb89-8cafb1097889, deployed 07:54:45 UTC.
- Provider Worker version: 19dfb128-ef42-442c-9fa3-1da356db8fdd, deployed 07:52:41 UTC.
- Asset revision: 6353df9b5afabac02c31164a8e33626ee0db5339158d0ac811d9234e309535dc.
- Downloaded production Worker bundle verified against all six tested source modules; every module matched exactly.
- Existing secret remains on tradepilot-market-data. Confirmed secret binding retained; main Worker has MARKET_PROVIDER service binding targeting production. Matching issuer/audience configured; no key was read or copied.
- Additive private-state migration applied, existing user/settings retained. No synthetic production transactions, positions, journal plans or watchlist items created.

## Evidence
- Final Node suite: 88 passed, zero failed.
- Prior complete Chromium/WebKit matrix: 62 passed. Final changed feature suite: 22 passed, zero failed, including one-candle chart/progress completion regression.
- Deterministic build/check passed. Scoped security review PASS; 13 market/adapter tests passed, including signed-JWT main-to-provider integration and legacy quote compatibility.
- Authenticated production browser: account greeting/settings loaded; existing preferences version2 retained after reload. Private feature state initialized version1.
- OPEN 5-minute and 15-minute charts returned real Twelve Data candles. Five-minute last candle opening 2026-10-09T19:55:00Z, retrieved 2026-10-10T07:55:00.565Z; close2.23 USD. This is historical weekend data, not a current tradable quote. UI correctly says Wachten and exposes unverified phase/delay.
- Production ticker search OPEN returned Opendoor listings. Search does not invent a price.
- Direct /app/analyzer/ redirects to canonical route and loads. Final progress message clears when chart completes, labels display Slotkoers/VWAP/RSI/Relatief barvolume.
- Final code commit aba9363 passed all three GitHub workflows: app shell/browser run38036052872, general checks run38036052876, quality gates run38036052942. Bridge browser run38035934455 also succeeded.
- Portfolio and Journal production routes rendered the empty real account state without console errors from the TradePilot app. No account financial data was modified during smoke checks.

## Rollback
- Pre-release app version: df428d57-701c-437a-bdbc-c6c791471dd6 (deployment ff51aa6d-c213-4ccc-a183-d948b3a72a25).
- Pre-release provider version: 425cfcc9-e3b2-4bbf-b6d2-43276050db3c (deployment2d918eaf-46ca-4b2c-be3b-2828aafa7e2b).
- Roll back code through Cloudflare version deployments, preserve existing secrets and D1. Leave additive user_state table intact. Never delete account records to roll back.

## Acceptance boundaries
See RELEASE_2026-10-10.md. Verified provider reuse does not verify the subscription's realtime rights or delay. Actionable ranking and alert trigger/delivery are not accepted. Broker-specific CSV mapping, corporate actions, tax/FIFO, historical FX performance and consolidated current portfolio valuation remain outside this delivered acceptance. WebKit automation does not substitute for a physical iPhone test.

## Lesson
Verify application authentication separately from Cloudflare account login. An internal authenticated provider adapter can reuse an existing secret while the management API cannot export it; test both public rejection and service binding success.

## Completion release — 08:39 UTC
- Application: https://tradepilot-pro-api.alexvdslot.workers.dev/app/
- Tested/deployed final code: 3622bcbaae8761fc2e8df659f91e4cd31c5d3ec5. Main completion commit: eb85092706b91d40fa6fcb16107478fcfbca8a55.
- Main Worker version: 8425f161-155b-4741-a23c-3a55556bcd5e; deployed 2026-10-10T08:39:46.01542Z.
- Provider Worker version: e77f013b-5aa6-42e2-9ce3-8de54f4c8d6b; deployed 2026-10-10T08:15:47.159909Z.
- Asset revision: 11c40c628598d566f3cbdc6de477e4e619fa8551d2f384b0f4b11bacb41dd0cf.
- All16 downloaded production modules matched tested source bytes. Secret remains on the provider; main uses internal service binding. No key was read or copied.
- Additive migration0004 applied; MARKET_QUOTA_DB bound to the same D1 in both Workers. Actual live provider quota row confirms accounting (five admissions at verification). Limits8/minute800/day enforced atomically; other uses of the key outside these Workers are outside this accounting.
- Existing counts unchanged: users1/settings1/private_state1. No synthetic account transactions or plans added.
- Node148/148 passed. Complete pre-final-UI Chromium/WebKit matrix76/76 passed. Final feature run34 passed, with only the new FX assertion locator corrected; corrected FX regression2/2 passed. Full final CI browser matrix follows below.
- Source review PASS for session-safe CSV uploads and evidence-gated alerts. Build/check and diff checks passed.
- Authenticated live session loaded stateversion1. OPEN5min/15min real historical candles remained correctly non-actionable; confirmed NASDAQ closed via provider_market_state at2026-10-10T08:16:30.110Z.
- Live USD/EUR0.89274, completed timestamp2026-10-10T08:30:00Z, displayed as indicative with source/time. No verified realtime/delay or current trading signal inferred.
- Cash-only FX refresh enabled; hypothetical entry ranges formatted, risk/reward displayed. UI reads do not persist portfolio changes.

### Completion rollback
Restore main43c3af7e-9886-4b20-bb89-8cafb1097889 and provider19dfb128-ef42-442c-9fa3-1da356db8fdd if required. Retain secret bindings, user_state and additive provider_quota table; never drop existing data. Intermediate main f4d6b351-feb2-4691-a357-d2357ee03f67 is also retained.

### Remaining acceptance
Core app features are built, tested and deployed. Production live ranking/alerts require verified account display entitlement plus fresh authoritative market evidence. Basic8/non-display plan evidence does not establish this. Stocktwits Worker credentials/rights are unavailable; actual broker-export validation and physical iPhone review remain open. Notifications run only while the app fetches data; no background/push service is claimed. Corporate actions/tax reporting/historical FX performance remain outside this release.

- Final authenticated broader radar returned seven real equity rows (OPEN/AAPL/MSFT/NVDA/AMD/PLTR/TSLA) aligned to SPY and2026-10-09T19:45:00Z. All rows correctly say Wachten. No TradePilot console errors; no private state changes. Provider bundle also matched allfour uploaded modules and retained its secret binding.

## Final CI acceptance
Final deployed codecommit3622bcbaae8761fc2e8df659f91e4cd31c5d3ec5 passed allthree workflows: app shell/browser38038651638, quality gates38038651591, generalchecks38038651603. Browserjob114174320871 completed successfully; final matrix78cases (Chromium/WebKit). Node148tests passed. Earlier completioncommiteb850927 also passed allthree workflows. Documentation-only commits after this record do not change deployed code or assets.

## UX release — 10 October 2026, 08:59 UTC

Core interaction repair described in UX_ACCEPTANCE_2026-10-10.md, without changing the data-rights gates or the provider deployment.

- Source commit 4a78df62533eeacd4c0563467430ff9a0de0e10d.
- Main version 1a4dae4b-5a3b-4c8b-afa0-7dfa5d0364a2, deployment 6e4e265e-369a-417e-b4ca-de14adcce384, 100% traffic.
- Asset revision e6c7fa8d2ae6d98886f8424a475e28a32cb88c5e80ac8be696bef6b18eb1b25d; all17 downloaded modules match source bytes.
- Node152/152; synchronized Chromium/WebKit116/116; syntax/assets/diff checks passed; integration review PASS.
- Authenticated production verified genuine OPEN5/15 candles, automatic interval refresh, readable mobile contained scrolling, Portfolio hierarchy, search→Analyzer Enter, notifications and zero console errors. State remainedversion1; no production financial state was changed.
- Rollback UX only: restore main8425f161-155b-4741-a23c-3a55556bcd5e, retaining current bindings and user records. Provider e77f013b-5aa6-42e2-9ce3-8de54f4c8d6b unchanged.
- This scope does not claim every advanced older screen detail. See UX acceptance limits for chart crosshair/zoom, historical performance graphics and richer comparison work.

### UX CI portability verification
Source4a78 passed quality38039782824 and general38039782814. Browser38039782812 passed113 interactions but failed three screenshot saves because `/private/tmp` is macOS-specific. Corrected tests use Playwright `testInfo.outputPath`. Fix commitfb864e70f1c277dc59c36eb85eb4fc28047fa46a passed allthree workflows: app38040118377, quality38040118531, general38040118360. Local portable screenshot regression6/6 passed. This correction does not change deployed UI assets.

## UX quota drilldown final release
Source5e5f52bcd9b8cdfb4e1a6812fe727c0471eacae1; mainb40cbddc-aa3b-418a-ab1e-6e80ad89cba6; deploymentfaf5b78c-6cc7-4b18-964d-b5798a520098,100%,2026-10-10T09:11:30.490584Z. Asset8f63b9f1bef61d06dc2e347ea3560e6dc688577fb39e9987c8c8940b0890e2c0. Exact17-module source comparison PASS. Node152/152, full browser122/122, focusedcache20/20, syntax/assets/diff and read-only review PASS. Live broadscan→NVDA15min chart PASS, genuine historical waiting state, no console errors or financial writes, stateversion1. Bindings/provider/secret retained. Last-fix rollbackmain1a4dae4b-5a3b-4c8b-afa0-7dfa5d0364a2.

Final deployed source5e5f52b passed allthree GitHub workflows: app/browser38040472994, quality38040473037, general38040473065. Documentation followups do not change deployed assets.
