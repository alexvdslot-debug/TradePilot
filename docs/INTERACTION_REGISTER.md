# TradePilot Pro — Interactieregister v1.0
Status: ontwerpcontract; niet geïmplementeerd of getest. Scope: vijf hoofdschermen en globale app-shell. Elke interactie heeft trigger → resultaat → leeg/fout → test.

## Globale app-shell (op alle vijf schermen)
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| G01 | Logo | Dashboard; geen nieuwe splash bij interne navigatie | Niet-ingelogd → login | Navigatie correct |
| G02 | Zijbalk Dashboard | Dashboard met KPI, posities, risico's, kansen | Skeleton/lege portefeuille | Actieve navigatie |
| G03 | Zijbalk Portfolio | Portfolio met posities, totalen en filters | Lege portefeuille CTA | Actieve navigatie |
| G04 | Zijbalk Opportunity Radar | Radar met kansen, filters en sortering | Geen matches / bronfout | Geen fictieve signalen |
| G05 | Zijbalk Trade Analyzer | Analyzer met laatst gekozen ticker of zoektoestand | Geen ticker → invoer | Geen gefabriceerde koers |
| G06 | Zijbalk Trade Journal | Journal met transacties en notities | Lege staat met CTA | Correcte records |
| G07 | Vergrootglas | Globale zoek-overlay: ticker/bedrijfsnaam, selectie → Analyzer | Geen resultaten, API-fout | Escape, Enter, focus, loading |
| G08 | Bel | Meldingenpaneel: gelezen/ongelezen, timestamp, bron en deep-link | Geen meldingen; backendfout | Alleen echte records; badge = ongelezen |
| G09 | Bel → Alle meldingen | Volledige meldingenweergave met filter/status | Lege lijst | Pagina of modal, terugroute |
| G10 | Bel → Alerts beheren | Centrale alertbeheerpagina | Geen alerts → CTA | CRUD en autorisatie |
| G11 | Tandwiel Instellingen | Instellingen met secties Profiel, Meldingen & alerts, Marktdata | Load-/savefout | Wijzigingen persistent |
| G12 | Mobiele navigatie | Zelfde vijf bestemmingen; zoeken en bel in vaste bovenbalk | N.v.t. | Toetsenbord/touch |
| G13 | Persoonlijke begroeting | Tijdzone-afhankelijke dagdeeltekst op Dashboard | Naam ontbreekt → zonder naam | Update bij tijdwissel |
| G14 | Marktstatusbadge | Premarket/Open/After-hours/Gesloten/Onbekend op Dashboard | Kalender/API-fout → onbekend | DST/feestdag/early-close |

## Dashboard
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| D01 | KPI-/portefeuillekaart 'Bekijk alle' | Portfolio met actuele positie- en P/L-gegevens | Lege portefeuille | Bestemming en context |
| D02 | Positierij/ticker | Analyzer van geselecteerde ticker; portfolio-context blijft beschikbaar | Ticker niet beschikbaar | Juiste ticker |
| D03 | Positie-actiemenu (...) | Alleen daadwerkelijk ondersteunde acties, zoals details of journal | Ontbrekende actie niet tonen | Geen dood menu |
| D04 | Opportunity-preview 'Bekijk alle' | Opportunity Radar, dezelfde selectieperiode en databronlabels | Geen kansen / bronfout | Filter/sortering bereikbaar |
| D05 | Opportunity-rij | Trade Analyzer met geselecteerde ticker | Ontbrekende quote → melding | Geen schijnprijs |
| D06 | Watchlist-ticker | Analyzer | Ticker verwijderd | Juiste route |
| D07 | Watchlist 'Alert instellen' | Alerteditor vooraf ingevuld met ticker | Databron niet beschikbaar | Validatie en opslag |
| D08 | Risicokaart/waarschuwing | Detailcontext van relevante positie/risico | Geen detail → niet klikbaar | Geen dode CTA |
| D09 | Journal-preview 'Bekijk alle' | Trade Journal | Geen records | Correcte bestemming |

