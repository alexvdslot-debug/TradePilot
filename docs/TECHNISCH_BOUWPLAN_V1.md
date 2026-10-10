# TradePilot Pro — Technisch bouwplan v1
**Datum:** 9 oktober 2026 · **Bijgewerkt:** 10 oktober 2026 · **Branch:** `tradepilot-pro-rebuild`

**Status:** bouwplan met gerealiseerde B0–B8-uitbreidingen en expliciete acceptatiegrenzen. De eerste release is beschreven in [deploymentbewijs](DEPLOYMENT_2026-10-10.md); de nieuwe uitbreidingen zijn getest, gepubliceerd en met de ingelogde productieomgeving gecontroleerd; bewijs en afzonderlijke acceptatiegrenzen staan in het deploymentdocument. Een geïmplementeerde berekening is geen bewijs van productierechten, actuele marktdata of volledige productieacceptatie.

## 1. Doel en scope
Bouw een echte, mobiel bruikbare, Nederlandstalige trading-webapp conform [visuele baseline](DESIGN_BASELINE_V1.md), schermspecificaties, [S02 API-contracten](architecture/02-api-datamodel-contracten.md) en de [gap-analyse](PRODUCT_GAP_ANALYSIS.md). Eerste aantoonbare oplevering is een **werkende app-shell**, niet een statische HTML-presentatie.

## 2. Technische opzet
- **Frontend:** bestaande plain JavaScript-app met ES-modules, HTML, CSS en eigen router behouden. `app/main.js` verzorgt de shell; feature-/domeinmodules scheiden state, ledger, waardering, marktkwaliteit, analyse, journal en alerts. Geen React-/TypeScript-/Vite-herschrijving: de inventarisatie bevestigde een werkende bestaande app en Worker, zodat gerichte modules minder migratierisico toevoegen.
- **Styling:** CSS-variabelen/tokens voor lichte hoofdapp, donker splash; één SVG-iconenset; responsive mobile-first; tabular-nums voor geld.
- **Backend:** Cloudflare Worker met `/api/v1`, D1 voor user-scoped opslag; secrets uitsluitend in serveromgeving. Geen echte privédata in de browserbundel.
- **Tests/build:** Node `node:test` voor domein-/API-regressies, echte SQLite voor migraties en concurrerende quota, Playwright Chromium/WebKit voor browser/E2E. `npm run build` genereert de Worker-assets deterministisch; `npm run check` controleert assetgelijkheid en JavaScript-syntax. Browserchecks gebruiken de echte Worker-responses en CSP. Er is geen TypeScript-typecheck of Vitest-configuratie die niet in de repository bestaat.
- **Marktdata:** Twelve Data via beschermde Worker-adapter en bestaand secret; zoekfunctie, 5m/15m-candles, actuele exchange-status en indicatieve USD/EUR-data. Bron/schema, historische candlefase, huidige marktstatus en realtime-/displayrechten blijven afzonderlijk. Stocktwits blijft extern afhankelijk van servercredentials en gebruiksrechten. Accountbrede quota zijn gebouwd via gedeelde D1-reservering, met expliciete lokale fallback zonder binding; activering in productie is geverifieerd met migratie0004 en dezelfde D1binding op beide Workers.
- **Financiële logica:** BigInt-decimalen en stringbedragen; expliciete gemiddelde kostprijs; ledger voor stortingen, verkopen, kosten, FX en margin volgens [boekhoudbeleid](accounting/04-degiro-usd-ledger-fx.md). Waardering per valuta, dekking/concentratie, historische as-of-projectie en geconfigureerde CSV-mapping zijn gebouwd. Geen fictieve ontbrekende prijzen, impliciete FX of claim over belasting/historische FX-performance.
- **Beveiliging:** Cloudflare Access gekozen en hergebruikt; JWT issuer/audience/signature/expiry server-side gecontroleerd, ook bij interne providerbinding. Same-origin CSRF/Origin checks, eigenaarschap uit geverifieerde identiteit, parameterized queries, begrensde input, snapshotversies en conflicts. Privédata worden direct gewist bij sessieverlies. Er is geen eigen wachtwoordformulier of onbevestigde tweede authprovider.

