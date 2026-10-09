# TradePilot Pro — Data-integratie- en bronmatrix v1.0
Datum: 2026-10-09. Status: ontwerpcontract; koppelingen en datarechten niet gevalideerd; geen werkende implementatie aangetoond.

## Principes
- Twelve Data = beoogde primaire marktdata-provider; Stocktwits = aanvullende sentiment-/cross-checkbron, **geen automatische fallback voor betrouwbare exchange quotes**.
- Webull = externe visuele referentie; geen veronderstelde API-integratie.
- DEGIRO = uitvoerende broker buiten de app; geen broker-API of automatische sync veronderstellen.
- Persoonlijke holdings, transacties, cash, kostprijs, alerts en journal zijn eigen geautoriseerde app-records; niet afleiden uit sentimentfeeds.
- Elke koers heeft source, symbol, venue, currency, exchange_timestamp_utc, received_at_utc, session, delay_class (realtime/delayed/unknown), quality_status; bij conflicten alleen vergelijkbare timestamps en handelssessies vergelijken.
- Providerkeys server-side, geen browser exposure. Licenties, limieten, endpointbeschikbaarheid en marktdekking vóór implementatie controleren.

## Per scherm
| Scherm / functie | Gegeven | Voorgestelde bron | Backendcontract (ontwerp, niet bestaand) | Validatie / foutgedrag |
|---|---|---|---|---|
| Dashboard | Waarde, P/L, cash, concentratie | Eigen ledger + geverifieerde Twelve Data quotes + FX | GET /api/dashboard/summary | Incomplete quotes/FX expliciet, geen fictieve P/L |
| Dashboard | Marktstatus | NYSE/Nasdaq handelskalender + America/New_York timezone | GET /api/market/session | DST, feestdagen, early close, onbekend |
| Dashboard | Kansenpreview | Eigen screener uit marktdata | GET /api/opportunities?limit=... | Geen signalen zonder verse, toereikende data |
| Dashboard | Watchlist | Eigen watchlist + quotes | GET /api/watchlist | Quotes afzonderlijk gedateerd |
| Portfolio | Posities, kosten, gerealiseerde P/L | Eigen geautoriseerde ledger; handmatige invoer/import pas na validatie | GET/POST/PATCH /api/portfolio/... | Kosten, valuta, corporate actions, FIFO/average-cost beleid nog te beslissen |
| Opportunity Radar | Universe, momentum, RVOL, liquiditeit, setups | Twelve Data waar datarechten/endpoint dekking volstaan; eigen berekening | GET /api/opportunities | RVOL vereist passende referentiehistorie; spread vereist bid/ask; geen score bij ontbrekende velden |
| Trade Analyzer | 5m/15m OHLCV, volume, VWAP, RSI, MACD | Twelve Data candles + eigen indicatorberekening of geverifieerde providerindicatoren | GET /api/market/candles; GET /api/analysis/:symbol | Controleer corporate actions, sessie, tijdzone, latency en indicatorparameters |
| Trade Analyzer | Sentiment en secundaire koerscheck | Stocktwits waar werkelijk toegankelijk | GET /api/sentiment/:symbol | Social sentiment niet presenteren als exchange-confirmatie |
| Trade Analyzer | Entry, stop, targets, netto R:R | Eigen berekening met quotes, fees, slippage, FX | POST /api/trade-plans; GET /api/trade-plans/... | Geen advies of doel zonder aannames en invalidatie |
| Trade Journal | Trades, notities, statistieken | Eigen database; optionele handmatige DEGIRO-import | GET/POST/PATCH /api/journal/... | Brokerimport niet als live sync voorstellen |
| Search | Ticker/naam/venue | Gevalideerde symbolenzoekfunctie van provider of eigen symbolencatalogus | GET /api/search?q=... | Debounce, geen resultaten, rate-limit, symbol disambiguation |
| Meldingen | Ongelezen status, notificatiehistorie | Eigen database | GET /api/notifications | User-scoped, geen demo-meldingen |
| Alerts | Regels en triggers | Eigen DB + server-side worker + gekwalificeerde koersfeed | /api/alerts/... | Worker moet draaien zonder open browser; deduplicatie; delayed data gelabeld |
| Instellingen | Voorkeuren, tijdzone, meldingskanalen | Eigen gebruikersprofiel | /api/preferences/... | Persistent; browser push alleen bij ondersteunde infrastructuur |
| Alle schermen | USD/EUR | Valutaprovider nog te selecteren en verifiëren | GET /api/fx?pair=USD_EUR | Tijdstempel en eventuele vertraging; bij uitval geen verzonnen EUR |
| Alle schermen | Auth/session | Authprovider/implementatie nog te beslissen | /api/auth/... | Server-side autorisatie op alle private endpoints |

## Integratiearchitectuur
UI → geautoriseerde eigen API (Cloudflare Worker voorgesteld) → provideradapters (Twelve Data, Stocktwits, later FX/calendar) en gebruikersdatabase. Centrale normalisatie/validatie en caching met expliciete TTL. Providerfouten 429/5xx, timeouts, licentiebeperkingen en staleness zichtbaar; geen stille bronwissel.

## Nog te verifiëren vóór bouwen
1. Werkelijke Twelve Data en Stocktwits accounttoegang, concrete endpoints, limieten, licenties, realtime-/extended-hours-dekking, symbol universe en vertraging.
2. Geschiktheid van beschikbare candle-/volume-/bid-askdata voor 5m/15m, RVOL, VWAP, spread en scanner op schaal.
3. FX-provider en beurskalender-provider selecteren; API-contract en fallback testen.
4. Authenticatiekeuze, database, beveiliging, hosting, opslag en kostenraming.
5. DEGIRO importformaat en accountingmethode; geen API-sync aannemen.
6. Browser push: toestemming, service worker, serverlevering en operationele kosten.
7. Contracttests met echte responses, vergelijking tijdstempels en sessies, fouten, rate limits en beveiliging.
8. Geen status 'gebouwd' of 'getest' totdat werkende code en testresultaten bestaan.
