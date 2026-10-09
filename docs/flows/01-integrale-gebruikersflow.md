# TradePilot Pro — S01 Integrale gebruikersflow
**Versie:** 1.0 · **Datum:** 2026-10-09 · **Status:** intern gereviewde bouwspecificatie; nog geen werkende implementatie of gebruikerstest.

## Doel, grenzen en ontwerpregels
Één consistente, Nederlandstalige premium tradingcockpit met vijf routes: Dashboard, Portfolio, Opportunity Radar, Trade Analyzer en Trade Journal. DEGIRO voert orders buiten de app uit. TradePilot toont nooit fictieve livekoersen, voert geen orders uit en presenteert wachten als volwaardige beslissing. De gebruiker ziet vóór elke analyse bron, sessie, tijdstempel, vertraging en data-kwaliteit. Iedere route bewaart terugnavigatie en selectiecontext zonder verouderde handelsgegevens als actueel te behandelen.

## Globale navigatie en toestandsmachine
Routes: `/dashboard`, `/portfolio?symbol=`, `/radar?symbol=&filters=`, `/analyzer?symbol=&compare=`, `/journal?plan=`, `/settings`. URL bevat uitsluitend niet-gevoelige filters/IDs; authenticatie en autorisatie altijd server-side. Desktop: vijf-tab sidebar; mobiel: vijf-tab bottomnav met tekstlabels, safe-area en >=44px targets. De instellingen zijn bereikbaar vanuit topbar/menu en niet een zesde bottom-tab.

Globale toestanden: `booting → unauthenticated | ready | degraded | offline | error`. Geen vaste splash-wachttijd. `ready` vereist werkende accountcontext, niet per se werkende marktfeed. `degraded` toont portfolio-historie maar geen bevestigde actuele setups. `offline` toont alleen duidelijk gedateerde, lokaal beschikbare informatie; mutaties alleen als expliciet niet-gesynchroniseerd concept. 401 leidt tot herauthenticatie, 403 tot toegang geweigerd, 429 tot gecontroleerde retry/backoff. Marktstatus (NYSE/Nasdaq-sessie) en koersversheid zijn afzonderlijke waarden.

## F01 — Eerste bezoek en onboarding
1. App openen: render echt SVG-logo/splash tijdens initialisatie; reduced-motion en foutfallback.
2. Bepaal sessie; geen sessie → login/onboarding, geen persoonlijke portfolio-informatie.
3. Na login: optionele weergavenaam voor begroeting, locale/tijdzone (standaard Europe/Amsterdam op basis van expliciete voorkeur, niet stilzwijgend locatie), EUR/USD-weergave en risicobudget; wijzigingen bevestigen.
4. Portfolio leeg → dashboard met lege KPI's en CTA 'Transactie toevoegen' / 'DEGIRO CSV importeren'; geen demoportefeuille als echt tonen.
5. Import: bestand selecteren → kolommapping/preview → deduplicatie/validatie → bevestiging → ledger herberekenen → Portfolio; geen directe brokerverbinding claimen.
6. Dashboard toont persoonlijke begroeting op lokale tijd, actuele marktstatus volgens US exchange calendar inclusief DST/early closes, plus afzonderlijke feedstatus.
**Foutpaden:** login mislukt; import met verkeerde kolommen; dubbele transacties; ontbrekende FX; marktfeed uit; gebruiker slaat import over. Geen blokkade voor dashboard zonder holdings.
**Acceptatie F01:** geen gegevenslek vóór login; import is herhaalbaar zonder dubbeltelling; dynamische begroeting wisselt correct bij tijdgrenzen; beursstatus klopt bij feestdagen en DST; geen fictieve waarden.

