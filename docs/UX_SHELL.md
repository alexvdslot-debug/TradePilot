# Shell UX acceptance

Implemented against `DESIGN_BASELINE_V1.md`, `INTERACTION_REGISTER.md`, and the dashboard/global-search/notifications screen contracts. No invented live prices or private production records are introduced.

Search preserves the selected category's destination: stock results open Analyzer, holdings open Portfolio, and journal/plans open Journal with ticker and record context. The URL retains this context, allowing direct navigation and reload. Results use a combobox/listbox keyboard contract with Arrow Up/Down selection, Enter activation, Escape closing, and focus restoration. Debounced responses retain their generation and category, so older searches cannot replace the current result set. Failed searches expose a retry action.

The bell displays the actual unread count, caps its visual badge at `9+`, and preserves the accessible button name “Meldingen.” Its accessible description provides the complete unread count. Notification records support All/Unread filters, single or bulk acknowledgement, original source/time labeling, and ticker links. Acknowledgement must succeed before the count decreases or the user navigates from an unread notification. Failed saves retain the unread notification and current screen. Confirmed authorization failure clears the badge alongside private feature state. Alerts management opens Radar.

Opening and closing an overlay no longer rebuilds the underlying app or reloads settings. Typed profile fields remain intact. Background sections become inert and regain their normal interaction state on close. Focus traversal explicitly cycles through visible enabled controls, including links, and excludes hidden retry buttons. This works consistently with WebKit keyboard behavior.

Dashboard copy distinguishes unavailable valuations from loaded manual ledger data. Cash shows its actual ledger amounts with a clear accounting basis. Pending portfolio valuation/day result/exposure use compact dash values and refer to missing verified quotes rather than claiming that no account, ledger, scanner, or provider is connected. Loaded holdings/watchlists link to their ticker's Analyzer; recent plans link to their Journal record. Plan status labels are Dutch. Source/session information is described as not yet checked on this screen, with a working Analyzer action.

Verification uses new `tests/main-ux.spec.cjs` browser scenarios in Chromium and WebKit, including a 375px dashboard/navigation check. The rapid smoke fixture serves current local shell modules while the parent owns Worker asset generation. This is source-level browser evidence; the final release must separately exercise synchronized Worker assets and the actual authenticated deployment.

Lessons recorded:

- Rebuilding the shell just to open or close a dialog silently discards unsaved settings; append/remove the dialog while preserving the underlying DOM instead.
- Private search categories need typed destinations and record identifiers; ticker-only routing loses the user's portfolio/journal context.
- An unread badge is private state too. Clear it on confirmed auth failure even when the settings form is retained.
- A hidden retry control must not count as the focus trap's last element. Safari may skip buttons under native tab traversal, so explicit visible-control cycling is more reliable than trapping only the first/last boundary.
- Scope browser selectors to the active search listbox. Native select options in the underlying Portfolio page also have the `option` role.
- Empty-state copy must follow real loaded data and checked evidence. An unavailable valuation does not mean the ledger or provider is disconnected.

## Settings and bootstrap completion (2026-10-10)
- Account preferences are an additive `user_settings.preferences_json` column in migration 0005. Deploy migration before the backend SELECT; never synthesize readiness when the DB is unavailable. Preferences have an exact five-key allowlist and share the existing optimistic version check. Configured DB failures return structured 503.
- Six settings sections persist profile, language/time zone, currency display, analysis interval/risk exposure, in-app alert checks and privacy amount hiding. Export downloads only the authenticated snapshot. Deletion stays unavailable pending retention/recovery configuration.
- Bootstrap waits for settings and private state rather than CSS animation. A ten-second settings deadline yields retry and explicit limited continuation; limited mode clears all private data. Animation and reduced-motion cannot bypass account checks.
- Locale is a central module with namespaced dictionaries and literal translation registration. Peer modules register their own dictionaries; translation targets generated UI only and never rewrites private notes or user input.
- Preserve dirty form input: overlays do not rerender, Cancel restores last server-confirmed settings, navigation asks the user to resolve unsaved changes through Save/Cancel, and browser unload uses the native unsaved-change warning.
- Smoke discovery: sharing a development-server lifecycle across concurrent Playwright runs causes ERR_CONNECTION_REFUSED. An exclusive fresh server removes this infrastructure failure. Main UX Chromium 9/9; new settings tests Chromium/WebKit 4/4; signed settings API 6/6. New tests capture page errors and verify the 375px layout.
- Dashboard valuation now consumes the exact portfolio summary: EUR requires full current coverage plus verified FX; USD uses the complete current native total. Display hiding applies to NAV and cash. Coverage counts disclose missing prices. Daily P/L and stop-loss capital risk remain unavailable when the required prior-period quotes or execution-risk evidence are missing; equity market value is not substituted for risk.
- The bootstrap deadline covers both account settings and private state. Late responses are rejected by auth generation and private read epochs after a timeout or retry.
