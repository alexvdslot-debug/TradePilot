# Analyzer and Radar — final conformance record

Scope: `docs/screens/03-opportunity-radar.md`, `04-trade-analyzer.md`, Data Integration Matrix, Interaction Register. Original screen documents are design contracts; this record distinguishes implemented behavior from provider-dependent acceptance criteria. No market quotes, sentiment, bid/ask, corporate actions, holdings or market-wide scores are fabricated.

## Implemented controls

| Interaction ID | Trigger and behavior | Evidence/status |
|---|---|---|
| A01 | Valid ticker → authenticated candles, source/time/session/delay, completed-bar indicators | Built; normalization/analysis fixtures and market browser flow |
| A02 | 5m/15m interval → revalidated corresponding feed | Built; provider interval validation, chart/history fixtures |
| A03 / R03 | Selected candidate → prefilled threshold editor; explicit saved account alert | Existing price-alert storage; candidate preparation added; no background/push claim |
| A04 | Indicative levels → manually editable scenario → existing explicit Journal save flow | Built; no automatic execution or silent plan persistence |
| A05 / R02 | Candidate → Analyzer ticker/context; cached source remains dated | Existing route/context handling retained; source is revalidated by current-data gates |
| R01 | Ticker, price range, average feed dollar-volume, setup and comparable-window filter; descriptive sorting; reset | Built; pure filter/URL roundtrip tests and browser workflow |
| R04 | Radar route available from dashboard/navigation | Existing app-shell route; no alternate dead destination |
| MC01 | Chart +/− buttons and keys zoom actual source-bar window | Built; viewport clamping and browser controls |
| MC02 | Earlier/later buttons, Page Up/Down, horizontal drag pan actual history | Built; source-only window, no synthetic earlier bars |
| MC03 | Mouse/pointer/touch/arrow-key crosshair selects candle | Built; accessible selected OHLCV/VWAP/RSI/MACD output; table remains alternative |
| MC04 | Reset restores most-recent ≤80 actual bars | Built; indicator warmup uses full available history |
| MC05 | Support/resistance/entry/stop/targets and indicative entry band | Built; finite positive overlays; no levels without supporting calculations |
| MC06 | RSI/MACD disclosure and full candle table | Existing implementation retained and localized |
| MR01 | Candidate select → chart, conditional scenario, quality reasons and actions | Built; historical results explicitly distinct from confirmed ranking |
| MR02 | Add candidate to personal watchlist | Built; user-scoped explicit save; already watched disabled |
| MR03 | Candidate → prepare alert | Built; editor only, no automatic alert creation |
| MA01 | Actual portfolio holding dropdown → exact shared completed-period comparison | Built; no fabricated OPEN holding, no winner/rotation advice |
| MA02 | Conditional levels → populate manual level fields | Built; quantity/costs remain user-controlled; no execution |
| MA03 | Manual valid level edits → chart overlay refresh | Built; invalid ordering does not produce a valid plan overlay |
| ML01 | Persisted English locale → actual chart/market controls, metadata, reasons and status messages in English | Built with central namespaced i18n; stored ticker/schema/user notes unchanged |

Filters are URL query state for public market criteria only. Private quantities, cash and holdings are not serialized. No fake sector/market-cap/spread filters exist: those values are unavailable from the current verified provider contract. Relative bar volume is explicitly not time-of-day RVOL.

## Acceptance mapping

| Criterion | Status and boundary |
|---|---|
| RD01 / TA01 | Responsive controls use shared app tokens; root performs combined 320/375/1440 QA and screenshot review. Original dark-only mockup was superseded by approved light/dark token architecture. |
| RD02 / TA02 | Existing five-tab navigation and browser route history retained. |
| RD03 | Known-data filters/sorts, reset and public URL parameters implemented. Unsupported data filters explicitly unavailable. |
| RD04 / RD07 | Stale/partial/unverified feeds are never promoted to current ranking; displayed historical comparisons have no buy ranking. Reasons are localized. |
| RD05 / TA03 | 5/15-minute source data with UTC opening/completion, New York candle-clock classification and separate current exchange status; calendar uncertainty preserved. |
| RD06 / TA04 | Wilder RSI, MACD, completed-bar VWAP, ATR and aligned returns are fixture-tested. True session/time-of-day RVOL unavailable; shown metric is average prior-20-bar relative volume. |
| RD08 / TA08 | Real holdings and identical historical windows are compared. Ledger-owned explicit partial-sale/fees/FX scenario flow determines accounting; no rotation recommendation from recent rise. |
| RD09 | Price alert preparation/storage works. Reliable current-data trigger gates remain enforced. Background delivery, push and complex volume/setup conditions are external infrastructure limitations. |
| RD10 / TA12 | Auth/config/timeout/429 errors preserve honest unavailable states; no substitute prices. |
| RD11 / TA14 / TA15 | Keyboard/pointer chart, semantic buttons, table and selected readout; shared reduced-motion and focus styles. Combined accessibility review remains root's release gate. |
| RD12 / TA11 | Provider key remains server-side; Access/D1 ownership remains unchanged. |
| RD13 / TA10 | Analyzer applies completed-bar/current-status/entitlement gates again; stale cached source is historical. |
| RD14 | Exchange halt/corporate-action status is not supplied; cannot claim verified halt/split safety. This blocks full actionable production acceptance until an authenticated provider contract is available. |
| RD15 / RD16 / TA16 / TA17 | Automated source/browser checks below plus root combined release QA; no claim that unknown licensing/data requirements have been completed. |
| TA05 / TA06 | Existing manual long-level/cost validation retained; indicative chart overlays distinguish manually edited from source-derived values. |
| TA07 | Ledger-owned sizing/cash/FX calculations are separately audited; Analyzer checklist requires explicit cash/FX review. |
| TA09 | Waiting is a visible equal alternative; no invented return for no action. |
| TA13 | Existing explicit scenario→Journal draft and save path retained. |

