# Final conformance review — 10 October 2026

Verdict: NEEDS-REVISION after the source recheck below. The initial findings and matrix are historical snapshots, not a list of still-open defects. This is a read-only integration audit; implementation owners are changing the sources concurrently. Findings below must be rechecked after their fixes. No source changes or external account writes were performed.

## Authority and scope

DESIGN_BASELINE_V1 overrides older dark main-screen styling; light screens, dark splash, shared mark and five mobile tabs are authoritative. Functional, financial accuracy, privacy and accessibility requirements take precedence over illustrative prices. The approved named collage is absent from the workspace/available attachment filename search, so pixel-perfect conformance cannot be asserted. Earlier v3/v4/v5 products and generated browser screenshots are not the approved mockup.

Reviewed main.js, features.mjs, i18n.mjs, feature-copy.mjs, portfolio.mjs/panels, journal.mjs/panels and analysis quality gates against INTERACTION_REGISTER, screens 01/06/07 and splash/alerts components. Portfolio/Journal and market agents own their detailed screen audits. Known pending dashboard market-status/opportunity export integration is explicitly excluded from defect claims until its owner finishes.

## Initial findings sent immediately to owners (superseded by recheck)

1. `app/main.js:168`: USD portfolio KPI uses the native USD bucket as whole portfolio value. EUR balances/equity/debt are omitted. Reproduction: deposit EUR 100 and USD 50, select USD; dashboard shows USD 50. `calculatePortfolio` confirms EUR 100 still exists and only provides consolidated EUR, not consolidated USD. Fix with verified inverse FX consolidation or explicitly label native USD as partial; unknown FX must leave whole total unavailable.
2. `app/features.mjs:29–30`, `app/main.js:54`: persisted in-app alerts switch is never consulted in feature alert checking; hide-amounts is consulted only in Dashboard while Portfolio and Journal reveal cash, cost and risk. Show-USD preference likewise has no consumption. Wire each preference to its scope, or accurately label/disable unsupported settings. A global privacy promise must not expose amounts on another screen.
3. `app/journal.mjs:48`: R eligibility uses plan creation time as proof initial risk predates execution. An old planned record without risk can be amended today with initialRisk and then linked to historical completed fills; it is counted in original-risk statistics. The reviewed prior source permits that attribution. During the local fixture run, the owner concurrently added riskRecordedAt; the fixture then returned null, correctly excluding missing provenance. Add explicit immutable risk-recorded evidence; unknown legacy provenance must not become eligible solely from createdAt.
4. `app/main.js:72,96,116,122`: account failure/logout/save-loading branches remain hardcoded Dutch for English accounts. Successful-screen phrase checks do not exercise these paths. Translate all success/error/loading states with keyed strings.
5. `app/feature-copy.mjs:13–17`, `app/journal-panels.mjs:9`: text-node translation skips thesis/textarea/option but not user attachment names or linked booking references. User source named “Instap” is displayed “Entry” under English, and dictionary-equal references inside a Journal fill table change. Mark every user-derived text container, including attachment name/alt, reference and evaluation display, as untranslated content.

## Initial traceable screen snapshot (superseded by recheck)

