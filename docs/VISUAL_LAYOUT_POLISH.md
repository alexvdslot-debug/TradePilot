# Workspace composition polish — 10 October 2026

User superseded exact mockup matching with a bright, clear interface using recognizable icons and graphics. This change corrects content hierarchy independently of the shared visual styling.

- Portfolio opens with valuation and native currency metrics, then positions and allocation/detail. Performance, historical value, transaction records and historical reconstruction precede expanded booking/import administration. Existing accounting, API and form identifiers are unchanged.
- Journal opens with a New plan jump action, evaluation/export overview, linked execution results and filtered records. The full editor follows those records and remains available. The jump focuses the existing form input and honors reduced motion.
- Analyzer's real candle chart now immediately follows the quote/provenance header. Wait reasons, indicators, scenario and detailed evidence follow the chart; none of their data-quality restrictions are weakened.
- Shared saved-state/reload controls form one status toolbar. The market form remains first in its workspace, with compact session context after it.

Styling hooks: `feature-heading`, `feature-status-toolbar`, `portfolio-actions`, `portfolio-hint`, `portfolio-cash-grid`, `portfolio-history`, `administration-workspace`, `journal-actions`, `journal-overview`, `journal-editor`, `market-workspace`, `market-context-toolbar`, `market-decision-status`.

Validation: `node --check app/features.mjs` passed; 43 Portfolio/Journal financial and lifecycle tests passed; rendered loaded-state smoke proved Journal records/results and Portfolio positions/history precede editors, and retained unique form IDs. Browser verification is coordinated by the root agent after synchronized asset generation.

Lessons: accurate evidence must remain accessible, but the overview, chart and records should precede long editors. A layout-only correction should preserve data semantics and established selectors. Smoke fixtures must use the actual supported accounting method (`average`), not an invented descriptive method name.
