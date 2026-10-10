# TradePilot Pro — Visuele ontwerpbaseline v1
**Datum:** 9 oktober 2026  
**Status:** vastgelegde visuele richting voor implementatie; geen bewijs van werkende app of goedkeuring van elk detail.

## Referentie en prioriteit
De op 9 oktober 2026 gegenereerde overzichtsmock-up met zeven hoofdschermen en twee zoekvoorbeelden is de **visuele referentie** voor de bouw. De afbeelding werd in het gesprek geleverd als `a_clean_high_resolution_app_ui_mockup_collage_on.png`; opname van de afbeeldingsbytes in deze repository is **nog niet bevestigd**. Dit document borgt de ontwerpbesluiten onafhankelijk van een tijdelijke chatbijlage.

Bij tegenstrijdigheden geldt: functionele specificaties, data-integriteit, veiligheid en toegankelijkheid gaan vóór de afbeelding. De mock-up toont **uitsluitend fictieve demonstratiekoersen en resultaten**.

## Schermoverzicht
1. **Splashscreen:** diep marineblauw `#09111E`, centraal herkenbaar TradePilot Pro-logo/woordmerk, cyaan `#55C7ED`, rustige eenmalige animatie gekoppeld aan echte bootstrap. Geen kunstmatige wachttijd, geen slogan. Bij >2 seconden status, bij fout herstelactie. Zie `docs/components/00-app-splashscreen.md`.
2. **Dashboard:** lichte achtergrond, begroeting naar lokale tijd en ingestelde weergavenaam (voorbeeld: 'Goedenavond, Alexander'), overzicht markt, portefeuille en kansen.
3. **Portfolio:** waarde, prestatiegrafiek, cash, posities en transacties; EUR-weergave en USD-ledger strikt gescheiden.
4. **Kansen:** scan-/watchlistkaarten met ticker, bedrijfsnaam, koerskwaliteit, momentum en drill-down.
5. **Analyzer:** aandeel zoeken/selecteren, 5m/15m-grafiek, indicatoren en onderbouwde handelsplannen met instap/stop/doelen/kosten.
6. **Journal:** resultaten, tradehistorie, notities en trade-invoer.
7. **Instellingen:** bereikbaar via tandwiel rechtsboven; profiel, valuta, risico, meldingen, datatransparantie, privacy. Geen zesde mobiele tab. Zie `docs/screens/06-settings.md`.

## Globale zoekfunctie
Het vergrootglas in de vaste header opent op mobiel een schermvullende overlay met zoekveld, annuleren/sluiten, categorieën (Aandelen, Mijn portefeuille, Handelsplannen, Journal) en resultaten voor ticker of bedrijfsnaam. Resultaatprijzen alleen met bron, tijdstempel en vertraging; geen gesimuleerde realtime status. Op desktop een toegankelijk zoekvenster. Zie `docs/screens/07-global-search-notifications.md`.

## Consistente app-shell
- **Lichte hoofdschermen**: wit/off-white canvas, rustige kaarten, marineblauwe tekst en blauw/cyaan als actieaccent. De donkere splash is bewust een uitzondering.
- **Zelfde merkasset** in splash, header en app-icoon. Definitief vectorlogo nog visueel goed te keuren; tijdelijke illustratie uit de mock-up is niet automatisch definitief.
- **Zelfde header** op de vijf primaire schermen: merk links; rechts zoeken, notificatiebel en instellingen, als herkenbare SVG-iconen met toegankelijke labels en touch targets >=44px.
- **Vijf vaste mobiele tabs**: Dashboard, Portfolio, Kansen, Analyzer, Journal. Actieve tab duidelijk blauw, alle tabs echt navigeerbaar en met correcte terugnavigatie. Instellingen en Zoeken zijn aparte routes/overlays.
- Consistente typografie, spacing, cards, iconen, grafiekstijl, loading/empty/error states, responsive gedrag en toetsenbord/screenreaderbediening.

## Expliciete afwijkingen / nog te besluiten
- `docs/PRODUCT_DESIGN_DOCUMENT.md` en `docs/screens/06-settings.md` beschrijven nog een **dark-theme** hoofdapp. Voor het visuele ontwerp is nu **light-theme voor de hoofdschermen** gekozen; die oudere documenten moeten bij implementatie op dit punt worden geharmoniseerd.
- De gegenereerde splashmock-up toont de slogan 'Smarter Trading Every Day'. **Niet overnemen**: de goedgekeurde splashspecificatie schrijft geen slogan voor.
- De getoonde zoekvoorbeelden tonen prijzen zonder volledige bron/timestamp/delay. De echte app moet die metadata wel tonen of de prijs weglaten.
- De gegenereerde mock-up is een compositie, geen pixel-perfect componentenspecificatie en geen bewijs van functionaliteit.
- Logo, exacte design tokens voor de lichte app en alle detailinteracties moeten nog als implementeerbare componenten worden uitgewerkt.

## Eerste bouw- en verificatiepoort
Start met app-shell, splash, vijf werkende routes, consistente header en dashboard-layout. Verifieer op mobiel en desktop: navigatie, zoekoverlay openen/sluiten, instellingenroute, browser terug, loading/foutgedrag, responsiviteit en toegankelijkheid. Geen mockdata als live markeren. Pas 'werkend' claimen na aantoonbare tests en controle van de gedeployde app.

## Brondocumenten
- `docs/PRODUCT_DESIGN_DOCUMENT.md`
- `docs/screens/01-dashboard.md` t/m `07-global-search-notifications.md`
- `docs/components/00-app-splashscreen.md`
- `docs/DATA_INTEGRATION_MATRIX.md`

## Richting bevestigd — 10 oktober 2026
De gebruiker heeft de ontbrekende mockup als blokkerende referentie losgelaten: “maakt niet uit, de ux moet strak, helder van kleur.. en duidelijke icons en graphics hebben.” Voor de huidige afronding gelden de vastgelegde lichte richting, heldere hiërarchie, herkenbare SVG-iconen en echte financiële grafieken. Exacte gelijkenis met de verdwenen collage is geen acceptatievoorwaarde meer. De overige functionele en data-integriteitsafspraken blijven gelden.
