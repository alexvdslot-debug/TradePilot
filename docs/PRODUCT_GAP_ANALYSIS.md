# TradePilot Pro — Product Completeness & Gap Analysis
**Versie:** 1.0 · **Datum:** 2026-10-09 · **Status:** documentreview; geen code-, browser- of externe audit.

## Scope en methode
Bronnen: `docs/PRODUCT_DESIGN_DOCUMENT.md`, `docs/screens/01-dashboard.md` t/m `05-trade-journal.md`, `docs/DATA_INTEGRATION_MATRIX.md` op `tradepilot-pro-rebuild`. Status **Beschreven** betekent dat ontwerpgedrag in de documenten staat, niet dat het gebouwd of bewezen is. **Aanvullen** betekent dat een developer nog keuzes moet maken. **Valideren** betekent dat externe feiten, toegang of tests nodig zijn. P0 blokkeert een betrouwbare eerste release; P1 is vereist voor premium afwerking.

## Samenvatting
Vijf schermen hebben gedetailleerde specificaties; bronmetadata, sessie/vertraging, veiligheidsprincipes en iteraties zijn beschreven. Het totaalproduct is **niet build-ready**: datarechten, schermoverschrijdende contracten, definitieve assets, account-/portfolio-keuzes en aantoonbare end-to-endkwaliteit zijn nog open. Geen percentage voltooiing zonder objectieve inventarisatie van code en tests.

## Gap-register
| ID | Prioriteit | Onderwerp | Status | Ontbrekend bewijs / concrete oplevering | Acceptatie |
|---|---|---|---|---|---|
| G01 | P0 | Gebruikersreis over vijf schermen | Aanvullen | Één routekaart onboarding → dashboard → radar → analyzer → plan → journal → portfolio; terugnavigatie, wacht-scenario, lege/offline toestand | Elke overgang heeft trigger, inputs, resultaat, foutpad en test-ID |
| G02 | P0 | API- en datamodelcontracten | Aanvullen | OpenAPI, schema voor quote/candle/position/ledger/plan/alert, idempotency, versiebeheer, foutcodes | Contracttests en voorbeeldresponses voor succes/401/403/429/timeout/stale |
| G03 | P0 | Marktdatarechten en capaciteit | Valideren | Twelve Data/Stocktwits endpoints, abonnement, exchange entitlement, timestamps, sessies, quotas, scanner-universum | Echte responses en haalbare kosten-/rate-limitberekening, geen ongefundeerde 'realtime' claim |
| G04 | P0 | Portfolio accounting/DEGIRO | Aanvullen | Kostprijsmethode, CSV-mapping, partial exits, stortingen, margin, fees, historische FX, corporate actions | Gouden testfixtures met handmatig nagerekende USD/EUR-uitkomsten |
| G05 | P0 | Auth en privacy | Aanvullen | Loginmethode, sessies, user isolation, retentie, verwijderbeleid, D1/R2 autorisatie | Misbruik- en autorisatietests, privacybesluit |
| G06 | P0 | Betrouwbare indicatoren/scanner | Valideren | Referentiedata 5m/15m, RVOL lookback, thresholds, spreads, candle completeness, providervergelijking | Reproduceerbare indicatorfixtures; geen score bij ontbrekende data |
| G07 | P0 | Alert- en notificatieketen | Aanvullen | Eventmodel, polling, deduplicatie, rechten, kanaal, belstatus, notificatietoestemming | Eén echte alert end-to-end, inclusief fail/retry |
| G08 | P0 | Releasebewijs | Valideren | CI, unit/integration/E2E, deployment, secretscan, backup/restore, rollback, productie-URL | Zeven PDD release-gates aantoonbaar groen |
| G09 | P1 | Definitieve visuele ontwerpen | Aanvullen | Desktop/mobiel wireframes, klikbaar prototype, component states, echte SVG-assets, licenties | Screenshotreview 320/375/768/1024/1440px, geen dode knoppen |
| G10 | P1 | Onboarding en voorkeuren | Aanvullen | Eerste login, naam/begroeting, timezone, EUR/USD, risicobudget, datavoorkeuren, toestemming | Instellingen blijven bewaard; first-run zonder holdings is bruikbaar |
| G11 | P1 | Markturen/kalender | Valideren | US exchange holidays, early closes, DST EU/VS, status apart van quote-versheid | Testmatrix voor overgangsdagen, weekend en feestdagen |
| G12 | P1 | Grafiekinteracties/toegankelijkheid | Aanvullen | Tooltips, tijdzones, indicatorpaneel, keyboard/screenreader, reduced motion | WCAG 2.2 AA-doel getest op echte UI |
| G13 | P1 | Journal bijlagen en statistiek | Aanvullen | Veilige opslag, bewaartermijn, plan↔fills allocatie, minimale steekproef voor metrics | Geen dubbeltelling, uploadbeveiliging en consistente export |
| G14 | P1 | Kosten, performance en operatie | Aanvullen | Provider- en Cloudflare-budget, latency SLO, caching/TTL, logging, incidentherstel | Loadtest, kostenschatting, monitoring en restore-test |
| G15 | P1 | Branding en splash | Aanvullen | Logo-SVG, iconenset, animation timings, contrast en fallback | Uitvoerbaar design token-/assetpakket en reduced-motion-variant |

