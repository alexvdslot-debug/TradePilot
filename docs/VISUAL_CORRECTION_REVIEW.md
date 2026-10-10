# Visual correction review — mobile app composition

Reviewed screenshot: `/private/tmp/tradepilot-complete-mobile.png`, 360×780. Read-only comparison against DESIGN_BASELINE_V1 and light-compatible structure of screens 01, 02, 04 and 05. No browser/server opened. The approved original collage bytes remain unavailable; this review cannot claim pixel matching or reconstruct its exact visual appearance. Legacy dark canvas/sidebar instructions are superseded by the light baseline.

## Verdict

NEEDS-REVISION for visual hierarchy. The screenshot uses the correct light canvas, navy text, blue accents, recognisable brand/header icons and five bottom tabs. Its first viewport still reads as explanatory documentation followed by cards rather than a compact trading overview. Functional test success does not resolve this composition mismatch.

## Highest-impact correction: put the overview in the first viewport

Dashboard specification: answer capital, risk, freshness and attention within five seconds; mobile order title/status → 2×2 KPIs → risk → positions → opportunities → watchlist → Journal.

Observed: the first KPI begins around y=480. Greeting, four-line generic description, three-line unavailable-data banner, two-line account preference summary and an unstyled refresh action occupy almost the entire space above it. Only two of the four KPI cards fit before fixed navigation. The portfolio value timestamp wraps across several lines, while the full-sized “Data and sources” disclosure consumes another substantial fraction of each small card.

Concrete correction:

1. Keep eyebrow optional and compact; greeting is the primary title. Follow it directly with a concise, truthful market-state badge and refresh action on one toolbar row. At narrow width allow this toolbar to wrap once, not into paragraphs.
2. Remove generic onboarding/strategy prose from the returning-user overview. Put it in an empty-portfolio onboarding card or an expandable “About this overview” disclosure. Preserve a concise data-quality warning; a compact chip “Market data unavailable” with expandable source/retry detail is sufficient. Do not collapse severe actionable alerts into invisible details.
3. Move account locale/timezone/currency/risk-budget summary into Settings. The Dashboard needs display currency and data basis, not the entire settings record printed above its KPIs. Preserve hidden-amounts behavior.
4. Make refresh a deliberately styled 44px touch action next to the state/title, with disabled/loading feedback; the screenshot's bare browser-style text button is inconsistent with the rest of the app.
5. Equalize KPI heights and align top edges; use label → tabular value → short coverage/update line. Format visible time as a locale date and HH:mm; disclose full UTC ISO, source and computation basis on demand. Never trim a financial value or hide unknown coverage. Four cards should be visible in the initial 375×812 overview with a compact heading, without shrinking touch targets.
6. Put risk summary before positions on mobile, matching the explicit documented order. Keep only actionable warning text outside the details section.

The screenshot's staggered second KPI card is already addressed by the parent’s latest sibling-card margin reset. This image predates that correction; do not treat it as a newly unfixed source defect. Likewise retain the documented one-column fallback at very narrow widths when long values genuinely need it.

## Primary composition across screens

| Screen | Documented dominant content | Concrete layout correction |
|---|---|---|
| Dashboard | Four equal KPI cards, risk/positions, up to three evidence-valid opportunities | Compact top region above; dashboard refresh/status toolbar; native empty states as short cards, no repeated paragraphs |
| Portfolio | Value/P&L/cash, positions and allocation, selected position detail, transaction history | Put verified valuation and primary metrics in one composed overview rather than duplicate native cash/result cards plus a separate generic valuation block. Keep native currencies and partial coverage explicit. On mobile render positions as readable cards; retain accessible table view for detailed audit. Add transaction/import actions open a focused panel/sheet rather than leaving raw booking/import forms expanded in the default overview |
| Analyzer | Ticker/quote context followed by prominent 5m/15m chart, then compact plan/risk | Ticker+interval+refresh in compact toolbar. Place chart directly below quote/provenance summary and above explanatory checklists. Keep chart viewport usable at mobile width, with compact horizontally scrollable controls and expandable advanced controls. Separate price chart, indicators, scenario cards and detailed evidence; do not stack every control/checklist before the chart |
| Radar | Scan/watchlist result cards, quality/momentum and drilldown | Results are primary workspace; collapse optional filters into a labelled drawer/disclosure at mobile width. Watchlist/add control and scan action fit compact toolbar. Selected candidate gets a clear active boundary with chart and one next action; keep detailed quality reasons expandable while displaying wait/invalid state immediately |
| Journal | Result summary, plan list and selected detail; new plan is an action | Current feature composition puts the full new-plan form before the list/statistics. Move “New plan” to a primary action opening a sheet/detail editor. Show concise summary metrics and filtered lifecycle list first. Desktop list/detail split, mobile list → full detail. Attachments, checklist and audit timeline belong to selected detail, not every expanded row |
| Settings | Grouped profile/currency/risk/notifications/data/privacy | Keep existing section navigation and grouped cards; concise section explanations, consistent input spacing and single explicit save/cancel bar. No trading-dashboard prose repeated here |

These are layout changes supported by the available documents; they do not authorize synthetic prices, cosmetic performance charts, new data rights or new broker behavior. Missing current data should remain an honest short state, not a large placeholder occupying the main composition.

## Styling discipline

- Preserve current white/off-white canvas, marine text, blue/cyan actions, consistent SVG icons and the shared mark. Do not reintroduce old dark main screens to imitate superseded specs.
- Use one consistent action hierarchy: filled primary, bordered secondary, icon actions with >=44px targets. Plain native buttons should not appear among polished cards.
- Reserve body-sized prose for detail content; overview uses title, label, tabular value and a concise status. Explanations must remain accessible through labelled disclosures.
- Keep numeric columns aligned, positive/negative signs explicit, and evidence separately readable. Decorative dots must not imply verified live status; an unlabeled dot on every card is not a data-quality indicator.
- Avoid solving density by reducing font size, target size or card padding until content hierarchy is corrected. Retain readable line height and viewport-safe bottom padding.

## Review acceptance for the correction

Capture current 320/375/768/1440 screenshots after synchronized assets. At 375px the primary overview must be immediately recognizable: greeting and short state, 2×2 KPI grid, then risk summary; no large generic prose wall above the metrics. Portfolio should show overview before editable administration; Analyzer should show an actual or explicitly unavailable chart viewport near the top; Journal should show its list/summary before a full editor. Confirm keyboard/sheet focus, preserved unsaved drafts, hidden amounts, source evidence and no fake current-data claims. Obtain the original collage before asserting visual resemblance or exact match to it.

## Lessons

A functional control inventory is not visual conformance. Explanatory safety text can be accurate yet dominate the first viewport and defeat the intended information hierarchy. Progressive disclosure should preserve truthful evidence while making capital, risk, chart and next action immediately visible. Reviewing one historical screenshot requires separating its defects from already-applied source fixes. Missing mockup bytes must be disclosed instead of inventing an exact design comparison.
