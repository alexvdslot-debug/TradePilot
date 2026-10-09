# TradePilot Pro — S02 API-contracten en datamodel
**Versie:** 1.0 · **Datum:** 2026-10-09 · **Status:** voorgesteld technisch ontwerp, intern consistentie-gecontroleerd; geen API, migratie of contracttest uitgevoerd.

**Bronnen:** [S01 gebruikersflow](../flows/01-integrale-gebruikersflow.md), [datamatrix](../DATA_INTEGRATION_MATRIX.md), [gap-analyse](../PRODUCT_GAP_ANALYSIS.md), vijf schermspecificaties. **Scope:** contractontwerp voor Cloudflare Worker + D1 en browser. Niet beweren dat de endpoints al bestaan.

## 1. Principes
- Basis `/api/v1`; JSON UTF-8; datums als UTC ISO 8601 met Z; geld en aantallen als **decimale strings**, nooit binary floating-point voor ledgerberekeningen. ISO 4217-valutacodes.
- Auth via beveiligde HttpOnly Secure SameSite-cookie en server-side user context (definitieve authprovider nog open). Muterende endpoints eisen CSRF-bescherming waar cookies worden gebruikt; Origin-controle; CORS strikt.
- Alle private tabellen hebben `user_id`; object-autorisatie **op iedere query**. Niet vertrouwen op door client aangeleverde user_id, kosten, P&L of quotes.
- Schrijfoperaties met financieel of plan-effect gebruiken `Idempotency-Key` (UUID), request-hash en server-side deduplicatie. `version` of `If-Match` voor optimistic concurrency.
- Cursor-pagination, begrensde `limit` (default 25, max 100), allowlisted sort/filter; geen ongecontroleerde bulkresponses.
- Iedere marktdataresponse geeft expliciete data-kwaliteit. `UNKNOWN` delay betekent **niet realtime**. Marktstatus is onafhankelijk van quoteversheid. Geen scanner-ranking of bevestigde analyzer-uitkomst bij ontoereikende data.
- Geen brokerorders of automatische DEGIRO-sync.

## 2. Gemeenschappelijke envelopes
Succes: `{ "data": {...}, "meta": {"request_id":"uuid","server_time_utc":"2026-10-09T19:00:00Z"} }`.
Lijst: `{ "data":[...], "page":{"next_cursor":null}, "meta":{...} }`.
Fout: `{ "error":{"code":"QUOTE_STALE","message":"Koers onvoldoende actueel","details":{},"retryable":true},"meta":{"request_id":"uuid","server_time_utc":"..."}}`.
HTTP: 400 INVALID_INPUT; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND (ook voor niet-eigen resource om enumeratie te beperken); 409 VERSION_CONFLICT/DUPLICATE_IMPORT; 422 BUSINESS_RULE_VIOLATION/INSUFFICIENT_DATA; 429 RATE_LIMITED (+ Retry-After); 502 PROVIDER_FAILURE; 503 DATA_UNAVAILABLE; 504 PROVIDER_TIMEOUT. Errors tonen geen providerkeys, persoonlijke records of stacktraces.

## 3. Kernobjecten
### MarketQuote (read-only, providerafgeleid)
```json
{"symbol":"OPEN","venue":"NASDAQ","currency":"USD","last":"2.69","exchange_timestamp_utc":"2026-10-09T18:59:00Z","received_at_utc":"2026-10-09T18:59:02Z","source":"twelve_data","session":"REGULAR","delay_class":"UNKNOWN","delay_seconds":null,"quality_status":"UNVERIFIED","stale":true,"bid":null,"ask":null}
```
**Voorbeeldwaarden zijn synthetische fixtures, geen actuele koersen.** `session`: PREMARKET/REGULAR/AFTER_HOURS/CLOSED/UNKNOWN. `delay_class`: REALTIME/DELAYED/UNKNOWN; `quality_status`: VERIFIED/DEGRADED/UNVERIFIED/UNAVAILABLE. `stale` volgens per endpoint en sessie geconfigureerde TTL, niet uitsluitend ontvangen-tijd. Venue, sessie en timestamps bij cross-check vergelijkbaar maken.

