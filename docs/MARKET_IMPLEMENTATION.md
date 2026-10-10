# B5/B6 implementation evidence

Implemented protected Twelve Data search and 5/15-minute candles, strict OHLCV normalization, deterministic indicator/scenario engine. No orders, synthetic quotes, credentials in client assets, or production writes.

Primary references researched before implementation:
- https://support.twelvedata.com/en/articles/5745849-timezones (intraday timezone request)
- https://twelvedata.com/docs/markets/market-state (indexed primary API documentation: symbol_search and time_series contracts, metadata and ordering)

The provider request explicitly selects UTC, ascending order, country United States and 200 bars. Returned metadata is checked for matching symbol and interval, USD, approved US exchange and equity type. Search additionally requires US country. `exchange_timezone` describes the exchange, not the returned bar timezone; country is not included in the documented time_series metadata. Datetimes undergo strict UTC/date validation; out-of-order, duplicate, future, missing volume or invalid OHLC bars are rejected.

Authentication reuses server-verified Cloudflare Access identity. Missing Access configuration or provider secret fails with 503; absent/invalid authentication returns 401. Provider responses never include keys or raw error text. Timeout is seven seconds. Both upstream and admission quota failures return 429 with Retry-After. Provider success cache is 30 seconds for candles, five minutes for searches; simultaneous requests are coalesced. Admission and cache are bounded **per Worker isolate**, not a global account quota. Before scaling, configure a distributed quota binding and provider license/entitlement appropriate to redistribution. No claim of global quota enforcement is made.

Session, realtime and delay remain unverified: time_series responses alone cannot prove entitlement, delay or current exchange session. The analyzer displays calculations as indicative and withholds trade scenarios/ranking on unverified or stale feeds. Stocktwits comparison is not connected: no server credential/provider contract was supplied. Multi-source confirmation and session/entitlement verification remain release requirements for actionable production ranking.

Indicators: New York trading-date-reset VWAP, Wilder RSI, EMA MACD, last bar volume divided by prior 20-bar average (explicitly `intrabar_average_20`, **not time-of-day RVOL**), short EMA trend, five-bar momentum, trailing support/resistance, mean high-low range volatility, average dollar-volume liquidity, and comparable-window benchmark strength. VWAP includes supplied bars for that trading date; no assertion that a supplied feed excludes extended-hours bars. Scenario engine accepts only verified regular-session realtime/no-delay feeds and complete same-date intervals; a still-forming last candle withholds scenarios. Scenario levels are heuristic support/resistance levels, not forecasts. The 200-bar window does not cover all five trading days. Round-trip fees and slippage are supplied per share in USD; portfolio FX conversion is outside this module. Scenario ranking uses net reward/risk only after evidence gates.

Tests: `node --test tests/analysis.test.mjs worker/market-api.test.mjs`. Deterministic fixtures cover 5/15 minutes, session reset, flat reference indicators, invalid candles, freshness/session gates, benchmark incompatibility, verified scenario/ranking, fees/slippage, auth/config failure, US filter, caching, upstream quota/malformed errors and bounded request admission. Live provider smoke test blocked by absent configured provider secret and authenticated production session; fixture tests do not establish live entitlement.

Lessons recorded during implementation:
1. Primary time_series metadata does not include country; validate US exchange/type/currency and constrain the request instead of rejecting every real response for a missing field.
2. exchange_timezone remains exchange metadata when UTC is requested; requiring it to equal UTC would incorrectly reject US feed responses.
3. A fresh timestamp does not prove realtime entitlement or regular-session status. Preserve uncertainty and withhold actionable ranking.
4. Candle timestamps denote bar opening; wait until interval close before actionable analysis.
5. Global rules referenced at ~/.Codex/rules/security.md and testing.md were absent in this environment; actual Access verification and fail-closed boundaries were reviewed from the existing source.

## Provider service binding (secret reuse)

The app Worker may configure `MARKET_PROVIDER` as a Cloudflare service binding to the existing legacy market Worker. The existing provider secret stays only on that legacy Worker. Both Workers must pin the same Cloudflare Access issuer/audience. Main market requests forward the verified Access assertion, or only the CF_Authorization cookie as fallback; unrelated cookies, browser Authorization and provider keys are not forwarded. Main Worker prefers the binding when configured and otherwise supports its local provider secret.

