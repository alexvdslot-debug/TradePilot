# Completion-domain review — 2026-10-10

Scope: B4–B8 domain/UI changes in portfolio, broker mapping, journal linkage/statistics, alerts, market quality, analyzer/scanner, search and notification integration. Read-only source review and local fixtures; no production identities or external writes. Parent owns browser/mobile/CSP verification and backend distributed quota review.

## Evidence

- 52/52 focused domain tests pass across portfolio (including explicit CSV mapping), journal, alerts, market quality and analysis.
- Exact portfolio arithmetic separates cash, margin debt, realized/unrealized results and each currency. Missing/untrusted prices do not enter current totals; historical ledger reconstruction excludes later events. No artificial FX consolidation.
- Journal statistics use server-validated unique event links and ledger allocations; incomplete/unlinked/planned cycles are excluded, and foreign-currency fees remain separate.
- Import mapping requires source identities and explicit delimiters, decimal and UTC date policies. Invalid rows prevent canonical confirmation; no implicit ticker/ISIN or FX guesses.
- Historical metrics and hypothetical levels remain labelled non-actionable. Current ranking remains gated by display-rights evidence and provider market status; no verified account entitlement configuration is enabled by this review.

## Initial blocking findings

1. Canonical CSV upload awaited `f.text()` without capturing the account/read generation. Reproduction: start owner A upload; reset features and load owner B; resolve A file. A's USD 321 deposit preview is rendered using B's state and can be confirmed into B. Apply generation and connected-control checks as in the mapped-upload flow; capture snapshot/version for confirmation.
2. Alert `trustedClose` accepts contradictory/new quality metadata. Reproduction: normal regular/realtime flags plus `verified:false`, unverified display rights/entitlement and provider market state `closed` still trigger an alert. Align current alert evidence with source verification, entitlement expiry, display rights and fresh exchange-state gates; strengthen signed/local fixtures accordingly.

## Lessons

- Session guards must cover local asynchronous file reads, not only network requests. Parse completion can cross an account transition and present private file data in a new account.
- Quality contracts evolve together: source/session/entitlement gates used for analysis must also cover alerts. Tests with only legacy booleans can miss contradictory market evidence.
- A passing domain suite proves the tested local logic, not production completeness. Rights, realtime quality, current-session evidence, real browser/mobile behavior and release operations retain separate acceptance gates.

## Canonical-upload fix verification

- The handler now captures its read generation before file IO, rejects completion after a generation transition or disconnected input, and binds its confirmation closure to the candidate snapshot and preview generation.
- Added a browser regression that holds `File.text()` pending, expires the account, loads a fresh account snapshot with distinct cash, and then resolves the original account's upload. It asserts no private preview, confirmation button, stale amount, write or page error appears.
- Source-level delayed-file fixture passes. Initial browser execution still reproduces the old leak because the Worker serves stale embedded assets; `npm run check` confirms the asset/source mismatch. Rebuild the embedded asset map and restart any reused development server before browser acceptance.

## Alert-quality fix verification

- Alert evaluation now requires a verified source, an unexpired verified entitlement with display rights, and fresh authoritative matching-exchange/provider open-market status. The completed candle must fall in the regular exchange session; legacy flags alone cannot activate a notification.
- 8/8 alert tests pass, including missing/expired entitlement, closed/stale/untrusted current market state, and explicitly verified current evidence for otherwise unverified normalized session metadata.
- The two initial findings are fixed in source. Rebuilt packaged browser regression passed in Chromium and WebKit within the76-case matrix. Final cash-only FX regression passed in both engines; no source blocker remains from these scoped findings.
