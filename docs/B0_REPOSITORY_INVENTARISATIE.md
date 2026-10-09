# B0 — Inventarisatie bestaande code en infrastructuur
**Datum:** 9 oktober 2026 · **Branch:** `tradepilot-pro-rebuild` · **Status:** broncode op GitHub geïnspecteerd; uitvoering van lokale build/browsertests en live deploymentcontrole nog niet gedaan.

## Gecontroleerde bron
Repository-tree op commit `359492006f600b5f4418f40b362f1d6d5315e1c3` plus bestanden: `index.html`, `pro/index.html`, `worker/src/index.mjs`, `worker/market-data.js`, `worker/wrangler.toml`, `.github/workflows/checks.yml`, `.github/workflows/tradepilot-pro.yml`, `tests/browser.spec.cjs`, `playwright.config.cjs`.

## Feitelijke bevindingen
1. **Bestaande frontend is statische HTML/JS**, met `index.html`, `pro/index.html` en oudere `v3.html`, `v4.html`, `v5.html`. Geen `package.json`, `src/` frontendstructuur of React/Vite-configuratie zichtbaar in de volledige tree. De bestaande UI gebruikt dark-theme styling; wijkt af van de goedgekeurde light-theme baseline.
2. **Wel herbruikbare domeinlogica/tests**: `pro/indicators.mjs`, `pro/indicators.test.mjs`, `tests/portfolio.test.cjs`, `tests/v5.test.cjs`. Eerst isoleren en valideren; niet blind kopiëren.
3. **Twee marktdata-Workerimplementaties**: `worker/market-data.js` (quoteproxy) en `worker/src/index.mjs` (geauthenticeerde candlesproxy met statische clienttoken). `worker/wrangler.toml` wijst naar `src/index.mjs`. Niet zonder expliciete keuze combineren; een statische clienttoken in browser is geen veilig eindgebruikers-authmodel. De Worker-code waarschuwt zelf dat auth/rate limiting nog ontbreken.
4. **Tests en CI bestaan**, maar zijn op de oude app gericht: Playwright laadt `v5.html`; checks-workflow test oude v4/v5-HTML en portfolio; Pro-workflow voert indicator- en Worker-tests uit. Dit bewijst niet dat de nieuwe app-shell werkt.
5. **Backend en opslag nog onvolledig**: `worker/migrations/0001_initial.sql` bestaat, maar een volledige user-scoped D1-API volgens S02 is in de geïnventariseerde Worker-code niet zichtbaar. Geen productieauth of bewezen live entitlement aannemen.
6. **Deploymentconfig aanwezig**, maar live productie-URL, actuele secrets, providerrechten en browserwerking zijn met deze code-inspectie niet geverifieerd.
7. **Designverschil**: de oudere dark-theme code en enkele documenten conflicteren met `docs/DESIGN_BASELINE_V1.md` (lichte hoofdschermen, donker splash). Nieuwe implementatie volgt baseline, met functionele specs als autoriteit.

## Hergebruik / behoud
- **Behouden als legacy referentie:** `index.html`, `v3.html`, `v4.html`, `v5.html`, `pro/index.html`; niet verwijderen in B1.
- **Valideren voor hergebruik:** indicatorformules, portfolio-rekentests, API-foutafhandeling, Cloudflare Wrangler-config en D1-migraties.
- **Nieuw bouwen in B1:** moderne app-shell met gescheiden routes en gedeelde componenten, light-theme tokens, SVG-headericonen, vijf werkende mobiele tabs, Settings-route en Search-overlay.
- **Tests uitbreiden:** B1-E2E richten op nieuwe route en expliciet browserterug, 320/375px, toegankelijkheid en niet-functionele knoppen.

## Technische beslissingen voor B1
1. Voeg een afzonderlijke frontend-app toe (bijv. `app/` met TypeScript/React/Vite) in plaats van oude `index.html` te overschrijven; pas routing/deploy pas na tests aan.
2. Gebruik geen live marktdata in B1; expliciete empty/not-connected states. Geen dummykoersen als realtime.
3. Maak geen directe brokerorderintegratie; gebruikersacties blijven binnen de app.
4. Test eerst bestaande Node-tests en syntax, daarna nieuwe app-build en Playwright; rapporteer echte uitvoer in volgende verificatierapport.

## B0 exitcriteria
- [x] Repositoryboom en kernbestanden op gekozen branch geïnspecteerd.
- [x] Legacy frontend en huidige Worker-entry geïdentificeerd.
- [x] Test- en CI-configuratie geïdentificeerd.
- [x] Reuse/migrationstrategie zonder destructieve overschrijving bepaald.
- [ ] Bestaande tests lokaal of via CI uitgevoerd en resultaten bekeken.
- [ ] Publieke deployment en mobiele browser geverifieerd.
- [ ] Provider/auth/security-contracten bewezen (later fase, niet nodig voor B1 app-shell).

**Conclusie:** B0 code-inventarisatie voltooid; B0 runtime-verificatie nog open. B1 kan als geïsoleerde implementatie beginnen zonder de oude demo te beschadigen.
