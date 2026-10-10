# Chart UX implementation and lessons

The light interface and five-tab navigation in DESIGN_BASELINE_V1 take precedence over the older dark-screen prose. The Analyzer now draws source OHLCV candles, volume and day VWAP, with price labels in USD and time labels in New York (DST-aware). RSI and MACD have separate expandable plots; a native disclosure exposes the exact plotted candles as a keyboard-scrollable table.

Only the latest 80 bars are drawn for readability, while indicator calculations retain the full loaded history. Days break VWAP lines. Zero volume yields no fabricated VWAP. A single flat candle receives finite padded price geometry. Missing periods are not synthesized; the visible text states that bars are equally spaced. Daily VWAP includes only available input bars, not asserted whole-market coverage.

Sources checked before implementation: MDN SVG title reference and Intl.DateTimeFormat reference. Four deterministic tests cover session reset/DST, zero/flat data, invalid input, and retained indicator history.

Lessons: plotting a closing-price line does not satisfy an OHLCV chart specification. Data quality must remain visible independently of visual richness. Accessible chart text and a data table also support touch users who cannot use mouse tooltips. Native SVG tooltips are not a complete crosshair interaction; advanced zoom/crosshair remains outside this change.
