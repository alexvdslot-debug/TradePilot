# Portfolio and Journal implementation evidence

The implementation uses the existing plain JavaScript app, exact decimal ledger and private owner-scoped state API. No broker orders, invented holdings or fabricated prices are introduced.

## Portfolio criteria

| Requirement | Implementation / evidence | Data prerequisite or remaining decision |
|---|---|---|
| P01 position detail / Analyzer | Position picker shows quantity, average basis and actual booking history; ticker buttons route to Analyzer. | Instrument names and comparable prior-session day change require source data. |
| P02 filter / sort | Actual transaction ticker/reference/type/date filtering, chronological sort, reset and 25-row pagination; allocation sorted by covered weight. | Position ticker search/reset and exact quantity/cost-basis sorting implemented. |
| P03 add booking | Existing exact event validation and atomic versioned account save; live validation shows cash and quantity after booking; invalid/oversell disabled; clear-form action. | Existing inline form retained rather than modal. |
| P04 alert at position | Analyzer/Radar ticker context retains symbol. | Contextual position action opens the dedicated Alerts form with the actual ticker; no alert is created before explicit save. |
| Valuation | Actual current evidence gates, separate indicative marks, exact EUR and USD consolidation; no FX needed for a zero foreign balance. Display preference applied to consolidated totals; USD summary optional. | Missing quote, delay, display entitlement or FX remains unknown. |
| Allocation / risk | Covered per-currency equity weights, graphical meters and actual configurable maximum-position limit; cash and margin excluded explicitly. EUR risk budget stays EUR regardless display currency. | Full account risk cannot be asserted without complete quote coverage. |
| Historical graph | Exact cumulative realized-sale result plus separately sampled observed completed-candle cash + equity − margin values. Missing/stale positions create gaps; no interpolation. Accessible values table. | Full-period time-weighted total return / benchmark and historical FX require verified historical price/FX coverage; curves are not labeled total return. |
| CSV | Existing canonical or explicit mapped preview, duplicate control, confirmation, formula-safe export. | Real DEGIRO sample and broker reconciliation still require account evidence. |
| Privacy | Hidden amount preference suppresses financial Portfolio/Journal sections while leaving ticker navigation. | Private state remains stored, unchanged. |
| Corporate actions / corrections | Existing allowed-event whitelist blocks unsupported types rather than silently guessing. | DIVIDEND, SPLIT, transfers and audit reversal accounting require a separate agreed event contract and fixtures. Not implemented. |

## Journal criteria

| ID | Implementation / evidence | Qualification |
|---|---|---|
| TJ01–02 | Existing responsive shell/navigation, additional modules contain no fixed page width. | 375px browser smoke passed in Chromium/WebKit; final owned browser suite 16/16 passed. |
| TJ03 | Draft/planned/executed/reviewed/cancelled states; original unexecuted plan editor, duplicate, evaluation, linked actual fills. | Active and Closed are derived strictly from actual linked fills and remaining quantity; legacy executed/reviewed persistence codes retained for compatibility. |
| TJ04 | Server compares prior owner state before versioned mutation; original thesis/levels/pretrade risk/checklist freeze after execution; status cannot roll back to editable. | Executed/reviewed original deletion is disabled with an explanation and rejected by the server. Unexecuted plans remain removable. |
| TJ05–06 | Full-account average-cost allocation, partial exits, linked execution timeline, same-currency fees included and foreign fees separate. | Mixed currency results excluded from win/loss and R classification; no invented FX. |
| TJ07–08 | n/sample disclosure, expectancy and profit factor per currency, actual calendar-hour duration, R only from pre-execution risk recording. | Server stamps riskRecordedAt on risk introduction/change; retroactively supplied risk and legacy unstamped risk produce no R. No MAE/MFE without price path. |
| TJ09 | Private bounded PNG/JPEG image data, signature/size validation, ≤2 images / ≤4 attachments per plan, safe HTTPS links; no remote image embedding; owner API and global 200KB state limit retained. | Larger image storage is not configured; UI states 40KB per image. |
| TJ10–12 | Actual saves use readEpoch/session/version guards; async image reads abort on session/route change; failures do not claim saved. | Offline saved drafts are not implemented. |
| TJ13 | Owner-only JSON journal/account export, no credentials; ledger CSV remains formula-safe. | Journal summary CSV now quotes multiline cells and neutralizes spreadsheet formula prefixes; private images remain in explicit JSON export. |
| TJ14–16 | Native labeled controls, keyboard-accessible scroll tables, translated NL/EN added UI, test fixtures for mobile/filter/attachments/immutability/English. | Final 16 Portfolio/Journal browser cases passed across Chromium/WebKit on asset fc7bcb7. |
| TJ17 | No claim of blanket closure. | Remaining items listed explicitly above and in root conformance register. |

