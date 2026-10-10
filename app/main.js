import * as featureTools from './features.mjs';
import {decorateWorkspace} from './visuals.mjs';
import {registerTranslations,t as centralT,translate,setLocale,formatCurrency} from './i18n.mjs';
import {initFeatures,resetFeatures,loadFeatures,featurePage,bindFeatures,searchFeatures,featureNotifications,dashboardValues,readNotifications,openTicker} from './features.mjs';
const pages=[['dashboard','Dashboard','home'],['portfolio','Portfolio','portfolio'],['radar','Kansen','radar'],['analyzer','Analyzer','analyzer'],['journal','Journal','journal']];
const app=document.getElementById('app');
let searchOpen=false,notificationOpen=false,searchCategory='Aandelen',lastFocus=null;
const shellCopy={search:'Zoeken',close:'Sluiten',searchPlaceholder:'Zoek ticker of bedrijf',searchResults:'Zoekresultaten',notificationHint:'Koersmeldingen gebruiken geverifieerde data. Achtergrondcontroles vereisen afzonderlijke toestemming en actieve serverconfiguratie. Opgeslagen meldingen verschijnen bij je volgende bezoek; geen pushmeldingen.',planned:'Gepland',executed:'Uitgevoerd',reviewed:'Geëvalueerd',searchMinimum:'Typ minimaal twee tekens om te zoeken.',searchLoading:'Zoeken…',searchFound:'{count} resultaten · geen koers zonder broncontrole',searchEmpty:'Geen resultaten.',searchError:'Zoekgegevens niet beschikbaar: {message}',retry:'Opnieuw proberen',unread:'{count} ongelezen meldingen',notifications:'Meldingen',new:'Nieuw',read:'Gelezen',readOne:'Als gelezen markeren',readAll:'Alles als gelezen markeren',openAnalysis:'Analyseer {symbol}',manageAlerts:'Alerts beheren',all:'Alles',unreadFilter:'Ongelezen',noNotifications:'Je hebt geen meldingen.',noUnread:'Je hebt geen ongelezen meldingen.',saving:'Opslaan…',saveError:'Niet opgeslagen: {message}',historical:'Historische melding · {time}',source:'Bron: {source}',unknownSource:'Niet vastgelegd',tickerContext:'Geselecteerd aandeel: {symbol}',awaitingPrices:'Wacht op actuele koersen',cashShort:'USD en EUR afzonderlijk',dashboardIntro:'Je portefeuille, watchlist en handelsplannen op één plek. Controleer actuele koersgegevens voordat je een trade beoordeelt.',marketUnavailable:'Actuele marktgegevens niet beschikbaar · Open de Analyzer om bron, koerstijd en beursstatus te controleren.',portfolioEmpty:'Nog geen open posities. Voeg uitgevoerde transacties toe in Portfolio.',portfolioPending:'Je persoonlijke portefeuille verschijnt na het laden van je accountgegevens.',valuationPending:'Actuele waardering wacht op gecontroleerde koersen.',dayPending:'Dagresultaat wacht op vergelijkbare actuele koersen.',riskPending:'Actuele blootstelling wacht op gecontroleerde koersen.',sourcePending:'Bron: niet gecontroleerd · Koerstijd: onbekend · Handelsfase: onbekend · Vertraging: onbekend',checkQuotes:'Koersgegevens controleren',cashBasis:'Cash uit je geregistreerde boekingen, afzonderlijk in USD en EUR.',opportunities:'Vergelijk aandelen in Kansen. Alleen bevestigde scenario’s krijgen een handelssignaal; wachten blijft een geldige keuze.',dashboardFooter:'Analyses zijn scenario’s, geen gegarandeerde uitkomsten. Orders plaats je zelf bij je broker.',planStatus:'{symbol} · {status}',shares:'{quantity} aandelen'};
const shellEnglish={search:'Search',close:'Close',searchPlaceholder:'Search ticker or company',searchResults:'Search results',notificationHint:'Price alerts use verified data. Background checks require separate opt-in and active server configuration. Stored notifications appear on your next visit; no push notifications.',planned:'Planned',executed:'Executed',reviewed:'Reviewed',searchMinimum:'Type at least two characters.',searchLoading:'Searching…',searchFound:'{count} results · prices require source verification',searchEmpty:'No results.',searchError:'Search unavailable: {message}',retry:'Retry',unread:'{count} unread notifications',notifications:'Notifications',new:'New',read:'Read',readOne:'Mark as read',readAll:'Mark all as read',openAnalysis:'Analyze {symbol}',manageAlerts:'Manage alerts',all:'All',unreadFilter:'Unread',noNotifications:'No notifications.',noUnread:'No unread notifications.',saving:'Saving…',saveError:'Not saved: {message}',historical:'Historical alert · {time}',source:'Source: {source}',unknownSource:'Not recorded',tickerContext:'Selected stock: {symbol}',awaitingPrices:'Awaiting current prices',cashShort:'USD and EUR separately',dashboardIntro:'Your portfolio, watchlist and trade plans. Verify current market data before evaluating a trade.',marketUnavailable:'Current market data unavailable · Open Analyzer to verify source, timestamp and market status.',portfolioEmpty:'No open positions. Add executed transactions in Portfolio.',portfolioPending:'Your portfolio appears after your account loads.',valuationPending:'Valuation awaits verified prices.',dayPending:'Daily result awaits comparable current prices.',riskPending:'Exposure awaits verified prices.',sourcePending:'Source: unverified · Price time: unknown · Session: unknown · Delay: unknown',checkQuotes:'Check market data',cashBasis:'Cash from your recorded transactions, separately in USD and EUR.',opportunities:'Compare stocks in Opportunities. Only confirmed scenarios receive a trade signal; waiting remains a valid choice.',dashboardFooter:'Analysis describes scenarios, not guaranteed outcomes. Place orders yourself with your broker.',planStatus:'{symbol} · {status}',shares:'{quantity} shares'};
registerTranslations('shell',shellCopy,shellEnglish);
const t=(key,values={})=>centralT('shell.'+key,values);
const uiNL={settings:'Instellingen',back:'Terug',account:'Account en voorkeuren',secure:'Beveiligde accountinstellingen via Cloudflare Access. Je persoonlijke administratie wordt per account veilig opgeslagen.',checking:'Verbinding controleren…',login:'Beveiligd inloggen ↗',profile:'Profiel en regio',name:'Weergavenaam',language:'Taal',zone:'Tijdzone',currency:'Valuta en administratie',displayCurrency:'Weergavevaluta',showUSD:'Toon USD naast de hoofdvaluta',currencyHint:'Weergavevoorkeuren wijzigen geen boekingen. EUR/USD-waardering vereist een vastgelegde wisselkoers.',risk:'Risico en analyse',budget:'Risicobudget per trade (EUR)',exposure:'Maximum positie als percentage van portefeuille',interval:'Standaard analyse-interval',alerts:'Meldingen',inApp:'Controleer koersmeldingen in de geopende app',background:'Bewaar mijn voorkeur voor achtergrondcontroles',backgroundHint:'Achtergrondcontroles slaan meldingen op voor je volgende bezoek. Geen Web Push, e-mail of gegarandeerde controle van iedere koersbeweging. Activering vereist beschikbare quota en geverifieerde providerrechten.',backgroundDisabled:'Achtergrondcontrole niet actief: de serverfunctie is uitgeschakeld.',backgroundBlocked:'Achtergrondcontrole niet actief: providerrechten of configuratie zijn niet bevestigd.',backgroundOut:'Achtergrondcontrole niet actief: je hebt niet ingestemd.',backgroundActive:'Achtergrondcontrole beschikbaar: periodieke controles onder bron- en quotalimieten.',data:'Data en bronnen',dataHint:'Koersen komen van de geconfigureerde marktprovider. Realtime status, vertraging en weergaverechten worden per antwoord gecontroleerd. Er zijn geen voorbeeldkoersen.',privacy:'Privacy en gegevens',hide:'Verberg bedragen op het scherm',export:'Download persoonlijke administratie (JSON)',privacyHint:'Export bevat alleen je eigen administratie. Accountverwijdering is niet beschikbaar zolang bewaartermijnen en herstel niet zijn ingericht.',save:'Opslaan',cancel:'Annuleren',reload:'Opnieuw laden',logout:'Uitloggen bij Cloudflare Access ↗',saved:'Opgeslagen in beveiligde database · versie {version}',loading:'Beveiligde instellingen laden…',loaded:'Ingelogd · instellingen geladen (versie {version})',prepare:'App voorbereiden…',bootError:'Starten mislukt: {message}',limited:'Doorgaan zonder accountgegevens',refresh:'Marktgegevens vernieuwen',notLoaded:'Accountvoorkeuren niet geladen'};
const uiEN={settings:'Settings',back:'Back',account:'Account and preferences',secure:'Secure account settings through Cloudflare Access. Your personal records are stored separately for each account.',checking:'Checking connection…',login:'Secure sign in ↗',profile:'Profile and region',name:'Display name',language:'Language',zone:'Time zone',currency:'Currency and records',displayCurrency:'Display currency',showUSD:'Show USD beside the main currency',currencyHint:'Display preferences do not change transactions. EUR/USD valuation requires a recorded exchange rate.',risk:'Risk and analysis',budget:'Risk budget per trade (EUR)',exposure:'Maximum position as portfolio percentage',interval:'Default analysis interval',alerts:'Notifications',inApp:'Check price alerts while the app is open',background:'Save my preference for background checks',backgroundHint:'Background checks store notifications for your next visit. No Web Push, email or guaranteed detection of every price move. Activation requires available quota and verified provider rights.',backgroundDisabled:'Background checking is inactive: the server feature is disabled.',backgroundBlocked:'Background checking is inactive: provider rights or configuration are unverified.',backgroundOut:'Background checking is inactive: you have not opted in.',backgroundActive:'Background checking is available: periodic checks remain subject to source and quota limits.',data:'Data and sources',dataHint:'Prices come from the configured market provider. Realtime status, delay and display rights are verified for each response. No sample prices are used.',privacy:'Privacy and data',hide:'Hide amounts on screen',export:'Download personal records (JSON)',privacyHint:'Exports contain only your own records. Account deletion is unavailable until retention and recovery are configured.',save:'Save',cancel:'Cancel',reload:'Reload',logout:'Sign out of Cloudflare Access ↗',saved:'Saved in secure database · version {version}',loading:'Loading secure settings…',loaded:'Signed in · settings loaded (version {version})',prepare:'Preparing app…',bootError:'Unable to start: {message}',limited:'Continue without account data',refresh:'Refresh market data',notLoaded:'Account preferences not loaded'};
registerTranslations('ui',uiNL,uiEN);const u=(key,values={})=>centralT('ui.'+key,values);
const shellLiterals={'Hoofdnavigatie':'Main navigation','Kansen':'Opportunities','Jouw tradingoverzicht':'Your trading overview','Portefeuillewaarde':'Portfolio value','Dagresultaat':'Daily result','Kapitaal onder risico':'Capital at risk','Beschikbare cash':'Available cash','Mijn posities':'My positions','Bekijk Portfolio →':'View Portfolio →','Risico & marktstatus':'Risk and market status','Kansen voor 1–5 handelsdagen':'Opportunities for 1–5 trading days','Nog geen bevestigde kansen':'No confirmed opportunities','Bekijk Kansen →':'View Opportunities →','Nog geen watchlistgegevens beschikbaar.':'Watchlist data unavailable.','Naar Kansen →':'Go to Opportunities →','Recente handelsplannen':'Recent trade plans','Nog geen gekoppelde handelsplannen.':'No linked trade plans.','Open Journal →':'Open Journal →','Goedenacht':'Good night','Goedemorgen':'Good morning','Goedemiddag':'Good afternoon','Goedenavond':'Good evening','Geen internetverbinding. Gegevens kunnen niet worden vernieuwd.':'No internet connection. Data cannot be refreshed.','Accountvoorkeuren laden…':'Loading account preferences…','Aandelen':'Stocks','Mijn portefeuille':'My portfolio','Handelsplannen':'Trade plans','Pagina niet gevonden':'Page not found','Terug naar Dashboard':'Back to Dashboard','Direct naar inhoud':'Skip to content','Naar de inhoud':'Skip to content','Niet-opgeslagen wijzigingen':'Unsaved changes','Gecontroleerde waardering':'Verified valuation','Koersdekking':'Price coverage','Broncontrole per positie':'Source verification for each position','Opslaan mislukt: ':'Save failed: ','Conflict: laad de nieuwste instellingen en probeer opnieuw.':'Conflict: reload the latest settings and try again.'};
registerTranslations('marketState',{open:'Open',closed:'Gesloten'},{open:'Open',closed:'Closed'});
registerTranslations('literals',Object.fromEntries(Object.keys(shellLiterals).map((key,index)=>[String(index),key])),Object.fromEntries(Object.values(shellLiterals).map((value,index)=>[String(index),value])));
registerTranslations('accountErrors',{'0': 'Sessie gewijzigd; oud antwoord genegeerd', '1': 'Sessie verlopen; meld opnieuw aan', '2': 'Geen geldig antwoord; controleer je beveiligde sessie', '3': 'Niet ingelogd: meld opnieuw aan.', '4': 'Niet ingelogd: gebruik de beveiligde inloglink.', '5': 'Toegang geweigerd.', '6': 'Accountservice niet beschikbaar.', '7': 'Instellingen niet bereikbaar ({message}). Mogelijk blokkeert de browser cookies tussen domeinen.', '8': 'Uitgelogd', '9': 'Opslaan…'},{'0': 'Session changed; previous response ignored', '1': 'Session expired; sign in again', '2': 'Invalid response; check your secure session', '3': 'Not signed in: sign in again.', '4': 'Not signed in: use the secure sign-in link.', '5': 'Access denied.', '6': 'Account service unavailable.', '7': 'Settings unavailable ({message}). Your browser may be blocking cross-site cookies.', '8': 'Signed out', '9': 'Saving…'});
function translateShell(){const skip=document.querySelector('.skip-link');if(skip)skip.textContent=translate('Naar de inhoud');const targets=[app.querySelector('.header'),...app.querySelectorAll('nav'),route()==='dashboard'?document.getElementById('main'):null,...app.querySelectorAll('.overlay'),document.querySelector('.skip-link')].filter(Boolean);for(const root of targets){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;node.nodeValue=translate(node.nodeValue)}if(root.hasAttribute('aria-label'))root.setAttribute('aria-label',translate(root.getAttribute('aria-label')));root.querySelectorAll('[aria-label]').forEach(el=>{el.setAttribute('aria-label',translate(el.getAttribute('aria-label')))});}}
const preferenceDefaults={showUSD:true,defaultInterval:'15min',inAppAlerts:true,maxPositionPercent:'25.00',hideAmounts:false,backgroundAlerts:false};
let savedSettings=null,bootstrapReady=false,settingsDirty=false,lastRenderedURL=location.pathname+location.search+location.hash;

