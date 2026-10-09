# TradePilot Pro — Scherm 01: Dashboard
Versie 1.0 · 9 oktober 2026 · Status: ontwerp gereviewd, niet gebouwd
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
