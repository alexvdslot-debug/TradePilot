# UX contract review — 2026-10-10

Read-only review against `DESIGN_BASELINE_V1.md`, `INTERACTION_REGISTER.md`, and the screen specifications. The light-app baseline supersedes earlier dark-theme mockups. Source inspection identifies functional gaps; parent owns visual/mobile/browser evidence. No source changes by this reviewer.

## Initial highest-priority gaps

1. Dashboard data and copy disagree. Cash/watchlist/journal can load, but static paragraphs still claim the ledger, scanner and sources are not connected. Position/watchlist text provides no ticker drill-down. D02/D06/G14 require actual account-aware state, meaningful next actions and explicit unavailable-data reasons.
2. Global private search loses object context: every category result opens Analyzer by ticker. A journal or plan result must open its selected record, and a holding must open its own position context, as required by G07 and global-search specs.
3. Notification center lacks a real unread badge and individual read/context actions. Rendered paragraphs cannot satisfy G08/N05/N06. Count persistent unread records; only mark read after confirmed save and retain original trigger provenance.
4. Analyzer-to-journal flow is disconnected. Users calculate levels, then retype the plan on Journal. A04/TA13 require a persistent plan action with a confirmed ID and Journal destination; historical/unverified input must stay visibly conditional.
5. Portfolio, journal and radar records lack consistent ticker/detail navigation (P01/J04/R02). Drill-down must preserve the selected ticker and support predictable browser back.

## Secondary gaps

- Journal uses raw English lifecycle codes in a Dutch interface and renders all record editors together. Provide readable status labels plus search/filter/selected-record context; do not imply that a manually selected execution status is ledger confirmation.
- Analyzer needs chart axes/time/price labels and visible MACD detail, with a text alternative; a simple anonymous polyline does not communicate timeframe or price distance adequately.
- Financial settings must explain which preferences affect display and which validate scenarios. Persisting locale/currency/risk values without applying them or explaining a blocked FX calculation creates a misleading control.
- Large journals/ledgers need paging or bounded rendering. Scrolling hundreds of edit forms contradicts the focused mobile list/detail design and makes records difficult to find.

## Re-review acceptance

- Dashboard populated vs empty states accurately match ledger/feed coverage; no fabricated current prices.
- Ticker drill-down, private search record selection, plan save and individual notification actions reach the promised context with correct focus/back behavior.
- New handlers bind after rendering, avoid unintended form submits, preserve session-generation guards, and remove private overlay/result content on 401/403.
- Keyboard behavior includes labelled controls, visible focus, overlay focus containment, selection/Enter behavior, and restored focus after closing. Mobile controls retain >=44px targets without page overflow.
- Invalid/unknown data stays explicit, user-facing errors remain understandable, and save/read success is only claimed after server confirmation.

## Lessons

- A truthful empty-state implementation can become misleading when new data wiring arrives; revisit static copy together with the data it describes.
- Search results need typed destinations and stable record identities. A shared ticker is insufficient to identify a particular plan or journal record.
- Build the complete user journey between screens, not just individual forms. Re-entering the same scenario or ticker is a concrete sign that state/context integration is missing.
- Visual conformity cannot be established from source inspection or passing unit tests alone; final browser screenshots and actual keyboard/mobile interactions are separate evidence.

## Integration re-review

- New typed search destinations retain private record IDs, dashboard ticker links reach the selected context, and notification read actions await persistence before navigation or badge changes.
- Overlays mount/remove independently of the page, preserving unsaved form input. Authentication invalidation removes private overlays and resets feature state, including the in-memory Journal draft. Draft application checks the feature generation; it is not claimed as server-saved until the user submits.
- Alert-edit direction selection initially ignored the saved direction; the select helper now accepts and selects that value. Preserve this regression when changing reusable control helpers.
- Remaining initial re-review findings: search focus trapping includes the hidden retry button, so its computed last focusable differs from the actual last keyboard target; alert edits use unconditional rearming, silently enabling a paused alert. The owners received these findings for correction.
- Lessons: visible/enabled/focusable are separate properties; filter all three when trapping dialog focus. Editing an alert condition and explicitly resuming it are distinct user actions, so preserve pause state unless the interface makes rearming explicit.

### Corrected integration findings

- Focus trapping now excludes disabled, hidden/inert and zero-layout controls, and cycles from the actual active element through visible targets. The hidden retry control no longer breaks wrapping.
- Alert edits now preserve `alert.enabled`, and the direction helper preserves the existing selected condition. Pause/resume remains an explicit action.
- Scoped source re-review has no remaining high-confidence blockers. 29/29 focused alerts, journal, market-quality and analysis tests pass. Parent/owners retain browser regressions for form preservation, paused threshold editing, typed navigation and keyboard interaction; this source verdict does not substitute for their browser results.

## Radar-to-Analyzer quota/cache review

- Drill-down reuses only the requested symbol and interval with a canonical, valid UTC retrieval timestamp between now minus 60 seconds and now. Expired, future, missing or malformed timestamps cannot authorize reuse. Explicit interval changes and the retry control continue through the provider fetch path.
- Cached rendering reruns completed-candle filtering and analysis against the current clock; retrieval freshness does not imply candle freshness, market-open status, entitlement or display rights. Reset still clears feeds and increments the market generation, blocking prior-owner request completions.
- Actual cache-helper fixture passed eight eligibility cases plus completion/staleness recomputation. Market-quality/analysis suite passed 15/15. No high-confidence new blockers identified; owner runs the scan-to-drill-down browser quota regression.
- Lesson: transport-cache TTL and market-data validity are different clocks. Reusing recently downloaded historical bars is appropriate only when the interface retains historical/unknown quality labels and reevaluates trading gates at display time.