const tickerValid=symbol=>typeof symbol==='string'&&/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol);
let notificationFilter='all',lastAnalyzerSymbol=null;
const dashboardPreferences={name:null,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,locale:null,currency:null,riskBudget:null,loaded:false};
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function applyAccountSettings(data){
 dashboardPreferences.name=typeof data.display_name==='string'?data.display_name:null;
 dashboardPreferences.timeZone=data.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 dashboardPreferences.locale=data.locale||null;
 dashboardPreferences.currency=data.display_currency||null;
 dashboardPreferences.riskBudget=data.risk_budget_eur||null;
 dashboardPreferences.loaded=true;dashboardPreferences.preferences={...preferenceDefaults,...data.preferences};savedSettings=structuredClone(data);setLocale(data.locale);featureTools.configureFeaturePreferences?.({locale:data.locale,displayCurrency:data.display_currency,riskBudget:data.risk_budget_eur,...dashboardPreferences.preferences});
 refreshGreeting();refreshAccountSummary();
}
function clearAccountSettings(){
 resetFeatures();refreshNotificationBadge();searchOpen=false;notificationOpen=false;document.querySelectorAll('.overlay').forEach(el=>el.remove());app.querySelector('.shell')?.removeAttribute('inert');app.querySelector('.bottom')?.removeAttribute('inert');
 savedSettings=null;dashboardPreferences.preferences={...preferenceDefaults};dashboardPreferences.name=null;dashboardPreferences.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 dashboardPreferences.locale=null;dashboardPreferences.currency=null;dashboardPreferences.riskBudget=null;dashboardPreferences.loaded=false;
 refreshGreeting();refreshAccountSummary();
 const form=document.getElementById('account-settings');if(form){form.reset();setAccountEnabled(false);}else if(app.querySelector('.shell')){searchOpen=false;notificationOpen=false;render();}
}
const iconPaths={"home":"<path d=\"m3 10 9-7 9 7v10h-6v-6H9v6H3z\"/>","portfolio":"<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18\"/>","radar":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><path d=\"m12 12 6-6\"/>","analyzer":"<path d=\"M3 20V4M3 20h18M6 16l5-6 4 3 6-8\"/>","journal":"<rect x=\"5\" y=\"3\" width=\"15\" height=\"18\" rx=\"2\"/><path d=\"M9 8h7M9 12h7M9 16h5M5 6H3M5 12H3M5 18H3\"/>","search":"<circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m16 16 5 5\"/>","bell":"<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10M10 21h4\"/>","settings":"<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M10 2h4l.7 2.5 2.3 1 2.3-1.2 2.8 2.8-1.2 2.3 1 2.3L24 12l-2.1 1.3-1 2.3 1.2 2.3-2.8 2.8-2.3-1.2-2.3 1L14 23h-4l-.7-2.5-2.3-1-2.3 1.2-2.8-2.8 1.2-2.3-1-2.3L0 12l2.1-1.3 1-2.3-1.2-2.3 2.8-2.8L7 5.5l2.3-1z\" transform=\"translate(1.8 1.8) scale(.85)\"/>"};
const svg=id=>'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(iconPaths[id]||'')+'</svg>';
const route=()=>{const last=location.pathname.replace(/\/$/,'').split('/').pop();return !last||last==='index.html'||last==='app'?'dashboard':last};
const pageText={
 dashboard:['Jouw tradingoverzicht','Hier komen je portefeuille, marktstatus en maximaal drie onderbouwde kansen samen.'],
 portfolio:['Jouw portefeuille','Transacties, beschikbare cash, posities en EUR/USD-berekeningen worden hier gekoppeld.'],
 radar:['Kansenradar','De scan voor Amerikaanse aandelen wordt pas geactiveerd wanneer marktdata en kwaliteitscontroles werken.'],
 analyzer:['Trade Analyzer','Hier vergelijk je instap, stop-loss, koersdoelen, risico en kosten met je bestaande posities.'],
 journal:['Trade Journal','Leg je handelsplannen, uitvoeringen en evaluaties vast.']
};
function iconButton(label,symbol,id){return '<button type="button" class="icon-button" aria-label="'+label+'" id="'+id+'">'+svg(symbol)+'</button>'}
function tabs(cls){return '<nav class="'+cls+'" aria-label="Hoofdnavigatie">'+pages.map(([id,label,symbol])=>'<a class="tab" href="./'+id+'" data-route="'+id+'" '+(route()===id?'aria-current="page"':'')+'><span aria-hidden="true">'+svg(symbol)+'</span>'+translate(label)+'</a>').join('')+'</nav>'}
function greeting(date=new Date(),timeZone=dashboardPreferences.timeZone){let hour;try{hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone}).format(date))}catch{hour=date.getHours()}return translate(hour<5?'Goedenacht':hour<12?'Goedemorgen':hour<18?'Goedemiddag':hour<23?'Goedenavond':'Goedenacht')}
function dashboard(){const name=dashboardPreferences.name;return '<div data-testid="dashboard"><p id="connectivity-notice" class="notice" role="alert" hidden>Geen internetverbinding. Gegevens kunnen niet worden vernieuwd.</p><div class="dashboard-heading"><div><p class="eyebrow">Jouw tradingoverzicht</p><h1 id="dashboard-greeting">'+greeting()+(name?', '+escapeHtml(name):'')+'</h1></div><div id="dashboard-actions"></div></div><details class="dashboard-market"><summary id="dashboard-market-status">'+escapeHtml(t('marketUnavailable').split(' · ')[0])+'</summary><p class="muted">'+escapeHtml(t('marketUnavailable').split(' · ').slice(1).join(' · '))+'</p></details><div class="dashboard-kpis">'+[['Portefeuillewaarde','—',t('awaitingPrices')],['Dagresultaat','—',t('awaitingPrices')],['Kapitaal onder risico','—',t('awaitingPrices')],['Beschikbare cash','—',t('portfolioPending')]].map(([title,value,desc])=>'<section class="card"><h2>'+title+'</h2><strong>'+value+'</strong><p class="muted">'+desc+'</p></section>').join('')+'</div><div class="dashboard-columns"><section class="card"><h2>Mijn posities</h2><p class="muted">'+escapeHtml(t(dashboardValues()?'portfolioEmpty':'portfolioPending'))+'</p><a class="text-link" href="./portfolio" data-route="portfolio">Bekijk Portfolio →</a></section><section class="card"><h2>Risico & marktstatus</h2><p class="muted">'+escapeHtml(t('riskPending'))+'</p><p class="data-label">'+escapeHtml(t('sourcePending'))+'</p><a class="text-link" href="./analyzer" data-route="analyzer">'+escapeHtml(t('checkQuotes'))+'</a></section></div><section class="card dashboard-section"><h2>Kansen voor 1–5 handelsdagen</h2><strong>Nog geen bevestigde kansen</strong><p class="muted">'+escapeHtml(t('opportunities'))+'</p><a class="text-link" href="./radar" data-route="radar">Bekijk Kansen →</a></section><div class="dashboard-columns dashboard-section"><section class="card"><h2>Watchlist</h2><p class="muted">Nog geen watchlistgegevens beschikbaar.</p><a class="text-link" href="./radar" data-route="radar">Naar Kansen →</a></section><section class="card"><h2>Recente handelsplannen</h2><p class="muted">Nog geen gekoppelde handelsplannen.</p><a class="text-link" href="./journal" data-route="journal">Open Journal →</a></section></div><details class="dashboard-account"><summary>'+u('account')+'</summary><p class="data-label" id="account-summary" role="status">Accountvoorkeuren laden…</p><p class="muted">'+escapeHtml(t('dashboardIntro'))+'</p></details><p class="dashboard-footer">'+escapeHtml(t('dashboardFooter'))+' <a class="text-link" href="./settings#settings-data">'+escapeHtml(u('data'))+'</a></p></div>'}
function updateConnectivity(){const notice=document.getElementById('connectivity-notice');if(!notice)return;notice.hidden=navigator.onLine}
function refreshGreeting(){const el=document.getElementById('dashboard-greeting');if(el)el.textContent=greeting()+(dashboardPreferences.name?', '+dashboardPreferences.name:'')}
function refreshAccountSummary(){const el=document.getElementById('account-summary');if(!el)return;const p=dashboardPreferences;if(!p.loaded){el.textContent=u('notLoaded');return}el.textContent=u('account')+' · '+(p.locale==='nl-NL'?'Nederlands':p.locale==='en-US'?'English':p.locale)+' · '+p.timeZone+' · '+p.currency+' · '+u('budget')+': '+(p.preferences?.hideAmounts?'••••':formatCurrency(p.riskBudget,'EUR'))}
function settingsPage(){const label=(key,id,input)=>'<label for="'+id+'">'+escapeHtml(u(key))+'</label>'+input;const check=(key,id)=>'<label class="check"><input type="checkbox" id="'+id+'">'+escapeHtml(u(key))+'</label>';const section=(key,body)=>'<section id="settings-'+key+'" class="card settings-card"><h2>'+escapeHtml(u(key))+'</h2>'+body+'</section>';return '<button class="back" data-back>← '+u('back')+'</button><p class="eyebrow">'+u('account')+'</p><h1>'+u('settings')+'</h1><p class="muted">'+u('secure')+'</p><p id="account-status" role="status" aria-live="polite">'+u('checking')+'</p><a class="text-link" id="account-login" href="'+accountApi+'/api/v1/session" target="_blank" rel="noopener noreferrer">'+u('login')+'</a><div class="settings-layout"><nav class="settings-nav" aria-label="'+escapeHtml(u('account'))+'">'+['profile','currency','risk','alerts','data','privacy'].map(key=>'<a href="#settings-'+key+'">'+escapeHtml(u(key))+'</a>').join('')+'</nav><form id="account-settings" class="settings-sections">'+section('profile',label('name','profile-name','<input id="profile-name" maxlength="80" autocomplete="nickname">')+label('language','profile-locale','<select id="profile-locale"><option value="nl-NL">Nederlands</option><option value="en-US">English</option></select>')+label('zone','profile-zone','<select id="profile-zone"><option value="Europe/Amsterdam">Amsterdam</option><option value="America/New_York">New York</option><option value="UTC">UTC</option></select>'))+section('currency',label('displayCurrency','profile-currency','<select id="profile-currency"><option>EUR</option><option>USD</option></select>')+check('showUSD','profile-show-usd')+'<p class="muted">'+u('currencyHint')+'</p>')+section('risk',label('budget','profile-risk','<input id="profile-risk" inputmode="decimal" required>')+label('exposure','profile-exposure','<input id="profile-exposure" inputmode="decimal" required>')+label('interval','profile-interval','<select id="profile-interval"><option value="5min">5 min</option><option value="15min">15 min</option></select>'))+section('alerts',check('inApp','profile-inapp')+check('background','profile-background')+'<p class="muted">'+escapeHtml(u('backgroundHint'))+'</p><p id="background-alert-status" class="notice" role="status">'+escapeHtml(u('backgroundDisabled'))+'</p>'+ '<p class="muted">'+t('notificationHint')+'</p>')+section('data','<p class="muted">'+u('dataHint')+'</p><a class="text-link" href="./analyzer" data-route="analyzer">'+t('checkQuotes')+'</a>')+section('privacy',check('hide','profile-hide')+'<p class="muted">'+u('privacyHint')+'</p><button type="button" class="secondary" id="account-export">'+u('export')+'</button>')+'<div class="settings-actions"><button class="primary" id="account-save" type="submit" disabled>'+u('save')+'</button><button type="button" class="secondary" id="account-cancel">'+u('cancel')+'</button></div></form></div><p id="account-message" role="status" aria-live="polite"></p><button class="secondary" id="account-reload" type="button">'+u('reload')+'</button><p><a class="text-link" id="account-logout" href="'+accountApi+'/cdn-cgi/access/logout">'+u('logout')+'</a></p>'}
function fillSettings(data){settingsDirty=false;for(const [id,key] of [['profile-name','display_name'],['profile-locale','locale'],['profile-zone','timezone'],['profile-currency','display_currency'],['profile-risk','risk_budget_eur']])document.getElementById(id).value=data[key];const p={...preferenceDefaults,...data.preferences};for(const [id,key] of [['profile-show-usd','showUSD'],['profile-inapp','inAppAlerts'],['profile-hide','hideAmounts'],['profile-background','backgroundAlerts']])document.getElementById(id).checked=p[key];document.getElementById('profile-exposure').value=p.maxPositionPercent;document.getElementById('profile-interval').value=p.defaultInterval;const capability=data.backgroundAlertsStatus;document.getElementById('background-alert-status').textContent=u(capability?.active?'backgroundActive':capability?.code==='BACKGROUND_DISABLED'||!capability?'backgroundDisabled':capability?.code==='OPTED_OUT'?'backgroundOut':'backgroundBlocked');}

