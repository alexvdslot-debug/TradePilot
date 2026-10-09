# TradePilot Pro — Technisch bouwplan v1
**Datum:** 9 oktober 2026 · **Branch:** `tradepilot-pro-rebuild`  
**Status:** uitvoerbaar implementatieplan; **geen code of tests gerealiseerd door dit document**.

## 1. Doel en scope
Bouw een echte, mobiel bruikbare, Nederlandstalige trading-webapp conform [visuele baseline](DESIGN_BASELINE_V1.md), schermspecificaties, [S02 API-contracten](architecture/02-api-datamodel-contracten.md) en de [gap-analyse](PRODUCT_GAP_ANALYSIS.md). Eerste aantoonbare oplevering is een **werkende app-shell**, niet een statische HTML-presentatie.

## 2. Technische opzet
- **Frontend:** TypeScript + React + Vite, React Router, herbruikbare design-systemcomponenten. Motivering: gescheiden routes, testbare UI-states, responsive layout en gecontroleerde integratie. Keuze nog afstemmen op aanwezige repositorycode voordat bestanden worden vervangen.
- **Styling:** CSS-variabelen/tokens voor lichte hoofdapp, donker splash; één SVG-iconenset; responsive mobile-first; tabular-nums voor geld.
- **Backend:** Cloudflare Worker met `/api/v1`, D1 voor user-scoped opslag; secrets uitsluitend in serveromgeving. Geen echte privédata in de browserbundel.
- **Tests:** Vitest + Testing Library voor componenten, Playwright voor browser/E2E; typecheck, lint en build in CI. Controleer Cloudflare-compatibiliteit vóór definitieve configuratie.
- **Marktdata:** Twelve Data primaire bron, Stocktwits aanvullende controle, met providerrechten, tijdstempels, handelsfase, delay, caching en foutpaden. Nooit fictieve prijzen als live tonen.
- **Financiële logica:** USD/EUR-decimalen als strings in API en exacte decimal arithmetic; ledger met stortingen, verkopen, kosten, FX en margin volgens `docs/accounting/04-degiro-usd-ledger-fx.md`.
- **Beveiliging:** authprovider nog kiezen; HttpOnly/Secure/SameSite sessies, CSRF/Origin checks, object-level authorization, inputvalidatie, rate limits, idempotency en migraties.

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

## 4. Routes en interacties (B1)
- `/` of `/dashboard`: Dashboard; `/portfolio`: Portfolio; `/radar`: Kansen; `/analyzer`: Analyzer; `/journal`: Journal.
- `/settings`: via header-tandwiel, **niet** in de onderste vijf tabs.
- Zoekknop: mobiel full-screen overlay, desktop toegankelijke dialoog; categorieën Aandelen, Mijn portefeuille, Handelsplannen, Journal; sluiten met Escape/terug; focusherstel.
- Bel: notificatiepaneel, aanvankelijk eerlijk lege/niet-verbonden status; geen fictieve badge.
- Iedere route heeft eigen component, paginaheader, skeleton/empty/error state en test-ID; placeholders duidelijk als 'Nog niet aangesloten', niet als live functionaliteit.

## 5. Componenten en visuele contracten
`AppShell`, `AppHeader`, `BottomTabBar`, `SplashScreen`, `SearchOverlay`, `NotificationPanel`, `MarketDataStatus`, `MoneyValue`, `PriceChart`, `EmptyState`, `ErrorState`, `SettingsSection`. Gedeelde logo-asset nog goed te keuren. Lichte hoofdapp wint van oudere dark-theme passages; donkere splash blijft. Geen slogan op splash. De mock-up is richtinggevend, geen pixel-perfect of data-contract.

## 6. Definition of Done per fase
Code gecommit op afgesproken branch; build/typecheck/lint/tests uitgevoerd en uitkomsten vastgelegd; screenshotreview mobiel/desktop; echte knoppen of zichtbaar disabled met uitleg; geen secrets/privédata in code; fout- en lege toestand getest; geen claim 'live', 'klaar' of 'realtime' zonder bewijs. Bij blocker status **geblokkeerd** met reproduceerbare oorzaak.

## 7. Eerste uitvoeringsvolgorde
1. Repo- en deploy-inventarisatie (B0).
2. App-shell en router met vijf tabs plus settings/zoekfunctie (B1).
3. Splash en dashboard (B2).
4. Pas dan auth/ledger/marktdata, zodat UI en echte backend stapsgewijs aantoonbaar aansluiten.

## 8. Open beslissingen die geen B1-blokkade zijn
Definitieve SVG-logoasset; authprovider; Twelve Data/Stocktwits entitlement en quota; privacyretentie; DEGIRO-importdetails; pushnotificatielevering. Deze blokkeren respectievelijke latere integraties, maar **niet** het bouwen en testen van de app-shell.