Legacy Worker intercepts only `/_tradepilot/symbol_search` and `/_tradepilot/time_series` before its existing quote handler. It independently verifies the forwarded JWT; unauthenticated requests spend no provider quota. GET and exact nonduplicated parameters are required. Search accepts symbol; candles accept symbol/5min-or-15min interval. UTC, US, ascending order and 200-bar size are fixed server-side. Upstream is a fixed host with a seven-second abort deadline; response bytes are counted during streaming with a 250,000-byte ceiling. Error text and extra diagnostic fields are never relayed. Provider errors use fixed codes; 429 retains Retry-After. Existing quote behavior is retained with the production no-store/no-cf-cache baseline and sanitized errors.

Additional tests: `node --test worker/provider-adapter.test.mjs worker/market-api.test.mjs` — 13 passed, 0 failed. Covers unauthenticated no-upstream calls, exact parameter whitelist, forwarding without secrets, real main→legacy adapter→mock-provider normalization, cookie filtering, quota/error/oversized-response sanitization and existing legacy quote behavior. This local integration smoke test proves the request path, not production binding configuration.

Lessons:
- A service binding is transport, not authorization: independently revalidate the signed end-user assertion at the destination.
- Reusing an existing Worker secret avoids reading/exporting or duplicating credential material.
- Preserve observed production caching behavior when the repository proxy differs from deployed code.
- A post-allocation text-length check does not bound memory consumption; count upstream bytes while streaming.

## Historical metrics, completion and session status update

Researched primary provider docs before this extension:
- https://twelvedata.com/docs/markets/market-state — market_state costs one credit; exchange/country filters; boolean current open status. Generic exchange_schedule provides session hours but does not verify a historical holiday/early-close calendar.
- https://support.twelvedata.com/en/articles/5195429-pre-post-market-data — UTC-normalized intraday candles refer to bar opening; extended-hours availability varies by plan and historical/live period.
- https://support.twelvedata.com/en/articles/9935903-us-equities-market-data — general default realtime feed and partial market-volume coverage, not evidence of this account's display rights.
- https://www.nyse.com/trade/hours-calendars — 09:30–16:00 ET core session, holiday and early-close exceptions.

`app/market-quality.mjs` exports:
- `classifyCandleSession(time,{exchange,exchangeTimezone})`: historical New York clock window; DST aware; session is regular/premarket/after-hours/closed/unverified. `calendarVerified:false` explicitly excludes holiday/early-close proof. This is not a current exchange-status claim.
- `completedFeed(feed,now)`: removes still-forming bars based on opening+5/15-minute interval, retains `sourceAsOf`, returns last completed `asOf` and `droppedFormingBars`.
- `compareHistoricalFeeds(feed,benchmark,{now,bars=6})`: validates OHLCV/order and aligns exact uninterrupted completed timestamps, currency and interval. Reports descriptive historical relative return even if stale/delay unknown. Incompatible windows are rejected. No actionable score is generated.
- `entitlementMetadata(raw,now)`: validates optional owner-verified server config; never infers account permissions from candle age or general docs.

Normalized backend candles now include `completedAt` and `complete`. Feed `verified:true` / `verificationBasis:'provider_schema_validation'` means source/schema validation only, not realtime/entitlement/current-price verification. `lastCandleSession` is historical. `currentMarketStatus` starts unverified. The protected `/api/v1/market/status?exchange=NASDAQ` endpoint calls the same whitelisted provider binding, caches one minute and returns `{exchange,provider,state:'open'|'closed',asOf,basis:'provider_market_state',scope:'current_exchange_status',stale:false}`. AsOf is retrieval time because market_state supplies no exchange-event timestamp. The call consumes the same bounded admission budget; no per-symbol status request is made automatically.

`analyzeCandles` calculates only completed bars, adding ATR as simple mean of 14 true ranges, volatility percentages, descriptive historical benchmark comparison and `hypotheticalScenario` (actionable:false with assumptions). Existing `scenario` and `score` remain null until fresh verified realtime/no-delay data, verified display rights, current provider-reported open state, sufficient liquidity/history and technical/cost criteria all pass. `compareHistoricalOpportunities` returns descriptive rows without actionable ranking. Extended-hours clock classification does not override unknown entitlement.

