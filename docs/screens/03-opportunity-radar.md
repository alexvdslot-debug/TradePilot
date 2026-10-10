# TradePilot Pro — Scherm 03: Opportunity Radar

> Current implementation verification: see [final conformance register](../FINAL_CONFORMANCE.md). Original version/status below records the design review. Light main screens and dark splash follow [DESIGN_BASELINE_V1](../DESIGN_BASELINE_V1.md); older dark-sidebar compositions are superseded. User-approved final completion is being audited and tested; do not infer implementation from this specification.

**Versie 1.0 · 9 oktober 2026 · Status: multidisciplinair gereviewde specificatie; niet gebouwd of visueel getest.**
Gebaseerd op [PDD](../PRODUCT_DESIGN_DOCUMENT.md), [Dashboard](01-dashboard.md) en [Portfolio](02-portfolio.md).

## 1. Productdoel en prioriteit
Opportunity Radar identificeert **controleerbare, liquide Amerikaanse aandelen met 1–5-daags handelspotentieel** en vergelijkt ze met bestaande posities (waaronder OPEN). De kernvraag is niet 'wat stijgt het hardst?' maar 'welk scenario biedt na kosten en risico een onderbouwde kans, en wanneer is wachten beter?' Geen kooporders, gegarandeerde winst of fictieve scores.

## 2. Desktop: visuele specificatie
1440×900 referentie; 232px sidebar, 72px topbar, 12-koloms grid (16px gutters), 24–32px contentpadding, maximaal 1440px contentbreedte. Kleuren canvas #09111E, surface #111E30, border #243750, primary #EDF4FF, secondary #9FB2C9, cyan #55C7ED, positive #5FDBAC, negative #FF929E, warning #FFC38A. Font Inter/system-ui, tabular-nums; cards radius 18px, buttons 10px.

```text
┌ Sidebar ┐ ┌ RADAR / Opportunity Radar   [Sessie] [Laatste scan] [Verversen] ┐
│ Dash    │ ├ Zoeken [ticker...] [Filters] [Universum] [Sorteren]             ┤
│ Port    │ │ Datakwaliteit | Marktbreedte | Aantal valide setups | Alerts     │
│ Radar ● │ ├────────────────────────────────┬────────────────────────────────┤
│ Analyze │ │ Kandidatenlijst / rangschikking │ Geselecteerde kandidaat         │
│ Journal │ │ Ticker / setup / RVOL / spread  │ Ticker + prijs + bron + tijd     │
│         │ │ momentum / score / liquiditeit │ [5m][15m] candlesticks + volume│
│         │ │                                │ VWAP / RSI / MACD               │
│         │ │                                │ thesis / invalidatie / risico   │
│         │ ├────────────────────────────────┴────────────────────────────────┤
│         │ │ [Vergelijk met OPEN] [Naar Analyzer] [Watchlist] [Alert]          │
└─────────┘ └─────────────────────────────────────────────────────────────────┘
```

### Navigatie en header
Sidebar met consistente outline SVG's: LayoutDashboard, Wallet, Radar (actief: cyaan linkerlijn 3px, donkerblauwe highlight), ChartNoAxesCombined, NotebookPen. Topbar eyebrow 'MARKTSCAN', H1 'Opportunity Radar' 28px, subtitel 'Bevestigde setups · 1–5 handelsdagen'. Rechts beursfase, provider-/vertragingbadge en RefreshCw 'Scan vernieuwen'. Laatste scan als exact tijdstip in ET en lokale tijd op hover. Geen label 'live' zonder geverifieerde entitlement.

### Filterbalk
Search-input 'Ticker of bedrijfsnaam', select 'Universum: US equities', filters SlidersHorizontal: koersrange, gemiddelde dollarvolume, spread %, market cap, sector, beursfase, setup (breakout/pullback/reversal), relatieve sterkte versus SPY. Sortering: 'Datakwaliteit', 'Risico/rendement', 'Relatief volume', 'Momentum'; standaard **Datakwaliteit eerst, daarna setupkwaliteit**. Actieve filterchips met X, 'Filters wissen'. Filters zijn in URL queryparameters deelbaar, zonder privéportefeuilledata.

