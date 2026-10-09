# TradePilot Pro — Product Design Document
Version: 0.2 · 9 oktober 2026 · Status: multidisciplinair gereviewd ontwerp, nog niet geïmplementeerd

## Productdoel
Een premium, Nederlandstalige, responsive trading cockpit voor Amerikaanse aandelen, gericht op beslissingen met een horizon van 1–5 handelsdagen. Het product analyseert kansen, voert zelf geen orders uit en belooft geen rendement. DEGIRO is de handelsomgeving; Webull dient als externe grafiekreferentie.

## Ontwerpprincipes
- Premium dark fintech; helder, rustig, snel en mobiel bruikbaar.
- Geen verzonnen livekoersen, signalen, volumes of winstcijfers.
- Elke koers toont bron, beursfase, tijdstempel, valuta en realtime/vertraagd-status.
- Nooit een trade zonder zichtbare invalidatie, kosten en risico.
- Vijf afzonderlijke navigatietabs; nooit één lange pagina met alle schermen.

## Navigatie en schermen
### 1. Dashboard
Portefeuillewaarde, dagverandering, gerealiseerd/ongerealiseerd resultaat, beschikbare cash, OPEN-exposure, marktstatus, alerts en maximaal drie onderbouwde kansen. Acties: verversen, positie openen, kans vergelijken, alert bekijken.

### 2. Portfolio
Transactieboek (koop/verkoop, aantal, uitvoeringsprijs, kosten, datum), gewogen kostprijs, posities, cash, USD/EUR-conversie, performance en concentratierisico. Acties: transactie toevoegen/bewerken/verwijderen, CSV importeren/exporteren, back-up maken, positie analyseren. Waarschuw bij negatieve positie en ongeldige transactievolgorde.

### 3. Opportunity Radar
Scan liquide Amerikaanse aandelen; sorteer op momentum, relatief volume, spread, koersruimte en risicorendement. Filters: prijs, volume, sector, marktkapitalisatie, handelsfase, setup. 5- en 15-minutenkaarten met VWAP, RSI, MACD en duidelijke signalen. Acties: watchlist, details, vergelijken met OPEN, alert instellen. Geen score bij onvoldoende of verouderde data.

### 4. Trade Analyzer
Tickervergelijking met bestaande positie (standaard OPEN indien aanwezig). Instapzone, stop, doelen 1/2, potentieel rendement, risico/rendement, positieomvang, orderkosten, FX en scenario 'niets doen'. Berekeningen tonen aannames en markeren handmatige invoer. Acties: scenario opslaan, handelsplan maken.

### 5. Trade Journal
Handelsidee, thesis, setup, geplande instap/stop/doelen, daadwerkelijke uitvoering, resultaat, screenshots/links, evaluatie en statistiek. Acties: maken, bewerken, afsluiten, filteren en exporteren.

## Visual design system
- Achtergrond: diep marineblauw #09111E; panelen #111E30; borders #243750.
- Accent: helder cyaan #55C7ED; positief #5FDBAC; negatief #FF929E.
- Typografie: system-ui/Inter-achtig; tabulaire cijfers; duidelijke hiërarchie.
- Iconen: één consistente SVG-iconenset; iconen nooit als enige betekenisdrager.
- Desktop: zijbalk met vijf tabs, hoofdgebied met kaarten en tabellen.
- Mobiel: vaste onderste navigatie met vijf items, horizontaal scrollbare tabellen waar nodig, touch targets >=44px.
- Splash/loading: TradePilot-woordmerk en subtiele voortgang; skeletons bij netwerkverzoeken; duidelijke fout- en lege toestanden.
- Grafieken: tijdas, prijsas, volume, VWAP en indicatorpaneel; toegankelijke tooltips.
- Interacties: toetsenbordfocus, bevestiging bij destructieve acties, undo waar mogelijk, duidelijke succes/foutmeldingen.

