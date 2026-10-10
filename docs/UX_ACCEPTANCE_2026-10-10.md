# TradePilot Pro UX update — 10 October 2026

User priority: make the app work according to its design and UX contracts before further subscription work. DESIGN_BASELINE_V1 is the visual authority: light screens, navy text, blue/cyan actions, shared header and five mobile tabs.

## Delivered interactions

- Dashboard uses loaded ledger/watchlist/plan records as contextual links. Unavailable market values remain unknown; copy no longer claims the ledger or scanner is absent.
- Search categories open Portfolio or the selected Journal plan, or Analyzer for instruments. Keyboard selection, Enter, Escape, visible-control focus trapping and return focus work without discarding the underlying form.
- Notifications show real unread counts, all/unread filters, individual/bulk acknowledgements and Analyzer links. Read status changes only after a confirmed server save; failed saves retain the unread state. Session expiry clears private badges.
- Portfolio puts cash and valuation before administration, with direct booking/import actions and holding links. Historical reconstruction follows the administration section. Wide tables support keyboard scrolling.
- Radar comparison uses the full workspace width, with ticker filtering, descriptive sorting/reset and ticker drilldown. Unknown/historical data retain the waiting state. An empty watchlist remains disabled after a broader scan.
- Analyzer shows actual OHLCV, available-volume daily VWAP, USD/ET axes, expandable RSI/MACD plots and an exact candle table. Interval changes refresh the selected instrument. Valid manual scenarios transfer to Journal as a private session-bound draft; saving is explicit and never creates an execution.
- Journal status labels are Dutch while persisted enum values remain unchanged. Alert edit, pause/re-arm and confirmed removal use owner-scoped state; editing a paused below-alert preserves its direction and paused state.
- Forms use native controls, 44px touch actions and one-column mobile layouts. Desktop overlays are modal cards; mobile overlays fill the screen. Chart scroll stays within its panel at narrow widths.

## Scope and limits

This update repairs the core interactions above. It is not a claim that every older screen specification has been implemented. Advanced chart zoom/crosshair, graphical portfolio performance using historical valuations, richer position risk comparison and full multi-language coverage remain separate implementation work. Broker orders and external push notifications are not part of this app flow. Unknown rights, latency or source coverage never become verified through a visual change.

## Verification

Evidence is recorded in the final release entry after the full bundled-asset browser suite and production check. Targeted tests already covered actual owner state, failed notification saves, stale data, source timestamps, alert direction/pause preservation and mobile overflow. See UX_SHELL.md, UX_FEATURES.md, UX_CHART.md and UX_REVIEW.md.

## Lessons

A technical release does not prove that the interaction design works. Contextual search and unread state must preserve the selected record and confirmed persistence. Changing enum labels must not change enum values. Editing an alert must not re-arm it implicitly. Mobile chart axes require enough physical space; a contained scroll panel is more readable than shrinking all labels. Validate visual hierarchy with screenshots, not only DOM assertions. Existing legacy UI tests stay in their own workflow; the modern app configuration includes its new UX tests explicitly.