function pageContent(id){if(id==='dashboard')return dashboard();if(id==='settings')return settingsPage();const feature=featurePage(id);if(feature)return feature;return '<h1>Pagina niet gevonden</h1><a class="text-link" href="./dashboard" data-route="dashboard">Terug naar Dashboard</a>';}

const accountApi=['tradepilot-pro-api.alexvdslot.workers.dev','127.0.0.1','localhost'].includes(location.hostname)?location.origin:'https://tradepilot-pro-api.alexvdslot.workers.dev';
let accountVersion=null;
let profileRequestEpoch=0;
let authGeneration=0;
let accountWriteInProgress=false;
function setAccountEnabled(enabled){const form=document.getElementById('account-settings');if(form)for(const input of form.elements)input.disabled=!enabled}
async function accountFetch(endpoint,options={}){
 const generation=authGeneration;
 const response=await fetch(accountApi+'/api/v1/'+endpoint,{credentials:'include',cache:'no-store',...options});
 if(generation!==authGeneration){const e=new Error(translate('Sessie gewijzigd; oud antwoord genegeerd'));e.status=499;throw e;}
 if(response.redirected&&new URL(response.url).hostname!==new URL(accountApi).hostname){++profileRequestEpoch;++authGeneration;clearAccountSettings();const e=new Error(translate('Sessie verlopen; meld opnieuw aan'));e.status=401;throw e;}
 if(response.status===401||response.status===403){++profileRequestEpoch;++authGeneration;accountVersion=null;clearAccountSettings();setAccountEnabled(false);const status=document.getElementById('account-status');if(status)status.textContent=response.status===401?translate('Niet ingelogd: meld opnieuw aan.'):translate('Toegang geweigerd.');}
 let body;try{body=await response.json()}catch{const e=new Error(translate('Geen geldig antwoord; controleer je beveiligde sessie'));e.status=response.status;throw e}
 if(!response.ok){const e=new Error(body.error?.code||'SERVER_ERROR');e.status=response.status;throw e}
 if(generation!==authGeneration){const e=new Error(translate('Sessie gewijzigd; oud antwoord genegeerd'));e.status=499;throw e;}
 return body.data;
}
async function loadAccount(){
 if(accountWriteInProgress)return;
 const epoch=++profileRequestEpoch;
 const status=document.getElementById('account-status');if(!status)return;
 accountVersion=null;setAccountEnabled(false);status.textContent=u('loading');
 document.getElementById('account-message').textContent='';
 try{
  const session=await accountFetch('session');
  if(!session.authenticated)throw Error('UNAUTHENTICATED');
  const data=await accountFetch('settings');
  if(epoch!==profileRequestEpoch||!document.getElementById('account-settings'))return;
  accountVersion=data.version;
  fillSettings(data);
  applyAccountSettings(data);
  status.textContent=u('loaded',{version:data.version});
  setAccountEnabled(true);
 }catch(e){
  if(!document.getElementById('account-status'))return;
  if(epoch!==profileRequestEpoch&&e.status!==401&&e.status!==403)return;
  if(e.status===401||e.status===403)clearAccountSettings();
  status.textContent=e.status===401?translate('Niet ingelogd: gebruik de beveiligde inloglink.'):e.status===403?translate('Toegang geweigerd.'):e.status===503?translate('Accountservice niet beschikbaar.'):centralT('accountErrors.7',{message:e.message});
 }
}
async function hydrateDashboardProfile(){
 if(accountWriteInProgress||route()==='settings')return;
 const epoch=++profileRequestEpoch;
 try{
  const data=await accountFetch('settings');
  if(epoch===profileRequestEpoch&&!accountWriteInProgress)applyAccountSettings(data);
 }catch{
  if(epoch===profileRequestEpoch&&!accountWriteInProgress)clearAccountSettings();
 }
}
function bindAccountSettings(){
 document.getElementById('account-settings').oninput=()=>{settingsDirty=true;document.getElementById('account-message').textContent=translate('Niet-opgeslagen wijzigingen');};
 document.getElementById('account-cancel').onclick=()=>{if(savedSettings)fillSettings(savedSettings)};
 document.getElementById('account-export').onclick=()=>{const state=featureTools.featureSnapshot?.();if(!state||!dashboardPreferences.loaded)return;const blob=new Blob([JSON.stringify({settings:savedSettings,state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='tradepilot-records.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 document.getElementById('account-reload').onclick=loadAccount;
 document.getElementById('account-logout').onclick=()=>{++profileRequestEpoch;++authGeneration;accountVersion=null;clearAccountSettings();setAccountEnabled(false);const status=document.getElementById('account-status');if(status)status.textContent=translate('Uitgelogd');};
 document.getElementById('account-settings').onsubmit=async event=>{
  event.preventDefault();if(accountVersion===null)return;
  const payload={version:accountVersion,display_name:document.getElementById('profile-name').value.trim(),locale:document.getElementById('profile-locale').value,timezone:document.getElementById('profile-zone').value,display_currency:document.getElementById('profile-currency').value,risk_budget_eur:document.getElementById('profile-risk').value.trim().replace(',','.'),preferences:{backgroundAlerts:document.getElementById('profile-background').checked,showUSD:document.getElementById('profile-show-usd').checked,inAppAlerts:document.getElementById('profile-inapp').checked,hideAmounts:document.getElementById('profile-hide').checked,defaultInterval:document.getElementById('profile-interval').value,maxPositionPercent:document.getElementById('profile-exposure').value.trim().replace(',','.')}};
  accountWriteInProgress=true;++profileRequestEpoch;document.getElementById('account-reload').disabled=true;
  setAccountEnabled(false);document.getElementById('account-message').textContent=translate('Opslaan…');
  try{
   const data=await accountFetch('settings',{method:'PATCH',headers:{'content-type':'application/json','x-tradepilot-csrf':'1'},body:JSON.stringify(payload)});
   settingsDirty=false;accountVersion=data.version;applyAccountSettings(data);render();fillSettings(data);setAccountEnabled(true);
   const message=document.getElementById('account-message');if(message)message.textContent=u('saved',{version:data.version});
   setAccountEnabled(true);
  }catch(e){
   const message=document.getElementById('account-message');if(message)message.textContent=e.status===409?translate('Conflict: laad de nieuwste instellingen en probeer opnieuw.'):translate('Opslaan mislukt: ')+e.message;
   if(![409,401,403,499].includes(e.status)&&accountVersion!==null)setAccountEnabled(true);
  }finally{accountWriteInProgress=false;const reload=document.getElementById('account-reload');if(reload)reload.disabled=false;}
 };
 if(savedSettings&&dashboardPreferences.loaded){accountVersion=savedSettings.version;fillSettings(savedSettings);setAccountEnabled(true);document.getElementById('account-status').textContent=u('loaded',{version:accountVersion});}else loadAccount();
}
function render(){lastRenderedURL=location.pathname+location.search+location.hash;const id=route();document.title=(id==='alerts'?t('manageAlerts'):id==='settings'?u('settings'):(pages.find(p=>p[0]===id)||pages[0])[1])+' · TradePilot Pro';
 app.innerHTML='<div class="shell"><header class="header"><a class="brand" href="./dashboard" data-route="dashboard"><img class="brand-mark" src="./assets/tradepilot-mark.svg" alt="" width="38" height="38">TradePilot <span class="brand-pro">Pro</span></a><div class="header-actions">'+iconButton(t('search'),'search','search')+iconButton(t('notifications'),'bell','notifications')+iconButton(u('settings'),'settings','settings')+'</div></header>'+tabs('tabs')+'<main class="content" id="main" tabindex="-1">'+pageContent(id)+'</main></div>'+tabs('bottom');
 if(searchOpen)renderSearch();if(notificationOpen)renderNotifications();if(searchOpen||notificationOpen){app.querySelector('.shell')?.setAttribute('inert','');app.querySelector('.bottom')?.setAttribute('inert','');}
 document.querySelector('.skip-link').onclick=event=>{event.preventDefault();const main=document.getElementById('main');main?.focus();main?.scrollIntoView({block:'start'});};
 document.getElementById('search').onclick=()=>openOverlay('search');
 document.getElementById('notifications').onclick=()=>openOverlay('notifications');
 document.getElementById('settings').onclick=()=>navigate('settings');
 translateShell();document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.route,{symbol:el.dataset.symbol,alert:el.dataset.alert==='1'})}));
 updateConnectivity();refreshAccountSummary();bindFeatures();
 if(id==='dashboard'){hydrateDashboardCards();translateShell();}refreshNotificationBadge();applyPageContext(id);
 decorateWorkspace(document.getElementById('main'));
 if(id==='settings')bindAccountSettings();
 const back=document.querySelector('[data-back]');if(back)back.onclick=()=>{if(blockDirtySettings())return;history.length>1?history.back():navigate('dashboard');};
}
function blockDirtySettings(){if(settingsDirty&&document.getElementById('account-settings')){document.getElementById('account-message').textContent=translate('Niet-opgeslagen wijzigingen');document.getElementById('account-save')?.focus();return true;}return false;}
function navigate(id,{symbol,recordId,alert=false}={}){
 if(blockDirtySettings())return;
 searchOpen=false;notificationOpen=false;++profileRequestEpoch;
 if(id==='analyzer'&&!tickerValid(symbol))symbol=lastAnalyzerSymbol;
 const destination=new URL('./'+id,location.href);
 if(tickerValid(symbol))destination.searchParams.set('symbol',symbol);
 if(alert&&tickerValid(symbol))destination.searchParams.set('alert','1');
 if(typeof recordId==='string'&&recordId.length<=128)destination.searchParams.set('record',recordId);
 history.pushState({},'',destination.pathname+destination.search);render();document.getElementById('main')?.focus();
}
function applyPageContext(id){
 if(searchOpen||notificationOpen)return;
 const params=new URLSearchParams(location.search),symbol=params.get('symbol'),recordId=params.get('record');
 if(!tickerValid(symbol))return;
 const input=document.querySelector(id==='journal'?'#journal-form [name=symbol]':id==='portfolio'?'#ledger-form [name=symbol]':'#market-form [name=symbol]');
 if(input)input.value=symbol;
 if(id==='analyzer'){lastAnalyzerSymbol=symbol;void openTicker(symbol).finally(refreshNotificationBadge);return;}
 const notice=document.createElement('p');notice.className='notice';notice.dataset.tickerContext=symbol;notice.textContent=t('tickerContext',{symbol});document.getElementById('main')?.prepend(notice);
 if(id==='portfolio'){const row=[...document.querySelectorAll('tbody tr')].find(item=>item.querySelector('td')?.textContent===symbol);if(row){row.dataset.selectedTicker=symbol;row.tabIndex=-1;}}
 if(id==='journal'&&recordId){const field=[...document.querySelectorAll('[data-journal-status]')].find(item=>item.dataset.journalStatus===recordId);const article=field?.closest('article');if(article){article.dataset.selectedRecord=recordId;article.tabIndex=-1;article.scrollIntoView({block:'center'});}}
}
function hydrateDashboardCards(){
 const button=document.createElement('button');button.id='dashboard-refresh';button.className='secondary';button.textContent=u('refresh');button.onclick=async()=>{button.disabled=true;try{await featureTools.refreshDashboardData?.();}finally{if(button.isConnected)button.disabled=false;}};document.getElementById('dashboard-actions')?.append(button);
 const values=dashboardValues();if(!values)return;
 const summary=featureTools.featureMarketSummary?.();if(summary?.marketStatus){const current=summary.marketStatus;const notice=document.getElementById('dashboard-market-status');if(notice)notice.textContent=current.exchange+' · '+translate(current.state==='open'?'Open':'Gesloten')+' · '+current.provider+' · UTC '+current.asOf;}
 if(summary?.opportunities?.length){const section=document.querySelector('.dashboard-section');const status=section?.querySelector('strong');if(status){status.textContent='';for(const opportunity of summary.opportunities.slice(0,3)){const link=document.createElement('a');link.className='chip text-link';link.href='./analyzer?symbol='+encodeURIComponent(opportunity.symbol);link.textContent=opportunity.symbol;link.onclick=e=>{e.preventDefault();navigate('analyzer',{symbol:opportunity.symbol});};status.append(link);}}}
 const valuation=values.valuation,preferences=values.preferences??{};const cards=document.querySelectorAll('.dashboard-kpis .card');if(valuation){const currency=dashboardPreferences.currency??'EUR',value=currency==='EUR'?valuation.currentEURValue:valuation.currentUSDValue;cards[0].querySelector('strong').textContent=preferences.hideAmounts?'••••':value!==null&&value!==undefined?formatCurrency(value,currency):'—';if(value!==null&&value!==undefined)cards[0].querySelector('p').textContent=translate('Gecontroleerde waardering')+' · '+new Intl.DateTimeFormat(dashboardPreferences.locale??'nl-NL',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:dashboardPreferences.timeZone}).format(new Date(valuation.asOf));const coverage=valuation.concentration;const label=document.querySelector('.dashboard-columns .card:nth-child(2) .data-label');if(label&&coverage)label.textContent=translate('Koersdekking')+': '+coverage.coveredPositions+'/'+coverage.openPositions+' · '+translate('Broncontrole per positie');}
 const cash=document.querySelector('.dashboard-kpis .card:last-child');if(cash){cash.querySelector('strong').textContent=preferences.hideAmounts?'••••':values.cash;cash.querySelector('p').textContent=t('cashShort');}
 document.querySelectorAll('.dashboard-kpis .card').forEach((card,index)=>{const basis=document.createElement('details');const label=document.createElement('summary');label.textContent=u('data');const text=document.createElement('p');text.className='muted';text.textContent=[t('valuationPending')+' '+t('sourcePending'),t('dayPending'),t('riskPending'),t('cashBasis')][index];basis.append(label,text);card.append(basis);});
 const sections=[['Mijn posities',values.positions,values.positionEntries,'analyzer'],['Watchlist',values.watchlist,values.watchlistEntries,'analyzer'],['Recente handelsplannen',values.plans,values.planEntries,'journal']];
 for(const [heading,fallback,entries,target] of sections){
  const title=[...document.querySelectorAll('h2')].find(item=>item.textContent===translate(heading)),description=title?.parentElement.querySelector('p');if(!description)continue;
  description.textContent=heading==='Mijn posities'&&!entries?.length?t('portfolioEmpty'):fallback;
  if(!entries?.length)continue;
  const list=document.createElement('div');list.className='watchlist';
  for(const entry of entries){const symbol=typeof entry==='string'?entry:entry.symbol;if(!tickerValid(symbol))continue;const link=document.createElement('a');link.className='search-result text-link';link.href='./'+target+'?symbol='+encodeURIComponent(symbol);link.dataset.dashboardTicker=symbol;link.textContent=symbol+(entry.quantity?' · '+t('shares',{quantity:entry.quantity}):entry.status?' · '+t(entry.status):'');link.onclick=event=>{event.preventDefault();navigate(target,{symbol,recordId:entry.id});};list.appendChild(link);if(target==='analyzer'){const alert=document.createElement('a');alert.className='text-link';alert.href='./alerts?symbol='+encodeURIComponent(symbol)+'&alert=1';alert.textContent=t('manageAlerts')+' · '+symbol;alert.onclick=e=>{e.preventDefault();navigate('alerts',{symbol,alert:true});};list.append(alert);}}
  description.replaceWith(list);
 }
}
function closeOverlay(){
 searchOpen=false;notificationOpen=false;app.querySelectorAll('.overlay').forEach(layer=>layer.remove());
 app.querySelector('.shell')?.removeAttribute('inert');app.querySelector('.bottom')?.removeAttribute('inert');
 if(lastFocus?.id)document.getElementById(lastFocus.id)?.focus();
}
function openOverlay(kind){
 app.querySelectorAll('.overlay').forEach(layer=>layer.remove());
 lastFocus=document.getElementById(kind==='search'?'search':'notifications');
 searchOpen=kind==='search';notificationOpen=!searchOpen;
 if(searchOpen)renderSearch();else renderNotifications();
 app.querySelector('.shell')?.setAttribute('inert','');app.querySelector('.bottom')?.setAttribute('inert','');
 document.getElementById(searchOpen?'search-input':'close-notifications')?.focus();
}
function resultDestination(result,category){
 return {route:category==='Mijn portefeuille'?'portfolio':category==='Journal'||category==='Handelsplannen'?'journal':'analyzer',symbol:result.symbol,recordId:result.id};
}
function renderSearch(){
 const layer=document.createElement('div');layer.className='overlay';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label',t('search'));
 layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>'+escapeHtml(t('search'))+'</h1><button class="primary" id="close-search">'+escapeHtml(t('close'))+'</button></div><label class="sr-only" for="search-input">'+t('searchPlaceholder')+'</label><input class="search-input" id="search-input" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false" maxlength="40" placeholder="'+t('searchPlaceholder')+'" autocomplete="off"><div class="categories">'+['Aandelen','Mijn portefeuille','Handelsplannen','Journal'].map(x=>'<button class="chip" aria-pressed="'+(x===searchCategory)+'" data-category="'+x+'">'+translate(x)+'</button>').join('')+'</div><p class="notice" id="search-status" role="status">'+escapeHtml(t('searchMinimum'))+'</p><button class="secondary" id="search-retry" hidden>'+escapeHtml(t('retry'))+'</button><div id="search-results" role="listbox" aria-label="'+t('searchResults')+'"></div></div>';
 app.appendChild(layer);translateShell();layer.addEventListener('click',event=>{if(event.target===layer)closeOverlay();});let timer,epoch=0,results=[],selected=-1,resultCategory=searchCategory;
 const input=layer.querySelector('#search-input'),list=layer.querySelector('#search-results'),status=layer.querySelector('#search-status'),retry=layer.querySelector('#search-retry');
 const choose=()=>{const result=results[selected];if(!result)return;const target=resultDestination(result,resultCategory);navigate(target.route,target);};
 const select=index=>{
  selected=index;const options=[...list.children];options.forEach((item,i)=>item.setAttribute('aria-selected',String(i===selected)));
  if(options[selected])input.setAttribute('aria-activedescendant',options[selected].id);else input.removeAttribute('aria-activedescendant');
 };
 const search=()=>{
  clearTimeout(timer);const generation=++epoch,q=input.value.trim(),category=searchCategory;results=[];select(-1);list.replaceChildren();retry.hidden=true;input.setAttribute('aria-expanded','false');
  if(q.length<2){status.textContent=t('searchMinimum');return;}
  status.textContent=t('searchLoading');
  timer=setTimeout(async()=>{
   try{
    const found=await searchFeatures(q,category);if(generation!==epoch||!layer.isConnected)return;
    results=found;resultCategory=category;status.textContent=results.length?t('searchFound',{count:results.length}):t('searchEmpty');input.setAttribute('aria-expanded',String(results.length>0));
    results.forEach((result,index)=>{const item=document.createElement('button');item.type='button';item.className='search-result';item.id='search-result-'+index;item.setAttribute('role','option');item.onclick=()=>{select(index);choose();};item.onpointerenter=()=>select(index);item.textContent=result.symbol+' · '+(result.name||'')+(result.exchange?' · '+result.exchange:'');list.appendChild(item);});select(results.length?0:-1);
   }catch(error){if(generation===epoch&&layer.isConnected){status.textContent=t('searchError',{message:error.message});retry.hidden=false;}}
  },350);
 };
 input.addEventListener('input',search);
 input.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&results.length){event.preventDefault();select((selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length);}
  if(event.key==='Enter'){event.preventDefault();choose();}
 });
 layer.querySelector('#close-search').onclick=closeOverlay;retry.onclick=search;
 layer.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{searchCategory=button.dataset.category;layer.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));search();input.focus();});
}
function refreshNotificationBadge(){
 const button=document.getElementById('notifications');if(!button)return;
 const count=featureNotifications().filter(entry=>!entry.read).length;button.setAttribute('aria-label',t('notifications'));
 button.querySelector('[data-unread-badge]')?.remove();button.removeAttribute('aria-description');
 if(count){const badge=document.createElement('span');badge.className='badge';badge.dataset.unreadBadge='';badge.id='unread-notification-count';badge.textContent=count>9?'9+':String(count);badge.setAttribute('aria-hidden','true');button.appendChild(badge);button.setAttribute('aria-description',t('unread',{count}));}
}
function notificationTicker(entry){const symbol=entry.symbol||entry.text.split(' ')[0];return tickerValid(symbol)?symbol:null;}
function renderNotifications(){
 const all=featureNotifications(),entries=notificationFilter==='unread'?all.filter(entry=>!entry.read):all;
 const layer=document.createElement('div');layer.className='overlay';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label',t('notifications'));
 layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>'+escapeHtml(t('notifications'))+'</h1><button class="primary" id="close-notifications">'+escapeHtml(t('close'))+'</button></div><div class="categories"><button class="chip" data-notification-filter="all" aria-pressed="'+(notificationFilter==='all')+'">'+escapeHtml(t('all'))+'</button><button class="chip" data-notification-filter="unread" aria-pressed="'+(notificationFilter==='unread')+'">'+escapeHtml(t('unreadFilter'))+'</button></div><div id="notification-entries"></div>'+(all.some(entry=>!entry.read)?'<button class="secondary" id="read-notifications">'+escapeHtml(t('readAll'))+'</button>':'')+'<p><a class="text-link" href="./alerts" id="manage-alerts">'+escapeHtml(t('manageAlerts'))+'</a></p><p class="data-label">'+escapeHtml(t('notificationHint'))+'</p><p id="notification-status" role="status"></p></div>';
 app.appendChild(layer);translateShell();layer.addEventListener('click',event=>{if(event.target===layer)closeOverlay();});const container=layer.querySelector('#notification-entries');
 if(!entries.length){const empty=document.createElement('p');empty.textContent=t(notificationFilter==='unread'?'noUnread':'noNotifications');container.appendChild(empty);}
 const refresh=()=>{if(!layer.isConnected)return;layer.remove();refreshNotificationBadge();renderNotifications();document.getElementById('close-notifications')?.focus();};
 const acknowledge=async(id,target)=>{
  const generation=authGeneration;layer.querySelectorAll('button').forEach(button=>button.disabled=button.id!=='close-notifications');layer.querySelector('#notification-status').textContent=t('saving');
  try{await readNotifications(id);if(generation!==authGeneration||!layer.isConnected)return;refreshNotificationBadge();if(target)navigate('analyzer',{symbol:target});else refresh();}
  catch(error){if(layer.isConnected){layer.querySelector('#notification-status').textContent=t('saveError',{message:error.message});layer.querySelectorAll('button').forEach(button=>button.disabled=false);}}
 };
 for(const entry of entries){
  const card=document.createElement('article');card.className='card';card.dataset.notificationId=entry.id;
  const status=document.createElement('p');status.className='data-label';status.textContent=t(entry.read?'read':'new');card.appendChild(status);
  const text=document.createElement('p');text.textContent=entry.text;card.appendChild(text);
  const metadata=document.createElement('p');metadata.className='data-label';metadata.textContent=t('historical',{time:entry.asOf||entry.triggeredAt||''})+' · '+t('source',{source:entry.source||t('unknownSource')});card.appendChild(metadata);
  const symbol=notificationTicker(entry);if(symbol){const link=document.createElement('a');link.className='text-link';link.href='./analyzer?symbol='+encodeURIComponent(symbol);link.textContent=t('openAnalysis',{symbol});link.onclick=event=>{event.preventDefault();if(entry.read)navigate('analyzer',{symbol});else void acknowledge(entry.id,symbol);};card.appendChild(link);}
  if(!entry.read){const button=document.createElement('button');button.type='button';button.className='secondary';button.dataset.readNotification=entry.id;button.textContent=t('readOne');button.onclick=()=>void acknowledge(entry.id);card.appendChild(button);}
  container.appendChild(card);
 }
 layer.querySelector('#close-notifications').onclick=closeOverlay;layer.querySelector('#read-notifications')?.addEventListener('click',()=>void acknowledge());
 layer.querySelector('#manage-alerts').onclick=event=>{event.preventDefault();navigate('alerts');};
 layer.querySelectorAll('[data-notification-filter]').forEach(button=>button.onclick=()=>{notificationFilter=button.dataset.notificationFilter;refresh();});
}