## Data/provider boundaries

Twelve Data provides authenticated candle/search/current-state/fixed indicative FX contracts through the existing secret binding. Stocktwits credentials/contract, bid/ask spread, symbol-specific halts, corporate actions, complete 1–5-day/time-of-day history and redistribution/display permissions remain unverified or unavailable. Current account rights are not inferred from fresh candles or generic provider documentation. Basic account limits are not solved by an unrestricted browser universe scan; existing bounded scanner/admission is retained.

The current historical setup is a conditional calculation, not an executable broker trade. Manual costs/slippage are assumptions. A regular-session clock window is not a verified holiday calendar. Source volume may cover a subset of venues. News/macro catalyst sentiment is not fabricated.

## Verification

Targeted source/API tests: `node --test tests/analysis.test.mjs tests/chart.test.mjs tests/market-workspace.test.mjs tests/market-quality.test.mjs worker/market-api.test.mjs worker/provider-adapter.test.mjs` — 41 passed, 0 failed. Covers viewport clamp, finite/validated overlays, full-history indicators, English chart labels, URL roundtrip, filters excluding missing evidence and real-holding/wait alternative.

New browser suite: `tests/market-conformance-ux.spec.cjs` covers chart crosshair keyboard/pointer, zoom/pan/overlays, Radar URL filters and candidate alert preparation, manual-level transfer/actual-holding comparison, and actual English market/chart workflow at 375px. Final integrated suite passed in Chromium and WebKit: **12 passed, 0 failed**, asset `fc7bcb7ce9dae29a8a35b919cc342ff011313014af8d9d68fc4b024887a225f5`. Includes dedicated English alert CRUD/filter/pause/edit/delete, safe Analyzer→alert preparation, native mobile touchscreen candle selection and persisted 5-minute interval.

## Lessons recorded

- Interactive chart navigation must change only the displayed window; indicator warmup remains on the complete source history.
- A data filter cannot hide missing evidence by replacing it with zero. Missing price/volume fails numeric filters; missing benchmark never becomes an artificial strength score.
- Translate owned static text and attributes through namespaced i18n. Never perform global HTML replacement across private notes, input values, tickers or schema enums.
- Text-node localization is bounded to registered exact owned copy; dynamic metadata/reasons are translated explicitly.
- Avoid an accumulating chart-change listener when switching symbols: replace the owned handler and ignore disconnected charts.
- A translation search/replace must not alter dictionary initialization into a function call before registration; corrected and covered by an actual English chart test.

### Confirmed-signal evidence contract (fail closed)

Confirmed actionable scenarios and dashboard opportunities additionally require these trusted feed objects; the current provider adapter does not invent or populate them:

- `bidAsk`: `verified:true`, provider, positive numeric bid/ask with ask≥bid, and asOf within 90 seconds.
- `marketRisk`: `verified:true`, asOf within 90 seconds, `halted:false`, `corporateActionsChecked:true`; explicit verified halt blocks the signal.
- `timeOfDayRvol`: `verified:true`, `basis:'cumulative_same_session_time'`, regular session, at least five reference sessions, nonnegative numeric value, `barTime` exactly the latest completed candle opening and fresh asOf. Confirmed volume requires value≥1. Average prior-20-bar volume remains descriptive only.
- `sourceCheck`: independent provider, matching currency, `comparisonBasis:'same_completed_interval'`, positive price, exact latest completed barTime, fresh asOf, `verified:true`, `conflict:false`. Explicit conflicts block the signal.

Each missing object produces its own translated visible waiting reason. Source schemas require a future authenticated normalization contract; no browser checkbox can promote these objects. Hypothetical historical levels remain available because those calculations make no current-trade claim. Existing account display-rights uncertainty remains independently blocking.

`featureMarketSummary()` makes no requests. It exposes cached provider-authoritative open/closed status only within 60 seconds, and opportunities only from the previous scan after all scenario gates pass; it clears on private-state reset. `inAppAlerts:false` suppresses automatic in-app threshold evaluation.

Additional lessons: source freshness is insufficient evidence of independent agreement or halt safety. A pointer smoke test must scroll its SVG into the visible viewport before calculating mouse coordinates; button focus may have scrolled the target below the viewport.

G10/D07/A03: shared `marketAlertPanel()` now powers a standalone authenticated alert page and the compatible Radar editor. Safe symbol-only URL preparation, ticker/status filters, pause/rearm/edit/delete and existing persisted CRUD are implemented. Dedicated alert browser smoke passed in both engines.

Current source smoke additionally validates standalone Alerts markup without Watchlist and default empty market summary after private reset. Analyzer interval now follows the persisted account preference; native touch smoke includes a saved 5-minute preference. Explicit current halt evidence TTL is 90 seconds. Private holding quantity is masked under Hide amounts.

Final lessons: secondary routes must be included in the authenticated Worker route whitelist, not only client navigation. Browser context prefill smoke caught the missing Alerts route before release. Settings fixture preferences follow the real nested account schema; actual saved 5-minute interval is verified rather than merely checking a dropdown default. Per-session auto-rearm/cooldown and background push remain unsupported: current foreground alerts are one-shot and require explicit owner rearm.