### Candle
`{symbol,venue,interval:"5m"|"15m",start_utc,end_utc,open,high,low,close,volume,complete,source,session,quality_status}`; OHLC decimale strings, volume niet-negatief geheel getal. Alleen complete candles voor bevestigde signalen.

### ScanCandidate
`{symbol,signal_id,asof_utc,session,score,score_version,indicators:{vwap,rsi14,macd,macd_signal,rvol},liquidity:{spread_pct,volume},explanations:[],exclusion_reasons:[],quote_quality}`. Geen score als noodzakelijke inputs ontbreken; `score:null` en uitleg.

### LedgerEvent (eigen app-record)
`{id,account_id,type,trade_at_utc,symbol,quantity,unit_price,currency,fees,fx_rate_to_eur,external_ref,version}`; type BUY/SELL/DEPOSIT/WITHDRAWAL/FEE/FX_ADJUSTMENT/CORPORATE_ACTION. Eventmodel en verplichte velden **typeafhankelijk**; storting heeft geen symbol/quantity. `fx_rate_to_eur` is een decimale string met vastgelegde bron/timestamp of expliciete ontbrekende status. Geen stille FX-schatting.

### HoldingSnapshot
`{account_id,symbol,quantity,cost_basis_method,cost_basis_eur,market_value_eur,realized_pnl_eur,unrealized_pnl_eur,quote_asof_utc,fx_asof_utc,coverage_status}`. Snapshot is afgeleid van ledger en marktdata; geen tweede financiële waarheid.

### TradePlan
`{id,user_id,symbol,status,decision,entry_low,entry_high,stop,target1,target2,quantity,risk_eur,net_rr1,net_rr2,assumptions,quote_snapshot,created_at_utc,updated_at_utc,version}`. `decision`: BUY/HOLD/ROTATE/WAIT; `status`: DRAFT/ACTIVE/CLOSED/REVIEWED/CANCELLED. `quote_snapshot` bevat historische metadata en mag nooit als actuele quote worden getoond.

### Alert / Notification
Alert `{id,symbol,condition,threshold,channel,enabled,cooldown_seconds,last_triggered_at_utc,version}`; notification `{id,alert_id,triggered_at_utc,read_at_utc,reason,quote_snapshot,target_route}`. Alle IDs user-scoped.

## 4. Endpointcontracten (ontwerp, niet live)
| Methode | Pad | Doel / sleutelcontroles |
|---|---|---|
| GET | `/session` | authstatus, profiel zonder geheimen |
| GET/PATCH | `/settings` | locale, tijdzone, valuta, risicobudget; versiecheck |
| GET | `/market/status` | exchange calendar, sessie, next open/close, kalenderbron |
| GET | `/market/quotes?symbols=OPEN,ORCL` | max symbolen, source/timestamps/delay per symbool |
| GET | `/market/candles?symbol=OPEN&interval=5m&limit=100` | complete/incomplete candle en sessie |
| GET | `/radar?cursor=&limit=&session=` | filters, kandidaat, uitsluitreden, scan-asof |
| GET | `/radar/{signal_id}` | historische signalcontext; geen realtimeclaim |
| POST | `/analyzer/evaluate` | server-hercontrole quotes, entry/stop/targets, fees/FX en WAIT |
| GET | `/portfolio` | holdings/cash/coverage, op basis van ledger |
| GET | `/ledger/events` | eigen account, cursor, tijdsvolgorde |
| POST | `/ledger/events` | gevalideerd event, idempotency, audit |
| POST | `/imports/degiro/preview` | bestandsvalidatie, mapping, duplicate candidates, **geen mutatie** |
| POST | `/imports/degiro/commit` | preview-token + expliciete bevestiging, atomair/dedup |
| GET/POST | `/plans` | lijst / nieuw plan met servervalidatie en idempotency |
| GET/PATCH | `/plans/{id}` | eigen plan, version, toegestane statusovergangen |
| POST | `/plans/{id}/fills` | expliciete koppeling bestaande eigen ledger-events |
| GET/POST | `/alerts` | regels lezen/aanmaken, serverrechten en validatie |
| PATCH | `/alerts/{id}` | enabled/condition, version |
| GET | `/notifications` | cursor en unread_count |
| POST | `/notifications/{id}/read` | markeer gelezen, idempotent |
| GET | `/journal/stats` | sample size, definitie, data coverage; null bij onvoldoende input |
| GET | `/health` | niet-gevoelige service-health; geen keys/PII |

