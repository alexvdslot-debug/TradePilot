# B3 — Account + instellingen: implementatie- en acceptatiestatus

**Status: IN UITVOERING — NIET AFGEROND.** Dit is geen productie-release.

## Geïmplementeerd in branch
- `worker/migrations/0002_identity_settings.sql`: D1 users en per-gebruiker settings met versieveld.
- `worker/src/b3-settings.mjs`: `GET /api/v1/session`, `GET /api/v1/settings`, `PATCH /api/v1/settings`; Cloudflare Access JWT RSA-handtekening/audience/issuer/exp verificatie; user identity uitsluitend server-side; SQL user-scoped; optimistic concurrency (409); origin/CSRF-check; inputvalidatie.
- `worker/b3-settings.test.mjs`: security unit-tests met gesigneerde test-JWT en geïsoleerde in-memory D1 mock.
- CI-workflow voert deze unit-tests uit.

## Uitgevoerde stagingstappen (10 oktober 2026)
- Cloudflare D1 **tradepilot-pro-staging** aangemaakt in EU-jurisdictie, ID `052feeda-74df-4a2e-923f-0a2bf1d97d08`.
- Migratie `0002_identity_settings.sql` toegepast; beide tabellen `users` en `user_settings` via echte D1-query bevestigd.
- Worker `tradepilot-pro-api` geüpload en `workers.dev`-route geactiveerd. URL: `https://tradepilot-pro-api.alexvdslot.workers.dev/`. Geen Access-instellingen: B3 retourneert bewust 503. Dit is **geen functionerende login**.
- `pro/index.html` bevat nu instellingenformulier met accountstatus, GET/PATCH, foutmeldingen en versiecontrole; code is in GitHub, nog niet als definitieve mobiele release geverifieerd.
- Cloudflare API meldt expliciet `access.api.error.not_enabled`: **Zero Trust Access moet door de accounteigenaar worden ingeschakeld in het Cloudflare-dashboard**. Zonder die stap kan er geen echte Access-login en geen geldige `ACCESS_AUD`/team-issuer worden ingesteld.

## Nog verplicht voor definitieve B3-acceptatie
- Cloudflare Access applicatie en login-provider configureren, correcte issuer/audience instellen en Access-beleid vastleggen; echte login/logout browserflows en 401/403 testen.
- Echte D1 integratietests voor A/B-isolatie, schema, transacties en concurrente writes (database en migratie zijn nu geprovisioneerd).
- Cross-origin cookies en CORS/CSRF-beleid end-to-end testen; GitHub Pages en Access op verschillende domeinen vereisen expliciet cookiebeleid. Niet aannemen dat browsercookies werken zonder verificatie.
- Instellingenscherm daadwerkelijk verbinden met `GET/PATCH`, inclusief loading/empty/error/401/403/409/offline, taal/tijdzone, EUR/USD en risicobudget; na reload persistent aantonen.
- JWT-certs caching/timeout/rate-limit en operationele beveiliging (CSP, sessieherroeping, auditlogging) afronden.
- Privacy/export/verwijderbeleid, rollback/back-up, mobiele E2E en toegankelijkheidsacceptatie afronden.
- Alle workflows groen op dezelfde commit, staging-deploy en browsercontrole; geen P0/P1.

**Belangrijk:** Zonder echte Access/D1-configuratie retourneert de B3 API bewust HTTP 503. Geen schijn-login, geen browser-side secrets en geen gedeelde token als gebruikersauthenticatie.

Bronnen: `docs/TECHNISCH_BOUWPLAN_V1.md`, `docs/architecture/02-api-datamodel-contracten.md`, `docs/PRODUCT_DESIGN_DOCUMENT.md`.

## Cloudflare Access geactiveerd en geverifieerd (10 oktober 2026)
- Zero Trust-organisatie: `misty-surf-09c1.cloudflareaccess.com`.
- Self-hosted Access-app: `TradePilot Pro Private API`, ID `8f89ad13-1777-4530-a182-de9837ff17fb`, domein `tradepilot-pro-api.alexvdslot.workers.dev`.
- Toegangsbeleid `Owner only` staat op exact één e-mailadres (niet hier herhaald).
- Cloudflare One-time PIN identity provider bestaat.
- Worker-bindings `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ALLOWED_ORIGIN` en `DB` zijn via Cloudflare API bevestigd.
- Frontend heeft login- en logoutlinks op het API-domein; CI valideert de URLs.

**Open acceptatierisico:** de UI wordt op een ander domein geserveerd dan de Access-beveiligde API. Cross-site `fetch(...,{credentials:'include'})` kan in Safari door third-party cookiebeleid mislukken, ook na geslaagde Access-login. De definitieve oplossing is UI en API via hetzelfde site-/originbeleid aanbieden of een expliciet veilig alternatief ontwerpen. Dit is niet end-to-end geverifieerd; B3 niet als gereed markeren totdat iPhone Safari en desktop daadwerkelijk inloggen, instellingen wijzigen, reload en uitloggen aantonen.

## B3 same-origin release (10 oktober 2026)
- De volledige lichte hoofdapp is op `https://tradepilot-pro-api.alexvdslot.workers.dev/app/` gepubliceerd, achter dezelfde Cloudflare Access-app als `/api/v1/session` en `/api/v1/settings`.
- De Worker levert HTML, JS, CSS en SVG-assets met CSP, `no-store`, `X-Content-Type-Options` en `X-Frame-Options`.
- De hoofdapp gebruikt voor accountverzoeken `location.origin` op dit Worker-domein; Safari heeft hierdoor geen cross-site sessiecookie meer nodig.
- Voor PATCH is CSRF-bescherming aangescherpt: de request-Origin moet gelijk zijn aan de daadwerkelijke API-origin, met de bestaande `X-TradePilot-CSRF` header.
- GitHub CI: `TradePilot Pro quality gates` groen op commit `70bba47`; `TradePilot app shell checks` groen op de wijziging aan de hoofdapp; legacy TradePilot checks groen op `3f97fc2`.
- Cloudflare Worker-upload geslaagd (HTTP 200), maar **een echte iPhone-browsertest van PATCH + reload is nog nodig**. Dit document claimt geen definitieve B3-afronding.

### iPhone acceptatieprocedure
1. Open `https://tradepilot-pro-api.alexvdslot.workers.dev/app/` in Safari (zelfde domein als de beveiligde API).
2. Open Instellingen en controleer of `Ingelogd · instellingen geladen` verschijnt.
3. Wijzig een niet-gevoelige instelling, bijvoorbeeld de weergavenaam; druk Opslaan.
4. Controleer `Opgeslagen in beveiligde database`, laad de pagina opnieuw en bevestig dat de wijziging behouden is.
5. Controleer uitloggen en opnieuw inloggen. Test 401/403 en toegang vanaf een niet-geautoriseerd account in een aparte browsersessie.