## F02 — Van kans naar onderbouwde beslissing
1. Dashboard toont maximaal drie alleen bij gevalideerde marktdata onderbouwde kandidaten; klik 'Bekijk radar' of 'Analyseer'.
2. Radar laadt scan-universum, filters en 5m/15m OHLCV. Laat bron, timestamp, sessie, delay, spread/liquiditeit en score-uitleg zien.
3. Kandidaat selecteren → detail met VWAP/RSI/MACD/RVOL, risico, invalidatie en knop 'Analyseer'; bij ontbrekende input 'onvoldoende data', geen bevestigde score.
4. Analyzer ontvangt ticker en optionele vergelijkpositie (OPEN uitsluitend als echte holding). **Haal quotes opnieuw op**; oude Radar-quote is alleen historische context.
5. Toon entryzone, stop, targets 1/2, netto risico-rendement inclusief fees/FX/slippage, cash-/exposurelimiet, plus drie keuzes: behouden, gedeeltelijk roteren, wachten.
6. Gebruiker kan aannames aanpassen; client-preview en servervalidatie bij bewaren; foutieve stop/target blokkeert bewaren als actief plan.
7. 'Plan opslaan' → Journal met immutable quote-/assumptiesnapshot, server-ID en bevestigde opslag. 'Wachten' → optioneel concept of alert; nooit order.
**Foutpaden:** stale quote, halts, premarket zonder entitlement, onvoldoende volume, FX ontbreekt, providerconflict, rate limit, positie intussen gewijzigd, dubbel save-verzoek.
**Acceptatie F02:** dezelfde sessie/timestampbasis bij vergelijking; Radar herbevestigd in Analyzer; geen actuele setup bij slechte data; geen brokerorder; iedere CTA werkt of is expliciet disabled met reden.

## F03 — Werkelijke uitvoering en evaluatie
1. Na een externe DEGIRO-transactie registreert gebruiker fill handmatig of via gevalideerde CSV.
2. Ledger bewaart uitvoertijd, aantal, koers, valuta, fees, FX en account-ID; correcties auditbaar; cash/positie/P&L herberekend.
3. Portfolio toont open positie, kostprijs, gerealiseerd/ongerealiseerd P&L, valuta-effect, dekking en koersversheid.
4. Gebruiker koppelt fills expliciet aan een Journal-plan; ticker-overeenkomst alleen is onvoldoende.
5. Gedeeltelijke verkoop → resterende planhoeveelheid en status ACTIVE; volledig gesloten → CLOSED; evaluatie → REVIEWED.
6. Journal toont plan versus uitvoering, netto resultaat, R-multiple alleen met geldige basis, procesreflectie en les.
**Foutpaden:** dubbele import, verkeerde uitvoeringsvolgorde, short/margin-onbekend, partial exits, ontbrekende fees/FX, concurrerende edits, offline draft.
**Acceptatie F03:** geen dubbeltelling; één ledger als financiële waarheid; Journal/Portfolio reconciliëren; correcties behouden auditspoor.

## F04 — Alert en notificatiebel
1. Gebruiker kiest in Radar/Analyzer een concreet alerttype, ticker, conditie en kanaal; toestemming en marktdatarechten controleren.
2. Server slaat user-scoped regel op; alleen bevestigde opslag toont succes.
3. Geplande evaluatie haalt geldige quotes met sessie/timestamp; detecteert overgang over drempel, dedupliceert events en respecteert cooldown.
4. Bell-badge toont werkelijk aantal ongelezen meldingen; klik opent meldingenlijst met tijd, oorzaak en link naar actuele hercontrole.
5. Openen markeert gelezen; koers wordt opnieuw gevalideerd, nooit verouderd als koopadvies getoond.
**Foutpaden:** notificatietoestemming geweigerd, data stale, 429, dubbele triggers, offline, uitgeschakelde alert.
**Acceptatie F04:** geen fictieve alerts; duplicate events voorkomen; user isolation; klik naar correct instrument; alerts zonder feed niet als getriggerd melden.

