# TradePilot Pro — Implementatiespecificatie: zelfstandig Splashscreen
Versie 1.0 · 9 oktober 2026 · Status: ontwikkelcontract, niet geïmplementeerd of getest.

## Scope en architectuur
Het splashscreen is een **app-breed opstartcomponent**, géén Dashboard-onderdeel. Het wordt in de root app-shell gerenderd tijdens sessie- en app-initialisatie, vóór routering naar Dashboard of Login. Componentnaam: `AppSplashScreen`. Een eventuele native/PWA splash wordt afzonderlijk door het platform afgehandeld; geen dubbele splashvertraging creëren.

## Visuele specificatie
- Full viewport: `min-height: 100dvh`, veilige viewport fallback `100vh`, rekening houden met mobile safe areas.
- Achtergrond: `#09111E`, zonder foto, video of fictieve marktdata.
- Gecentreerde stack: TP-logo als lokale SVG, circa 72×72px mobiel en 88×88px desktop, met vectorgeometrie; productnaam 'TradePilot Pro' onder logo in Inter/system-ui semibold 24px mobiel, 28px desktop, kleur `#EDF4FF`. Ruimte logo-naam 20px.
- Accent cyaan `#55C7ED`, zachte gloed via CSS pseudo-element; voldoende contrast en geen knippering.
- Geen 'Goedemorgen, Alexander', beursstatus, portfolio of andere privédata op splashscreen. Die verschijnen pas op Dashboard na autorisatie.
- Logo-asset moet definitief als SVG worden goedgekeurd; voorlopig monogram is een implementeerbare placeholder, geen geclaimd merkontwerp.

## Motion en lifecycle
- Op mount logo fade/translate van 0 naar 1, 250ms ease-out; woordmerk volgt na circa 100ms, 200ms fade. Maximaal één animatiecyclus, geen loop of opzettelijke wachttijd.
- Render zolang `bootstrapState` INIT/AUTH_CHECK/APP_LOADING is. Verwijder splash zodra auth en noodzakelijke app-shell-config gereed zijn; overige marktdata mogen daarna asynchroon laden in Dashboard-skeletons.
- Na succesvolle auth: route naar toegestane bestemming of Dashboard. Zonder auth: Login. Bij initialisatiefout: toegankelijk foutscherm met Retry, niet eindeloos splash.
- Als loading > circa 2s: toon status 'App voorbereiden…' met `role=status`. Als bootstrap faalt of time-out optreedt: duidelijke fout met retry, zonder kunstmatig vastgehouden logo.
- `prefers-reduced-motion: reduce`: alle transities uit; direct statisch logo. Focusbeheer na routewissel naar H1 van nieuwe pagina; screenreader leest status zonder herhaalde aankondigingen.
- Bij warme navigatie binnen de app **geen splash opnieuw**; alleen bij echte app-bootstrap. Bij browser-back niet opnieuw triggeren.

## Implementatiecontract
`AppRoot` beheert enum `bootstrapState: 'init'|'auth-check'|'app-loading'|'ready'|'unauthenticated'|'error'`. Alleen root beheert lifecycle. `AppSplashScreen({status, reducedMotion})` is presentational en krijgt geen API keys, accountinfo of marktquotes. Server bewaakt auth en retourneert nooit holdings tijdens ongeautoriseerde bootstrap. Geen setTimeout om splash kunstmatig te verlengen; timers uitsluitend voor loadingstatus en timeout. Gebruik lokale SVG + CSS, geen zware animatiebibliotheek nodig.

## Test- en reviewcriteria
SP01 cold start toont splash vóór privé-UI. SP02 warm route change toont geen splash. SP03 auth success → Dashboard, auth failure → Login. SP04 netwerkfout/timeout → fout + retry. SP05 geen onnodige vaste vertraging. SP06 reduced-motion en keyboard/screenreader. SP07 320/375/1440px plus 200% zoom zonder overflow. SP08 geen privédata, geen fictieve marktdata en geen API secrets. SP09 iOS Safari, Android Chrome en desktop browser screenshot-/E2E-validatie vereist vóór 'af'.