| Contract | Current evidence | Remaining gap / limit |
|---|---|---|
| G01–G06, G12 navigation | Five persistent tabs, gear Settings, branded Dashboard link, typed ticker/record routing | Analyzer tab does not preserve last selected ticker; browser Back bypasses Settings dirty guard |
| G07 / screen07 search | Debounce, min length, typed categories, owner-scoped private data, stale result guards, keyboard listbox, outside click and focus restore | Explicit offline and 429 cooldown states absent; old request ignored rather than cancelled |
| G08–G10 / N05–N06 notifications | Real unread count, filter, individual/all persisted read, historic source evidence, Analyzer context | Manage alerts points to Radar editor rather than dedicated central management route/filter; reminders/system categories unavailable |
| G11 / ST01–ST02, ST08–ST09 Settings | Profile, currency, risk, notifications, data, privacy sections; optimistic account save; export; cancel; five mobile tabs | Notification categories/sessions/cooldown and provider entitlement/status/last error detail not present; no inline field errors or saved-at timestamp |
| ST03 / ST06 preferences | Preferences persist independently per account; locale config and feature preferences passed | Whole-portfolio USD conversion and settings consumption findings above; default market form remains hardcoded 15min despite saved interval |
| ST04 / FX | Valuation uses source-evidenced FX and keeps original ledger currencies | No account-level manual FX configuration/display-rate history; absence must be explicit rather than invented |
| ST05 / dirty/offline | Explicit Save/Cancel, navigation-click block, beforeunload protection, 409 message | `popstate` and Back button use direct render/history.back without a dirty-state decision |
| D01–D02 / Dashboard zones | Seven zones, position/watchlist/plan links, cash and verified value refresh | Daily result and capital-at-risk KPI remain placeholders; no quote-backed position price/P&L/weight/minichart; KPI basis drilldown missing |
| D04–D06 / opportunities | Source-safe pending empty state, Radar and Analyzer routing | Dashboard market/opportunity cache hookup is known work in progress, not a new blocker |
| D07 / N01–N04 alerts | Persistent above/below thresholds, edit, pause/resume, delete confirmation, trusted-data-only foreground evaluation | Context prefilled alert action absent; per-alert sessions/channels/cooldown absent; central list filtering absent |
| G14 / market phase | Provider current-state evidence is validated in analytical flow | Dashboard integration pending; no verified state may be invented from local clock |
| SP01–SP09 splash | Shared SVG mark, inert underlying app, awaited account+state loading, 10-second timeout, retry/sign-in/limited mode, no warm-route splash | Account errors are safe but raw code/text is shown; real iPhone/Android and 200% zoom evidence not yet supplied |
| Footer / Dashboard D06 | Clear scenario disclaimer | Data-policy link absent |
| Journal original-plan freeze | Executed/reviewed or linked BUY freezes thesis/levels/risk; status rollback rejected; evaluation editable | Original-risk timestamp defect above; deletion behavior needs explicit retention policy rather than implied immutability |
| Private attachments | Strict keys, max 4/2 images, bounded PNG/JPEG data with signatures, credential-free HTTPS links; async image read uses owner epoch/connected-input guard | These are signature checks, not complete image decoding; private images correctly need no external upload service |

No push/closed-app notification claim is made. Existing explanatory foreground-only copy is accurate; lack of provisioned push infrastructure is an external capability limit, not grounds to fake successful delivery. Similarly permanent deletion remains unavailable with an explicit retention/recovery explanation.

## Security and race observations

Successful fetch responses are guarded by authGeneration before and after JSON; reset clears private state, caches, draft, overlays and request epochs. Bootstrap timeout invalidates the previous generation before retry/limited mode, preventing late account data restoration. Image reading captures owner epoch before await. Exact journal attachment keys reject executable formats and credential-bearing links. These controls were read, not independently proven across every browser race in this audit. The hide-amounts leak is a privacy defect within the authenticated UI, not a cross-account ownership bypass.

## Verification

`npm test`: 167 tests passed, zero failed (local run, approximately 2 seconds). Meaningful local fixtures confirmed the native USD bucket omits EUR. During testing, concurrently updated riskRecordedAt logic correctly excluded missing risk provenance (R=null). The original issue remains recorded for traceability, not as a claim against that fix. Parent/owners run synchronized Chromium/WebKit integration tests; this audit does not claim their pending results or deployed acceptance. No production credentials, browser accounts, external writes or opened Chrome tabs were used.

## Lessons

Native-currency totals cannot be relabelled consolidated totals. Persisting a setting is not proof its behavior is implemented. Privacy settings require checking every screen. Creation time does not prove a later-added financial snapshot existed at creation. Localization must translate interface literals, never user records. A happy-path English smoke test must also cover failures, saved state, derived labels and source-provenance messages. Async bootstrap completion now correctly replaces animation completion as readiness evidence.

## Concurrent fixes observed before handoff

Main now reads currentUSDValue rather than native USD. Journal now requires riskRecordedAt for R eligibility and freezes it with executed plans. Features now hide Portfolio/Journal amounts through a dedicated privacy view. These fixes need owner regression evidence; the initial findings above describe the source at discovery. No false R=2 fixture result is claimed.