## Schermoverschrijdende flows: te documenteren
1. **Eerste gebruik:** openen → splash alleen tijdens initialisatie → aanmelden → persoonlijke voorkeuren → lege portefeuille → transactie importeren/toevoegen.
2. **Kans vinden:** dashboard → radar met verse data → kandidaat → analyzer met hercontrole → entry/stop/targets → bewaren of wachten.
3. **Handelsadministratie:** DEGIRO-uitvoering buiten app → ledger-transactie registreren/importeren → positie/cash/P&L herberekenen → koppelen aan journalplan → evaluatie.
4. **Alert:** gebruiker maakt regel → server bewaart → bronupdate en drempelcheck → deduplicatie → notificatiebel → detail → gelezen-status.
5. **Foutpad:** provider 429/offline/stale → zichtbaar label + tijdstempel → geen bevestigde signalen → herstel/retry zonder fictieve cijfers.

## Beslislog (nog open; niet stilzwijgend invullen)
D01 loginprovider; D02 Twelve Data/Stocktwits rechten en dekking; D03 FX- en markturenbron; D04 kostprijsmethode; D05 DEGIRO CSV-versies en marginmodel; D06 alertkanalen; D07 branding en iconenlicentie; D08 privacyretentie; D09 risicobudget en scannerfilters; D10 hostingkostenplafond.

## Gefaseerde afronding — steeds één afgebakende stap
**S01** Maak een integrale gebruikersflow en schermovergangen met 5 scenario's; review UX/trading/security; stop voor akkoord.
**S02** Schrijf OpenAPI en database-entiteiten met fixtures en foutpaden; review backend/security; stop.
**S03** Valideer provider-entitlements en scan-capaciteit met echte testcalls; documenteer prijs/vertraging; stop.
**S04** Leg DEGIRO/FX/kostprijsbesluiten en gouden ledgerfixtures vast; stop.
**S05** Maak definitieve wireframes, iconen/assets en interactiestaten voor elk scherm, één voor één; stop.
**S06** Werk alert- en notificatiemodel plus privacy/accountkeuzes uit; stop.
**S07** Vertaal alle gaps naar GitHub issues en testbare release-gates; daarna pas implementatie-iteraties.

## Definitie van gereed
Een gap wordt pas **Gesloten** als (a) de ontwerpkeuze vastligt, (b) broncontract of UI-asset aanwezig is, (c) de vereiste tests aantoonbaar slagen en (d) de GitHub-commit/PR en bewijslinks zijn vastgelegd. Een documentreview is **geen** onafhankelijke expertaudit, visuele mock-up of productietest.

## Volgende stap
Start uitsluitend **S01: integrale gebruikersflow**. Werk niet alvast de overige gaps uit zonder reviewmoment.
