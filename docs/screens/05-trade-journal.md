# TradePilot Pro — Scherm 05: Trade Journal
**Versie 1.0 · 9 oktober 2026 · Status: ontwerp intern gereviewd, niet gebouwd, niet visueel of met gebruikers getest.**
Afhankelijkheden: [Product Design Document](../PRODUCT_DESIGN_DOCUMENT.md), [Dashboard](01-dashboard.md), [Portfolio](02-portfolio.md), [Radar](03-opportunity-radar.md), [Analyzer](04-trade-analyzer.md).

## 1. Productdoel en principes
Trade Journal legt het **beslisproces vóór de trade, de feitelijke uitvoering en de evaluatie achteraf** vast. Het moet helpen onderscheiden of een trade volgens plan is uitgevoerd, niet slechts of de uitkomst winstgevend was. Horizon 1–5 handelsdagen. Trades worden uitsluitend via eigen transactieregistratie of gevalideerde import vastgelegd; het journal voert geen brokerorders uit. OPEN is slechts een voorbeeldpositie indien aanwezig. Geen verzonnen statistieken of automatisch toegeschreven transacties.

## 2. Visueel ontwerp desktop
Referentie 1440×900; vaste sidebar 232px, topbar 72px, 12-koloms grid 16px gutters, 24–32px padding. Achtergrond #09111E, panels #111E30, border #243750, tekst #EDF4FF, secundair #9FB2C9, cyaan #55C7ED, positief #5FDBAC, negatief #FF929E, waarschuwing #FFC38A. Inter/system-ui met tabular-nums; card radius 18px, button radius 10px, focus-visible 2px cyaan.

```text
┌ Sidebar ┐ ┌ JOURNAL / Trade Journal       [Export] [+ Nieuw handelsplan] ┐
│ Dash    │ ├ [Open plannen] [Afgesloten] [Alle] [Zoeken] [Filters]        ┤
│ Port    │ │ Trades | Plantrouw | Gem. R | Netto P&L | Datadekking        │
│ Radar   │ ├───────────────────────────────┬─────────────────────────────┤
│ Analyze │ │ Plannen/trades lijst          │ Geselecteerd plan           │
│ Journal●│ │ Datum ticker setup status    │ Thesis / entry/stop/targets │
│         │ │ R-multiple / netto P&L       │ Checklist / tijdlijn        │
│         │ │                               │ Werkelijke fills / kosten   │
│         │ ├───────────────────────────────┴─────────────────────────────┤
│         │ │ Evaluatie | Lessons learned | Screenshot/link attachments  │
└─────────┘ └─────────────────────────────────────────────────────────────┘
```

### Header
Eyebrow 'HANDELSDISCIPLINE', H1 'Trade Journal' 28px, subtitel 'Plan, uitvoering en evaluatie'. Rechts Download-icon 'Exporteren', Plus-icon primaire CTA 'Nieuw handelsplan'. Datakwaliteitsregel: aantal records, laatste synchronisatie/import, bron en dekking. Geen 'live'-status nodig voor historische notities; marktquotes in detail krijgen wel bron, sessie, tijd en vertraging.

### KPI-kaarten (vier of vijf afhankelijk breedte)
'Afgesloten trades', 'Plantrouw' (% met voldoende checklistdata), 'Gemiddelde R' (uitsluitend met vooraf vastgelegde stop en werkelijk netto resultaat), 'Netto gerealiseerde P&L' (ledger-derived) en 'Datadekking' (x/y evalueerbaar). Elke KPI toont definitie via Info-icon, periode, steekproefgrootte; bij n te klein of ontbrekende gegevens 'Onvoldoende data' in plaats van betekenisloze statistiek. P&L niet dubbel tellen bij meerdere fills of gedeeltelijke verkopen.

### Lijst (5/12)
Tabs 'Open plannen', 'Afgesloten', 'Alle'. Zoekbalk met Search, filterdrawer: ticker, setup, datumrange, status, resultaat, plantrouw, tags. Rijen min 72px: datum, ticker+naam, setup-badge, status ('Concept', 'Gepland', 'Actief', 'Gesloten', 'Geëvalueerd', 'Geannuleerd'), netto P&L en R indien berekenbaar, ChevronRight. Sortering nieuwste eerst, alternatieve sortering expliciet. Kleur nooit als enige statusindicator. Bij selectie cyaan 3px rand links.

