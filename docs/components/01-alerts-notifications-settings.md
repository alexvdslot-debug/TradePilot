# TradePilot Pro — Alerts, meldingen en instellingen v1.0
Status: technische ontwerp-specificatie; nog niet gebouwd of getest.

## Informatiearchitectuur
Globale app-shell: zoekicoon en belicoon rechtsboven op alle vijf hoofdschermen, inclusief mobiel. Bel opent meldingenpaneel; paneel bevat 'Alle meldingen' en 'Alerts beheren'. Tandwiel in navigatie opent Instellingen > Meldingen & alerts. Analyzer/Portfolio/Radar bieden contextuele knop 'Alert instellen'. Geen zesde hoofdtab.

## Alerts beheren (secundaire route /alerts)
Lijst met ticker, type, operator, grens, sessies, kanaal, status, laatste trigger en acties: bewerken, pauzeren/hervatten, verwijderen. Zoek/filter op ticker, status, type. 'Nieuwe alert' opent editor. Empty state: 'Nog geen alerts' + Nieuwe alert. Fouten: retry zonder stil dataverlies. Alle records gebruiker-gebonden.

## Alerteditor
Verplichte velden: geldige ticker/venue, conditie (boven/onder prijs; geavanceerde indicatoralerts pas wanneer ondersteund), USD-drempel >0, sessie(s) (premarket/regulier/after-hours), notificatiekanaal (in-app altijd; browser opt-in indien infrastructuur beschikbaar). Toon bron, vertraging en relevante koers/timestamp. Valideer server-side; voorkom dubbele triggers door edge crossing, hysterese/cooldown en idempotency. Bij save: bevestiging + zichtbaar in beheer. Bewerk/pauzeer/verwijder met persistente backendstatus.

## Meldingenpaneel en overzicht
Echte opgeslagen meldingen met titel, ticker, beschrijving, triggerprijs, tijdstip inclusief tijdzone, gelezenstatus en deep-link. Badge telt ongelezen. Openen markeert gelezen; 'Alles gelezen' werkt persistent. Bij geen meldingen expliciete lege staat. Bij ontbrekende service foutmelding, nooit demo-alerts als live.

## Instellingen > Meldingen & alerts
Algemene voorkeuren: toegestane sessies, standaard notificatiekanalen, browserpermissie-status, geluidsoptie indien ondersteund, standaard cooldown en voorkeurstijdzone. Specifieke alertregels blijven primair op /alerts en bij het aandeel. Veranderde voorkeuren moeten opgeslagen en bij herstart geladen worden.

## Backend en leveringsvoorwaarden
Entiteiten: Alert(id,user_id,symbol,venue,condition,threshold,currency,sessions,channels,status,cooldown,created_at,updated_at); Notification(id,user_id,alert_id,occurred_at_utc,observed_price,quote_timestamp_utc,source,read_at,deep_link). API: GET/POST /api/alerts; PATCH/DELETE /api/alerts/:id; GET /api/notifications; POST /api/notifications/read-all; PATCH /api/notifications/:id/read; GET/PATCH /api/preferences/notifications. API-autorisatie per gebruiker, inputvalidatie, rate limiting, auditlog.

Een server-side scheduler/worker controleert alerts ook als de app gesloten is. Correcte markt-/feestdagkalender en quote-session, tijdstempel, realtime/delayed-status verplicht. Vertraagde marktdata mogen geen ongekwalificeerde 'live trigger'-claim opleveren. Browser push vereist expliciete toestemming, service worker en werkende pushinfrastructuur; zonder die infrastructuur geen pushoptie aanbieden. Brokerorders worden nooit automatisch geplaatst door een alert.

## Acceptatie
N01 alert aanmaken → persistent record; N02 wijzigen → worker nieuwe conditie; N03 pauzeren → geen triggers; N04 verwijderen → geen triggers; N05 trigger → exact één melding met herleidbare bron/timestamp; N06 belbadge correct en gelezenstatus persistent; N07 deep-links correct; N08 offline/bronfout → transparante fout; N09 browserpermissie geweigerd → app blijft bruikbaar; N10 toegankelijk via alle vijf schermen op desktop/mobiel; N11 gesloten app → servercontrole blijft lopen indien service operationeel; N12 geen alerts uit fictieve of onbetrouwbare quotes.