Optional server env `MARKET_ENTITLEMENT_JSON` contract:
`{"provider":"Twelve Data","scope":"US_EQUITIES","evidence":"owner_account_verified","verifiedAt":"ISO","expiresAt":"ISO","realtime":true,"delayMinutes":0,"volumeCoverage":"partial","displayRights":"verified"}`.
Expiry must be future and at most 30 days after verification. `displayRights:"unverified"` is supported and blocks actionable ranking. Actual realtime flags require owner-account evidence; display permission requires entitlement evidence applicable to this app. Default metadata has `realtime/delay/displayRights:"unverified"`; `documentedDefaultFeed` separately records generic default realtime availability and approximately 5% live market-volume share. Actual `volumeCoverage` remains unverified absent profile because historical/live feed coverage differs.

Owner account inspection reported by parent: Basic8, 8/minute and 800/day; account manage-plan lists realtime US stocks/ETF and Internal non-display usage, while Grow lists Internal display. General provider support language about personal/internal tools does not settle this specific private chart display scope. No live display rights were configured. This is a permission-evidence ambiguity, not a conclusion that a paid upgrade is necessarily required. Parent will resolve licensing/account scope and distributed quota enforcement before enabling actionable production flags.

Regression command: `node --test tests/analysis.test.mjs tests/market-quality.test.mjs worker/market-api.test.mjs worker/provider-adapter.test.mjs` — 29 passed, 0 failed. Covers DST sessions and calendar uncertainty, forming-bar exclusion, stale historical hypothetical scenarios, exact benchmark alignment/corruption/interval/currency/gaps, entitlement expiry, current status binding, metadata completion and prior auth/quota/normalization tests. No live entitlement claim is established by these fixtures.

Lessons:
- Historical last-bar session, present exchange open status, source-schema validation and account entitlement are four different facts; they require separate fields.
- Drop the forming bar and use the previous completed bar; rejecting an entire otherwise-valid live feed prevents useful analysis.
- Historical unknown-delay data can support aligned descriptive comparisons and explicitly conditional plans while actionable ranking stays blocked.
- Treat approximately 5% default live volume as source coverage context, not consolidated market liquidity or evidence of a specific key's rights.

## Fixed indicative USD→EUR endpoint

Primary provider time_series/forex docs and UTC timezone support were reviewed before implementation: https://twelvedata.com/docs and https://support.twelvedata.com/en/articles/5745849-timezones . `/api/v1/market/fx` is authenticated and accepts no query parameters. It calls only `/_tradepilot/fx` through the existing secret binding, mapping to fixed `time_series?symbol=USD/EUR&interval=15min&timezone=UTC&outputsize=2&order=asc`; no US equity-country filter is sent for forex. The adapter permits no client-selected pair/endpoint/interval/key.

`normalizeForex` requires exact USD/EUR, 15min, Physical Currency, EUR quote metadata (ISO EUR or Euro with USD/US Dollar base metadata), positive finite consistent OHLC, strict valid ascending UTC timestamps and a completed bar. Forex metadata may use currency_base/currency_quote rather than equity currency. The newest forming bar is skipped. Response includes string `rate`/`price`, EUR quote currency, USD base currency, provider/source, completion `asOf`, opening `barOpenedAt`, stale, interval and timezone. `verified:false`, `schemaVerified:true`, `indicative:true`, `delay/realtime/marketSession:'unverified'` keep this suitable for explicitly indicative conversion, not a verified current FX valuation. US-equity entitlement config does not imply forex entitlement.

Updated targeted suite: 31 passed, 0 failed; fixed binding path/parameters, forex exclusion of country filter, exact pair/currency/type, positive OHLC, ordering, completion selection and indicative-only provenance are covered.

### Final UI evidence safeguards

Analyzer and Radar now keep actionable ranking separate from historical technical metrics. Confirmed signals require explicit verified bid/ask, halt/corporate-action checks, independent same-interval source agreement and true cumulative same-session-time RVOL. None are inferred from Twelve Data candles or the prior-20-bar volume ratio. Missing evidence yields translated waiting reasons; hypothetical historical levels remain usable for explicit manual plans. The exact future input contract and conformance IDs are in FINAL_CONFORMANCE_MARKET.md.

Market dashboard summary uses only cached provider market-state evidence no older than 60 seconds and scenarios from the latest completed scan that still pass every gate. It never launches a scan on dashboard rendering. Shared alert editor preserves persisted status enums and explicit saves; symbol-only route preparation does not invent a price threshold.