## Data en architectuur
- Frontend: semantische, toegankelijke webapp; aparte views en gedeelde componenten.
- Backend: Cloudflare Worker; API-sleutels uitsluitend server-side.
- Opslag: Cloudflare D1 met gebruikersisolatie, migraties en herstel/export.
- Marktdata: Twelve Data als primaire feed, Stocktwits als aanvullende koers-/sentimentcontrole; registreer bron, timestamp, delay en handelsfase. Providerlimieten en datalicenties respecteren.
- Beveiliging: authenticatie, autorisatie per gebruiker, invoervalidatie, rate limiting, audit logging, geen geheimen in GitHub of browser.
- Performance: caching met expliciete TTL; geen oude cache presenteren als live.

## Functionele acceptatiecriteria
1. Alle vijf tabs werken onafhankelijk op desktop en mobiel, inclusief browsernavigatie.
2. Portfolio- en FX-berekeningen zijn reproduceerbaar getest; import/export rondreis slaagt.
3. Livefeed toont aantoonbaar actuele timestamp, beursfase en vertraging; fouten worden zichtbaar afgehandeld.
4. Scanner berekent indicatoren op echte 5-/15-minutenkaarsen; tests vergelijken referentiedatasets.
5. Analyzer toont consistente entry/stop/targets, netto kosten en R/R; ontbrekende input blokkeert misleidende uitkomst.
6. Auth en D1 scheiden gegevens per gebruiker; geheimen blijven server-side.
7. Browser- en mobiele regressietests slagen; geen consolefouten in kritieke flows.
8. Deployment wordt gecontroleerd via de publieke URL; pas daarna label 'release'.

## Iteraties en definitie van klaar
I01: designsystem + vijf werkende tabs en responsive navigatie.
I02: portefeuille, transacties, export/import en tests.
I03: veilige Worker, auth, D1 en migraties.
I04: Twelve Data-connector, timestamp/delay en fallbackstatus.
I05: 5-/15-minutenindicatoren en radar met echte data.
I06: analyzer, rotatiescenario en FX/kosten.
I07: journal, alerts en afwerking.
I08: toegankelijkheid, beveiligingsreview, E2E, performance en release.
Elke iteratie eindigt met commit, aantoonbare tests, bijgewerkt changelog en een expliciete pass/fail-checklist.

## Buiten scope van eerste release
Automatische orderuitvoering, winstgaranties, AI-handelsbeslissingen en brokerrekening-synchronisatie zonder ondersteunde veilige integratie.

## Open ontwerpbeslissingen
Definitieve branding/illustratiestijl, accountloginmethode, datalicenties en de concrete beschikbare API-endpoints worden vóór hun betreffende iteratie gevalideerd.

## Multidisciplinaire review — v0.2 (ontwerpcontrole, geen externe audit)
Beoordeeld vanuit productmanagement, UX/UI, frontend, backend, marktdata, quant/trading, beveiliging, privacy, toegankelijkheid, QA, DevOps en operationeel beheer. Dit is een analytische review van de specificatie, niet een bevestiging dat onafhankelijke experts of automatische tests zijn uitgevoerd.

