# Remaining delivery audit — 10 October 2026

## Verified dependencies

Read-only connector probes succeeded: Twelve Data usage returned one used credit out of 800 daily credits; Stocktwits returned NVDA metadata with a provider price timestamp. This proves those ChatGPT connectors work. It does not grant the deployed Worker their authenticated sessions or server-side redistribution rights.

The logged-in Twelve Data manage-plan page showed Basic subscribed, 8 API credits per minute and 800 daily, with internal non-display usage. Grow lists internal display access. Official pricing confirms the distinction: https://twelvedata.com/pricing. General personal/internal use guidance: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage.

No paid upgrade was purchased and no key was copied or exposed. Successful data access is not evidence of account display entitlement or complete consolidated volume. Preserve the app's explicit unverified states until the relevant account evidence is available.

## Remaining implementation versus activation

Background checking and notification transport are software/infrastructure work, not an API-key entry task. Existing notifications are persisted foreground one-shot price alerts with source provenance and explicit rearm. Audit the scheduler, optimistic D1 updates, shared quota, bounded symbols, and owner notification preferences before adding background delivery. External activation needs trustworthy current feeds; a scheduler must never convert missing evidence into a verified trigger.

Spread, symbol-specific halts and corporate actions require actual provider contracts. Do not equate exchange-open status with a particular symbol trading normally, a last trade with bid/ask, or a general quote timestamp with the same completed interval used by the analysis. Stocktwits chat access is available; app-server integration remains separate. The official Stocktwits MCP repository documents unauthenticated public endpoints (https://github.com/stocktwits/stocktwits-mcp). A direct read-only request to its documented ql.stocktwits.com/pricedata endpoint returned HTTP 403 from this permitted network. Do not claim a secret is necessarily required; the public path is currently inaccessible from this tested network. Do not bypass its restriction.

## Lessons

Report software completion and provider activation separately. Do not say a provider is unavailable without testing its current connector. A logged-in account and a working key still do not prove all datasets or usage rights required by a product. Mark a feature complete only with evidence of the requested behavior, not by treating unfinished implementation as an external dependency.
