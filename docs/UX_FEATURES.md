# Portfolio, Radar, Analyzer and Journal UX changes

Scope: `app/features.mjs`, focused browser tests and this evidence record. The app
remains the existing plain JavaScript application. Ledger, private-state ownership,
quote entitlement and background delivery policies are unchanged.

## Built

- Portfolio shows the valuation/coverage overview before positions and manual
  administration. Quick actions scroll and focus the transaction/import controls.
  The existing visible forms and IDs remain compatible with established workflows;
  introducing collapsed bookkeeping forms would hide controls from those flows.
  Closed zero-share positions no longer appear as open holdings.
- Holding, journal, alert and Radar comparison tickers open Analyzer with the
  selected symbol. Watchlist tickers also use this route. Navigation delegates to
  the main app's contextual router so browser history and symbol selection agree.
- Radar comparison results occupy their own full-width card after the watchlist/
  alert columns. Ticker filtering, alphabetical or historical-strength sorting and
  filter reset operate on already-fetched rows. Sort labels explicitly describe a
  historical comparison, not an actionable ranking. Empty results have a clear
  state; resetting returns the original order and focuses the search field.
- After scanning, the personal-watchlist button stays disabled when the watchlist
  is empty. Broad discovery remains available for a loaded account. This holds in
  the scanner's `finally` path and does not override session-reset guards.
- Analyzer uses the parent's reusable candlestick renderer. Metadata is available
  in a clearly named details block, with known candle time visible above the chart.
  Changing 5/15-minute interval refreshes an already-chosen ticker; an empty ticker
  causes no request. `openTicker` uses the actual selected interval.
- A validated manual risk scenario offers an explicit Journal handoff. It copies
  symbol and levels into a private in-memory draft, with an editable thesis. No
  plan is persisted until the owner clicks the existing Journal save button, and
  the status remains `planned`; no execution or broker order is invented.
- Journal status labels are Dutch while underlying `planned/executed/reviewed`
  values remain unchanged. Booking-type labels are also Dutch in histories/previews.
- Alert direction labels are Dutch. Threshold/direction edit, pause, explicit
  re-arm and confirmed deletion save the owner's versioned snapshot. Editing
  clears obsolete trigger provenance while preserving a paused alert's enabled
  flag. Re-arming remains its own explicit action.
- Scrollable tables are keyboard-focusable with a descriptive Dutch accessible
  label. Form labels and tickers retain visible text; focus actions respect reduced
  motion. New feature strings use a local `t(key)` translation dictionary.

## Integration contracts

`initFeatures(api,render,navigateTo)` optionally accepts the contextual navigation
callback. Ticker actions call `navigateTo('analyzer',{symbol})` once; the main router
owns fetching the selected instrument after rendering. Journal draft handoff calls
`navigateTo('journal',{symbol})` and is consumed by the feature binder.

`dashboardValues()` retains existing display strings and adds `loaded`, `error`,
`positionEntries:[{symbol,quantity}]`, `watchlistEntries:[symbol]` and
`planEntries:[{id,symbol,status}]`. It still returns null without a loaded state.
Journal/private search rows additionally expose record `id`, `status` and
`type:'journal'|'plan'` for contextual navigation.

Notifications expose `symbol`, `source`, `asOf` and `triggeredAt` alongside their
existing ID/read/text. `readNotifications(id)` reads one matching notification;
omitting ID retains bulk acknowledgement. Successful non-rendering saves dispatch
`tradepilot:notifications` so the main app can update its unread badge without
discarding chart/form state.

## Safety and verification

Read/market/scan epochs, account clearing, optimistic snapshot versions and
concurrent-save guards are preserved. In-memory scenario drafts are cleared by
`resetFeatures`; stale draft buttons also compare their captured read epoch before
handoff. Local file-read and import confirmation guards remain intact. New controls
perform no provider-rights change, deployment, background notification or order.

The design baseline, interaction register and Portfolio/Radar/Journal screen
specifications were read before editing. Functional privacy and accounting contracts
remain higher priority than decorative mock data. Parent owns shared chart/CSS/
completion modules and deterministic asset packaging; builds were coordinated to
avoid generated-asset races.

Initial Chromium smoke: **5 passed, 0 failed**. The focused expanded suite contains
seven tests per engine: portfolio ordering/ticker/navigation/mobile overflow;
full-width Radar/filter/sort/reset and disabled empty-watchlist state;
scenario-to-Journal explicit save; Dutch Journal status/value preservation;
alert edit/pause/re-arm/delete; paused below-alert preservation; interval refresh.
Final focused run: `playwright test --config=app/playwright.config.cjs
tests/feature-ux.spec.cjs --workers=1` — **14 passed, 0 failed** across Chromium and
WebKit. The parent final build/full browser suite also covers the last additive
keyboard-scroll table label change.

## Lessons

1. Changing display labels must preserve serialized option values; otherwise a
   translation can break existing storage and tests.
2. Edit and re-arm are different alert intentions. Calling a reset helper during
   threshold edit must not silently enable a previously paused alert.
3. Filter redraws should replace result rows, not the active input, or keyboard
   users lose focus while typing.
4. Put wide analysis tables outside half-width dashboard cards. Internal horizontal
   scrolling remains useful on mobile, with a keyboard-focusable wrapper.
5. A scenario handoff is a draft, not a saved trade. Keep the explicit save step and
   clear the draft on account/session transitions.
6. Development browser tests need a localhost server. The sandbox blocked binding
   port 8765 (`listen EPERM`); the authorized escalated Playwright run exercised the
   same real Worker/CSP test server rather than bypassing production headers.

## Live scan-to-Analyzer quota correction

Production discovery found that an eight-request scan immediately followed by a
ticker drill-down attempted an extra five-minute request, exhausting the provider
budget instead of opening the available chart. Market forms now default to the
specified 15-minute interval. `openTicker` reuses a matching in-memory feed only
when its exact UTC `retrievedAt` is valid, not future, and no more than 60 seconds
old. Invalid or expired retrieval evidence fetches again. Explicit interval change
and manual analysis/retry continue to request the selected interval.

Reuse re-runs `completedFeed` and `analyzeCandles` against the current clock; it
does not change entitlement/session flags, promote stale candles, or call a cached
historical price current. Account reset still clears the entire feed map. Cache
reuse is only navigation convenience within one authenticated feature session.

`PROVIDER_QUOTA`/429 now shows a Dutch explanation, technical code in details and
an owner-triggered retry button. It explains that a minute or daily limit may be
involved and promises no guessed reset time. Retry performs one request; there is
no automatic retry loop or bypass of the provider limit.

New regressions cover eight scan requests followed by successful NVDA 15-minute
drill-down without a ninth call; explicit five-minute change requiring a new call;
friendly quota/retry; cache expiration; and invalid retrieval timestamps.
Synchronized assets `8f63b9f1…` were tested with the same focused command above:
**20 passed, 0 failed** (10 Chromium and 10 WebKit cases), including all quota/cache
regressions. The localhost browser run exited successfully before the parent full
browser matrix. This local evidence does not claim the correction is deployed.

Lesson: network-cost acceptance must cover consecutive user actions across routes.
A passing scan and a passing Analyzer in isolation do not prove their combined
workflow respects a shared upstream quota. Retrieval recency and market-observation
freshness are separate; both must retain their own checks and labels.