### Marktoverzicht
Vier kleine statuskaarten: beursfase (Regular/Premarket/After-hours/Closed), datadekking (x/y kandidaten met verse quotes), gevalideerde setups (aantal), scanmoment + provider. Amber waarschuwing wanneer scan vertraagd, stale of gedeeltelijk is. Geen misleidende percentages op kleine steekproeven.

### Kandidatenlijst (5/12 kolommen)
Desktop tabel met rijen min 64px: ticker+naam, setup-badge, koers+timestamp, RVOL, spread, 5m/15m trendpijlen met tekst, kwaliteitsstatus en berekend netto R/R indien inputs valide. Kolomkoppen sorteerbaar. Kandidaten met onvoldoende data in aparte sectie 'Niet beoordeelbaar', nooit op rang 1. Selectie: cyaan rand links, details rechts. Elke rij toont waarom kandidaat wel/niet kwalificeert. Paginering/virtualisatie bij veel rijen; screenreader leest sorteerstatus.

### Kandidaatdetail (7/12 kolommen)
Boven: ticker, naam, sector, beurs, prijs in USD, quote tijdstip ET, bron, sessie, vertraging en spread. Onder: segmented '5 minuten'/'15 minuten', OHLC-candlesticks met prijsas rechts, tijdas onder, horizontale VWAP-overlay en volumehistogram; RSI(14) paneel met lijnen 30/70, MACD(12,26,9) paneel met histogram/signaal. Legenda, crosshair en tooltip tonen candle tijd, O/H/L/C, volume, VWAP en indicatorwaarden. Standaard 15m overzicht voor 1–5-daagse context, 5m voor timing; geen automatische herberekening zonder correcte candles. Grafiek toont exchange timezone en afterhours-markering. Onder chart: setup-thesis, bevestiging, invalidatie, stopzone, doelen 1/2, fees/slippage, geschat netto R/R en bronkwaliteit. Onbevestigde niveaus duidelijk 'Indicatief' of verborgen. Een breakout is pas 'Bevestigd' bij vooraf vastgelegde candle/volumecriteria, niet op basis van alleen een groene prijs.

### Acties
- 'Naar Analyzer': navigeert met symbol, scan-ID, quote-tijd, indicatieve niveaus en kwaliteitsstatus; Analyzer valideert opnieuw.
- 'Vergelijk met OPEN': alleen wanneer OPEN daadwerkelijk als positie bekend is; anders 'Vergelijk met positie' of verborgen. Vergelijk gelijke handelsperiode, netto koersruimte, downside, liquiditeit en overstapkosten; geen impulsieve rotatie.
- 'Toevoegen aan watchlist': toggle met bevestiging en accountgebonden opslag.
- 'Alert instellen': drawer met symbool, conditie (prijs boven/onder, volume, setupstatus), cooldown, sessie, bron en vervaltijd; server valideert, geen notificatiegarantie zonder kanaalrechten.
- 'Scan vernieuwen': één actieve job; spinner, voortgang en laatst geslaagde scan; 429 respecteren met backoff.

## 3. Mobiel/tablet
Tablet 768–1023px: 72px icon-sidebar; lijst en detail stapelen indien breedte onvoldoende. Mobiel <=767px: topbar met titel, sessiestatus, refresh; vaste vijf-tab bottomnav (minimaal 44px touch); zoekbalk, 'Filters' drawer, compacte datakwaliteit, kandidatenkaarten verticaal. Tik op kaart → volledig detailscherm met terugknop; 5m/15m switch; grafiek op breedte met horizontale interactie uitsluitend binnen chart, indicatorpanelen inklapbaar; sticky onderste CTA 'Analyseer' boven safe-area. Op 320px geen page-overflow, geen afgekapt risicogetal; tekst en kleur beide signaleren status.

