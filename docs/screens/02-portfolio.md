# TradePilot Pro — Scherm 02: Portfolio
**Versie 1.0 · 9 oktober 2026 · Status: ontwerp en logica gereviewd, niet geïmplementeerd**  
Gebaseerd op [Product Design Document](../PRODUCT_DESIGN_DOCUMENT.md) en het [Dashboard](01-dashboard.md).

## 1. Productdoel en beslisvolgorde
De gebruiker moet in maximaal vijf seconden zien: (1) hoeveel aandelen en cash hij heeft, (2) hoeveel zijn posities werkelijk waard en hoe actueel die waarde is, (3) wat gerealiseerd versus ongerealiseerd resultaat is, (4) hoeveel risico geconcentreerd is in OPEN of een andere positie, en (5) welke actie mogelijk is. Eerst correcte administratie, dan waardering, dan risico, dan analyse. Geen directe brokerorders.

## 2. Visueel ontwerp: desktop
Referentie 1440×900. Zelfde globale shell als Dashboard: 232px linker navigatie, 72px topbar, canvas #09111E, kaarten #111E30, border #243750, primaire tekst #EDF4FF, accent #55C7ED. Inhoud 12-koloms grid, 16px gutter, 24–32px buitenmarge. Font Inter/system-ui; getallen tabular-nums; kaarten radius 18px; buttons radius 10px.

```text
┌ Sidebar ┐ ┌ PORTFOLIO / Portefeuille              [USD|EUR] [Import] [Export] [+ Transactie] ┐
│ Trade   │ ├──────────────┬──────────────┬──────────────┬───────────────────────────────┤
│ Pilot   │ │ Totaalwaarde │ Ongerealiseerd│ Gerealiseerd │ Cash / FX                     │
│ Dash    │ ├──────────────────────────────────────┬──────────────────────────────────────┤
│ Port ●  │ │ Posities / tabel                     │ Allocatie en concentratierisico      │
│ Radar   │ │ ticker aantal kostprijs koers P&L    │ balkgrafiek, grootste positie        │
│ Analyze │ ├──────────────────────────────────────┴──────────────────────────────────────┤
│ Journal │ │ Geselecteerde positie: mini-chart | kostenbasis | lots | tijdstempel        │
│         │ ├─────────────────────────────────────────────────────────────────────────────┤
│         │ │ Transacties: zoeken/filteren | datum | side | qty | prijs | kosten | FX     │
└─────────┘ └─────────────────────────────────────────────────────────────────────────────┘
```

### Bovenbalk
Eyebrow 'MIJN POSITIES', H1 'Portefeuille', subtekst 'Waarde, transacties en risico op één plek'. Rechts USD/EUR-segmented toggle, Upload-icon 'Importeren', Download-icon 'Exporteren', Plus-icon primaire CTA 'Transactie toevoegen'. Boven waarden: market status badge met provider, exchange timestamp en delay. Geen fictieve 'live'-badge.

### KPI-rij (vier kaarten)
1. **Portefeuillewaarde**: grote valuta + bedrag (26px), kleine label 'x/y posities gewaardeerd', timestamp.
2. **Ongerealiseerd P&L**: USD/EUR en %, kleur met plus/minus en tekst; ontbrekende quotes → 'Onvolledig'.
3. **Gerealiseerd P&L**: afgesloten lots minus toegerekende kosten, periodefilter.
4. **Cash & FX**: beschikbare USD/EUR-cash en gebruikte wisselkoers inclusief timestamp; cash is uitsluitend betrouwbaar als stortingen, opnames en transacties volledig zijn ingevoerd.
Geen totalen zonder zichtbare dekking; nooit ontbrekende koersen als nul waarderen.

### Posities (7/12 kolommen)
Tabel: Ticker, naam, aantal, gemiddelde kostprijs, laatst bekende koers, dag%, ongerealiseerd P&L, gewicht, ChevronRight detail. Ticker links uitgelijnd, getallen rechts; vaste header, sortering met ArrowUpDown. Positieve waarden groen #5FDBAC, negatieve rood #FF929E, maar altijd expliciet teken/tekst. Elke koers heeft Info tooltip met bron, tijd, beursfase en vertraging. Klik rij → detailpaneel; button 'Analyseer' → Analyzer met ticker en timestamp.

### Allocatie & risico (5/12 kolommen)
Horizontale gewichtsverdeling met kleurlegenda en tekstpercentages (geen alleen-kleur donut); grote positie OPEN prominent indien aanwezig, anders feitelijke grootste positie. Risicotekst neutraal: 'OPEN vormt 68% van de bekende aandelenwaarde' als **illustratie, nooit hardcoded**. Concentratiedrempel configureerbaar; niet doen alsof een concentratie gelijkstaat aan automatisch verkopen.

### Positiedetail
Titel ticker/naam + close X, aantal, avg cost, actuele koers en kwaliteit, P&L, kostbasis, fees, FX-effect, lot- en transactiehistorie, echte sparkline of 'Grafiek niet beschikbaar'. Acties 'Analyseer positie', 'Transacties bekijken', 'Correctie toevoegen'. Geen brokerkoppeling of handelsknop.

