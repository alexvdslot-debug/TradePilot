# TradePilot Pro — Product Design Document
Version: 0.1 · 9 oktober 2026 · Status: ontwerp, nog niet geïmplementeerd

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