Alle GET-requests naar private data vereisen auth. Rate limiting op gebruiker/IP/providerbudget. Uploads: CSV maxgrootte, contenttype, rijlimiet en veilige parsing nog te beslissen; geen upload permanent opslaan zonder expliciet retentiebeleid.

## 5. Concrete request/response-fixtures
### Evaluate
`POST /api/v1/analyzer/evaluate`
```json
{"symbol":"OPEN","decision":"WAIT","entry_low":"2.65","entry_high":"2.70","stop":"2.55","target1":"2.90","target2":"3.05","compare_holding_id":null,"risk_budget_eur":"100.00"}
```
Response `data`: `{decision:"WAIT",trade_allowed:false,reason:"WAIT_SELECTED",quote:{...MarketQuote},sizing:null,net_rr1:null,net_rr2:null,assumptions:{fee_model_version:"pending",fx_status:"UNAVAILABLE"}}`. Voor BUY/ROTATE is `trade_allowed` alleen true na geldige, verse inputs en volledige servervalidatie; geen automatische order.
### Plan save
`POST /api/v1/plans` met `Idempotency-Key`, body `{evaluation_id:"uuid",decision:"WAIT",notes:"Wachten op bevestiging"}`; antwoord 201 met `plan.id`, `version:1`; herhaalde identieke key+body geeft hetzelfde plan, afwijkende body bij dezelfde key geeft 409.
### Import
`POST /imports/degiro/preview` retourneert `preview_token`, geldigheidsduur, rijen met `valid|duplicate|invalid`, samenvatting en expliciete waarschuwingen. `POST /commit` gebruikt token en idempotency key; alle gevalideerde records atomair of gespecificeerde gedeeltelijke import met volledige foutenlijst (besluit nog open; standaard **atomair**).
### Error
```json
{"error":{"code":"QUOTE_STALE","message":"De laatste koers is niet actueel genoeg voor een bevestigde trade.","details":{"symbol":"OPEN","last_exchange_timestamp_utc":"2026-10-09T17:00:00Z"},"retryable":true},"meta":{"request_id":"00000000-0000-4000-8000-000000000001","server_time_utc":"2026-10-09T19:00:00Z"}}
```

## 6. D1 relationeel schema (logisch; geen migratie uitgevoerd)
| Tabel | Sleutel / velden | Constraints en indexen |
|---|---|---|
| users | id, auth_subject, created_at | UNIQUE(auth_subject) |
| user_settings | user_id, timezone, display_currency, risk_budget_eur, version | PK(user_id), FK users |
| accounts | id, user_id, name, base_currency, margin_mode | INDEX(user_id,id) |
| ledger_events | id, user_id, account_id, type, trade_at_utc, symbol?, quantity?, unit_price?, currency, fees?, fx_rate_to_eur?, external_ref?, import_batch_id?, version | FK(account), CHECK type-specific in app + DB where feasible; UNIQUE(user_id,account_id,external_ref) when nonnull |
| import_batches | id, user_id, account_id, fingerprint, status, created_at | UNIQUE(user_id,account_id,fingerprint) |
| trade_plans | id, user_id, symbol, decision, status, terms_json, quote_snapshot_json, version, created_at, updated_at | INDEX(user_id,status,created_at) |
| plan_fill_links | id, user_id, plan_id, ledger_event_id, allocated_quantity | FK both; UNIQUE(user_id,plan_id,ledger_event_id); allocated quantity across plans <= fill quantity |
| journal_reviews | id, user_id, plan_id, notes, tags_json, reviewed_at, version | INDEX(user_id,plan_id) |
| alerts | id, user_id, symbol, condition, threshold, enabled, cooldown_seconds, last_triggered_at_utc, version | INDEX(user_id,enabled,symbol) |
| notifications | id, user_id, alert_id, trigger_key, quote_snapshot_json, read_at_utc, created_at | UNIQUE(user_id,trigger_key); INDEX(user_id,read_at_utc,created_at) |
| idempotency_records | user_id, key, route, request_hash, response_ref, expires_at | UNIQUE(user_id,key,route) |
| audit_events | id, user_id, entity_type, entity_id, action, at_utc, metadata_json | INDEX(user_id,at_utc) |

