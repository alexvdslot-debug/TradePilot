# B3 — Account + instellingen: implementatie- en acceptatiestatus

**Status: IN UITVOERING — NIET AFGEROND.** Dit is geen productie-release.

## Geïmplementeerd in branch
- `worker/migrations/0002_identity_settings.sql`: D1 users en per-gebruiker settings met versieveld.
- `worker/src/b3-settings.mjs`: `GET /api/v1/session`, `GET /api/v1/settings`, `PATCH /api/v1/settings`; Cloudflare Access JWT RSA-handtekening/audience/issuer/exp verificatie; user identity uitsluitend server-side; SQL user-scoped; optimistic concurrency (409); origin/CSRF-check; inputvalidatie.
- `worker/b3-settings.test.mjs`: security unit-tests met gesigneerde test-JWT en geïsoleerde in-memory D1 mock.
- CI-workflow voert deze unit-tests uit.

## Nog verplicht voor definitieve B3-acceptatie
- Cloudflare Access applicatie en login-provider configureren, correcte issuer/audience instellen en Access-beleid vastleggen; echte login/logout browserflows en 401/403 testen.
- D1-database provisioneren, `DB` binding toevoegen en migraties toepassen op staging; vervolgens echte D1 integratietests voor A/B-isolatie, schema, transacties en concurrente writes.
- Cross-origin cookies en CORS/CSRF-beleid end-to-end testen; GitHub Pages en Access op verschillende domeinen vereisen expliciet cookiebeleid. Niet aannemen dat browsercookies werken zonder verificatie.
- Instellingenscherm daadwerkelijk verbinden met `GET/PATCH`, inclusief loading/empty/error/401/403/409/offline, taal/tijdzone, EUR/USD en risicobudget; na reload persistent aantonen.
- JWT-certs caching/timeout/rate-limit en operationele beveiliging (CSP, sessieherroeping, auditlogging) afronden.
- Privacy/export/verwijderbeleid, rollback/back-up, mobiele E2E en toegankelijkheidsacceptatie afronden.
- Alle workflows groen op dezelfde commit, staging-deploy en browsercontrole; geen P0/P1.

**Belangrijk:** Zonder echte Access/D1-configuratie retourneert de B3 API bewust HTTP 503. Geen schijn-login, geen browser-side secrets en geen gedeelde token als gebruikersauthenticatie.

Bronnen: `docs/TECHNISCH_BOUWPLAN_V1.md`, `docs/architecture/02-api-datamodel-contracten.md`, `docs/PRODUCT_DESIGN_DOCUMENT.md`.
