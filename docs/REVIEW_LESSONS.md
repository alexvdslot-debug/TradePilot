# Integrated review lessons — 2026-10-10

- Session invalidation must guard both reads and writes. A successful response from a PUT/PATCH started before logout must never repopulate private state or profile data. Reproduced with a deferred feature PUT followed by `resetFeatures()`.
- Clearing in-memory private state must also remove already-rendered private DOM immediately. Returning early from an epoch-invalidated loader does not sanitize the visible page.
- Worker-hosted ESM must serve `.mjs` as JavaScript. A unit test checking only `main.js` does not prove that its complete import graph boots in a browser with `nosniff` enabled.
- Normalize or redirect app entry and trailing-slash screen routes before serving relative assets. `/app` resolves `./main.js` outside `/app/`; `/app/portfolio/` needs deliberate handling.
- Exercise the actual logout click and capture page errors: referencing an out-of-scope response inside the event handler can pass syntax and API tests.
- Review evidence: `npm test` passed 81/81 on the initial integrated snapshot; direct Worker fetch reproduced `.mjs` MIME and trailing-route defects. The requested `~/.Codex/rules/security.md` file is absent; only `default.rules` exists in that directory.

## Fix verification

- Repeated the deferred PUT fixture after the generation fix: private state remains null after an obsolete success. Direct Worker fixtures now redirect `/app` and `/app/portfolio/` to canonical routes and serve all three `.mjs` dependencies with JavaScript MIME.
- Error cleanup must tolerate authentication invalidating state during an awaited write. A margin-toggle fixture that resets state and throws 401 currently reaches a catch handler that reads `state.preferences`, causing an unhandled TypeError. Use optional state/access and avoid touching detached controls.
- A session generation guard does not serialize settings reads against writes within the same session. Reloading the profile during PATCH can populate an old form and enable it before the save completes; the confirmed save version must stay paired with the corresponding visible form values.

## Final scoped review

- Margin expiry fixture now completes without rejection and private state remains null. Cleanup guards both cleared state and detached controls.
- Settings reload now exits during an active write; the reload button is disabled throughout PATCH and restored in `finally`. This removes the reviewed concurrent reload/save path.
- All blockers reported in this scoped review have been addressed. Browser verification remains owned by the parent agent; this review uses read-only source inspection and local deterministic fixtures, with no production identity or external mutations.

## MARKET_PROVIDER bridge review

- A service binding is an internal transport, not an identity boundary. The bridge verifies the signed Access identity again and forwards only the assertion or the single authorization cookie; unrelated browser cookies and the provider secret remain outside the forwarded request.
- Keep routes and query keys explicit, reject duplicate parameters, and pin output size, country, timezone, and sort order inside the adapter. Stream and bound provider bodies before parsing; strip unrecognized response fields and use fixed public error codes.
- Scoped review passed: 13/13 market API and adapter tests, including unauthorized calls, duplicate/unknown parameters, assertion/cookie forwarding, quota/error/oversized responses, and preservation of the existing legacy quote route. No new bridge blockers identified. Tests used locally signed fixtures only.

## Fixes and test-environment discovery
- Fixed module MIME and redirected entry/trailing-slash routes; regression test covers the whole import graph and direct routes.
- Added auth-generation checks to every account request and state-save epoch checks; successful pre-logout responses are discarded. Private screens and open overlays are sanitized immediately.
- Browser tests must use the actual same-origin topology. Serving the real Worker CSP while mocking a cross-origin development API blocks requests before the mock can fulfill them. Localhost now uses its own origin and tests intercept that origin.
- Missing test browsers are a runtime setup issue; install the pinned Chromium/WebKit builds instead of interpreting launch failures as product test failures.
- Safari/WebKit does not consistently focus buttons on pointer click. Overlay focus restoration now explicitly remembers the invoking button instead of assuming `document.activeElement` is the invoker.
- Disable account reload during a settings write and reject obsolete save responses. Margin error cleanup must tolerate cleared account state and detached elements.
- Playwright's WebKit screenshot preparation inserts a temporary `body {}` inline stylesheet (`playwright-core/lib/server/screenshotter.js`), which strict CSP rightly blocks. Verify application console/CSP before screenshot preparation; generate the preview in Chromium without weakening the production CSP. WebKit keeps the same functional/CSP checks without that screenshot step.

- Cloudflare dashboard login is separate from the protected TradePilot Access application session; verify the actual app route rather than treating dashboard login as application access. Existing Worker secrets can be reused with an authenticated service binding without reading or copying their values.

- Authenticated production smoke testing confirmed the reused provider secret works. Clear generic progress text after read-only form completion; a successful chart should not retain a processing message. Handle a one-candle chart without division by zero.

- Canonical CSV file reads cross an async boundary just like provider calls: capture session/version before file.text(), discard detached inputs/changed accounts, and bind confirmation to the captured preview rather than mutable global preview.

- Completion review: canonical CSV reads need a session generation captured before File.text() plus a guarded confirmation closure. Tests must reload the generated Worker assets; a reused server can otherwise validate an older UI. Market-open evidence is independent of candle time and display entitlement.
- With both header Zoeken and Breder zoeken present, browser tests must match exact accessible button names or scope to the header; substring selectors become ambiguous. The full matrix exposed this and the test locator was corrected.
- Production smoke found a cash-only account also needs the FX refresh action. Enable quote/FX reads without equity positions; show FX source/time and keep unknown realtime rights indicative. Format historical entry ranges and display their calculated hypothetical risk/reward separately from actionable scenarios.

- Clarify completion by dependency: the deployed core app is finished and tested; live data entitlement is a separate account/billing choice. Rechecked official Twelve Data pricing and terms: Basic lists internal non-display usage, Grow internal display. Do not describe optional broker/physical-device acceptance as missing application implementation, and do not assume a paid purchase is authorized.
