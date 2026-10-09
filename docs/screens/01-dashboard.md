# TradePilot Pro — Scherm 01: Dashboard
Versie 1.1 · 9 oktober 2026 · Status: ontwerp gereviewd, niet gebouwd
Bron: PRODUCT_DESIGN_DOCUMENT.md v0.2

## Doel en hiërarchie
Het dashboard beantwoordt binnen vijf seconden: (1) hoeveel kapitaal en risico heb ik, (2) hoe actueel zijn de gegevens, (3) wat verdient mijn aandacht, (4) wat is de volgende actie? Geen orderknoppen en geen niet-geverifieerde signalen.

## Exacte desktopcompositie
Viewport 1440×900 als ontwerpreferentie. Achtergrond #09111E. Linker vaste sidebar 232px, rechter inhoud met 32px padding en maximaal 1320px breedte. Topbar 72px hoog. Kolomgrid 12 kolommen met 16px gutters.

1. Sidebar: bovenaan vectorlogo 'TradePilot' met cyaan accent en klein monogram TP; daaronder subtitel 'PRO TRADING COCKPIT'. Navigatie verticaal met iconen en labels: LayoutDashboard 'Dashboard' actief, Wallet 'Portefeuille', Radar 'Radar', ChartNoAxesCombined 'Analyzer', NotebookPen 'Journal'. Actieve tab: #193249, 3px cyaan linkeraccent, tekst #EDF4FF. Onderaan instellingen (Settings) en versie.
2. Topbar: links eyebrow 'MARKTOVERZICHT' (11px uppercase), H1 'Dashboard' (28px semibold), daaronder actuele beursfase. Rechts statusbadge met bron en vertraging, RefreshCw 'Verversen', Bell 'Meldingen' met numerieke badge uitsluitend bij echte meldingen. Geen verzonnen avatar.
3. Eerste rij: vier gelijke KPI-kaarten met 18px radius, #111E30, 1px #243750, padding 20px, hoogte minimaal 132px: 'Portefeuillewaarde', 'Dagresultaat', 'Kapitaal onder risico', 'Beschikbare cash'. Label 12px, hoofdwaarde 26px tabular, ondersteunende bron/tijd 11px. EUR/USD-valutakeuze naast portefeuillewaarde; berekening alleen met bekende FX.
4. Tweede rij (7/5 kolommen): links 'Mijn posities' met ticker, aandelen, actuele koers, P&L, gewicht, minigrafiek en doorklik; rechts 'Risico & marktstatus' met concentratiebalk, ontbrekende koersen, beursfase, vertraging en eventuele waarschuwingen. Niet-geverifieerde data krijgt expliciete waarschuwing.
5. Derde rij volle breedte: 'Kansen voor 1–5 handelsdagen' maximaal drie kaarten naast elkaar. Elke kaart: ticker, bedrijfsnaam, setup-tag, liquiditeitsstatus, relatieve volume-indicatie, 5m/15m trend, entryzone, stop, doel 1/2, netto R/R, quote-tijdstempel en knop 'Analyseer'. Alleen tonen wanneer validatie compleet; anders empty state 'Nog geen bevestigde kansen'.
6. Vierde rij 6/6: links 'Watchlist' met 5–8 tickers en kwaliteitsbadge, rechts 'Recente handelsplannen' met status, datum en knop 'Open journal'.
7. Footer: compacte disclaimer 'Analyses zijn scenario’s, geen gegarandeerde uitkomsten' en link naar databeleid.

## Mobiel ontwerp
Breakpoint <=767px: sidebar verborgen, bovenbalk logo links en marktstatus/meldingen rechts; vijfdelige vaste bottomnav met icon + korte tekst, hoogte 64px plus safe-area; focus/touch targets >=44×44px. Scrollvolgorde: titel/status → KPI's 2×2 → risicoalerts → posities → kanskaarten verticaal → watchlist → journal. 320px breedte zonder horizontale pagina-overflow; tabellen worden kaarten. KPI-waarden mogen afbreken, nooit worden afgekapt zonder toegankelijke volledige waarde.