## 3. Fasen, afhankelijkheden en bewijs
| Fase | Bouwscope | Concrete oplevering | Acceptatie / bewijs |
|---|---|---|---|
| **B0 — Inventarisatie** | Inspecteer bestaande repository, build scripts, Worker/deployment en tests. Harmoniseer light/dark-contradicties. | Bestands-/routekaart en risico's; geen destructieve overschrijving. | Reproduceerbare lokale install/build of gedocumenteerde blocker. |
| **B1 — App-shell** | Routing voor Dashboard, Portfolio, Kansen, Analyzer, Journal, Instellingen; zoekoverlay; globale header, bel, tandwiel; vijf mobiele tabs. | Navigatie tussen aparte schermen; actieve tab; browser terug; 404. | E2E op mobiel + desktop: alle tabs en headeracties werken; 320px en 375px; touch targets >=44px. |
| **B2 — Splash + Dashboard** | Splash met bootstrap, korte animatie, timeoutstatus/fout; dashboard kaarten en persoonlijke begroeting. | Functionele appstart en dashboard met expliciete lege/loading/error/demo-states. | Geen kunstmatige vertraging, reduced-motion; naam/tijdzone; geen fake live labels. |
| **B3 — Account + instellingen** | Auth, D1, user settings, privacy- en valutaschakelaars; scheiding per gebruiker. | Persistent instellingenprofiel, login/logout, API-foutstates. | 401/403/409, CSRF, user isolation, sessie- en offline-tests. |
| **B4 — Portfolio ledger** | Transacties, cash USD/EUR, stortingen, margin, fees, FX, CSV-import/export. | Reproduceerbare positie- en resultaatberekening. | Golden fixtures, partial sells, cash reconciliation, import roundtrip. |
| **B5 — Marktdata + zoeken** | Providerconnectors, quotes, candles, metadata, globale tickerzoekfunctie. | Zoekresultaten met geldige bron/tijd/delay of zonder koers; providerstatus. | Realtime alleen bij bewijs; stale/429/timeout; quota/licentiecheck. |
| **B6 — Kansen + Analyzer** | Scanner, 5m/15m VWAP/RSI/MACD, volume/RVOL, entry/stop/targets, R/R, OPEN-vergelijking. | Reproduceerbare analyse en tradeplannen met invalidatie. | Referentiecandles, geen ranking bij incomplete data, kosten/slippage/FX meegenomen. |
| **B7 — Journal + alerts** | Journal CRUD, plannen, notificatiebel, alerts, export. | Geautoriseerde end-to-end journal- en meldingenflow. | Deduplicatie, cooldown, read status, offline/permission tests. |
| **B8 — Release hardening** | Accessibility, performance, security, browsermatrix, migratie/back-up, deployment/rollback. | Controleerbare releasecandidate. | CI groen, E2E groen, echte deployment-URL en handmatige telefoonreview. |

### Gerealiseerde status per fase — 10 oktober

| Fase | Aanwezige implementatie | Bewijs / resterende acceptatie |
|---|---|---|
| **B0** | Repository-, Worker-, D1- en Access-inventarisatie; bestaande app en rekeninggegevens behouden. | [Inventarisatie](B0_REPOSITORY_INVENTARISATIE.md), [release](RELEASE_2026-10-10.md). |
| **B1** | Zes routes, vijf mobiele tabs, headeracties, zoekoverlay, notificatiepaneel, directe routes en terug/focusherstel. | Browsermatrix met echte Worker/CSP; definitieve controles staan in het releaserecord. |
| **B2** | Bootstrap/splash en dashboard met account-/lege/loading-/foutstates; geen nagemaakte actuele portefeuille. | Bestaande release-smoke vastgelegd; nieuwe dashboardgegevens houden dezelfde bewijslabels. |
| **B3** | Access-auth, D1-profiel en user-owned versiegebonden snapshot; CSRF, A/B-isolatie, 409-conflicts en directe privacyreset. | [Accountstatus](B3_ACCEPTATIE_STATUS.md), [privéstatecontract](PRIVATE_STATE_IMPLEMENTATION.md). |
| **B4** | Exacte ledger, CSV-roundtrip, expliciete header-/decimaal-/UTC-mapping, huidige/indicatieve waardering, concentratie met dekking en historische ledger-cutoff. | [Ledgerbewijs](LEDGER_IMPLEMENTATION.md), [portefeuilleacceptatie](PORTFOLIO_ACCEPTANCE.md); echte brokerexport, corporate actions en historische FX-performance blijven open. |
| **B5** | US-search, genormaliseerde candles, completed bars, status-/FX-proxy, secret reuse, cache en atomaire gedeelde quota. | [Marktbewijs](MARKET_IMPLEMENTATION.md), [quota](PROVIDER_QUOTA.md); Basic8/non-display is geen bewijs van app-displayrechten of volledige marktvolumedekking; Stocktwits niet aangesloten. |
| **B6** | VWAP/RSI/MACD/ATR, historische vergelijkingen, liquiditeit/volume, hypothetische levels en kosten-/slippage-R/R; handmatige analyzer. | Historische/descriptieve analyse werkt; actionable live ranking blijft geblokkeerd zonder entitlement, displayrechten en actuele marktstatus. |
| **B7** | Journal CRUD/export, transaction-links, werkelijk gerealiseerde gesloten-trade-statistieken, foreground one-shot alerts met read/reset/provenance. | [Journal-/alertcontract](PRIVATE_STATE_IMPLEMENTATION.md); geen productieacceptatie van live triggers of externe/background/pushlevering. |
| **B8** | Reproduceerbare assets, syntax-/unit-/browserchecks, mobiele form-layouts, focus/overlay/CSP-regressies en additieve migraties. | [Completion review](COMPLETION_REVIEW.md), [release](RELEASE_2026-10-10.md); tests en deploymentbewijs staan in het releaseverslag; fysieke telefoonreview blijft een aparte gate. |

