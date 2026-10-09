# TradePilot 5 — vijfhoekige review en design-thinking-validatie

Datum: 2026-10-09. Status: **ontwikkelversie**, geen productierelease.

## Ontwerpprincipe: vertrouwen boven schijnzekerheid

**Empathize** — Een particuliere belegger die 1–5 handelsdagen handelt, heeft beperkte tijd, wil geen fictieve realtime data en wil zijn bestaande OPEN-positie kunnen vergelijken met alternatieven zonder impulsieve rotatie.

**Define** — De kernvraag is niet “welk aandeel stijgt vandaag het hardst?”, maar “welke beslissing kan ik met verifieerbare data, vooraf gedefinieerd risico en beperkte kosten verantwoord overwegen?”.

**Ideate** — Scheid portefeuille, databroncontrole, watchlist, hypothetische scenario's en beslisdiscipline. Houd AI als laatste laag. Gebruik expliciete “niet geverifieerd”-statussen.

**Prototype** — V5 heeft een nieuwe Decision Desk, lokale V2-read-onlyportefeuille, back-upexport, koersradar met broncontrole, kostenbewuste R/R-scenario's en een vaste Cloudflare-backend.

**Test** — Regressietests voor kostprijs, chronologie, overselling, integer-aandelen en risico/rendement; syntaxcontrole via GitHub Actions. Geen claim over geslaagde browser-, iPhone- of live-marktdataintegratietests totdat die daadwerkelijk zijn uitgevoerd.

## Vijf reviewhoeken

### 1. Gebruiker / UX
- Mobielvriendelijke responsieve kaarten en scrollbare koersentabel.
- Alle kritieke knoppen hebben labels en de meeste meldingen zijn leesbaar.
- Geen overbodige API-keyvelden in de browser.
- Open: echte iPhone Safari/PWA-validatie, toegankelijkheidstest met VoiceOver en interactietest op kleine schermen.

### 2. Data / waarheid
- Eén Cloudflare Worker voor de koersfeed, geen API-key in frontend.
- Per quote: symbool, prijs, dagverandering, volume, oorspronkelijke koerstijd, status.
- Tijdzone-naïeve timestamps worden bewust niet als recent geverifieerd.
- De Worker geeft ontvangen-tijd en provider; de feitelijke datavertraging is nog niet vastgesteld.
- Open: Twelve Data plan, timezone mapping, exchange calendar, pre-/postmarket en onafhankelijke crosscheck; 5/15-minuten OHLCV.

### 3. Financiële logica / risico
- Gewogen kostprijs inclusief aankoopkosten, gerealiseerd resultaat na verkoopkosten.
- Verkoop boven positie geeft fout; transactievolgorde eerst datum, dan sequence.
- Hypothetische trade rekent inzet, risico inclusief kosten, koersdoelen na kosten en R/R.
- Open: FX-omrekening naar EUR, spread, slippage, corporate actions, dividenden, belastingen, echte stopuitvoering, backtests en technische signalen.

### 4. Security / privacy
- API-key uitsluitend als Cloudflare secret.
- Geen portefeuillegegevens naar de Worker.
- Portefeuille blijft in localStorage, met lokale JSON-back-up.
- Geen publiek toegankelijke D1-portefeuilledatabase zonder gebruikersauthenticatie.
- Open: beveiligde accounts en per-user autorisatie, D1-migraties, recovery, rate limiting op publieke koersproxy, CSP en dependency review. Origin/CORS is geen serverauthenticatie.

### 5. Engineering / betrouwbaarheid
- V5 is een aparte pagina; V2 wordt niet overschreven.
- CI-syntaxchecks en regressietests in repo toegevoegd.
- Frontend toont fouten expliciet en doet geen orderuitvoering.
- Open: bevestigde CI-resultaten, echte Worker HTTP-test, browser-end-to-endtest, performancebudget, logging zonder persoonsgegevens, monitoring en rollbackstrategie.

## Releasegates

Een productierelease mag pas worden geclaimd wanneer:
1. De live Worker voor echte tickers correct antwoordt, inclusief aantoonbare freshness/session/delay.
2. Een reproduceerbare browser- en iPhone-test slaagt.
3. D1-authenticatie en isolatie tussen gebruikers zijn getest, als cloudsynchronisatie wordt ingeschakeld.
4. Scanner-signalen op 5- en 15-minuten OHLCV zijn gevalideerd met backtests en liquiditeitsfilters.
5. Beveiligings- en hersteltests aantoonbaar slagen.

## Bekende beperkingen

De huidige radar is een **observatietabel**, geen scanner die koopkansen valideert. De “recent”-controle accepteert uitsluitend timestamps met expliciete tijdzone; veel Twelve Data quotes hebben die niet, dus de app kan terecht 0 geverifieerde tijdstempels tonen. R/R is hypothetisch en gebaseerd op door de gebruiker gekozen niveaus. Een JSON-back-up kan gevoelige portefeuillegegevens bevatten; bewaar die privé.

AI wordt pas na de bovenstaande datalaag toegevoegd.