## Visuele taal en assets
Kleuren: canvas #09111E, panelen #111E30, border #243750, primaire tekst #EDF4FF, secundair #9FB2C9, accent #55C7ED, positief #5FDBAC, negatief #FF929E, waarschuwing #FFC38A. Systeemfont/Inter fallback; tabulaire cijfers. Iconen: consistente SVG-outline set (licentie controleren), 20px navigatie en 16px inline; geen emoji in productie. Geen stockfoto's, raketten of decoratieve beursgrafieken. Alleen echte sparklines met as/tijd/context; zonder koersdata toon 'Geen koersgrafiek beschikbaar'. Animaties beperkt tot 150–200ms subtiele overgangen; respecteer prefers-reduced-motion. Splash: TP-monogram op marineachtergrond, maximaal zolang echte app-initialisatie duurt; geen kunstmatige wachttijd.

## Knoppen en interactiecontract
- Sidebar/bottomnav: routewissel, URL en browsergeschiedenis synchroon; geselecteerde tab heeft aria-current=page.
- 'Verversen': loading spinner + disabled zolang verzoek loopt; laatste geslaagde refresh en foutmelding apart tonen; geen vals succes.
- KPI-kaart: opent detailpaneel met rekenbasis, valuta, laatste koersupdate; Escape sluit.
- Positierij: opent Portefeuille op gekozen ticker.
- 'Analyseer': opent Analyzer met vooraf ingevulde ticker en bronmetadata, nooit automatisch handelen.
- Meldingen: opent lijst met tijdstempel, ernst en dismiss; ongelezen teller alleen bij echte records.
- Watchlist-item: opent Radar-detail.
- Journal-item: opent geselecteerd plan.
- EUR/USD-switch: herberekent met koersbron en timestamp; bij ontbrekende FX geen fictieve conversie.
Alle acties krijgen hover, focus-visible, disabled, loading, success en error waar relevant. Destructieve acties bestaan niet op dashboard.

## Datacontract
Portfolio API levert per positie symbol, qty, cost_basis_usd, market_price, price_timestamp_utc, source, session, delay_status, currency, unrealized_pnl, weight en completeness. Dashboard summary levert equity, realized/unrealized, cash, fx_rate, fx_timestamp, risk_budget, valuation_coverage. Opportunities hebben symbol, setup, liquidity_filter_pass, timeframe_5m/15m, rvol, vwap, rsi, macd, entry, stop, target1/2, estimated_fees, rr_net, signal_timestamp en data_quality. Alle berekeningen moeten vanuit ledger of gevalideerde marketdata reproduceerbaar zijn. 'Live' alleen bij aantoonbare providerrechten en verse data; anders 'Vertraagd', 'Onbekend' of 'Niet beschikbaar'.

## Lege, gedeeltelijke en fouttoestanden
- Geen portefeuille: illustratie is eenvoudige vectorlijn van lege portefeuille, CTA 'Voeg transactie toe'.
- Geen marktfeed: banner 'Actuele marktgegevens niet beschikbaar'; portefeuille toont uitsluitend historische ledgercijfers; geen kansen.
- Gedeeltelijke dekking: 'Waarde gebaseerd op 3 van 5 posities' naast elke geaggregeerde waarde; geen misleidend totaal.
- Stale data: amber klokicoon, laatst bekende tijd en expliciete vertraging.
- Serverfout: begrijpelijke foutmelding + 'Opnieuw proberen', met request-id voor support.
- Geen bevestigde kansen: neutrale lege kaart, uitleg dat wachten valide uitkomst is.
- Laden: skeletons in werkelijke kaartvorm zonder pseudo-nummers.

## Review: ontwerp, quant, security, toegankelijkheid, QA
Design: informatiehiërarchie, 12-koloms grid, voldoende witruimte, consistente iconen en states. Quant: geen ranking op incomplete indicatoren, vergelijk alleen gelijke handelsperiode, FX apart. Security: API-keys uitsluitend Worker-side; geen gevoelige holdings in querystrings/logs; auth op elk portfolio-endpoint; outputescaping en CSP. Privacy: geen persoonlijke data in analytics; gegevens pas na authenticatie. Accessibility: WCAG 2.2 AA doel, toetsenbord, zichtbare focus, contrastmetingen, semantische tabellen en tekstalternatieven voor sparklines. Performance: skeleton binnen 200ms waar mogelijk, caching met expliciete TTL, geen stalen feed als actueel labelen.

