# Background alert release — 10 October 2026

Implemented native scheduled price checks and stored in-app delivery for the next visit. Separate owner opt-in defaults false. No user session is stored or impersonated. Private provider RPC has no public HTTP invocation. Shared quota reserves interactive capacity; SQLite lease, bounded fair cursor and owner-version CAS protect against duplicate and lost writes. Invalid/delisted symbols are isolated. New York weekday 09:35–16:00 time gating conserves credits without claiming that an exchange is verified open.

Source application revision: `083e47bd676a846943da4c2fc5f93e677b6260ba`. Provider modules unchanged from `9f4876a09601ed02a13a13fd14998d287b7e69f7`.

Frontend asset revision: `87ec3a3554d40174c9003cb11a5be9d58b1ac5aa3474d6e693201c70b8a78bea`.

Main Worker version `28783eec-ecbf-4600-9478-0f5cfcfdcf0b` deployed at 2026-10-10T16:04:49.649622Z and active at 100%. Provider version `0a07e8da-2139-4932-8ba3-8fd542541aba` deployed at 2026-10-10T16:02:14.810525Z. All 25 main and six provider modules match the uploaded source byte for byte; the original provider secret remains preserved. Both BACKGROUND_ALERTS_ENABLED switches are false. Private BACKGROUND_MARKET binding points to BackgroundMarket. Native `*/5 * * * *` trigger is configured; disabled runs exit before database/provider work.

Migration 0006 was applied once through the D1 API after verifying missing columns. Both added quota counters and alert_scheduler exist. Account/portfolio rows were not rewritten: one state remains at version 1; live settings still load version 4.

Verification: 195 full unit/integration tests passed after clock correction, including actual SQLite concurrency. 188 Chromium/WebKit browser tests passed on identical frontend before the server-only clock correction. Final application revision passed all three triggered CI workflows: Worker bundle/browser validation 38066174894, app shell checks 38066174892, and Pro quality gates 38066174891. Native main/provider dry bundles passed. Independent security reviews passed. No production alert or preference was enabled.

Live UI showed the separate unchecked background preference and explicit inactive status. Screenshot: `/private/tmp/tradepilot-background-settings-live.jpg`. Existing provider-backed NVDA 15-minute analyzer succeeded after deployment at 2026-10-10T16:05:40.052Z. It showed last completed Friday bars as historical/unverified rather than current Saturday data; graph controls and six level labels remained present. Settings loaded version 4 and private state version 1.

Remaining activation dependencies: verified realtime/display entitlement and trustworthy feed; Basic account evidence does not satisfy the current display contract. Stocktwits connector works in ChatGPT but the documented public server endpoint returned 403 from the tested network. Spread, symbol halt/corporate-action and complete session-volume contracts still lack production evidence. No paid plan was purchased or agreement accepted.

Lessons: native scheduling does not grant data entitlement. A 24-hour scheduler can exhaust a daily budget before market opening even when each request is bounded; skip off-hours before any work. A single bad symbol must not poison a fair cursor. Preserve and test existing foreground transport while adding private background RPC. Runtime configuration, source completion and actual activation must be reported separately.
