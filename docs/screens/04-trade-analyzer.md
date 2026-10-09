# TradePilot Pro — Scherm 04: Trade Analyzer
**Versie 1.0 · 9 oktober 2026 · Status: gespecificeerd en kritisch gereviewd; niet gebouwd of visueel gevalideerd.**
Afhankelijkheden: [Product Design Document](../PRODUCT_DESIGN_DOCUMENT.md), [Dashboard](01-dashboard.md), [Portfolio](02-portfolio.md), [Opportunity Radar](03-opportunity-radar.md).

## Productbesluit en gebruikersvraag
Trade Analyzer is de **besliswerkplek**, niet een trading-terminal die orders uitvoert. Binnen 1–5 handelsdagen moet een gebruiker beoordelen: 'Is deze trade beter dan mijn bestaande positie of niets doen, na fees, FX, downside en bevestiging?' Standaard vergelijkpositie OPEN **alleen wanneer daadwerkelijk in portfolio aanwezig**. Geen aanbeveling enkel vanwege een stijgende koers.

## Visueel ontwerp desktop (1440×900)
Consistente app-shell: 232px sidebar, 72px topbar, 12 kolommen, 16px gutters, 24–32px padding. Canvas #09111E; kaarten #111E30; border #243750; tekst #EDF4FF; secundair #9FB2C9; accent #55C7ED; positief #5FDBAC; negatief #FF929E; waarschuwing #FFC38A. Inter/system-ui, tabular-nums; kaarten radius 18px, buttons 10px.

```text
┌ Sidebar ┐ ┌ ANALYSE / Trade Analyzer    [Datastatus] [Refresh] [Plan opslaan] ┐
│ Dash    │ ├ [Ticker zoeken] [Vergelijk: OPEN/andere positie] [Horizon: 1–5d] ┤
│ Port    │ │ Quotes: prijs / timestamp / sessie / bron / vertraging            │
│ Radar   │ ├────────────────────────────────┬─────────────────────────────────┤
│ Analyzer│ │ Grafiek 5m | 15m               │ Trade setup                     │
│   ●     │ │ OHLCV / VWAP / volume          │ Entryzone / Stop / Target 1/2   │
│ Journal │ │ RSI / MACD                    │ Aantal / kosten / FX / R:R      │
│         │ ├────────────────────────────────┴─────────────────────────────────┤
│         │ │ 3 scenario's: Kopen | OPEN behouden/rotatie | Niets doen         │
│         │ ├───────────────────────────────┬──────────────────────────────────┤
│         │ │ Risicomatrix en aannames      │ Invalidation & checklist         │
└─────────┘ └───────────────────────────────┴──────────────────────────────────┘
```

### Header en context
Eyebrow 'TRADEBESLISSING', H1 'Trade Analyzer' (28px), subregel 'Scenario's vergelijken vóór je handelt'. Rechts bron/tijd/sessie/delay-badge, RefreshCw 'Herberekenen', primaire knop 'Handelsplan opslaan'. Bovenaan instrumentzoeker met Search en gecontroleerde tickerselectie, naast 'Vergelijk met' dropdown (OPEN indien aanwezig), horizon segmented 1/3/5 handelsdagen; horizon is scenario-instelling, geen voorspelling.

### Linkerkolom grafiek (7/12)
Echte candlestick OHLCV, tijdas in ET, prijsas USD, volumehistogram, VWAP-overlay; RSI(14) en MACD(12,26,9) als afzonderlijke panelen. 15m standaard voor context, 5m voor timing; duidelijke onderscheidingen regular/extended hours en incomplete candles. Crosshair met tijd, OHLC, volume, indicatoren. Entryzone als transparante cyaan band, stop als rood gestippelde lijn, targets als groene lijnen met labels; alleen bij geldige niveaus. Toegankelijke tekstsamenvatting onder chart; nooit synthetische candles of verzonnen indicatoren.

### Rechterkolom trade setup (5/12)
Kaarttitel 'Handelsopzet'. Velden: instap laag/hoog, stop, target 1, target 2, aantal aandelen, risico per trade in USD/EUR of % van portefeuille, geschatte spread/slippage, brokerfees, FX-conversie en bron van niveaus ('Radar' of 'Handmatig'). Handmatig bewerkte velden krijgen Pencil-badge 'Handmatig'; automatische berekeningen tonen Info-popover met formule. Prijsstappen en decimalen instrumentafhankelijk; invalidatie bij stop >= entry voor long, target <= entry, negatieve fees, geen koers, onvoldoende cash of onbetrouwbare FX. R:R wordt alleen getoond wanneer de invoer volledig is.