document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!searchOpen){e.preventDefault();document.getElementById('search')?.focus();document.getElementById('search')?.click();return}if(e.key==='Escape'&&(searchOpen||notificationOpen))closeOverlay();if(e.key==='Tab'&&(searchOpen||notificationOpen)){const layer=document.querySelector('.overlay');const focusables=[...layer.querySelectorAll('button,input,a[href]')].filter(x=>!x.disabled&&!x.closest('[hidden],[inert]')&&x.getClientRects().length>0);if(focusables.length){e.preventDefault();const index=focusables.indexOf(document.activeElement);const next=index<0?(e.shiftKey?focusables.length-1:0):(index+(e.shiftKey?-1:1)+focusables.length)%focusables.length;focusables[next].focus();}}});
window.addEventListener('popstate',()=>{if(blockDirtySettings()){history.pushState({},'',lastRenderedURL);return;}searchOpen=false;notificationOpen=false;render()});
async function startApp(){
 bootstrapReady=false;app.setAttribute('inert','');const splash=document.createElement('div');splash.className='splash';splash.setAttribute('role','status');splash.setAttribute('aria-live','polite');splash.innerHTML='<div class="splash-brand"><svg class="splash-mark" viewBox="0 0 64 64" role="img" aria-label="TradePilot Pro"><rect width="64" height="64" rx="16" fill="#09111E"/><rect class="splash-bar bar-1" x="13" y="34" width="9" height="18" rx="4.5" fill="#55C7ED"/><rect class="splash-bar bar-2" x="27" y="23" width="9" height="29" rx="4.5" fill="#398DEB"/><rect class="splash-bar bar-3" x="41" y="12" width="9" height="40" rx="4.5" fill="#3773E7"/></svg><h1>TradePilot Pro</h1><p id="splash-status">'+u('prepare')+'</p></div>';document.body.appendChild(splash);
 let timeout;const generation=authGeneration;
 try{await Promise.race([(async()=>{const data=await accountFetch('settings');if(generation!==authGeneration)throw Error('SESSION_CHANGED');applyAccountSettings(data);await loadFeatures();if(generation!==authGeneration)throw Error('SESSION_CHANGED');if(featureTools.featureSnapshot&&!featureTools.featureSnapshot())throw Error('PRIVATE_STATE_UNAVAILABLE');})(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('TIMEOUT')),10000)})]);bootstrapReady=true;render();refreshAccountSummary();app.removeAttribute('inert');splash.remove();}
 catch(error){++profileRequestEpoch;++authGeneration;clearAccountSettings();const status=splash.querySelector('#splash-status');status.textContent=u('bootError',{message:error.message});const actions=document.createElement('div');actions.className='splash-actiongrid';actions.innerHTML='<button class="primary" data-boot-retry>'+t('retry')+'</button><button class="secondary" data-boot-limited>'+u('limited')+'</button><a href="'+accountApi+'/api/v1/session">'+u('login')+'</a>';splash.append(actions);actions.querySelector('[data-boot-retry]').onclick=()=>{splash.remove();void startApp()};actions.querySelector('[data-boot-limited]').onclick=()=>{bootstrapReady=true;render();app.removeAttribute('inert');splash.remove()};}
 finally{clearTimeout(timeout)}
}

initFeatures(accountFetch,()=>{refreshNotificationBadge();if(bootstrapReady&&route()!=='settings'&&!searchOpen&&!notificationOpen)render();},navigate);
window.addEventListener('tradepilot:notifications',refreshNotificationBadge);
startApp();
setInterval(()=>{if(!document.hidden)refreshGreeting()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshGreeting()});
window.addEventListener('focus',()=>{refreshGreeting();if(!document.hidden)void hydrateDashboardProfile()});

window.addEventListener('online',updateConnectivity);
window.addEventListener('offline',updateConnectivity);

window.addEventListener('beforeunload',event=>{if(settingsDirty){event.preventDefault();event.returnValue='';}});
