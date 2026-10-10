# B4 portfolio valuation and mapped import acceptance

## Implemented exports

`app/portfolio.mjs` reuses `calculateLedger`; it does not duplicate trade allocation,
create broker access, fetch prices, persist state or execute orders.

```js
projectLedger(events, { asOf, allowMargin: false, method: 'average' })
calculatePortfolio(events, {
  quotes: {}, fx: null, now: '2026-10-09T14:10:00Z', asOf: null,
  maxAgeMs: 900000, allowMargin: false, method: 'average'
})
quoteFromCandles(feed, { now: Date.now() })
```

`now` is injectable for reproducible tests; `asOf` activates historical projection.
Each event is schema-validated, IDs are unique across all input events, and only
events at or before the cutoff reach the ledger calculation. Future sells cannot
change past position quantities, cost basis, cash or realized results. A future
cutoff relative to `now` fails instead of claiming a prospective snapshot is actual.

Quotes are keyed by symbol, with the following explicit evidence:

```js
{ symbol: 'OPEN', currency: 'USD', price: '3.5', source: 'provider',
  asOf: '2026-10-09T14:09:00Z', delay: 0, realtime: true,
  verified: true, marketSession: 'regular', historical: false }
```

FX uses the same evidence plus `symbol:'USD/EUR'`, `currency:'EUR'`, and a decimal
`rate` or `price`. Inverse rates are rejected rather than guessed or inverted.
Only input evidence supplied by a trusted adapter should set `verified:true`;
the calculation itself cannot authenticate a quote's provenance.

Current valuation requires verified source, explicit zero delay and realtime true,
a known regular/premarket/afterhours session, positive decimal price, exact symbol
and currency, and a UTC timestamp at or before cutoff within configured freshness.
Historical valuation requires explicit source, known delay and a price at or before
the historical cutoff; freshness is measured against that cutoff. Historical
results never set `currentValuationComplete` or `currentEURValue`.

Quote statuses: `missing`, `unverified`, `stale`, `historical`, `current`, `closed`.
Each quote exposes reason codes and source/time/delay/session evidence for UI
translation. Usable stale/unverified prices can show an indicative position value
and P&L alongside status; they are excluded from current totals and concentration.
Mismatched identities, invalid values and future quotes yield null values entirely.

`quoteFromCandles` selects the newest explicitly completed bar with `completedAt`
at or before supplied clock and after its opening. With no completed bar it returns
null. It never uses a forming candle's close. Source/schema verification does not
upgrade unknown session or subscription entitlement. Recognized U.S. exchanges use
the shared exchange-clock classifier to mark closed sessions, including weekends,
as historical. That classifier does not certify holiday calendars or entitlement.

## Output for UI

- Original ledger cash, realized P&L, deposits, withdrawals, fees, financing and
  margin remain exact decimal strings.
- `positions` adds `quote`, `marketValue`, `unrealized`, `covered` and
  `coveredWeightPercent`. Zero-quantity closed positions remain auditable.
- `totals.EUR/USD` each exposes `cash`, `marginPrincipal`, `coveredEquityValue`,
  `indicativeEquityValue`, `equityValue`, `netAssetValue`, `complete` and coverage
  counts. Equity/net asset totals are null until every open position in that
  currency has qualifying evidence. Net asset value deducts explicit margin
  principal once; negative cash is already negative cash.
- `concentration` discloses per-currency covered equity basis, excluded symbols,
  coverage counts and explicit cash/margin exclusions. A 100% weight with one of
  several holdings priced is coverage-relative, not a full-portfolio weight.
- `indicativeEURValue` needs complete qualifying equity coverage and qualifying
  USD/EUR evidence when net USD is nonzero. Missing FX preserves separate currency
  balances and leaves the combined total null. `currentEURValue` exists only in
  current mode. FX price movement does not create an FX transaction or realized FX
  P&L. No historical deposit-weighted performance or tax result is claimed.
- `indicativeUnverifiedEURValue` is a separate estimate using usable indicative
  position/FX prices, even if stale or unverified. It remains null when any position
  price or required FX price is absent/invalid/future. It never fills current totals
  or their completeness flags. UI must explicitly label this value unverified and
  show its quote/FX timestamps and reasons.