### Scenariocomparatie (volle breedte)
Drie gelijkwaardige kaarten:
1. **Nieuwe trade**: inzet, netto winst bij T1/T2, netto verlies bij stop, R:R, risico%, cashimpact.
2. **Bestaande positie behouden / gedeeltelijk roteren**: werkelijke holding, verkoophoeveelheid, gerealiseerd resultaat en fees/FX, resterende exposure, opportunity cost; indien geen holding 'Niet van toepassing'.
3. **Niets doen / wachten**: geen extra transactiekosten of nieuw marktrisico; bestaande positierisico's blijven bestaan. Geen kunstmatige rendementsschatting.
Vergelijk dezelfde tijdstempels, valuta en marktperiode; ontbrekende gegevens leiden tot 'Niet vergelijkbaar' in plaats van een winnaar.

### Onderste kaarten
'Risico & invalidatie': downside, gap risk, liquiditeit, spread, concentratie, macro-eventrisico en expliciete reden wanneer setup vervalt. 'Beslischecklist': [ ] quote vers [ ] 5m/15m bevestiging [ ] liquiditeit [ ] stop logisch [ ] netto R:R [ ] exposure/cash [ ] kosten/FX [ ] alternatief wachten beoordeeld. Niet alle checkboxen automatisch aanvinken; laat zien welke systeemmatig bevestigd en welke subjectief zijn.

## Mobiel
<=767px: vaste vijf-tab bottomnav, titel en datastatus boven; ticker/horizon direct bereikbaar; verticale volgorde **data quality → samenvatting risico → trade setup → scenariovergelijking → grafiek → invalidatie/checklist → plan opslaan**. Grafiek krijgt full-width interactief paneel, 5m/15m toggle, indicatorpanelen inklapbaar; scenario's gestapelde kaarten; sticky CTA 'Plan opslaan' boven safe-area, nooit over inhoud. 320px geen horizontale page-overflow, toetsenbordtargets >=44px. Tablet 768–1023px: zijbalk 72px, kolommen stapelen waar nodig.

## Iconografie en states
Uniforme SVG outline set met licentiecheck: ChartNoAxesCombined (tab), Search, RefreshCw, Save, ArrowLeftRight (vergelijk), ShieldAlert (risico), Target (doel), TrendingDown (stop), Clock (tijd), Info, Pencil, CheckCircle2, TriangleAlert, ChevronDown, X. Iconen 20px navigatie/16px inline, labels en aria. Focus 2px cyaan, hover 150ms, reduced-motion; kleur nooit enige informatiedrager. Loading skeletons zonder nepgetallen; fouten met herstelactie.

## Rekenkontract en financiële nauwkeurigheid
- Long entry **E**; stop **S<E**; targets **T1,T2>E**. Risico per aandeel E−S, winstpotentieel T−E; bereken netto na entry/exit fees en realistische slippage, plus FX indien conversie nodig.
- Netto R:R = netto verwachte winst bij doel / absolute netto verlies bij stop; alleen bij positief risico en geldige aannames. Toon beide doelen afzonderlijk.
- Positiegrootte begrensd door risicobudget / netto risico per aandeel, beschikbare cash en liquiditeitslimiet; afronden naar toegestane hele aandelen tenzij broker anders ondersteunt.
- Rotatie: vergelijk *marginale* risico's en kosten van verkopen OPEN plus aankopen kandidaat, inclusief gerealiseerd P&L, resterende concentratie en FX; reeds geleden verlies is geen toekomstige rendementsprognose.
- Geen automatische stopuitvoering door app; stop is hypothetisch en bij gap/slippage kan verlies hoger uitvallen.
- Decimal-safe bedragen; valuta afzonderlijk, FX timestamp en bron; geschatte fees duidelijk gelabeld.
- Alle inputs krijgen bron, quote timestamp, market session, real-time/delay-status, calculation_version; resultaten zijn reproduceerbaar. Providerconflict/stale data → 'indicatief / niet actueel' en geen bevestigde setup.
- Als kans uit Radar wordt geopend: quote opnieuw valideren; nooit een oude score of entry blind overnemen.