## Acceptatiecriteria voor implementatie
D01 alle zeven dashboardzones op 1440px en 375px volgens ontwerp; D02 navigatie vijf tabs en browser-back/forward werkt; D03 320px geen horizontale overflow; D04 elk icoon is gelabeld en alle acties toetsenbordbedienbaar; D05 KPI's zijn ledger-consistent en onvolledige waarderingen herkenbaar; D06 elke quote toont bron, tijd, sessie en vertraging; D07 feed-failure/stale/empty/loading getest; D08 opportunities uitsluitend na alle filters; D09 securitychecks auth, XSS en secret-scan groen; D10 iOS/Android/desktop screenshotreview en WCAG-check uitgevoerd. Ontwerp-review is geen implementatiebewijs.

## Open punten vóór code
Definitieve logo-SVG, licentie iconenset, auth-oplossing, provider-entitlements, risk-budget-default en datavertragingsdrempels moeten voor de relevante implementatiestap worden vastgesteld. Geen andere schermen in deze iteratie.

## UX-flow review v1.1 — formele schermlogica (9 oktober 2026)
**Scope:** uitsluitend Dashboard. **Status:** ontwerpcontrole, geen gebruikerstest of browservalidatie.

### Primaire gebruikersreis en beslisboom
| Stap | Trigger | Voorwaarde | Systeemactie | Zichtbare uitkomst | Vervolg |
|---|---|---|---|---|---|
| F01 | /dashboard openen | onbekende sessie | sessiestatus controleren | neutrale skeleton zonder privégegevens | F02/F03 |
| F02 | sessie geldig | auth OK | ledger en voorkeuren laden; marktdata parallel ophalen | KPI's met kwaliteitslabels | F04 |
| F03 | sessie ongeldig | auth 401 | geen holdings tonen; naar login met veilige return-route | 'Log in om je portefeuille te bekijken' | na login F02 |
| F04 | ledger leeg | geen transacties | geen nulrendement als bewezen P&L tonen | onboardingkaart '+ Transactie' | Portfolio |
| F05 | ledger gevuld | prijs/FX compleet | KPI's en risico berekenen | volledige portefeuillewaarde, timestamp | F08 |
| F06 | ledger gevuld | gedeeltelijke quotes of FX | alleen aantoonbaar berekenbare deelresultaten tonen | 'Gedeeltelijke waardering' + dekking | F08 |
| F07 | ledger geladen | feed offline/timeout | ledger zichtbaar houden; scanner onderdrukken | amber status + 'Opnieuw proberen' | F08 |
| F08 | portefeuille beoordeeld | risico-alert aanwezig | waarschuwing vóór kansen plaatsen | concentratie-/risicokaart | F09 |
| F09 | marktdata valide | scannerresultaten compleet | maximaal 3 kansen rangschikken | kaarten met bron, entry, stop, targets | F10 |
| F10 | gebruiker kiest kans | kandidaat valide | ticker, bron en sessiecontext meegeven | Analyzer met vergelijkingsscenario | analyzer |
| F11 | gebruiker kiest wachten | geen overtuigende kans | geen handelsdruk of fictieve score | 'Geen bevestigde kansen; wachten is mogelijk' | Dashboard |
| F12 | gebruiker kiest positie | holdings aanwezig | gekozen ticker in route-state doorgeven | Portfolio-detail | Portfolio |
| F13 | gebruiker opent journal | plan bestaat | journal-id autoriseren | handelsplan | Journal |

**Prioriteit bij gelijktijdige problemen:** autorisatiefout > privacy/gegevensisolatie > ledgerfout > feedstoring > ontbrekende FX > ontbrekende scanner. Kritieke risicoalerts staan vóór kansen. Beurs gesloten is geen storing; toon laatst bekende quote met correcte sessie en tijd. Premarket/after-hours niet als reguliere sessie labelen.