## 4. Routes en interacties (B1)
- `/` of `/dashboard`: Dashboard; `/portfolio`: Portfolio; `/radar`: Kansen; `/analyzer`: Analyzer; `/journal`: Journal.
- `/settings`: via header-tandwiel, **niet** in de onderste vijf tabs.
- Zoekknop: mobiel full-screen overlay, desktop toegankelijke dialoog; categorieën Aandelen, Mijn portefeuille, Handelsplannen, Journal; sluiten met Escape/terug; focusherstel.
- Bel: notificatiepaneel, aanvankelijk eerlijk lege/niet-verbonden status; geen fictieve badge.
- Iedere route heeft eigen component, paginaheader, skeleton/empty/error state en test-ID; placeholders duidelijk als 'Nog niet aangesloten', niet als live functionaliteit.

## 5. Componenten en visuele contracten
De oorspronkelijke componentnamen (`AppShell`, `AppHeader`, `BottomTabBar`, `SplashScreen`, `SearchOverlay`, `NotificationPanel`, `MarketDataStatus`, `MoneyValue`, `PriceChart`, `EmptyState`, `ErrorState`, `SettingsSection`) beschrijven UI-verantwoordelijkheden; ze eisen geen React-componentimplementatie. De bestaande HTML-/moduleapp gebruikt gedeelde SVG-assets en CSS-tokens. Lichte hoofdapp en donkere splash volgen de baseline; de mock-up is richtinggevend, geen datacontract. Logo-/merkacceptatie blijft een visuele reviewbeslissing.

## 6. Definition of Done per fase
Code op afgesproken branch; aanwezige build/check/tests uitgevoerd en uitkomsten vastgelegd; browserreview mobiel/desktop; echte knoppen of zichtbaar disabled met uitleg; geen secrets/privédata in code; fout- en lege toestand getest; geen claim 'live', 'klaar' of 'realtime' zonder bewijs. Domeinunit-tests en gemockte API/browserchecks bewijzen geen providerlicentie of fysieke telefoonacceptatie. Externe blockers hebben een concrete oorzaak en aparte releasegate.

## 7. Eerste uitvoeringsvolgorde
1. Repo- en deploy-inventarisatie (B0).
2. App-shell en router met vijf tabs plus settings/zoekfunctie (B1).
3. Splash en dashboard (B2).
4. Pas dan auth/ledger/marktdata, zodat UI en echte backend stapsgewijs aantoonbaar aansluiten.

## 8. Open acceptatievoorwaarden
Auth is gekozen: Cloudflare Access. Gedeelde quota en expliciete CSV-mapping zijn geïmplementeerd en lokaal getest; hun productieconfiguratie/brokeracceptatie is geen automatisch gevolg daarvan. Open blijven: Twelve Data account-displayrechten en volume-/delay-entitlement (Basic8/non-display is onvoldoende), Stocktwits servercredentials/rechten, echte DEGIRO-export en rekeninginstellingen, privacyretentie, fysieke telefoonreview en achtergrond-/pushlevering. Geen nieuwe live ranking of productie-alertacceptatie zonder deze relevante bewijzen.

## 9. Vastgelegde lessen
Behoud een werkende platformopzet voordat een nieuw framework wordt toegevoegd. Laat releasehistorie en de huidige lokale uitbreidingen afzonderlijk zien: eerder gedeployde tests bewijzen geen nieuwe broncode. Koppel financiële/UI-totalen aan bronkwaliteit en dekking, en vermeld expliciet welke gecombineerde suites en externe acceptatie nog moeten volgen.

## 10. Opleverstatus
Uitvoerbare B3–B8-functionaliteit gepubliceerd op 10 oktober 2026. Exacte bronversie, testuitkomsten, behoud van gebruikersdata, providerquota en rollback: [deploymentbewijs](DEPLOYMENT_2026-10-10.md). Live handelssignalen blijven geblokkeerd op externe datarechten/actualiteit; broker- en fysieke telefoonacceptatie staan afzonderlijk open.

## 11. UX-prioriteit en acceptatie
Na de technische oplevering zijn de kerninteracties hersteld volgens DESIGN_BASELINE_V1: contextueel zoeken, betrouwbare unreadstatus, waarde vóór administratie, tickerdoorklikken, intervalverversing, OHLCV/VWAP/RSI/MACD, scenariodraft naar Journal en mobiele bediening. Zie UX_ACCEPTANCE_2026-10-10.md voor bewijs en afzonderlijke resterende geavanceerde schermdetails. Brede scan→Analyzer hergebruikt alleen exact passende feeds met strikt geldige ophaaltijd binnen60seconden; kwaliteitsregels worden opnieuw toegepast.
