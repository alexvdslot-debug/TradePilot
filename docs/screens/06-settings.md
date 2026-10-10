# TradePilot Pro — Scherm 06: Instellingen

> Current implementation verification: see [final conformance register](../FINAL_CONFORMANCE.md). Original version/status below records the design review. Light main screens and dark splash follow [DESIGN_BASELINE_V1](../DESIGN_BASELINE_V1.md); older dark-sidebar compositions are superseded. User-approved final completion is being audited and tested; do not infer implementation from this specification.

**Versie 1.0 · 9 oktober 2026 · Status: gespecificeerd; niet gebouwd of visueel getest.**

## Doel en navigatie
Zesde volledige route `/settings`, bereikbaar via profiel-/tandwielmenu in de app-shell. Desktop sidebar toont zes items. Mobiel behoudt vijf primaire tabs en toont Instellingen via profielmenu (geen onleesbare zes-tabbar). Terug naar vorige route zonder verlies van niet-gevoelige filters. Account en persoonlijke voorkeuren zijn user-scoped.

## Schermindeling
Header 'Instellingen', subtitel 'Weergave, risico en meldingen', opgeslagen-status en laatste wijziging. Desktop tweekoloms: linker sectienavigatie, rechter formulieren; mobiel gestapelde secties. Premium dark theme met bestaande design tokens, focus, foutmeldingen en duidelijke primaire/secondaire acties.

### A. Profiel en regio
Weergavenaam voor begroeting; taal Nederlands; tijdzone (standaard expliciet gekozen Europe/Amsterdam); datum- en getalnotatie; profiel/afmelden. Geen impliciete adres- of locatiedata.

### B. Valuta en portefeuille
Primaire **weergavevaluta EUR** voor geconsolideerde waarde, **handelsvaluta USD** voor Amerikaanse aandelen. Toggle 'Toon USD-waarde naast EUR' standaard aan. Voorbeeld als **demo**, geen echte holdings: **€ 30.000 ≈ $ 33.000**, koers 1 EUR = 1,10 USD; bron/timestamp en 'indicatief'. USD-cash blijft USD na verkoop. Afzonderlijke USD- en EUR-geldrekening. Keuze 'Handmatige valutawissel bij DEGIRO' als accountmodel; instelling kan niet zonder audit het verleden herboeken. Historische FX voor performance versus actuele FX voor waardering apart.

### C. Risico en analyse
Risicobudget per trade (€), max exposure, voorkeursinterval 5m/15m, alertdrempels. Opslaan server-side met validatie, versiecontrole en bevestiging; nooit stilzwijgend een brokerorder.

### D. Meldingen
In-app notificaties aan/uit, categorieën koersalerts/systeem/datafouten, cooldown, push alleen als technisch ondersteund en na browsertoestemming. Toont laatste levering/foutstatus en link 'Bekijk alle meldingen'. Geen push claim zonder server-worker/service worker.

### E. Data en transparantie
Beschikbare providers en entitlements (geen API-secrets), realtime/delayed/unknown, laatst bijgewerkt, foutstatus, uitleg indicatoren, providerrechten. 'Realtime' alleen als bewezen. Eventuele upgradeverwijzing geen betaling zonder expliciete actie.

### F. Privacy en account
Export eigen transacties/journal; verzoek tot gegevensverwijdering met bevestiging en bewaartermijninformatie; sessiebeheer; uitloggen. Geen definitieve verwijderflow zonder retentie- en backupbesluit.

## Interacties en edge cases
Form dirty-state, 'Wijzigingen opslaan', 'Annuleren', validatiefout inline, 401 login, 403 denied, 409 version conflict, 429 retry, offline read-only met niet-opgeslagen status, succes na serverbevestiging. Switch van EUR naar USD verandert alleen presentatie, **niet ledgerboekingen**. FX ontbreekt → geen geconsolideerde €-waarde, wel USD-bedragen met waarschuwing.

## API-voorstel
`GET/PATCH /api/v1/settings`, `GET /api/v1/session`, `GET /api/v1/market/status`; server auth en CSRF/If-Match. Nieuwe alert-/privacy-endpoints nog uit te werken in S02-contractrevisie.

## Acceptatiecriteria (nog niet getest)
ST01 zesde route bereikbaar; ST02 mobiel vijf tabs + profielmenu; ST03 EUR/USD-weergave zonder mutatie ledger; ST04 valuta bron/timestamp; ST05 409 en offline correct; ST06 notificatietoestemming en privacy; ST07 toetsenbord/screenreader/reduced motion; ST08 geen secrets; ST09 voorkeuren persistent per gebruiker; ST10 alle knoppen werken of disabled met reden.

**Open:** authprovider, privacyretentie, pushlevering, brokeraccountinstellingen, FX-bron. Geen werkende UI geclaimd.