### Scenario's die afzonderlijk getest moeten worden
1. Eerste bezoek, nog niet ingelogd → geen portefeuilledata in HTML, cache of browserconsole.
2. Ingelogd, geen transacties → onboarding, geen fictieve portefeuillewaarde.
3. OPEN is enige positie, koers vers → één positie en expliciete concentratie; niet automatisch verkoop aanraden.
4. OPEN en andere posities, één koers ontbreekt → dekking 'x van y', geen schijnbaar volledig totaal.
5. Twelve Data rate-limit 429 → bestaande historische informatie behouden met 'niet actueel'; retry met backoff, geen refresh-loop.
6. Provider levert tijdstempel zonder duidelijke vertraging → label 'Vertraging onbekend', niet 'Live'.
7. NYSE/Nasdaq gesloten → 'Gesloten' en tijd laatste reguliere/extended quote; geen nieuwe intraday-confirmatie claimen.
8. FX-feed ontbreekt → USD tonen, EUR niet berekenen, uitleg naast toggle.
9. Scanner geen kandidaat → neutrale wachtboodschap zonder lege pseudo-kaarten.
10. API geeft 403 op portfolio → geen gegevens tonen; foutmelding en veilige herstelroute.
11. Gebruiker klikt snel meermaals op Verversen → één actief verzoek, geen dubbele updates.
12. Gebruiker navigeert weg tijdens verzoek → late respons overschrijft geen nieuwe pagina of data.
13. Keyboard-only → alle acties bereikbaar, focus behouden na modal sluiten.
14. Browser terug/vooruit → actieve tab en geselecteerde context consistent.
15. Klein scherm 320px en zoom 200% → geen onbereikbare CTA's of overlappende bottomnav.

### Informatiearchitectuur: waarom deze volgorde?
A. **Vertrouwen:** bovenaan beursfase en datakwaliteit; anders lijken vertraagde prijzen actueel.
B. **Bezittingen:** portefeuillewaarde en cash vóór kansen; gebruiker moet eerst weten waar hij staat.
C. **Risico:** concentratie, exposure en feedproblemen vóór nieuwe ideeën; voorkomt impulsieve rotatie.
D. **Ontdekking:** alleen valide kansen; maximale drie om informatie-overbelasting te vermijden.
E. **Actie:** analyseren, niet handelen; tradeplan pas na scenario- en kostenanalyse.
F. **Reflectie:** journal is zichtbaar als terugkoppeling, maar verdringt risicoinformatie niet.

### Toestandsmachine
`INIT -> AUTH_CHECK -> {UNAUTHENTICATED | LEDGER_LOADING}`
`LEDGER_LOADING -> {EMPTY | LEDGER_ERROR | LEDGER_READY}`
`LEDGER_READY -> {MARKET_READY | MARKET_PARTIAL | MARKET_UNAVAILABLE}`
`MARKET_READY -> {SCANNER_READY | SCANNER_EMPTY | SCANNER_ERROR}`
`REFRESHING -> {UPDATED | REFRESH_FAILED}`
Bij iedere toestand zijn loading, aria-live melding, herstelactie en toegestane navigatie expliciet. Marktdatafouten mogen nooit het transactieboek wissen.

### Acceptatie: flow-specifieke gates
- UX01 alle F01–F13 routes hebben wireframe-state en verwacht resultaat.
- UX02 alle 15 scenario's zijn opgenomen in testcases; tests worden pas als geslaagd gemarkeerd na uitvoering.
- UX03 onbevoegde gebruiker ziet nergens holdings of eerdere sessiegegevens.
- UX04 elke niet-actuele waarde heeft zichtbaar bron/tijd/kwaliteitslabel.
- UX05 gebruiker kan vanuit dashboard in maximaal twee interacties een positie of kans analyseren.
- UX06 het 'wachten'-scenario is gelijkwaardig zichtbaar, zonder koopdruk.
- UX07 schermvolgorde mobiel bewaart prioriteit: marktkwaliteit → bezittingen → risico → kansen.
- UX08 geen navigatie of modal verliest toetsenbordfocus of blokkeert back/forward.

### Reviewbevindingen en status
- **Opgelost in specificatie:** expliciete login/lege portefeuille/partiële data/feeduitval/gesloten beurs; routing en retrygedrag; prioritering van risico boven kansen.
- **Nog niet gevalideerd:** echte API-responsecontracten, auth-keuze, datalicentie, implementatie van statusmachine, usabilitytest met echte gebruikers, toegankelijkheidsaudit en browser-E2E.
- **Besluit:** Dashboard v1.1 is gereed als implementatiespecificatie voor UX-flow; niet vrijgegeven als werkende of geteste app.