### Kritieke bevindingen en vereiste wijzigingen
| Prioriteit | Invalshoek | Bevinding | Besluit / acceptatie |
|---|---|---|---|
| P0 | Marktdata | 'Realtime' is niet gegarandeerd door een providernaam | Toon exchange timestamp, ontvangsttijd, provider, entitlement, vertraging en sessie; label onbekend expliciet. |
| P0 | Quant | Intraday-indicatoren zijn onvoldoende gespecificeerd | Leg candles, timezone, regular/extended-hours, corporate actions, warm-up, nulvolume en formules vast. |
| P0 | Trading | Scanner kan illiquide movers overwaarderen | Minimum dollarvolume, spread, prijsgap en slippagefilters; geen trade score bij ontbrekende inputs. |
| P0 | Security | 'Gebruikersisolatie' zonder autorisatiemodel is onvoldoende | Per-request identity, object-level authorization, least privilege, CSRF/XSS/CSP, secrets, rate limits en audit. |
| P0 | Portfolio | Gewogen gemiddelde kostprijs alleen dekt FX en gerealiseerd P&L niet | Leg cashflow-, kosten-, FX- en corporate-actionbeleid vast; reproduceerbare ledger. |
| P0 | QA | 'Getest' heeft geen meetbare exitcriteria | CI-gates, unit/integration/E2E, browsermatrix, toegankelijkheid, security en rollback-test. |
| P1 | UX | Mobiele vijf-tabnavigatie kan te krap zijn | 44px targets, korte labels, iconen met tekst, safe-area en 320px breedte testen. |
| P1 | Privacy | Bewaartermijn en verwijdering ontbreken | Data-export, accountverwijdering, retentie, logredactie en privacyverklaring. |
| P1 | Operations | Geen incident- en observabilitybeleid | Healthchecks, foutbudget, logging zonder persoonsgegevens, alerting, backups en hersteltest. |
| P1 | Product | Geen expliciete 'niet handelen'-uitkomst | Wachten is een volwaardige analyse-uitkomst met reden en ontbrekende bevestigingen. |

### Marktdata-contract
Een koersrecord bevat minimaal: ticker, exchange, currency, price, bid/ask indien beschikbaar, volume, exchange_timestamp_utc, received_at_utc, source, session (premarket/regular/afterhours/closed), freshness_seconds, delay_class (realtime/delayed/unknown), quality_status en error_code. De UI mag een onbekende vertraging nooit 'live' noemen. Bij discrepantie tussen bronnen: vergelijk dezelfde beursfase en timestamp, kies de aantoonbaar meest betrouwbare recente waarneming en toon conflict. Een ontbrekende feed wordt niet stilzwijgend vervangen door handmatige data.

### Scanner en indicator-specificatie
Gebruik 5m en 15m OHLCV, inclusief exchange timezone America/New_York en expliciete instelling voor extended hours. VWAP = som(typical_price × volume) / som(volume) per gekozen sessie; typical_price=(high+low+close)/3. RSI(14) met vastgelegde Wilder smoothing; MACD(12,26,9) op slotkoersen met EMA en warm-up. Relatief volume moet worden vergeleken met historisch volume voor hetzelfde tijdstip/sessie; definieer lookback en toon 'onvoldoende historie' indien nodig. Volume=0, ontbrekende candles, splits en trading halts blokkeren of degraderen signalen. Rangschikking is uitlegbaar en mag geen gegarandeerde verwachting suggereren.

### Risico-engine
Long trade: risico per aandeel = entry - stop, bruto reward = target - entry; valideer stop < entry < target. Bereken netto R/R met geschatte fees, spread, slippage en FX. Toon positieomvang op basis van maximaal toegestaan account-risico, maar bied geen orderuitvoering. Vergelijk 'OPEN behouden', 'gedeeltelijk roteren' en 'cash/wachten' met dezelfde koersperiode. Stop-loss is niet gegarandeerd; bij gaps kan verlies groter zijn. Geen score wanneer een essentiële aanname ontbreekt.

### Portfolio ledger en valutabeleid
Transacties zijn immutable gebeurtenissen; correcties gebeuren met een expliciete tegenboeking of versiehistorie. Leg ordertijd UTC, settlement/handelsdatum, ticker, instrument-ID indien mogelijk, side, hoeveelheid, execution price, valuta, fees en FX-koers vast. Scheid gerealiseerd P&L, ongerealiseerd P&L, stortingen/opnames, dividend en valuta-effect. Definieer kostprijsmethode en maak import deduplicerend met preview. Toon nooit een totale portefeuillewaarde wanneer een deel van de posities geen betrouwbare koers heeft zonder duidelijke 'gedeeltelijk'-markering.

