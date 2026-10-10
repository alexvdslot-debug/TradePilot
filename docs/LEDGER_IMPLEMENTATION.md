# B4 deterministic ledger

`app/ledger.mjs` is a pure calculation and CSV module. It performs no persistence,
external data access, account authentication, broker access or order execution.
Consumers must authorize the owner of the account before storing or reading events.

## Contract

- `validateEvent(event)` returns an immutable normalized event or throws
  `LedgerError` with a machine-readable `code`. Consumers translate error codes.
- `calculateLedger(events, {allowMargin=false, method='average', quotes={}}={})`
  returns JSON-safe decimal strings. Only the explicitly labeled weighted average
  method is supported. Other methods fail; FIFO is not silently substituted.
- `parseLedgerCSV(text)` returns a preview array without persistence.
- `exportLedgerCSV(events)` returns a canonical CSV including the header when empty.

Events require unique `id`, exact UTC ISO `timestamp`, `type`, and `currency` EUR/USD.
BUY/SELL require uppercase `symbol`, positive string `quantity` and `price`.
Other events require positive string `amount`; FX also requires distinct
`toCurrency` and positive `toAmount`. Fees default to zero in the event currency;
`feeCurrency` permits independently recorded foreign fees. `reference` is optional.
Unknown fields and nonempty fields irrelevant to the event type are rejected.
UTC timestamps normalize to milliseconds, and chronological sorting preserves
the original input order for equal timestamps.

Decimals have at most 18 integer digits. Cash amounts and fees permit 12 fraction
digits; quantities and prices permit 6 each. Their product is exact at the ledger's
12-decimal BigInt scale. Partial average-cost allocations truncate at that scale,
retaining the residual in inventory. A full exit allocates the entire remaining
cost basis, so rounding cannot leave phantom cost before re-entry. Display rounding
belongs to consumers, not this accounting engine.

## Accounting policy

USD sales remain USD cash; FX requires an explicit executed FX event. Deposits,
withdrawals, financing, fees, and explicit margin principal are reported separately.
BUY fees in the execution currency enter cost basis. SELL fees in the execution
currency reduce realized trading profit. Foreign fees debit and report their own
currency; they do not fabricate historical FX or get converted into trade P&L.
Position objects include `currency` alongside the requested fields. A symbol cannot
mix execution currencies in one ledger.

Without `allowMargin: true`, any event yielding negative cash in either currency
is rejected. Margin draws/repayments also require that setting, and repayment cannot
exceed explicit outstanding principal. Negative cash remains separately visible
from explicit margin principal; no automatic draw is invented. Overselling is always
rejected because short-position accounting is outside this release.

Closed positions remain in the result with zero quantity and cost basis so their
realized profit remains auditable. This module deliberately returns `unrealized:null`
and `valuationComplete:false` even if a quotes object is supplied: no quote freshness,
historical FX, FX profit, EUR performance, tax result or reconciliation certification
is fabricated.

## Canonical CSV

Header:

```csv
id,timestamp,type,symbol,quantity,price,currency,amount,fee,feeCurrency,toCurrency,toAmount,reference
```

Each exported field is quoted using standard doubled quote escaping. Potential
spreadsheet formula cells receive an apostrophe prefix. Existing apostrophe prefixes
are escaped too, so a canonical export/import restores exact references, including
commas, quotes and newlines. The parser enforces the exact header, column count and
quote syntax. This is not a DEGIRO CSV mapper: unknown broker formats need a reviewed
mapping before conversion. Duplicate event IDs fail both import and calculation.
Parsing alone does not guarantee cash sufficiency; callers run `calculateLedger`
for preview and again on authoritative storage.

Limits: 10,000 events, 500-character references, and 16,000,000 CSV characters.
The CSV bound allows roundtrip of maximum-length validated rows including doubled
quotes. Account-level broker fingerprints, corrections and corporate actions are
not implemented by this module.

## Validation and lessons

The initial module was immediately smoke-tested with an empty ledger. Golden tests
cover synthetic accounting fixtures, multi-tranche average cost, partial sales,
full exits and re-entry, foreign fees, FX, cash reconciliation, margin controls,
chronology, decimals, invalid input and CSV safety/roundtrip.

Verified with `node --test tests/ledger.test.mjs`: **21 passed, 0 failed**.

- A malformed-CSV test originally removed four trailing characters, which left a
  valid unquoted empty final cell. The fixture now removes three characters to
  leave an unterminated quoted cell; legitimate unquoted empty cells stay accepted.
- The CSV size limit must accommodate the maximum permitted event count and escaped
  references, or an otherwise valid export cannot be imported again.
- Sparse input arrays must be validated through `Array.from`; `Array.map` skips holes.
- Optional defaults apply only to omitted values: explicit null fees/currencies are
  rejected instead of silently normalized to zero or execution currency.
- Accounting documentation uses FIFO only as a demonstration and explicitly shows
  different average-cost outcomes. The release exposes its average method instead
  of claiming the FIFO fixture is its implemented method.
- `~/.Codex/rules/security.md` and `database.md` were not present at the prescribed
  paths. This module contains no backend authentication or database access.