Providerquotes en candles: **geen permanente D1-opslag als uitgangspunt**; Worker-cache met sessieafhankelijke TTL en licentiecontrole. Gevoelige uploads/bijlagen pas na R2-retentie- en privacybesluit. Ledger-events bij voorkeur append-only met correctie-events in plaats van destructief wijzigen; corporate-action accounting en kostprijsmethode zijn open beslissingen.

## 7. Integriteit en security
1. Authenticated user wordt server-side afgeleid; alle SQL queries scoped met `WHERE user_id = ?`; FK naar account of plan ook op eigendom verifiëren.
2. Ledger import in D1-transactie/batch, met unique constraints en idempotency. Cash/holdings altijd reproduceerbaar uit ledger. Geen silent partial writes.
3. Optimistic locking `UPDATE ... WHERE version = ?`, anders 409; voor plan-fills atomaire allocatiecontrole.
4. Decimale rekenbibliotheek voor geld, FX en risicoberekening; afronding pas op expliciete grens; berekeningsversie opslaan.
5. Alerttrigger alleen op vergelijkbare marktdata, cooldown en unieke trigger_key; stale data levert geen alert.
6. Geen API-keys, raw tokens of PII in logs; versleuteling en backups/retentie nader vastleggen.
7. JSON schema-validation en max payload; CSV-injectie neutraliseren bij exports; rate limits en auditlogs.

## 8. Contracttestmatrix — ontworpen, NIET uitgevoerd
| ID | Contracttest | Verwachting |
|---|---|---|
| C01 | Private GET zonder sessie | 401, geen data |
| C02 | User A vraagt plan van B op | 404, geen lek |
| C03 | Zelfde Idempotency-Key twee maal | één ledger-event/plan |
| C04 | Zelfde key met andere body | 409 |
| C05 | Verouderde quote in Analyzer | 422 QUOTE_STALE of 503, geen trade_allowed |
| C06 | Provider 429 | gecontroleerde 429/503 + retry-info, geen oude liveclaim |
| C07 | Quote timestamps uit andere sessies | geen ongeldige cross-check |
| C08 | DEGIRO preview zonder commit | geen ledger-mutatie |
| C09 | Dubbele CSV import | nul extra events |
| C10 | Partial sell + FX + fees | reproduceerbare P&L met fixtures |
| C11 | Plan version mismatch | 409, geen overschrijving |
| C12 | Fill twee keer aan plannen toegewezen | allocatielimiet gehandhaafd |
| C13 | Alert stale feed | geen notification |
| C14 | Notification van andere user lezen | 404 |
| C15 | Foutresponses | request_id, geen secrets/stacktrace |
| C16 | Markt gesloten, quote nog recent ontvangen | sessie en vertraging afzonderlijk zichtbaar |
| C17 | Journal statistiek bij ontbrekende FX | null/coverage, geen gefingeerde R |
| C18 | Payload/CSV te groot | 413 of 422, geen mutatie |

## 9. Nog te besluiten vóór code/migraties
D01 authprovider en cookie/CSRF-model; D02 definitieve DEGIRO CSV-varianten, FIFO/average cost en margin; D03 provider-entitlements en quote-TTL per sessie; D04 FX-provider en historische conversie; D05 markturenbron; D06 risicobudget- en fees/slippage-regels; D07 alertkanalen; D08 upload- en auditretentie; D09 corporate actions en shortposities; D10 SLO, caching en budget. Pas na die keuzes OpenAPI 3.1 machineleesbaar vastleggen en SQL-migraties genereren.

## S02 review en exit
Interne consistentiecheck tegen S01: F01 ↔ session/settings/import; F02 ↔ quotes/radar/evaluate/plans; F03 ↔ ledger/portfolio/fills/stats; F04 ↔ alerts/notifications; F05 ↔ errors/auth/quality. **Resultaat: contracten op ontwerpniveau beschreven.** Geen claims over implementatie, provider-validatie, securityaudit of geslaagde tests. Stop hier voor review; volgende afzonderlijke stap is S03 provider-validatie.
