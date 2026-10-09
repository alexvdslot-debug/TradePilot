# TradePilot Pro — Globale zoekfunctie en notificatiecentrum
**Versie 1.0 · 9 oktober 2026 · Status: interactieontwerp, niet gebouwd.**

## Globale app-shell
Topbar op alle zes routes: zoekveld/vergrootglas met label 'Zoeken' en bel-icoon met toegankelijk label en **werkelijke** ongelezen teller. Desktop altijd zichtbaar; mobiel zoekicoon opent full-screen zoekoverlay, bel opent meldingenpaneel. Escape sluit overlay; focus keert terug; buitenklik sluit alleen zonder gegevensverlies. Ongelezen badge toont '9+' bij >9.

## Zoekfunctie — volledige flow
- Zoeken op ticker en bedrijfsnaam, bv. 'OPEN' of 'Opendoor'; aanvullend eigen holdings, plannen en journal-notities indien geautoriseerd. Categorie-tabs 'Aandelen', 'Mijn portefeuille', 'Handelsplannen', 'Journal'.
- Debounce 250–350 ms; minimaal 1–2 tekens afhankelijk provider; annuleer oude requests, voorkom race conditions. Server-side allowlist, inputlimiet, rate limit en geen querylogging met gevoelige inhoud.
- Resultaat toont ticker, bedrijfsnaam, beurs, eventueel laatst bekende koers **met bron/timestamp/delay**. Koers ontbreekt? Toon symbool zonder prijs; zoekresultaat is geen tradebevestiging.
- Keyboard: Ctrl/Cmd+K opent, pijlen bewegen, Enter opent geselecteerde route, Escape sluit; duidelijke focus/aria-activedescendant, tekstlabels en screenreader-aankondiging.
- Klik ticker → `/radar?symbol=...` of instrumentdetail; holding → Portfolio; plan → Analyzer/Journal. Bij navigatie herverifieer marktdata en user-toegang.
- Empty 'Geen resultaten', loading skeleton, fout + opnieuw proberen, offline melding, 401 herauth, 429 cooldown; geen dummyresultaten.

## Notificatiebel — volledige flow
- Bell badge telt uitsluitend echte unread records voor ingelogde gebruiker. Klik opent paneel met 'Alles', 'Ongelezen', markeer gelezen, tijd, ticker, oorzaak, status en detailroute.
- Soorten: bevestigde koersalert, planherinnering, datafeed-/systeemstatus (geen misleidende 'koop nu'-melding). Geen alert op stale of niet-geautoriseerde data.
- Trigger pipeline: user-scoped regel → providerquote met geldige timestamp/sessie → drempelovergang → deduplicatie en cooldown → opslag → belupdate. Push optioneel, niet vereist voor in-app bel.
- Klik melding → server markeert gelezen → route naar actuele hercontrole; originele triggerquote als historisch label. Fout bij markeren? Teller niet optimistisch definitief verlagen.
- Leeg 'Je hebt geen meldingen'; offline laatste synchronisatietijd; 401/403 en retries; geen notificaties van andere gebruikers.

## API-voorstel / S02-delta
`GET /api/v1/search?q=&scope=all|symbols|portfolio|plans|journal&limit=10`: resultaten met type, title, symbol, target_route, quote_quality?; private scopes vereisen auth. `GET /api/v1/notifications?unread_only=&cursor=`; `POST /api/v1/notifications/{id}/read`; `POST /api/v1/notifications/read-all` met idempotency key; `GET/POST/PATCH /api/v1/alerts`. Schema en providerzoekrechten in S02-revisie valideren.

## Acceptatie (niet uitgevoerd)
GS01 ticker- en bedrijfsnaamzoek; GS02 auth-scope; GS03 keyboard/mobiel; GS04 race/429/offline; GS05 prijsmetadata; NT01 teller klopt; NT02 geen dubbele triggers; NT03 geen stale alerts; NT04 markeren gelezen idempotent; NT05 correcte deep links; NT06 privacy en user-isolatie; NT07 push alleen na toestemming en backendbewijs.

**Geen werkende zoekservice, alertscheduler of notificatiecentrum geclaimd.**
