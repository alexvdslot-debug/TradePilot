# Chart visual polish — live NVDA evidence

The inspected live image `/private/tmp/tradepilot-bright-chart-live.jpg` showed overlapping support/stop/entry labels near USD 229 and resistance/target labels near USD 231.66. The final timestamp also collided with the separate ET suffix.

## Correction

- Keep every horizontal level line at the exact price-derived y coordinate. Equal resistance/target values retain the same coordinate; no fabricated separation or changed financial values.
- Place level names and prices in a separate wrapping HTML legend below the SVG. Existing level classes provide matching line/swatches; SVG titles retain accessible level/value text. HTML text wraps without being constrained by candle geometry or SVG scale.
- Anchor the first timestamp inward at the plot's left edge and the final timestamp inward at its right edge. The ET suffix starts beyond that edge. One-, two-, three- and eighty-candle cases retain distinct tick entries.
- No inline style/event handlers, new data requests or entitlement changes. New heading is registered in Dutch and English.

## Verification

`node --test tests/chart.test.mjs`: **8 passed, 0 failed**. New fixtures reproduce crowded NVDA prices and equal resistance/target levels; assert absence of SVG overlay text, presence of all six legend labels/values, identical coordinates for identical prices, and inward endpoint anchors with a separate ET suffix. Existing indicator, escaping, viewport and language checks also pass.

No build/server was started, per the coordinating agent's ownership. Root performs integrated pixel/browser verification and release; unit checks verify the geometry/markup rather than claiming a new live screenshot.

## Lessons

Price geometry is evidence, so moving lines to make labels fit would misrepresent the data. Move annotation content out of the plotting area instead. SVG text anchored at a final candle's center can extend into a unit/timezone suffix; fixed inward endpoint anchors prevent this regardless of candle count. Source unit tests do not replace integrated pixel review.