### Schermgedrag en componentinventaris
**Globaal:** logo, actieve tab, marktstatus, bron-/versheidbadge, verversen, instellingen, toegankelijk foutscherm, skeleton en lege toestand.
**Dashboard:** vier KPI-kaarten, marktstatus, posities, drie radar-kandidaten, alerts; elke kaart heeft klikdoel, timestamp en data-qualitylabel.
**Portfolio:** positiekaart, transactietabel, formulier/drawer, CSV-preview, bevestigingsdialoog, kosten/FX-uitleg en export.
**Radar:** filterbar, sorteerknoppen, kandidatenrijen, score-uitleg, mini-chart, detaildrawer, watchlisttoggle en fout-/stale-badge.
**Analyzer:** twee-aandelenvergelijking, invoervelden, R/R-visualisatie, netto kosten, ongeldigverklaring, wachten-scenario en journal-actie.
**Journal:** lijst, zoek/filter, detail, editor, status, bijlagenreferenties en resultaatgrafiek.
Elke actie krijgt toestanden default/hover/focus/disabled/loading/success/error. Geen decoratieve knop zonder werkende functie.

### Toegankelijkheid en responsiviteit
WCAG 2.2 AA als doel: toetsenbordbediening, zichtbare focus, labels, screenreader-live-regio's, voldoende contrast, geen kleur als enige informatiedrager, reduced-motion, zoom 200%, touch 44×44px. Test 320, 375, 768, 1024 en 1440px en gangbare iOS/Android/desktopbrowsers.

### Security/privacy/operatie
Gebruik server-side API-proxy; nooit providerkeys in frontend, repo of logs. Session cookies Secure/HttpOnly/SameSite; CSRF-bescherming bij mutaties; strikte CORS en CSP; inputvalidatie en outputescaping; D1 queries met parameters en user-scoped predicates. Scheid development/staging/production secrets en databases. Documenteer backupfrequentie, RPO/RTO, monitoring, migratie-rollback en incidentprocedure. Geen echte persoonsgegevens in testfixtures.

### Verifieerbare release-gates
G1 Design: alle vijf flows als wireframe plus interactieve states goedgekeurd.
G2 Functioneel: elke knop heeft gedrag; 0 P0/P1 bugs; unit-tests groen.
G3 Data: quotes/indicatoren met bron, tijdstempel en delay; referentietests en foutinjectie geslaagd.
G4 Security: object-level access-tests, secret scan, auth-tests en dependency scan groen.
G5 UX: toetsenbord, mobiel, toegankelijkheid en browser-E2E groen.
G6 Ops: staging deploy, rollback, backup/restore en monitoring gecontroleerd.
G7 Release: productie-URL handmatig gecontroleerd, release-tag en changelog vastgelegd.

### Iteratievolgorde bijgesteld
I00: productdocument, review, open beslissingen en visuele wireframes.
I01: design tokens, iconenset, alle vijf navigatieschermen, interactiestaten en mobiele layout.
I02: ledger, portfolio, FX, import/export met tests.
I03: authenticatie, D1, user-isolatie, migraties en securitytests.
I04: Twelve Data via Worker, metadata/vertraging, bronvergelijking waar mogelijk.
I05: 5m/15m indicatoren, volume, kwaliteitsfilters en uitlegbare radar.
I06: analyzer, risicobudget, OPEN-rotatie en wachten-scenario.
I07: journal, alerts, polish, loading/error/empty states.
I08: volledige regressie, toegankelijkheid, security, operations en gecontroleerde release.

### Nog te besluiten vóór implementatie
Loginmethode, providerlicenties/quotas, welke beurzen/extended-hours worden ondersteund, portfolio-importformaten, kostprijsmethode, backup/retentie en definitieve visuele assets. Totdat die keuzes bevestigd zijn, worden aannames zichtbaar gedocumenteerd.
