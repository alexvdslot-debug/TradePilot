# TradePilot Pro — S04 DEGIRO-ledger, USD-rekening en FX
**Versie:** 1.0 · **Datum:** 2026-10-09 · **Status:** ontwerp en rekenfixtures; niet met echte DEGIRO-export getest.

## Expliciete gebruikerskeuze
De gebruiker houdt verkoopopbrengsten van Amerikaanse aandelen aan op een **USD-geldrekening** bij DEGIRO. Bij SELL wordt USD-cash gecrediteerd, **zonder automatische EUR-conversie**. Dit is een modelaanname over de rekeninginstelling, geen bevestiging van de actuele DEGIRO-configuratie. Geen veronderstelde FX-transacties of FX-kosten boeken. Een daadwerkelijke valutawissel moet als apart bevestigd ledger-event worden geïmporteerd of ingevoerd.

## Rekeningmodel
- Cash per account en valuta: `cash[USD]`, `cash[EUR]` als afzonderlijke saldi; USD-verkoop verhoogt uitsluitend USD-cash, verminderd met daadwerkelijk in USD ingehouden kosten.
- BUY USD: verlaagt USD-cash met `quantity*price + fee_usd`; SELL USD: verhoogt USD-cash met `quantity*price - fee_usd`. Fees in andere valuta worden in de eigen valuta geboekt en moeten afzonderlijk zichtbaar zijn.
- DEPOSIT/WITHDRAWAL/FX_CONVERSION zijn aparte gebeurtenissen. USD↔EUR uitsluitend na werkelijk bevestigde wissel; koers, fee, beide cashbewegingen en bron vastleggen.
- Margin/negatieve cash alleen volgens expliciet bevestigde accountinstelling. Geen veronderstelde automatische financiering of conversie.
- Reconstructie van posities, cash en gerealiseerd P&L uitsluitend uit ledger; idempotente import, auditbare correctie-events.

## Resultaatbegrippen — strikt scheiden
1. **Gerealiseerd handelsresultaat USD:** verkoopopbrengst minus toegewezen aankoopkostprijs minus relevante handelskosten in USD, volgens gekozen kostprijsmethode.
2. **Cashsaldo USD:** werkelijk aangehouden dollars; verkoop verandert de samenstelling (aandelen → USD-cash), niet automatisch de valuta.
3. **Indicatieve EUR-waardering:** USD-waarde × actuele USD→EUR koers; een **waarderingsverandering**, geen gerealiseerde FX-transactie.
4. **Gerealiseerd FX-resultaat:** alleen volgens gekozen verslagleggings-/kostprijsconventie, niet simpelweg omdat aandelen verkocht zijn. Bij latere daadwerkelijke conversie zijn historische FX-kostenbasis en uitvoeringskoers nodig.
5. **Totale portefeuilleprestatie in EUR:** kan FX-effect bevatten ondanks USD-cash; voor rendement t.o.v. EUR-inleg moeten historische FX, stortingen/onttrekkingen en methodiek worden meegenomen. Verwar dit niet met gerealiseerde conversiekosten.
6. **Aandeel-P&L in EUR:** optionele rapportage volgens historische FX-methodiek; kan verschillen van USD-handelsresultaat. Label de methode en maak geen ongefundeerde fiscale claim.

## Rekenkern — voorbeeldfixtures, volledig synthetisch
Aannames voor onderstaande voorbeelden: fees in USD, geen spread/slippage buiten uitgevoerde prijzen, FIFO als **testmethode** (definitieve keuze nog open), bedragen met decimale precisie.

### Fixture A — aankoop en gedeeltelijke verkoop, geen FX
- USD cash start: 10,000.00.
- BUY 100 OPEN @ 3.00 USD, fee 1.00 USD: USD cash = 9,699.00; voorraad 100; kostprijs incl. fee = 301.00 USD.
- SELL 40 OPEN @ 3.50 USD, fee 1.00 USD: bruto 140.00; netto USD 139.00; USD cash = **9,838.00**; resterend 60 OPEN.
- FIFO toegewezen kostprijs 40/100 × 301.00 = **120.40 USD**.
- Gerealiseerde aandeel-P&L USD = 139.00 − 120.40 = **18.60 USD**.
- Resterende kostprijs = 301.00 − 120.40 = **180.60 USD**.
- **EUR-conversie = 0; gerealiseerde FX-conversiekosten = 0**. USD cash is niet EUR-cash.

