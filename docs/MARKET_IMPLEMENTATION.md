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
