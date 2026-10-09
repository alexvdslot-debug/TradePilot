# TradePilot Pro — S03 Marktdata-provider-validatie
**Datum:** 2026-10-09 · **Versie:** 1.0 · **Status:** live connector-proeven uitgevoerd; gedeeltelijk geslaagd; productiegeschiktheid NIET bewezen.

## Testmethode
Live via de verbonden Twelve Data- en Stocktwits-connectors, ticker **OPEN**, op 9 oktober 2026 rond 19:45 UTC. De onderstaande waarden zijn **tijdgebonden testobservaties, geen actuele handelsaanbevelingen**. Endpointcontracten en accountrechten zijn getest voor één ticker, niet voor een volledig scan-universum. Tijdzones van OHLCV-responses werden niet expliciet meegeleverd; ga niet zonder verdere verificatie van UTC uit.

## Geobserveerde uitkomsten
| Test | Uitkomst | Betekenis |
|---|---|---|
| Twelve Data authenticatie | PASS: token geverifieerd | Connector werkt |
| API usage | PASS: respons `2026-10-09 19:45:43;2;800` | API geeft gebruik/planlimiet; **niet** hetzelfde als credits per minuut |
| OPEN quote met prepost=true | PARTIAL: close 2.205 USD, exchange NASDAQ; extended_price=0, extended_timestamp=0 | Gewone quote beschikbaar; extended-hours quote niet aangetoond; geen gegarandeerde realtimeklasse |
| 5m OHLCV met prepost=false | PASS: vijf candles, nieuwste label `2026-10-09 15:40:00` | Reguliere intradaybars beschikbaar; timezone/complete-candle nog te bewijzen |
| 15m OHLCV met prepost=false | PASS: vijf candles, nieuwste `2026-10-09 15:30:00` | Reguliere intradaybars beschikbaar |
| 5m OHLCV met prepost=true | BLOCKED: Pro individual / Venture business of hoger vereist | Extended-hours candles **niet beschikbaar op huidige toegang** |
| 15m RSI | PASS: RSI `41.098422` bij `15:30:00` | Indicatorendpoint werkt |
| 15m MACD | PASS: MACD `-0.0095618102`, signal `-0.0095156967` bij `15:30:00` | Indicatorendpoint werkt |
| 15m RVOL | BLOCKED: Grow/Pro/Ultra/Venture/Enterprise vereist | Native RVOL niet beschikbaar op huidige toegang; eigen RVOL op ruwe OHLCV vereist extra data/definitie |
| 5m VWAP | BLOCKED: 9 credits gebruikt bij minuutlimiet 8 | VWAP-entitlement **onbeslist**, retry na reset nodig |
| NASDAQ market state | PASS: is_market_open=true, time_to_close=00:14:15 | Exchange-status beschikbaar; holiday/DST-correctheid nog niet bewezen |
| Stocktwits symbol | PASS: OPEN 2.205 USD, `2026-10-09T15:45:00-04:00`, change -3.712% | Tweede bron met tijdstempel; niet onafhankelijk geverifieerd als beursrealtime |
| Stocktwits sentiment | PASS: score 33/100 label BEARISH; legacy bullish_pct 66.22% | **Score en legacy percentages zijn verschillende maatstaven**; niet gelijkstellen |
| Stocktwits message volume | PASS: now normalized 44/100 LOW | Genormaliseerde activiteit, geen letterlijk berichtenaantal |

## Kruiscontrole en tijdstempels
Twelve Data quote: `close=2.205`, `last_quote_at=1791575100`; Stocktwits: `price=2.205`, `price_time=2026-10-09T15:45:00-04:00`. Numerieke prijs komt overeen. Twelve Data `last_quote_at` dient expliciet als UNIX-seconden te worden geïnterpreteerd en met exchange/received timestamps te worden genormaliseerd. **Prijs-overeenkomst bewijst geen onafhankelijke realtimefeed, licentie of beschikbaarheid in een productieapp.**

## Technische consequenties
1. **Geen premium scanner op huidige verbinding beloven.** De minutenlimiet van 8 credits is bij enkele testcalls overschreden; zelfs een kleine multi-symbol 5m/15m scan met indicatoren kan daardoor blokkeren. Endpoint-creditgewichten, batchmogelijkheden, caching en kosten eerst meten.
2. **Reguliere 5m/15m bars werken voor OPEN.** Bepaal complete-candle-regels, exchange timezone, delayed/realtime-entitlements en test meerdere symbolen/marktfasen.
3. **Premarket/after-hours candles zijn geblokkeerd.** Ontwerp moet extended-hours signalen uitschakelen of na expliciete planupgrade en licentiecheck ondersteunen. Zie [Twelve Data pricing](https://twelvedata.com/pricing).
4. **Native RVOL geblokkeerd.** Alternatief: zelf berekenen uit voldoende historische, sessie-consistente candles; verifieer historische diepte en credits. Geen fictieve RVOL.
5. **VWAP nog niet vastgesteld.** Rate limit verhinderde de test; opnieuw proberen na minuutreset, niet als onbeschikbaar markeren.
6. **Stocktwits sentiment ≠ marktkoersbron met gegarandeerde realtime rechten.** Toon sentiment score en normalized message volume met eigen timestamp/semantiek; gebruik quote uitsluitend als secundaire kruiscontrole.
7. **Marktstatus gescheiden van feedstatus.** Test weekends, holidays, early closes, VS/EU DST en quotes rond open/close.
8. **Geen externe redistributierechten vastgesteld.** Een persoonlijke connectorcall bewijst niet dat data legaal/technisch in een Cloudflare-webapp voor eindgebruikers mogen worden doorgegeven.

## Validatiematrix en besluit
- Auth: **bevestigd**.
- Quote, reguliere 5m/15m candles, RSI, MACD, NASDAQ-status: **voor OPEN bevestigd**.
- Stocktwits prijs-/sentiment-/activiteitsrespons: **voor OPEN bevestigd**.
- Realtime SLA, vertraging, prijsfeedrechten, productie-redistributie, scanuniversum, RVOL-berekening, VWAP, credits per endpoint, providerkosten, bid/ask, historische FX: **niet gevalideerd**.
- Extended-hours OHLCV en native RVOL: **huidige toegang ontoereikend**.
- S03 release-gate: **NIET GESLAAGD**; vooralsnog alleen reguliere, beperkt geteste analysefunctionaliteit ontwerpen met duidelijk 'data niet beschikbaar' gedrag.

## Volgende gerichte verificatie (niet uitgevoerd)
Na reset VWAP testen; vervolgens 5m/15m complete-candle en timestamp semantics op 3-5 tickers; quota/creditmetingen per call; bid/ask en historische FX; abonnement/redistributievoorwaarden; eigen RVOL-fixtures; market calendar; latency- en loadtest. **Geen upgrade of betaling uitgevoerd.**

## Review
Interne controle tegen S01/S02: bron/timestamp/sessie/delay moeten expliciet blijven; blocked endpoints mogen niet als 'supported' in de app worden geadverteerd. Dit is een **praktijktest van connectors**, geen audit van een draaiende TradePilot-app.
