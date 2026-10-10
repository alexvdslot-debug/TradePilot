# TradePilot Pro deployment — 10 October 2026

## Live release
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
- Code commit e5b90f1 passed all three GitHub workflows. Bridge commit7518544 passed quality gate; final commit aba9363 passed quality gate while remaining browser workflows were still running when this record was written. Record final run outcomes separately if available.

## Rollback
- Pre-release app version: df428d57-701c-437a-bdbc-c6c791471dd6 (deployment ff51aa6d-c213-4ccc-a183-d948b3a72a25).
- Pre-release provider version: 425cfcc9-e3b2-4bbf-b6d2-43276050db3c (deployment2d918eaf-46ca-4b2c-be3b-2828aafa7e2b).
- Roll back code through Cloudflare version deployments, preserve existing secrets and D1. Leave additive user_state table intact. Never delete account records to roll back.

## Acceptance boundaries
See RELEASE_2026-10-10.md. Verified provider reuse does not verify the subscription's realtime rights or delay. Actionable ranking and alert trigger/delivery are not accepted. Broker-specific CSV mapping, corporate actions, tax/FIFO, historical FX performance and consolidated current portfolio valuation remain outside this delivered acceptance. WebKit automation does not substitute for a physical iPhone test.

## Lesson
Verify application authentication separately from Cloudflare account login. An internal authenticated provider adapter can reuse an existing secret while the management API cannot export it; test both public rejection and service binding success.