Valuation uses BigInt fixed point at 18 decimals. Ledger quantities have up to six
fraction digits and quotes up to twelve, so quantity × quote is exact. FX products
and percentages truncate at 18 decimals; financial UI display rounding remains a
consumer concern. Unrealized profit subtracts actual ledger cost basis, including
execution-currency buy fees; foreign fees stay separately recorded in their own
currency rather than using invented historical FX.

## Explicit import mapping

`app/import-mapping.mjs` adds:

```js
previewMappedCSV(text, {
  columns: { id: 'Order', timestamp: 'Executed UTC', type: 'Action', amount: 'Value' },
  constants: { currency: 'USD' }, typeMap: { Fund: 'DEPOSIT' },
  delimiter: ',', decimalSeparator: '.', timestampFormat: 'iso-utc',
  absoluteFields: [], existingEvents: []
})
```

`listCSVHeaders(text,{delimiter=','}={})` returns the exact parsed header list for
mapping dropdowns, including quoted commas. It shares the same parser and header
validation; consumers should not split the first line manually.

Mapping is supplied explicitly; no DEGIRO column layout is claimed. Columns may map
any canonical ledger field; fee currency and executed FX both retain separate
fields. Supported delimiters are comma, semicolon and tab. Decimal comma requires
explicit selection; mixed or thousands-separated formats fail as ambiguous.
`day-first-utc` accepts `DD/MM/YYYY HH:mm:ss` only after the user confirms the source
is UTC. Local-market or broker timezone conversion and DST are not inferred.
Negative quantities/amounts require explicit `absoluteFields`; no automatic sign
or transaction-type inference occurs. IDs must come from a source column, enabling
duplicate detection within the file and against `existingEvents`.

Output: `{events,issues,valid,requiresReview:true,sourceRows,acceptedRows,
appliedPolicy,canonicalCSV}`. Row issues block the entire canonical export. Accepted
rows in a failed preview are for review, not partial persistence. Canonical exports
reuse ledger formula protection. Before committing, callers must show this preview,
obtain the user's import confirmation, run the merged authoritative ledger and
enforce account ownership in the existing private-state backend.

## Evidence and acceptance

Primary provider documentation was consulted before implementation:

- [Twelve Data API documentation](https://twelvedata.com/docs/markets/market-state)
  distinguishes latest available prices and interval opening timestamps. Therefore
  an opening timestamp alone is not completed-candle quote evidence.
- [Twelve Data extended-hours documentation](https://support.twelvedata.com/en/articles/5195429-pre-post-market-data)
  documents session/plan-dependent extended-hour data. Session and realtime coverage
  are supplied evidence, not inferred merely from a ticker or request interval.

Project policy comes from `docs/accounting/04-degiro-usd-ledger-fx.md`: separate
cash currencies, no implicit AutoFX, executed conversion only, explicit fees and
cost method. Shared `app/market-quality.mjs` provides the clock classifier rather
than building a competing exchange-clock implementation.

Smoke-tested immediately with zero positions and an explicitly mapped deposit.
`node --test tests/portfolio.test.mjs tests/ledger.test.mjs`: **47 passed, 0 failed**
(26 portfolio/mapping/realization tests plus 21 existing ledger tests).
Fixtures are synthetic, not a real broker-export acceptance claim.

Lessons recorded during implementation:

1. Completed bar evidence must be checked against the requested clock; a last
   forming bar should cause selection of the earlier completed bar, not a false
   current price and not loss of all historical price evidence.
2. If no completed bar exists, returning null prevents a forming close from leaking
   into even indicative holdings valuation.
3. Source schema verification is separate from current entitlement/session
   verification. Existing unknown metadata must remain unknown after adaptation.
4. A cash-only EUR account does not need an invented USD/EUR rate. Accounts carrying
   USD do need verified FX to express a combined EUR balance.
5. Historical portfolio state must filter ledger events independently from quote
   selection, and reject quotes after the requested cutoff to avoid lookahead.
6. Concentration of covered equities needs counts and exclusions; cash or borrowed
   principal cannot silently enter its denominator.
7. When the UI offers a value from unverified FX or prices, it must have a separate
   named output and complete indicative price coverage. Using the current-total
   field for that estimate would erase the data-quality distinction.

The parent authorized one additive ledger option for B7 journal integration:
`calculateLedger(events,{includeRealizations:true})` adds per-SELL
`tradeRealizations:[{eventId,symbol,currency,realized}]` using the same allocation
and fee calculation. Default output is unchanged. This avoids recomputing every
ledger prefix and prevents a journal from drifting from the account's cost method.