## Lessons and checks

- Chronological helpers must retain stable input order without adding metadata to strict ledger events; sorting wrappers must remove their index before ledger validation. Three history tests caught the strict-field error and passed after correction.
- Compare timestamps numerically after UTC normalization. Raw `Z` and `.000Z` strings differ lexically at the same instant; a cutoff boundary test caught and fixed this.
- A plan creation timestamp does not prove initial risk existed before execution. Store a server-controlled risk recording timestamp and exclude retrospective risk from R.
- Native USD cash is not a consolidated USD portfolio value. Exact EUR/rate conversion and complete foreign coverage are required.
- Risk budget configured in EUR must never be relabeled USD merely because display currency changed.
- Test-server ports are exclusive. Shared-server reuse during concurrent asset builds produced an empty-app smoke result; root coordinates fresh builds and isolated runs.

Focused domain/private-state suite: 48 passed before the additional USD consolidation fixture; latest portfolio/history subset 31 passed. New browser cases are `tests/portfolio-conformance-ux.spec.cjs` (four cases per engine). Initial browser run: 12/12 passed (6 Chromium + 6 WebKit), including mobile, private image upload, immutable original, English, showUSD and hidden amounts. Targeted domain/private-state suite: 51/51 passed before follow-up sorting/CSV/delete changes; latest journal/private-state follow-up subset: 22/22 passed.

## Full Portfolio acceptance inventory

| ID | Status and evidence |
|---|---|
| PF01 | Responsive native shell and six new Portfolio/Journal browser scenarios; final root browser verification pending. |
| PF02 | Existing contextual route/ticker navigation, history and privacy guards retained. |
| PF03 | Keyboard-labeled inline transaction form and accessible scroll tables; specified modal/sheet not implemented. |
| PF04 | Versioned atomic buy/sell state persistence, CSV idempotent IDs. Audit correction/reversal event contract not implemented. |
| PF05 | Exact oversell rejection and live-disabled submit; domain and browser fixture. |
| PF06–07 | Exact weighted-average basis, partial sells, re-entry, fees, real FX and native cash fixtures. |
| PF08 | Coverage displayed; missing quote/FX cannot create current totals; indicative estimates explicitly distinct. |
| PF09 | Existing canonical/mapped CSV preview, duplicate policy and formula-safe roundtrip tests. Actual broker sample remains external. |
| PF10 | Existing owner verified Access identity, prepared scoped queries and second-user isolation tests; private attachments use same storage. |
| PF11 | Quote/FX source/time/delay in valuation metadata; candle graphs preserve historical identity. |
| PF12 | Existing privacy reset, version conflict, API errors, quota retry and source uncertainty; no successful save claimed offline. |
| PF13 | Native controls/mobile cases; no claim of completed external WCAG audit. |
| PF14 | Operational backup/restore/rollback evidence belongs to root deployment register; not tested in this subtask. |
| PF15 | Final root review required; not asserted from passing unit tests alone. |

Rotation comparison reuses Analyzer `#holding-compare-form`/`#holding-comparison`: only real positive holdings, candidate/holding matched completed six-interval history, remaining held quantity (masked when privacy enabled), explicit waiting option and no automatic rotation advice. Manual cost/slippage sizing feeds an explicitly saved Journal plan. Ledger remains sole execution source.

Additional lessons: original risk is server-stamped rather than trusted from client history; actual linked fills derive Active/Closed lifecycle; optional USD side totals may be hidden while native transaction currency must remain visible. The server-controlled risk timestamp and executed immutability owner API test passes (10 private-state tests total).

Follow-up implementation: position search and exact decimal sort/reset, contextual position Alerts link, spreadsheet-safe Journal CSV and enforced retention of executed/reviewed originals. New fixtures cover formula-prefix/multiline CSV cells and deletion protection. The visible original plan is retained; this is a clear disallow-deletion policy, not an unimplemented archive feature. Eight browser cases per engine cover the implemented follow-up and all 16 passed on fresh asset fc7bcb7.

## Final owned validation

- 53/53 targeted Node domain/API tests passed: portfolio26, history5, journal12, private-state10.
- 16/16 browser scenarios passed: eight Chromium and eight WebKit, asset `fc7bcb7`; test server exited and port released.
- Final browser cases prove mobile chart/filters/detail, exact no-save oversell preview, pretrade plan edit and private image upload, immutable original plan, actual English labels, optional USD summary suppression with native ledger retained, hidden amounts, contextual Alerts routing, formula-safe CSV download and disallowed executed deletion.
- These counts cover this ownership area; root runs the complete integrated suite and deployment.

No source edits were made during the final shared build/browser lease. Browser fixtures isolated account responses and closed their contexts automatically. Remaining broker sample, entitlement, historical FX/return and corporate-action decisions are listed above rather than replaced by fictional data.
