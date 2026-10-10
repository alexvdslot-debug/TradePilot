# TradePilot Pro — final conformance register

User instruction,10 October2026: finish implementation by comparing every build phase, screen detail, mockup and interaction contract with running code. The subsequent emphasis is complete settings/search/bootstrap UX and a genuine English option. This register is work in progress; an item is only accepted after tests and deployed verification.

## Authority
The latest user master authorizes autonomous audit→build→test→deploy→verify and supersedes the older review-stop sequencing. DESIGN_BASELINE_V1 governs light main screens, dark splash, shared brand/header, five mobile tabs and settings via gear. Functionality, accurate financial/data quality and accessibility override illustrative mockup data. The named collage image is absent from repository and searchable attachment filenames; no pixel-perfect image comparison can be claimed. Existing v3/v4/v5 HTML are earlier products, not a replacement for this approved baseline.

## Source coverage
Review TECHNISCH_BOUWPLAN_V1 B0–B8; PRODUCT_DESIGN_DOCUMENT; PRODUCT_GAP_ANALYSIS; INTERACTION_REGISTER; screens01–07; components00–01; flows01; architecture02; accounting04; provider-validation03 and DATA_INTEGRATION_MATRIX. Older 'not built' headers are historical design status, superseded only by explicit implementation evidence below.

## Ownership and verification
- Shell/settings/search/bootstrap/English: main.js, b3-settings.mjs, i18n module; backend owner.
- Portfolio/Journal/history/preferences/exports: portfolio, ledger, journal, completion and scoped features; ledger owner.
- Radar/Analyzer/chart/market quality/comparison: chart, analysis, market-quality and scoped features; market owner.
- Shared style, index/accessibility, release/migration, full responsive screenshot matrix and deployed proof: root.

## Initial gaps found
Dashboard always-empty market/value/risk fields despite loaded data; incomplete settings sections and unapplied preferences; splash removed before asynchronous private-account bootstrap; advanced chart interactions and overlays; portfolio/history and Journal filters/detail; context alert actions; English label without translated interface. New implementation must retain exact ledger, account isolation, verified evidence gates and existing records.

## Evidence so far
Root shell improvements: persistent mobile header, skip-to-content, favicon/description,100dvh and reusable settings section layout. Immediate Chromium/WebKit responsive smoke2/2 passed. Tests/conformance-ux.spec.cjs adds allsix route layout review at320/375/768/1024/1440px, header44px targets, five mobile tabs, screenshot artifacts and keyboard skip navigation. Full execution waits for synchronized completed assets. No new complete-release or deployment claim yet.

## External evidence separated from implementation
Provider display/volume/delay entitlement and Stocktwits access cannot be inferred from a successful feed. Broker sync/orders are not part of app authorization. Physical iPhone testing, actual broker export acceptance, retention-backed permanent deletion, external background/push delivery and unavailable historical-price/FX points require their own evidence; UI must identify each limit directly instead of faking a success.

## Lessons
A core-flow pass does not close every screen contract. Bootstrap animation completion is not account readiness. A language preference must translate interface content. A realized-ledger history chart is not total portfolio return. Visual mockups do not authorize synthetic market data or financial executions.

Responsive first pass: all30 route/width combinations passed bothengines. Chromium skip navigation passed; WebKit skipped a plain anchor under its default tab behavior. Give the skip link explicit tabindex0 and retest. Browser-specific keyboard behavior needs actual WebKit evidence.

## Additive preferences migration
Migration0005_ui_preferences.sql applied10October2026 after a PRAGMA guard confirmed the column absent. New preferences_json is JSON-validated with safe defaults; no account/ledger record was deleted or rewritten. Counts before/after: users1, settings1, private_records1. D1 recovery bookmark captured before this work:00000014-00000000-00005100-a1cc273f6a61bb29f1d77da722d4fc9d. Existing Worker remains deployed until all new code checks pass. Production migration success does not by itself prove the new UI is deployed.

## Integration and live-control lessons

The full initial regression run caught outdated selectors after adding contextual actions and candidate-detail drilldown. Tests now exercise the actual two-step Radar→candidate→Analyzer flow and still prove eight-call cache reuse, expired-cache fetch and invalid retrieval rejection. A no-fill reviewed plan does not imply a completed execution.

A native fragment link does not reliably transfer focus in WebKit. The skip-link activation now explicitly focuses the main region. Chromium verifies initial Tab discovery; WebKit verifies focusability and keyboard activation separately because macOS link tabbing depends on platform keyboard preferences.

A persistent DOM node outside rerendered content needs its original keyed translation restored on every language change. Live EN→NL checking discovered the skip link retaining English; a dedicated roundtrip regression covers it. Translation placeholders must receive their count before interpolation; the live empty-alert counter discovered this and its browser assertion now proves an actual numeric zero.

Concurrent remote icon/style/mobile-test improvements were compared and retained when publishing; branch updates used an exact-head lease. Two newly added remote workflows were retained in the base tree. Header targets remain44×44px at320px.

## Visual correction — 10 October, user feedback

The user rejected resemblance to the mockups. Visual conformance remains open. The original collage `a_clean_high_resolution_app_ui_mockup_collage_on.png` is referenced by DESIGN_BASELINE_V1 but absent from available repository/attachments; a source request is pending. Functional success must not be described as design acceptance.

The first correction compacts Dashboard greeting, market status and refresh; preserves source evidence in disclosures; moves account preferences below the overview; aligns KPI cards and removes decorative live-looking dots. Full timestamps are not presented as current quotes. Risk precedes positions only in the Dashboard overview. All four KPI cards are tested above the bottom navigation at375×812 in Chromium and WebKit. The preliminary correction passed175unit and180browser checks. The review in VISUAL_CORRECTION_REVIEW.md identifies further composition changes for Portfolio, Analyzer and Journal; these remain pending original-reference comparison.

Lesson: sibling margins and long explanation blocks can defeat a valid grid and the intended five-second overview. Scope ordering rules to their intended section rather than every reused column grid. Test functionality and visual hierarchy separately.