## F05 — Herstel, sessiewissel en toegankelijkheid
1. Heropen app: herstel toegestane voorkeuren, actieve tab en niet-gevoelige filters; nooit onbevestigde server-save tonen.
2. App wordt hervat na achtergrondstand: vernieuw marktstatus, quote-versheid, sessie en accountcontext.
3. Feed offline/stale: label bron + laatste update; schakel bevestigde kansen uit, behoud ledgergegevens waar veilig.
4. Token verlopen: bescherm persoonlijke data, vraag opnieuw login, behoud alleen niet-gevoelige navigatiecontext.
5. Toetsenbord/screenreader: zichtbare focus, aria-current, dialoogfocus en Escape; grafieken met tekstalternatief; reduced-motion.
**Acceptatie F05:** 320/375/768/1024/1440px zonder onbruikbare controls; browser back/forward correct; offline en 401/403/429 veilig; geen misleidende realtimeclaims.

## Schermovergangen: uitvoerbaar contract
| Van → naar | Trigger | Meegegeven context | Verplichte controle |
|---|---|---|---|
| Dashboard → Portfolio | Positiekaart | ticker | auth, holdings en nieuwe quote |
| Dashboard → Radar | Kansenkaart/watchlist | ticker/filter | verse scan en sessie |
| Radar → Analyzer | Analyseer | ticker, historisch signal-ID | quote opnieuw ophalen, risico opnieuw berekenen |
| Portfolio → Analyzer | Analyseer positie | ticker/holding-ID | actuele eigendom en kostprijs |
| Analyzer → Journal | Plan opslaan | server plan-ID | servervalidatie, idempotency, autorisatie |
| Journal → Portfolio | Fill/positie bekijken | ledger event/holding-ID | user-scoped ledger |
| Bell → Radar/Analyzer | Alert openen | alert-ID/ticker | alert eigenaar en nieuwe marktdata |
| Iedere route → Settings | Instellingen | geen geheimen in URL | auth en validatie |

## Reviewmatrix (interne ontwerpcontrole, geen externe audit)
- **Product:** geen automatische orders; wachten als valide uitkomst; eerste gebruik zonder posities.
- **UX/UI:** consistent vijf-tabmodel; duidelijke informatiehiërarchie; terugnavigatie; alle controls gekoppeld aan gedrag; premiumstijl is nog visueel te bewijzen.
- **Trading/quant:** geen oude scores overnemen; kosten en risico zichtbaar; geen gefingeerde realtime-indicatoren.
- **Backend/data:** expliciete IDs, contracten, versieconflicten, idempotency, feedkwaliteit en rate limiting.
- **Security/privacy:** object-level authorisatie, veilige sessies, geen secrets in browser/URL, user-scoped notificaties.
- **QA/accessibility:** positieve en negatieve E2E-paden, responsive, screenreader, reduced motion, fouten en herstel.

## Traceerbare tests voor S01
S01-T01 first-run zonder portefeuille; T02 import + dedup; T03 dynamische begroeting/NYSE holiday/DST; T04 Radar→Analyzer stale-data hercontrole; T05 OPEN behouden/roteren/wachten; T06 Analyzer→Journal dubbele save; T07 partial sale→Journal evaluatie; T08 alert→bell→detail; T09 offline/429 en herstart; T10 auth 401/403 en data-isolatie; T11 mobiel 320px/toetsenbord; T12 back/forward + contextbehoud. **Status van alle tests: nog uit te voeren.**

## Open punten die S01 niet zelfstandig kan sluiten
Providerentitlements en scanner-capaciteit (G03/G06), OpenAPI en DB-schema (G02), DEGIRO kostprijs/importbesluiten (G04), auth/retentie (G05), definitieve visual assets en gebruikerstests (G09/G12), pushtechniek en operationele kosten (G07/G14). Geen van deze open punten als opgelost markeren.

## S01 exitstatus
**Document en interne ontwerp-review afgerond; implementatie- en testbewijs ontbreken.** S01 mag als *ontwerpspecificatie opgesteld* worden aangeduid, niet als *product gerealiseerd*. Volgende afgebakende stap na akkoord: S02 API- en datamodelcontracten.