## 4. Iconografie en micro-interacties
Gelicentieerde uniforme outline SVG set: Radar, Search, SlidersHorizontal, RefreshCw, ArrowUpDown, ChevronRight, ArrowLeft, ChartCandlestick, Activity, Bell, BookmarkPlus/BookmarkCheck, ArrowLeftRight, TriangleAlert, Clock, Info, X, Check, LoaderCircle. 20px navigatie, 16px in labels, 24px empty state; iconen altijd met aria-label. Hover 150ms, focus-visible 2px cyaan, prefers-reduced-motion. Geen raketten, hype-iconen of decoratieve nepkoersen. Skeletons volgen echte kaarten/grafieken zonder fictieve candles.

## 5. Scanflow en beslislogica
R01 Open Radar → auth/entitlements check (publieke marktdata alleen indien licentie dit toestaat). R02 marktstatus en provider timestamps ophalen. R03 universum bepalen, filters toepassen. R04 voldoende verse OHLCV voor 5m/15m en indicator-warmup controleren. R05 liquiditeit, dollarvolume en spread controleren. R06 technische indicatoren en setupcriteria deterministisch berekenen. R07 relatieve sterkte versus SPY in dezelfde sessie/tijd vergelijken. R08 invaliderende signalen en corporate actions/halts controleren. R09 alleen valide kandidaten rangschikken met uitlegbare score en dataquality. R10 gebruiker selecteert → details. R11 gebruiker vergelijkt bestaande positie (OPEN indien aanwezig). R12 gebruiker kiest Analyzer, watchlist, alert of wachten. R13 bij feedfout oude scan uitsluitend als 'Historisch / niet actueel' tonen.

### Technische definities
- **OHLCV:** candles met expliciete exchange timezone, sessie en complete/partial-candle flag. Laatste incomplete candle mag geen bevestigde breakout opleveren.
- **VWAP:** som(typical price × volume) / som(volume) vanaf expliciete sessiestart; extended-hours apart of uitgesloten volgens gekozen sessie.
- **RSI(14):** Wilder smoothing met voldoende historische bars; warmup verplicht.
- **MACD(12,26,9):** EMA(12)-EMA(26), signaal EMA(9), histogram verschil; warmup verplicht.
- **RVOL:** huidig cumulatief volume vergeleken met historisch cumulatief volume op vergelijkbaar tijdstip en sessie; ontbrekende referentie → 'N/B'.
- **Spread:** (ask-bid)/mid indien actuele bid/ask beschikbaar; geen spread uit last trade afleiden.
- **R/R:** (doel-instap minus kosten)/(instap-stop plus kosten) voor long setup, alleen bij valide stop, doel, spread/slippage en positief risico; label 'Indicatief'.
- **Relatieve sterkte:** kandidaat versus SPY op exact vergelijkbare interval- en sessiebasis.
- **Kwaliteit:** timestamp, provider, real-time/delay entitlement, bronconflict, missing candles, halts en corporate-action adjustment expliciet.
- **Score:** gewichten, normalisatie en thresholds versiebeheerbaar; zonder voldoende betrouwbare data geen score of 'topkans'.