## Portfolio
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| P01 | Positierij | Detail/Analyzer met ticker en positiecontext | Quote niet beschikbaar | Context behouden |
| P02 | Sorteer-/filtercontrols | Sortering en filtering van eigen posities | Geen matches | Reset mogelijk |
| P03 | Positie toevoegen/bewerken | Formulier met aantal, kostprijs, valuta, datum | Validatiefout / opslaan mislukt | Persistente mutatie |
| P04 | Alert bij positie | Alerteditor met ticker | Geen marktdata | Werkelijke alertrecord |

## Opportunity Radar
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| R01 | Filters, sortering, zoekveld | Bijgewerkte resultaten, actieve filters zichtbaar | Geen resultaten | Resetfilters |
| R02 | Kans-/tickerkaart | Analyzer met ticker en broncontext | Verouderde data → waarschuwing | Bron en timestamp |
| R03 | 'Alert instellen' | Alerteditor met ticker en voorwaarde | Ongeldige conditie | Opslag + bevestiging |
| R04 | 'Bekijk alle' vanuit Dashboard | Volledige Radar met terugnavigatie | API-fout | Geen navigatiedoodloop |

## Trade Analyzer
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| A01 | Tickerselectie | Laad grafiek, quote, timestamp, sessie en indicatoren | Geen ticker/quote | Geen fictieve data |
| A02 | 5m/15m wissel | Grafiek/indicatoren met juiste interval | Interval niet beschikbaar | Label klopt |
| A03 | Alert instellen | Alerteditor met ticker, drempel, richting, sessies | Validatiefout | Alert in beheer zichtbaar |
| A04 | Tradeplan opslaan | Plan met entry, targets, stop, R:R en invalidatie | Savefout | Persistent en terugvindbaar |
| A05 | Terug | Vorige scherm/context | Directe deep-link → Dashboard | Navigatie voorspelbaar |

## Trade Journal
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| J01 | Journalregel | Detail met trade, notities en resultaten | Record weg | Veilige fout |
| J02 | Nieuwe trade/notitie | Invoerformulier, valideren en opslaan | Ongeldige invoer/savefout | Persistente record |
| J03 | Filter/sortering | Resultaten bijwerken | Geen resultaten | Reset mogelijk |
| J04 | Tickerlink | Analyzer voor ticker | Quote niet beschikbaar | Juiste bestemming |

## Alerts, meldingen en instellingen — secundaire routes
| ID | Trigger | Gedrag/bestemming | Leeg/fout | Acceptatie |
|---|---|---|---|---|
| N01 | Nieuwe alert | Ticker, conditie, drempel, sessie, kanalen → opslaan | Validatie/API-fout | Persistente alert |
| N02 | Alert bewerken | Bestaande alert aanpassen | Conflict/404 | Nieuwe voorwaarden actief |
| N03 | Alert pauzeren/hervatten | Active-state mutatie | API-fout | Geen triggers tijdens pauze |
| N04 | Alert verwijderen | Bevestiging → verwijderen | API-fout | Geen nieuwe triggers |
| N05 | Melding openen | Markeer gelezen en navigeer naar context | Doel verwijderd | Graceful fallback |
| N06 | Alle meldingen gelezen | Bulkupdate | API-fout | Badge wordt 0 na succes |
| N07 | Notificatievoorkeuren | In-app, browser (indien ondersteund), sessies | Browserpermissie geweigerd | Geen nep-push |
| N08 | Marktdata-instellingen | Bron/status/delay transparant tonen | Verbinding ontbreekt | Geen realtime-claim |

## Kwaliteitspoorten
Iedere nieuwe zichtbare link/knop krijgt vóór bouw een uniek ID, scherm, trigger, resultaat, data-afhankelijkheden, loading/empty/error, keyboard/mobile en test. Ontworpen ≠ gebouwd ≠ getest. UI-implementatie vereist unit/integratie/E2E-tests per relevant ID; geen decoratieve interactieve affordances.
