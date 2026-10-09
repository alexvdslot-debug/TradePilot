# TradePilot Pro — release gates

This branch is a clean rebuild workspace. The existing production pages and legacy browser storage remain untouched until acceptance.

## Product architecture
- Home, Scanner, Charts, Portfolio, Risk Lab: separate routed views; no long-page navigation.
- Market data: Cloudflare Worker proxy with provider key in secrets, server-side rate limiting, session-aware timestamps, cache TTL and source attribution.
- Scanner: 5/15-minute candles, VWAP, RSI, MACD, relative volume, liquidity filter and deterministic scoring; never fabricate missing indicators.
- Portfolio: explicit transaction ledger, FX and fees, realized/unrealized P&L, whole-share scenarios, import/export.
- Storage: D1 behind authenticated Worker endpoints, per-user authorization, migration and restore tests. No public portfolio endpoints.
- AI is out of scope.

## Five-angle acceptance review
1. **Design:** mobile Safari and desktop navigation, typography, iconography, keyboard accessibility, contrast, empty/loading/error states.
2. **Trading:** reproducible scanner scores, valid price session and timestamp, stop/target/R:R, conservative no-trade state.
3. **Finance:** FIFO/average-cost method explicitly specified; fees, FX, partial fills, sells, splits and reconciliation tested.
4. **Security:** authentication, authorization, secret handling, XSS, CSP, abuse throttling, privacy, backup and recovery.
5. **Reliability:** unit, integration, live-provider, browser E2E, outage and regression tests; deployment rollback.

## Release blocker checklist
- [ ] Live provider feed validated with timestamp and trading session.
- [ ] Scanner indicator calculations compared with known reference fixtures.
- [ ] Authenticated D1 database and per-user isolation verified.
- [ ] Portfolio ledger, fees and EUR/USD calculations tested.
- [ ] Five tab views tested on mobile and desktop.
- [ ] No critical security findings.
- [ ] Recovery and rollback rehearsed.
- [ ] Deployment URL and iPhone Safari verified.

No checkbox may be marked complete without linked test evidence. No trading profitability guarantee.