## 6. Fout-, lege en risicoscenario's
| Conditie | Zichtbare staat | Consequentie |
|---|---|---|
| Markt gesloten | 'Gesloten · laatste sessie' | geen nieuwe intraday bevestiging |
| Premarket illiquide | 'Extended hours · hogere spreadrisico's' | strengere filters |
| Feed vertraagd | amber badge + exacte vertraging | geen 'live' claim |
| Delay onbekend | 'Vertraging onbekend' | score blokkeren indien actualiteit vereist |
| Provider 429 | scan pauze + retry na backoff | geen oneindige requests |
| Tweede bron wijkt af | 'Bronconflict' | uitsluiten van ranking tot opgelost |
| OHLCV ontbreekt | 'Indicatoren niet beschikbaar' | geen gefabriceerde RSI/MACD |
| Spread ontbreekt | 'Spread onbekend' | geen betrouwbare netto R/R |
| Halt/split | risicobanner | tijdelijk uitsluiten / data herberekenen |
| Geen kandidaten | 'Geen bevestigde kansen. Wachten is een geldige keuze.' | filters aanpassen |
| Geen OPEN positie | vergelijking met andere positie | geen fictieve holdings |
| Alert-permissie ontbreekt | uitleg + instellingen | geen valse notificatiebelofte |
| Offline | laatst bekende scan als historisch | refresh niet als geslaagd tonen |

## 7. Multidisciplinaire review
**Product:** focus 1–5 dagen, wachten is expliciet resultaat; geen automatische handelsaanbeveling. **UX:** filter → shortlist → bewijs → vergelijking → Analyzer; detail nooit los van datakwaliteit. **Visual:** consistent met Dashboard/Portfolio, goede density en mobile detailflow. **Quant:** geen look-ahead bias, partial bars niet bevestigen, intraday RVOL per tijdstip, indicator warmup, fees/slippage. **Marketdata:** bron/timestamp/sessie/vertraging en bronconflict; providerentitlements controleren. **Security/privacy:** API-keys uitsluitend server-side; watchlist/alerts user-scoped; auth/CSRF/CSP, XSS-safe symbol names, rate limits. **Accessibility:** WCAG 2.2 AA doel, toetsenbord en tekstalternatieven voor grafieken. **Backend/ops:** scanjob met quota, caching/TTL, observability, backoff en graceful degradation. **QA:** fixture-based indicator tests en end-to-end foutpaden.

## 8. Acceptatiecriteria
RD01 1440/375/320px layouts conform spec; RD02 vijf-tabs navigatie werkt; RD03 filters en sortering reproduceerbaar; RD04 scanner rangschikt geen stale/partial/bronconflict-data als valide; RD05 5m/15m candles correct met timezone en sessie; RD06 VWAP/RSI/MACD/RVOL matchen testfixtures; RD07 score en uitsluitredenen verklaarbaar; RD08 OPEN vergelijking gebruikt dezelfde marktperiode en kosten; RD09 alerts alleen na bevestigde opslag en rechten; RD10 provider 429/timeout/offline states; RD11 keyboard/screenreader en grafiektekstalternatieven; RD12 geen API secrets in browser; RD13 Analyzer herverifieert aangeleverde setup; RD14 market halt/split correct afgehandeld; RD15 browser-E2E, mobiele screenshots en toegankelijkheidsaudit uitgevoerd; RD16 geen P0/P1 defecten open.

## 9. Open beslissingen vóór bouw
Dataproviderlicenties voor scanuniversum en bid/ask, exact ondersteunde extended-hours feeds, scoregewichten, liquidity-thresholds, corporate-action-data, alertkanaal en notificatiebeperkingen. Dit is een uitvoerbare ontwerpspecificatie, **geen** bevestiging dat een scanner of mock-up bestaat.

## Aanvulling v1.1 — valuta, zoeken en notificaties
- Radar-koersen, entry, stop en koersdoelen primair **USD**. Bij mogelijke inzet/risico optionele **€-tegenwaarde**, expliciet indicatief met FX-timestamp; nooit USD en EUR ongemerkt optellen.
- Kansenkaart kan tonen: 'Potentieel risico $ X / ≈ € Y' als volledige inputs beschikbaar zijn. Ontbrekende FX geeft '€ niet beschikbaar', geen gefingeerde conversie.
- Globale tickerzoekfunctie leidt naar instrumentdetail/Radar; notificatiebel toont echte alerts. Instellingen voor displayvaluta en risicobudget via zesde scherm.