### Detailpaneel (7/12)
Boven: ticker, statusbadge, aanmaakdatum, laatst gewijzigd, auteur/eigenaar; actions Pencil 'Bewerken', MoreHorizontal menu met 'Dupliceren', 'Annuleren' en 'Exporteren'. Inhoud in duidelijk onderscheiden blokken:
1. **Vóór de trade:** thesis, catalyst, setup, bronverwijzing Radar/Analyzer, snapshot van toenmalige quote + timestamp, instapzone, stop, targets 1/2, geplande grootte, geschat risico en kosten, reden om te wachten of in te stappen.
2. **Tijdens de trade:** feitelijke BUY/SELL-fills via ledger-link, datum/tijd, aantal, uitvoeringsprijs, fees, FX, wijzigingen aan plan met reden; verschil plan/werkelijkheid zichtbaar.
3. **Na de trade:** gerealiseerd netto P&L, R-multiple, maximaal gunstige/ongunstige excursie uitsluitend indien betrouwbare intraday data beschikbaar, checklist plantrouw, evaluatie en les.
4. **Bewijs:** maximaal configureerbare screenshotbijlagen en veilige URL-links met caption; geen inline uitvoer van HTML of scripts.
5. **Tijdlijn:** chronologisch auditspoor 'plan gemaakt → gewijzigd → uitgevoerd → gesloten → geëvalueerd'.

## 3. Mobiel en tablet
<=767px: topbar titel + CTA, vijf-tab vaste bottomnav; KPI 2×2 en bij <350px één kolom; filters in drawer, plannen als verticale kaarten. Tik kaart → full-screen detail met terugknop en sticky 'Bewerken' of 'Evalueren' boven safe-area; secties via tabs/accordions 'Plan', 'Uitvoering', 'Evaluatie', 'Tijdlijn'. 320px geen horizontale overflow, targets >=44px. Tablet 768–1023px: compacte 72px sidebar, lijst/detail stapelen waar nodig.

## 4. Iconen en visuele states
Eén gelicentieerde SVG-outline familie (bijv. Lucide): NotebookPen (actieve tab), Plus, Download, Search, SlidersHorizontal, ChevronRight, ArrowLeft, Pencil, CheckCircle2, Clock, Target, ShieldAlert, Link, Image, CalendarDays, ListChecks, History, Info, MoreHorizontal, X, TriangleAlert, LoaderCircle. 20px nav, 16px inline, 24px lege toestand. Tekstlabels en aria-labels verplicht. Geen gamified trofeeën, winstconfetti of verzonnen winstreeksen. Skeletons zonder fictieve trades. Hover 150ms, prefers-reduced-motion, tekstalternatieven voor grafieken.

## 5. Formulier 'Nieuw handelsplan'
Open modal desktop (max 720px) / full-screen mobiel. Velden in logische volgorde:
- Ticker met instrument-ID; long setup; geplande handelsperiode 1–5 dagen.
- Thesis (vrije tekst), setup-tag, catalyst, reden om niet te handelen.
- Entry laag/hoog, stop, targets 1/2, geplande hoeveelheid, risico in USD/%.
- Dataherkomst (Radar/Analyzer/handmatig), quote timestamp/sessie/provider/delay, aannames over fees/slippage/FX.
- Pre-trade checklist: liquiditeit, trend 5m/15m, eventrisico, R:R, portefeuilleconcentratie, invalidatie.
- Knoppen 'Concept bewaren', 'Plan activeren' (alleen indien verplichte validaties voldoen), 'Annuleren'.
Valideer stop<entry<targets voor long, aantal>0, datum consistent, maximale tekstlengte, veilige links. Geen plan automatisch activeren bij opslaan. Autosave uitsluitend als expliciet herkenbaar lokaal concept en nooit als server-opgeslagen claimen.

## 6. Lifecycle en statusmachine
`DRAFT -> PLANNED -> ACTIVE -> CLOSED -> REVIEWED`; alternatieve paden `DRAFT/PLANNED -> CANCELLED`. Status ACTIVE uitsluitend na expliciete ledger-fillkoppeling of geverifieerde handmatige registratie. CLOSED alleen wanneer positieomvang van aan dit plan gekoppelde fills naar nul is teruggebracht; partial exits blijven ACTIVE. Een plan kan 'niet uitgevoerd' eindigen en toch geëvalueerd worden, met aparte reden. Historische oorspronkelijke thesis en oorspronkelijke risiconiveaus immutable na activering; wijzigingen als versioned amendments met reden en tijd. Re-open alleen als auditbare correctie, geen stille statuswijziging.

## 7. Uitvoering, berekening en statistiek
- Ledger is bron van waarheid voor echte fills, fees, cash en FX; journal bewaart **plan** en referenties naar ledger-event-ID's, geen tweede losstaande P&L-boekhouding.
- Een ledger-event mag niet dubbel worden toegerekend aan meerdere journal-trades; partiële fills/verkopen aan een plan koppelen via expliciete allocatie.
- Netto gerealiseerde P&L uit dezelfde cost-basis methode als Portfolio; weergave USD en EUR met juiste historische broker-FX waar bekend.
- R-multiple = netto gerealiseerde P&L / vooraf gedefinieerd initieel risicobedrag; bij ontbrekend/0 risico 'N/B', nooit oneindig of verzonnen.
- Winrate = winstgevende afgesloten trades / alle afgesloten trades met valide P&L; breakeven apart, steekproefgrootte altijd tonen.
- Gemiddelde R, expectancy, profit factor, gemiddelde houdtijd uitsluitend bij voldoende datadekking en eenduidige definitie; toon formule via tooltip en periodefilter.
- Plantrouw is checklist-/procesmaat, geen automatisch afgeleide winstscore. Geen AI-oordeel zonder zichtbare grondslag.
- Corporate actions, splits, dividends en open posities correct gescheiden van gerealiseerde handelsresultaten.
- Screenshot/links en reflecties mogen geen invloed hebben op financiële berekeningen.

