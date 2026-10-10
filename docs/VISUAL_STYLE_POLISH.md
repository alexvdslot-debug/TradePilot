# Light workspace visual polish

The user explicitly waived exact mockup matching on 10 October 2026 and requested a clear, bright interface with recognisable icons and graphics. This pass uses the documented light workspace direction: white surfaces, a pale blue canvas, navy labels and saturated blue actions.

## Changes

- Added consistent semantic line icons for the four Dashboard metrics, known section headings and the six Settings groups. Icons accompany existing text labels; they do not replace accessible names or financial values.
- Added small, neutral document illustrations to explicit empty watchlist and Journal states. These contain no fabricated performance curve, price, volume or signal.
- Made action, card, status and typography styling consistent across Dashboard, Portfolio, Journal, Analyzer and Settings. Supported the layout worker's overview-first compositions and administration sections.
- Kept the mobile five-tab navigation and 44px interaction targets. Dashboard icons occupy the existing label row; the returning-user overview retains compact status and four metrics.
- Restricted Dashboard icon ordering to the actual Dashboard. Portfolio cash cards use cash symbols in both currencies, avoiding a misleading performance icon on EUR cash.

## Verification

`node --check app/visuals.mjs` passed. Import/illustration smoke checks passed for three representative graphic variants; all expose decorative SVGs with `aria-hidden` and contain no price polyline. The parent runs the synchronized asset build and full browser suite, including semantic icons, mobile card visibility and financial behavior. No concurrent build or browser server was started by this worker.

## Lessons

Icon selection must follow meaning, not a shared card's index: Portfolio and Dashboard reuse the same grid class with different metrics. Decorative icons must preserve heading text and accessible names so localization, financial labels and existing controls stay intact. Clear graphics can improve empty states without suggesting market performance that has not been observed. The user's revised direction removes the missing mockup image as a prerequisite for this styling pass; exact mockup resemblance remains unclaimed.