### Fixture B — FX-waardering zonder wissel
- USD cash 9,838.00; illustratieve koers 1 USD = 0.90 EUR → indicatieve EUR-waarde **8,854.20**.
- Bij 1 USD = 0.85 EUR → indicatieve EUR-waarde **8,362.30**.
- Verschil in indicatieve waarde **−491.90 EUR**. USD cash blijft **9,838.00**; er is **geen valutaomwisseling en geen gerealiseerde conversiekost**. Het economische FX-risico blijft bestaan.

### Fixture C — echte conversie afzonderlijk
- CONVERT 1,000.00 USD naar EUR tegen werkelijk uitgevoerde koers 0.90 EUR/USD en expliciete EUR-fee 2.00: USD cash −1,000.00; EUR cash +898.00. Event registreert bruto EUR 900.00, fee EUR 2.00. Gerealiseerde FX-P&L kan **niet** zonder historische FX-kostenbasis worden berekend.

### Fixture D — meerdere kooptranches (FIFO alleen ter demonstratie)
- BUY 10 @ 2.00, fee 0; BUY 10 @ 3.00, fee 0; SELL 12 @ 4.00, fee 0.
- FIFO cost of sold = 10×2 + 2×3 = **26.00 USD**; netto proceeds **48.00 USD**; gerealiseerde P&L **22.00 USD**; resterend 8 aandelen met kostprijs **24.00 USD**.
- Bij gewogen gemiddelde kostprijs zou P&L 18.00 USD zijn; methode verandert uitkomst. Daarom kostprijsmethode expliciet kiezen vóór productie.

## Import-/boekingsregels
- DEGIRO CSV: preview, mapping op trade-id, UTC-tijd, ISIN/symbol, account, aantal, prijs, uitvoeringsvaluta, kostenvaluta, cashboeking, valutaevent; geen aannames uit alleen kolomnaam.
- Match dubbele transacties op account+brokerreferentie waar beschikbaar, anders stabiele fingerprint met handmatige review; import moet idempotent zijn.
- SELL vereist beschikbare positie tenzij short/margin expliciet ondersteund; corporate actions, splits en transfers afzonderlijk afhandelen.
- Brokerfees kunnen in USD of EUR vallen: niet stilzwijgend omzetten; per valuta boeken. Bewaar raw brokerbedragen en afzonderlijke geconsolideerde EUR-waardering.
- Historische FX per boeking alleen voor EUR-rapportage, niet om de feitelijke USD-cashbeweging te wijzigen.
- Cash-reconciliatie: per valuta opening + deposits − withdrawals + sells − buys − fees ± daadwerkelijke conversions = closing. Onverklaarde verschillen blokkeren status 'gereconcilieerd'.
- Geen echte rekeningtoegang of automatische DEGIRO API-sync veronderstellen.

## UI-acceptatie
Portfolio toont **USD cash**, **EUR cash**, **gerealiseerd aandeel-P&L USD**, **indicatieve totale EUR-waarde** en **FX-waarderingseffect** afzonderlijk. Bij USD SELL: 'Opbrengst toegevoegd aan USD-geldrekening — geen valutaomwisseling geregistreerd'. Alleen echte FX-events tonen wisselkosten. Datum, koersbron en FX-actualiteit zichtbaar.

## Testmatrix (gespecificeerd, nog niet uitgevoerd)
D04-T01 BUY/SELL partial cash + P&L = fixture A; T02 FX-waardering ≠ conversie = B; T03 echte conversie = C; T04 FIFO tranches = D; T05 kosten in verschillende valuta; T06 dubbele import; T07 storting EUR versus USD; T08 negatieve USD cash zonder margin; T09 ontbrekende FX → EUR totalen onvolledig; T10 corporate-action/split; T11 accountisolatie; T12 cash-reconciliatie; T13 geen impliciete AutoFX; T14 fee/FX rounding; T15 correctie-events.

## Nog te bevestigen
(1) DEGIRO **handmatige valuta-afhandeling** daadwerkelijk ingesteld en eventuele brokeruitzonderingen; (2) exacte kostenvaluta en tarieven per order; (3) FIFO of gemiddelde kostprijs voor app-P&L; (4) echte DEGIRO CSV-voorbeelden en boekingsmomenten; (5) marginbeleid; (6) historische FX-bron voor EUR-prestatie; (7) corporate actions en transfers. Geen fiscale berekeningsmethode zonder apart besluit.

## Exit
S04-document met rekenfixtures en USD-rekeninggedrag **opgesteld**; geen echte broker-CSV getest, geen code geschreven, geen tests uitgevoerd. Volgende stap volgens gap-plan: S05 definitieve visuele wireframes, na review.