### Transactiesectie
Zoekveld Search, filters Filter (ticker, type, datum), tabel met UTC-/lokale datum, type Koop/Verkoop, aantal, koers, transactievaluta, kosten, toegepaste FX, bron, notitie en MoreHorizontal-actiemenu. Paginering, lege toestand, export. Historische transacties niet stilzwijgend muteren: 'Corrigeren' maakt auditbare correctie/versie, 'Verwijderen' is tegenboeking met bevestiging.

## 3. Mobiel en tablet
Tablet 768–1023px: sidebar 72px, KPI 2×2, posities en risico onder elkaar. Mobiel <=767px: vaste bottomnav met vijf iconen+labels; topbar H1 en overflowmenu voor Import/Export; primaire '+ Transactie' CTA direct onder H1. KPI's 2×2 op 375px, onder 350px 1 kolom indien tekst anders afkapt. Posities als kaarten (ticker+waarde boven, aantal/prijs/P&L eronder), detail als full-screen sheet. Transacties als chronologische lijst, filterdrawer; 320px zonder pagina-overflow. Safe-area padding en targets >=44×44px.

## 4. Iconen, grafieken en micro-interacties
Consistente gelicentieerde SVG outline-set (bijvoorbeeld Lucide): Wallet (tab), Plus (toevoegen), Upload (import), Download (export), Search (zoeken), SlidersHorizontal (filter), ArrowUpDown (sort), ChevronRight (detail), ArrowLeftRight (FX), Info (bron), TriangleAlert (risico), Pencil (correctie), X (sluiten), Check (bevestigen), Clock (stale), ChartNoAxesCombined (analyse), MoreHorizontal (rijacties). Iconen 20px nav, 16px inline, 24px in lege toestand; icon+tekst en aria-label. Geen stockfoto's of pseudo-chart; echte grafieken met bron, as en tekstalternatief. Hover 150ms, focus-visible 2px cyaan, reduced-motion gerespecteerd.

## 5. Transactieflow: exacte velden en validatie
1. Gebruiker kiest '+ Transactie' → modal op desktop/full-screen sheet mobiel, focus naar titel.
2. Keuze 'Koop' of 'Verkoop' (segmented).
3. Velden: ticker (autocomplete, instrument-ID indien beschikbaar), uitvoeringsdatum en tijd met timezone, aantal (decimal >0), koers per aandeel (>0), valuta, transactiekosten (>=0), toegepaste FX-koers (>0 indien conversie), rekening/bron (optioneel), notitie.
4. Live preview: bruto notional, fees, cashimpact, verwachte nieuwe positie en validatie.
5. 'Opslaan' alleen actief bij geldige velden. Voor verkoop: voldoende aandelen in ledger; shortselling buiten scope. Geen impliciete marginaannames.
6. Server valideert opnieuw, schrijft atomair een auditbaar ledger-event en retourneert ID.
7. UI toont succes met transactie-ID en bijgewerkte samenvatting. Bij timeout eerst idempotency-status controleren; niet dubbel boeken.
8. 'Annuleren' sluit zonder opslag; bij wijzigingen confirm 'Wijzigingen weggooien?'. Escape sluit waar veilig.

## 6. CSV import/export-flow
Importeren → bestand selecteren → kolommapping → preview met datum/tijd, decimalen en valutacontrole → duplicaten detecteren via bron-ID of stabiele fingerprint → fouten per rij → expliciet 'Import bevestigen' → transactionele opslag → samenvatting ingevoerd/overgeslagen/afgewezen. Nooit importeren zonder preview. CSV-formule-injectie bij export neutraliseren; encoding UTF-8, schema-version en UTC ISO 8601; spreadsheetgebruik niet automatisch vertrouwen. Export bevat transacties, cash-events en correcties; geen API-keys of tokens. Back-up/restore wordt in backenditeratie uitgewerkt en getest.

## 7. Ledger- en rekenregels
- **Bron van waarheid:** immutable events: BUY, SELL, DEPOSIT, WITHDRAWAL, FEE, DIVIDEND, SPLIT, CORRECTION/REVERSAL; ieder event ID, user-ID, instrument-ID, UTC timestamp, valuta, fees en herkomst.
- **Positie:** som aankopen minus verkopen, met splits verwerkt. Onvoldoende hoeveelheid → blokkeren en reden tonen.
- **Kostprijs:** gewogen gemiddelde als voorgestelde app-weergave; gerealiseerde P&L bij verkoop op basis van toegewezen kostprijs en kosten. Fiscale verwerking kan anders zijn en wordt niet geclaimd.
- **USD/EUR:** koersconversie op historische uitvoeringsdatum voor kasstromen en actuele koers voor actuele waardering; onderscheid aandelenrendement en FX-effect. Broker-afrekenkoers gaat boven generieke markt-FX wanneer bekend.
- **Cash:** stortingen + verkopen + dividend − aankopen − opnames − kosten; per valuta afzonderlijk, inclusief brokerkosten; niet afleiden uit posities alleen.
- **Dagresultaat:** gebruik vorige vergelijkbare reguliere slotkoers, expliciet omgaan met pre/afterhours; niet verwarren met totaalrendement.
- **Datakwaliteit:** quote timestamp, provider, sessie, delay; stale/unknown duidelijk markeren. Ontbrekende koers/FX → partial valuation en geen schijnprecisie.
- **Numeriek:** decimal-safe geldberekening en expliciete afronding voor weergave; geen binary float voor ledgerbedragen.