## End-to-end flow
A01 Analyzer openen vanuit Radar/Portfolio of direct → A02 auth en holdings context laden → A03 ticker en vergelijkpositie kiezen → A04 quotes/5m/15m ophalen en datakwaliteit beoordelen → A05 grafiek en niveaus tonen (of placeholders) → A06 gebruiker vult entry/stop/doelen/aantal in → A07 lokale preview met server-side herberekening bij opslaan → A08 netto R:R en budget toetsen → A09 drie scenario's naast elkaar → A10 invalidatie/checklist tonen → A11 keuze: wachten, bewaren als concept of handelsplan naar Journal → A12 bij bewaren server valideert eigenaar, versie en inputs → A13 bevestiging met plan-ID en route naar Journal. Er is geen brokerorder.

## Fout- en randgevallen
- Geen ticker → zoektoestand met duidelijke instructie.
- Geen OPEN-holding → vergelijkselector toont andere echte positie of 'Geen positie'.
- Quote stale/closed/extended → exacte bron/tijd/sessie; geen 'live'.
- OHLCV ontbreekt → geen indicatoren of fictieve grafiek; handmatige scenario's als indicatief mogelijk.
- Spread onbekend → kostenraming onzeker; geen definitieve R:R-label.
- Stop boven entry / target onder entry → inline validatie en berekening blokkeren.
- Cash ontbreekt / margin onbekend → positiegrootte niet als uitvoerbaar markeren.
- Grote gap of halts → waarschuwing dat stopverlies onderschat kan zijn.
- 429/timeout → historische invoer behouden, status expliciet, retry/backoff.
- Concurrente wijzigingen in holdings → revalidatie en versieconflict; geen stilzwijgende overschrijving.
- Save mislukt → concept lokaal bewaren met waarschuwing; nooit claimen dat plan is opgeslagen.
- Offline → bestaande analyse als historisch; geen nieuwe bevestigde signalen.

## Kritische multidisciplinaire review
**Fintech product:** analyseren vóór handelen, wachten volwaardig; geen gamification of druk. **Visual/UI:** consistente dark-premium design tokens, duidelijke informatiehiërarchie en 3 scenario's. **UX:** flows voor nieuw idee, bestaande positie en wachten; duidelijke invalidatie. **Quant:** geen look-ahead bias, fees/slippage/FX in netto R:R, gap-risico, gelijkgetimede vergelijkingen. **Data:** timestamps, sessies, entitlements, bronconflicten en ontbrekende spread. **Security:** auth user-scoped holdings/plannen, API-keys server-side, inputvalidatie, rate limiting, CSP en audit. **Accessibility:** WCAG 2.2 AA doel, semantische labels, toetsenbord, tekstalternatieven grafieken. **QA:** formulefixtures, edge cases, mobiel/desktop screenshots, browser-E2E. Dit is een interne kritische review, geen externe expertreview.

## Acceptatiecriteria
TA01 desktop 1440 en mobiel 320/375px volgens layout. TA02 navigatie en back/forward consistent. TA03 quote timestamp/source/session/delay overal zichtbaar. TA04 indicatoren matchen fixtures en partial candles geven geen bevestiging. TA05 entry/stop/targets validatie voor long. TA06 netto R:R met fees/slippage/FX correct. TA07 risicobudget en cash limiteren sizing. TA08 OPEN-rotatie bevat fees, FX, restexposure en gerealiseerde P&L. TA09 wachten als gelijkwaardig scenario. TA10 Radar-data opnieuw gevalideerd. TA11 user isolation bij bewaren/opladen. TA12 offline/429/stale/FX ontbreekt states getest. TA13 plan-id en Journal route na succesvolle save. TA14 alle interactieve elementen toetsenbord/screenreader. TA15 grafiek met tekstalternatief en reduced-motion. TA16 browser-E2E, screenshotreview en securitychecks uitgevoerd. TA17 geen P0/P1 defecten open.

## Open punten vóór implementatie
DEGIRO fee- en FX-model, realistische slippagebron, risicobudgetinstelling, stop/targetstrategie, partial sales, broker-margins, providerrechten en exacte journal-schema. Geen mock-up of werkende analyzer wordt hiermee geclaimd.