## Current fix recheck

All five initial blockers are addressed in source: genuine consolidated currentUSDValue with inverse verified FX; Portfolio/Journal financial privacy view; showUSD side-value control; inAppAlerts evaluation guard; server-assigned riskRecordedAt (untrusted backdated inputs overwritten and unchanged original stamps preserved); account error translations; protected user attachment links and broker references. Original plans and risk provenance remain frozen after execution; status rollback is rejected. Settings Back/browser popstate checks the live dirty form and preserves it. Central /alerts route, status/ticker filters and prefilling now exist. Bootstrap correctly awaits settings and private state, with generation-invalidating timeout and retry. No newly discovered cross-account write/restore bypass.

Remaining concrete defects at recheck:

- `app/main.js:56`: Dashboard account summary always formats risk_budget_eur, even when hideAmounts is true. Mask/omit it consistently with Dashboard value/cash privacy. This is the sole remaining privacy flag.
- `app/features.mjs:49`: market form selects literal 15min. Saved defaultInterval=5min affects Dashboard refresh, but not the new Radar/Analyzer form or context drilldown. Set the initial form interval from the saved preference; explicit selection must keep priority afterwards.
- `app/features.mjs:50–51`: dynamic message/onSubmit paths set raw Dutch interface strings after localization (processing, failure prefix, saved booking, evaluation). Route keyed interface messages through the translator; preserve user records/error codes separately. Account-shell error paths are already fixed.

The owner must regression-test these fixes. This verdict concerns concrete implemented-flow defects, not external unavailable capabilities. Missing approved mockup bytes, physical phone evidence, provider entitlements, push infrastructure, historical FX, or permanent-deletion retention decisions are acceptance limits, not invented build blockers. Detailed optional control differences in the initial matrix require parent scope decisions and must not be represented as fresh core defects.

Verification at recheck: `npm test` **171/171 passed**, zero failures (approximately 1.74 seconds). No browser lease used; market owner is running final Chromium/WebKit tests. Ledger reports 12 passing browser checks and private-state provenance checks; these are attributed owner evidence, not independently rerun here. Deployment and final browser release acceptance remain parent's responsibility.

Recheck lesson: clearing the obvious KPI amounts does not satisfy a global privacy preference if a secondary summary still prints its budget. A stored analysis preference must drive the visible form as well as background refresh. DOM translation during render cannot translate messages inserted later by event handlers.

## Full-browser failure triage (read-only; no browser/server lease)

Parent reports the three previous residual items fixed and 175 unit tests passing; final browser run remains acceptance evidence in progress. Read actual failure snapshots rather than treating every red test as a defect:

- English all-route conformance is a genuine source issue: first Dashboard snapshot still shows `Nog geen aandelen toegevoegd.` and `Nog geen handelsplannen.` from feature fallbacks. Shell translation only matches its local literal allowlist. Translate those keyed fallback values at the source or explicitly cover them in shell localization. Navigation accessible name also remains `Hoofdnavigatie`: root nav's own aria-label is excluded by querySelectorAll, which only returns descendants. Translate the root attribute as well.
- B3 unavailable-settings test is stale: snapshot correctly shows authentication failure and disabled Save. Failing expectation hardcodes production login URL; local same-origin deployment correctly uses localhost `/api/v1/session`. Assert API origin from fixture/environment plus the correct pathname instead of hardcoding the production host.
- Dutch Journal status test uses reviewed plan without actual fills. Status select correctly retains reviewed, while new execution-derived lifecycle badge correctly displays planned. Supply a fully linked, closed BUY/SELL fixture to expect Reviewed, or explicitly expect Planned for this empty-fill fixture. Do not weaken execution evidence to make the legacy test green.

No new privacy or cross-account bypass was indicated by these snapshots. Lesson: assertions must distinguish user-entered workflow status from evidence-derived trade lifecycle, and deployment-relative links from fixed production URLs. English coverage must include hydrated empty-state fallbacks and accessible names, not just initial rendered headings.