## 8. Schermtoestanden en foutpaden
| Situatie | UI | Actie |
|---|---|---|
| Niet ingelogd | privacyveilige login-state | 'Inloggen' |
| Geen transacties | lege Wallet-vector en uitleg | '+ Eerste transactie' |
| Wel transacties, geen cash-events | 'Cash onbekend/onvolledig' | 'Cashsaldo aanvullen' |
| Quote ontbreekt | laatste prijs met tijd of 'Niet beschikbaar' | 'Verversen' |
| FX ontbreekt | USD intact, EUR '--' met uitleg | 'Opnieuw proberen' |
| CSV onjuist | rijgebonden foutmelding | 'Bestand aanpassen' |
| CSV duplicaten | preview met overslaan/controle | 'Import bevestigen' |
| Sell > positie | inline fout; opslaan disabled | hoeveelheid aanpassen |
| API 429/timeout | fout + retry met backoff | 'Opnieuw proberen' |
| API 403 | geen privédata tonen | veilige herauthenticatie |
| Concurrente wijziging | versieconflict | data herladen, niet overschrijven |
| Offline | bestaande cache als historisch gelabeld | geen nieuwe mutatie claimen |

## 9. End-to-end gebruikersflow
P01 open Portfolio → auth controleren → ledger laden. P02 geen ledger → onboarding. P03 ledger aanwezig → posities reconstrueren. P04 marktquotes parallel ophalen. P05 FX ophalen. P06 volledigheid bepalen. P07 KPI's en risico berekenen. P08 positie selecteren → detail. P09 analyse → Analyzer. P10 transactie toevoegen → preview → servervalidatie → commit → herberekening. P11 import → mapping → preview → dedup → commit. P12 export → CSV-download. P13 correctie → auditbare reversal. P14 terug/vooruit navigatie → selectie en focus consistent. Prioriteit: beveiliging > ledgerintegriteit > prijsversheid > FX > visualisatie.

## 10. Multidisciplinaire review en verbeteringen
**Product/UX:** transacties toevoegen vóór performance tonen; overzicht → detail → actie, geen impulsieve broker-CTA. **Visual design:** identieke tokens/sidebar als Dashboard; consistente spacing en states. **Trading/quant:** realized/unrealized, brokerfees, wisselkoers en OPEN-concentratie gescheiden; nooit 'koop/verkoop'-advies op alleen allocatie. **Backend:** atomiciteit, idempotency, eventversioning, migraties. **Security:** server-side user-scoped autorisatie per ledger-event, inputvalidatie, prepared statements, CSRF/CSP, rate limits, geen tokens in logs. **Privacy:** data-export, verwijderbeleid, minimaal noodzakelijke velden. **Accessibility:** WCAG 2.2 AA doel, contrast meten, keyboard focus, semantische tabel, screenreader labels en tekstalternatieven. **QA:** fixtures voor partial sells, fee-allocatie, splits, FX, importduplicaten, 429/403, offline, browser back/forward. **Ops:** backup/restore en migration rollback vóór productie.

## 11. Acceptatiecriteria (allemaal vereist vóór 'gebouwd')
PF01 layout desktop 1440px en mobiel 320/375px conform spec. PF02 vijf-tab navigatie en routeherstel. PF03 modal/sheet volledig keyboardbedienbaar. PF04 add-buy/sell en correctie atomair en idempotent. PF05 sell-over-position geblokkeerd. PF06 P&L/fees/FX kloppen met vaste referentiefixtures. PF07 cash per valuta sluit op events. PF08 gedeeltelijke waardering zichtbaar en geen misleidend totaal. PF09 CSV preview, mapping, dedup en roundtrip getest. PF10 user A kan user B's ledger nooit lezen/wijzigen. PF11 quote/fx-bron, timestamp en vertraging zichtbaar. PF12 loading/empty/error/offline en 429/403 states getest. PF13 browser- en mobiel-E2E plus WCAG-audit geslaagd. PF14 back-up/restore en rollback gecontroleerd. PF15 geen P0/P1 defecten open.

## 12. Open beslissingen
Definitieve loginprovider, exacte DEGIRO-CSV-formaten, rekening/marginmodel, kostenbasis voor belastingrapportage, licentie van iconenset, broker-FX-prioriteit en corporate-actions-feed moeten vóór de relevante bouwiteratie worden bevestigd. Dit document specificeert geen werkende integratie en claimt geen externe expertvalidatie.