## 8. Gebruikersflow end-to-end
J01 open Journal → authenticatie/user-scope → records laden. J02 lege journal → onboarding 'Maak je eerste plan' of 'Importeer transacties'. J03 plan aanmaken vanuit Analyzer → snapshot en inputs vooraf ingevuld, gebruiker controleert. J04 concept opslaan → server-ID bevestigen. J05 plan activeren → validatie en versie vastleggen. J06 ledger-fills koppelen (niet automatisch op ticker alleen). J07 gedeeltelijke verkoop → resterende positie en status ACTIVE. J08 volledig gesloten → CLOSED en evaluatie-CTA. J09 evaluatie schrijven → REVIEWED, tijdlijn bijwerken. J10 filters en zoeken → selectie. J11 export → privacyveilige CSV/JSON met schema-version. J12 correctie → auditbaar event, statistieken herberekenen. J13 browser terug/vooruit en mobiel detail → focus/route correct.

## 9. Uitzonderingen en foutpaden
- Geen plannen: onboarding, geen fictieve statistieken.
- Geen echte fills: plan blijft DRAFT/PLANNED, niet als gewonnen trade tellen.
- Gedeeltelijke exits: status ACTIVE en alleen gerealiseerde component meetellen.
- Dubbele import/ledger-link: blokkeren en bestaande koppeling tonen.
- Ontbrekende fees of FX: netto EUR-P&L en vergelijkende metrics 'Onvolledig'.
- Stale quote uit Analyzer: historische snapshot behouden met tijd, niet als huidige koers tonen.
- Browser offline: lokaal concept expliciet 'Niet gesynchroniseerd'; geen server-succesmelding.
- Opslaan timeout: idempotency-key en statuscontrole vóór retry.
- Gelijktijdige bewerking: versieconflict, verschilweergave, geen silent overwrite.
- 401/403: geen persoonlijke notities of bijlagen zichtbaar, reauth.
- Malafide screenshot/URL: MIME/magic-byte check, grootte- en typegrens, malwarecontrole, signed URLs, CSP, geen HTML-executie.
- Verwijderverzoek: bevestiging en duidelijk audit-/retentiebeleid; geen hard delete van ledger om historische cijfers te manipuleren.

## 10. Review vanuit meerdere disciplines
**Product/fintech:** nadruk op beslisdiscipline boven winst; 'wachten' en geannuleerde plannen zijn leerdata. **UX:** plan → uitvoering → reflectie als natuurlijke volgorde; gebruikers kunnen later aanvullen. **Visual:** rustige premium hiërarchie, duidelijke scheiding intentie/feit/evaluatie, consistent met vier schermen. **Quant:** één ledgerbron, juiste partial exits, geen misleidende statistiek bij kleine n. **Security/privacy:** per-user autorisatie, signed attachments, audit trail, veilige exports en rate limiting. **Accessibility:** WCAG 2.2 AA doel, keyboard, zichtbare focus, tekstlabels, contrast en schermlezer. **QA:** fixtures voor partial sells, dubbele fills, FX, idempotency, import, offline, 403 en statusovergangen. **Ops:** backup/restore, retentie en schema migrations. Dit is een interne kritische documentreview, geen externe of visuele validatie.

## 11. Acceptatiecriteria
TJ01 desktop 1440px en mobiel 320/375px conform spec. TJ02 alle vijf navigatietabs werken. TJ03 aanmaken, bewaren, activeren, sluiten en evalueren volgens statusmachine. TJ04 oorspronkelijke thesis/risico immutable na activering. TJ05 partial fills/exits correct gekoppeld en niet dubbel geteld. TJ06 P&L/fees/FX matchen Portfolio-fixtures. TJ07 R en statistieken tonen n, definitie en dekking. TJ08 geen metrics bij onvolledige inputs. TJ09 screenshotupload en links veilig, user-scoped. TJ10 concept offline niet als opgeslagen claimen. TJ11 timeout/retry idempotent. TJ12 401/403 privacy en versieconflict correct. TJ13 exports zonder secrets en CSV-formule-injectie. TJ14 keyboard/screenreader, reduced motion en 200% zoom. TJ15 filter/zoek/route state consistent. TJ16 browser-E2E en screenshots op mobiel/desktop uitgevoerd. TJ17 geen P0/P1 defecten open.

## 12. Open punten vóór bouw
Datamodel voor journal↔ledger-allocatie, DEGIRO import mapping, attachmentopslag en retentie, privacyverwijderbeleid, accountauth, exacte statistiekdrempels, auditlog-backup en visual mock-ups. Geen echte gebruikersreview of implementatie wordt geclaimd.
