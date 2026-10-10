import {initFeatures,resetFeatures,loadFeatures,featurePage,bindFeatures,searchFeatures,featureNotifications,dashboardValues,readNotifications,openTicker} from './features.mjs';
const pages=[['dashboard','Dashboard','home'],['portfolio','Portfolio','portfolio'],['radar','Kansen','radar'],['analyzer','Analyzer','analyzer'],['journal','Journal','journal']];
const app=document.getElementById('app');
let searchOpen=false,notificationOpen=false,searchCategory='Aandelen',lastFocus=null;
const shellCopy={search:'Zoeken',close:'Sluiten',searchPlaceholder:'Zoek ticker of bedrijf',searchResults:'Zoekresultaten',notificationHint:'Koersmeldingen worden uitsluitend in de geopende app gecontroleerd, met geverifieerde data. Geen pushmeldingen.',planned:'Gepland',executed:'Uitgevoerd',reviewed:'Geëvalueerd',searchMinimum:'Typ minimaal twee tekens om te zoeken.',searchLoading:'Zoeken…',searchFound:'{count} resultaten · geen koers zonder broncontrole',searchEmpty:'Geen resultaten.',searchError:'Zoekgegevens niet beschikbaar: {message}',retry:'Opnieuw proberen',unread:'{count} ongelezen meldingen',notifications:'Meldingen',new:'Nieuw',read:'Gelezen',readOne:'Als gelezen markeren',readAll:'Alles als gelezen markeren',openAnalysis:'Analyseer {symbol}',manageAlerts:'Alerts beheren',all:'Alles',unreadFilter:'Ongelezen',noNotifications:'Je hebt geen meldingen.',noUnread:'Je hebt geen ongelezen meldingen.',saving:'Opslaan…',saveError:'Niet opgeslagen: {message}',historical:'Historische melding · {time}',source:'Bron: {source}',unknownSource:'Niet vastgelegd',tickerContext:'Geselecteerd aandeel: {symbol}',dashboardIntro:'Je portefeuille, watchlist en handelsplannen op één plek. Controleer actuele koersgegevens voordat je een trade beoordeelt.',marketUnavailable:'Actuele marktgegevens niet beschikbaar · Open de Analyzer om bron, koerstijd en beursstatus te controleren.',portfolioEmpty:'Nog geen open posities. Voeg uitgevoerde transacties toe in Portfolio.',portfolioPending:'Je persoonlijke portefeuille verschijnt na het laden van je accountgegevens.',valuationPending:'Actuele waardering wacht op gecontroleerde koersen.',dayPending:'Dagresultaat wacht op vergelijkbare actuele koersen.',riskPending:'Actuele blootstelling wacht op gecontroleerde koersen.',sourcePending:'Bron: niet gecontroleerd · Koerstijd: onbekend · Handelsfase: onbekend · Vertraging: onbekend',checkQuotes:'Koersgegevens controleren',cashBasis:'Cash uit je geregistreerde boekingen, afzonderlijk in USD en EUR.',opportunities:'Vergelijk aandelen in Kansen. Alleen bevestigde scenario’s krijgen een handelssignaal; wachten blijft een geldige keuze.',dashboardFooter:'Analyses zijn scenario’s, geen gegarandeerde uitkomsten. Orders plaats je zelf bij je broker.',planStatus:'{symbol} · {status}',shares:'{quantity} aandelen'};
const t=(key,values={})=>(shellCopy[key]||key).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
const tickerValid=symbol=>typeof symbol==='string'&&/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol);
let notificationFilter='all';
const dashboardPreferences={name:null,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,locale:null,currency:null,riskBudget:null,loaded:false};
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function applyAccountSettings(data){
 dashboardPreferences.name=typeof data.display_name==='string'?data.display_name:null;
 dashboardPreferences.timeZone=data.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 dashboardPreferences.locale=data.locale||null;
 dashboardPreferences.currency=data.display_currency||null;
 dashboardPreferences.riskBudget=data.risk_budget_eur||null;
 dashboardPreferences.loaded=true;
 refreshGreeting();refreshAccountSummary();
}
function clearAccountSettings(){
 resetFeatures();refreshNotificationBadge();searchOpen=false;notificationOpen=false;document.querySelectorAll('.overlay').forEach(el=>el.remove());app.querySelector('.shell')?.removeAttribute('inert');app.querySelector('.bottom')?.removeAttribute('inert');
 dashboardPreferences.name=null;dashboardPreferences.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 dashboardPreferences.locale=null;dashboardPreferences.currency=null;dashboardPreferences.riskBudget=null;dashboardPreferences.loaded=false;
 refreshGreeting();refreshAccountSummary();
 const form=document.getElementById('account-settings');if(form){form.reset();setAccountEnabled(false);}else if(app.querySelector('.shell')){searchOpen=false;notificationOpen=false;render();}
}
const svg=id=>'<svg class="ui-icon" aria-hidden="true"><use href="./assets/icons.svg#'+id+'"></use></svg>';
const route=()=>{const last=location.pathname.replace(/\/$/,'').split('/').pop();return !last||last==='index.html'||last==='app'?'dashboard':last};
const pageText={
 dashboard:['Jouw tradingoverzicht','Hier komen je portefeuille, marktstatus en maximaal drie onderbouwde kansen samen.'],
 portfolio:['Jouw portefeuille','Transacties, beschikbare cash, posities en EUR/USD-berekeningen worden hier gekoppeld.'],
 radar:['Kansenradar','De scan voor Amerikaanse aandelen wordt pas geactiveerd wanneer marktdata en kwaliteitscontroles werken.'],
 analyzer:['Trade Analyzer','Hier vergelijk je instap, stop-loss, koersdoelen, risico en kosten met je bestaande posities.'],
 journal:['Trade Journal','Leg je handelsplannen, uitvoeringen en evaluaties vast.']
};
function iconButton(label,symbol,id){return '<button type="button" class="icon-button" aria-label="'+label+'" id="'+id+'">'+svg(symbol)+'</button>'}
function tabs(cls){return '<nav class="'+cls+'" aria-label="Hoofdnavigatie">'+pages.map(([id,label,symbol])=>'<a class="tab" href="./'+id+'" data-route="'+id+'" '+(route()===id?'aria-current="page"':'')+'><span aria-hidden="true">'+svg(symbol)+'</span>'+label+'</a>').join('')+'</nav>'}
function greeting(date=new Date(),timeZone=dashboardPreferences.timeZone){let hour;try{hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone}).format(date))}catch{hour=date.getHours()}return hour<5?'Goedenacht':hour<12?'Goedemorgen':hour<18?'Goedemiddag':hour<23?'Goedenavond':'Goedenacht'}
function dashboard(){const name=dashboardPreferences.name;return '<div data-testid="dashboard"><p id="connectivity-notice" class="notice" role="alert" hidden>Geen internetverbinding. Gegevens kunnen niet worden vernieuwd.</p><p class="eyebrow">Jouw tradingoverzicht</p><h1 id="dashboard-greeting">'+greeting()+(name?', '+escapeHtml(name):'')+'</h1><p class="muted">'+escapeHtml(t('dashboardIntro'))+'</p><div class="notice" role="status">'+escapeHtml(t('marketUnavailable'))+'</div><p class="data-label" id="account-summary" role="status">Accountvoorkeuren laden…</p><div class="dashboard-kpis">'+[['Portefeuillewaarde','—',t('valuationPending')],['Dagresultaat','—',t('dayPending')],['Kapitaal onder risico','—',t('riskPending')],['Beschikbare cash','—',t('portfolioPending')]].map(([title,value,desc])=>'<section class="card"><h2>'+title+'</h2><strong>'+value+'</strong><p class="muted">'+desc+'</p></section>').join('')+'</div><div class="dashboard-columns"><section class="card"><h2>Mijn posities</h2><p class="muted">'+escapeHtml(t(dashboardValues()?'portfolioEmpty':'portfolioPending'))+'</p><a class="text-link" href="./portfolio" data-route="portfolio">Bekijk Portfolio →</a></section><section class="card"><h2>Risico & marktstatus</h2><p class="muted">'+escapeHtml(t('riskPending'))+'</p><p class="data-label">'+escapeHtml(t('sourcePending'))+'</p><a class="text-link" href="./analyzer" data-route="analyzer">'+escapeHtml(t('checkQuotes'))+'</a></section></div><section class="card dashboard-section"><h2>Kansen voor 1–5 handelsdagen</h2><strong>Nog geen bevestigde kansen</strong><p class="muted">'+escapeHtml(t('opportunities'))+'</p><a class="text-link" href="./radar" data-route="radar">Bekijk Kansen →</a></section><div class="dashboard-columns dashboard-section"><section class="card"><h2>Watchlist</h2><p class="muted">Nog geen watchlistgegevens beschikbaar.</p><a class="text-link" href="./radar" data-route="radar">Naar Kansen →</a></section><section class="card"><h2>Recente handelsplannen</h2><p class="muted">Nog geen gekoppelde handelsplannen.</p><a class="text-link" href="./journal" data-route="journal">Open Journal →</a></section></div><p class="dashboard-footer">'+escapeHtml(t('dashboardFooter'))+'</p></div>'}
function updateConnectivity(){const notice=document.getElementById('connectivity-notice');if(!notice)return;notice.hidden=navigator.onLine}
function refreshGreeting(){const el=document.getElementById('dashboard-greeting');if(el)el.textContent=greeting()+(dashboardPreferences.name?', '+dashboardPreferences.name:'')}
function refreshAccountSummary(){const el=document.getElementById('account-summary');if(!el)return;const p=dashboardPreferences;if(!p.loaded){el.textContent='Accountvoorkeuren niet geladen';return}el.textContent='Accountvoorkeuren · '+(p.locale==='nl-NL'?'Nederlands':p.locale==='en-US'?'English':p.locale)+' · '+p.timeZone+' · '+p.currency+' · Risicobudget per trade: € '+p.riskBudget+' (geen portefeuille-exposure)'}
function settingsPage(){return '<button class="back" data-back>← Terug</button><p class="eyebrow">Account en voorkeuren</p><h1>Instellingen</h1><p class="muted">Beveiligde accountinstellingen via Cloudflare Access. Je persoonlijke administratie wordt per account veilig opgeslagen.</p><section class="card settings-card"><p id="account-status" role="status" aria-live="polite">Verbinding controleren…</p><p><a class="text-link" id="account-login" href="https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/session" target="_blank" rel="noopener noreferrer">Beveiligd inloggen ↗</a></p><form id="account-settings"><label for="profile-name">Weergavenaam</label><input id="profile-name" maxlength="80" autocomplete="nickname"><label for="profile-locale">Taal</label><select id="profile-locale"><option value="nl-NL">Nederlands</option><option value="en-US">English</option></select><label for="profile-zone">Tijdzone</label><select id="profile-zone"><option value="Europe/Amsterdam">Amsterdam</option><option value="America/New_York">New York</option><option value="UTC">UTC</option></select><label for="profile-currency">Weergavevaluta</label><select id="profile-currency"><option value="EUR">EUR</option><option value="USD">USD</option></select><label for="profile-risk">Risicobudget per trade (EUR)</label><input id="profile-risk" inputmode="decimal" placeholder="100.00" required><button class="primary" id="account-save" type="submit" disabled>Opslaan</button></form><p id="account-message" role="status" aria-live="polite"></p><button class="primary" id="account-reload" type="button">Opnieuw laden</button><p><a class="text-link" id="account-logout" href="https://tradepilot-pro-api.alexvdslot.workers.dev/cdn-cgi/access/logout">Uitloggen bij Cloudflare Access ↗</a></p></section>'}
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
 if(generation!==authGeneration){const e=new Error('Sessie gewijzigd; oud antwoord genegeerd');e.status=499;throw e;}
 if(response.redirected&&new URL(response.url).hostname!==new URL(accountApi).hostname){++profileRequestEpoch;++authGeneration;clearAccountSettings();const e=new Error('Sessie verlopen; meld opnieuw aan');e.status=401;throw e;}
 if(response.status===401||response.status===403){++profileRequestEpoch;++authGeneration;accountVersion=null;clearAccountSettings();setAccountEnabled(false);const status=document.getElementById('account-status');if(status)status.textContent=response.status===401?'Niet ingelogd: meld opnieuw aan.':'Toegang geweigerd.';}
 let body;try{body=await response.json()}catch{const e=new Error('Geen geldig antwoord; controleer je beveiligde sessie');e.status=response.status;throw e}
 if(!response.ok){const e=new Error(body.error?.code||'SERVER_ERROR');e.status=response.status;throw e}
 if(generation!==authGeneration){const e=new Error('Sessie gewijzigd; oud antwoord genegeerd');e.status=499;throw e;}
 return body.data;
}
async function loadAccount(){
 if(accountWriteInProgress)return;
 const epoch=++profileRequestEpoch;
 const status=document.getElementById('account-status');if(!status)return;
 accountVersion=null;setAccountEnabled(false);status.textContent='Beveiligde instellingen laden…';
 document.getElementById('account-message').textContent='';
 try{
  const session=await accountFetch('session');
  if(!session.authenticated)throw Error('UNAUTHENTICATED');
  const data=await accountFetch('settings');
  if(epoch!==profileRequestEpoch||!document.getElementById('account-settings'))return;
  accountVersion=data.version;
  document.getElementById('profile-name').value=data.display_name;
  document.getElementById('profile-locale').value=data.locale;
  document.getElementById('profile-zone').value=data.timezone;
  document.getElementById('profile-currency').value=data.display_currency;
  document.getElementById('profile-risk').value=data.risk_budget_eur;
  applyAccountSettings(data);
  status.textContent='Ingelogd · instellingen geladen (versie '+data.version+')';
  setAccountEnabled(true);
 }catch(e){
  if(!document.getElementById('account-status'))return;
  if(epoch!==profileRequestEpoch&&e.status!==401&&e.status!==403)return;
  if(e.status===401||e.status===403)clearAccountSettings();
  status.textContent=e.status===401?'Niet ingelogd: gebruik de beveiligde inloglink.':e.status===403?'Toegang geweigerd.':e.status===503?'Accountservice niet beschikbaar.':'Instellingen niet bereikbaar ('+e.message+'). Mogelijk blokkeert de browser cookies tussen domeinen.';
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
 document.getElementById('account-reload').onclick=loadAccount;
 document.getElementById('account-logout').onclick=()=>{++profileRequestEpoch;++authGeneration;accountVersion=null;clearAccountSettings();setAccountEnabled(false);const status=document.getElementById('account-status');if(status)status.textContent='Uitgelogd';};
 document.getElementById('account-settings').onsubmit=async event=>{
  event.preventDefault();if(accountVersion===null)return;
  const payload={version:accountVersion,display_name:document.getElementById('profile-name').value.trim(),locale:document.getElementById('profile-locale').value,timezone:document.getElementById('profile-zone').value,display_currency:document.getElementById('profile-currency').value,risk_budget_eur:document.getElementById('profile-risk').value.trim().replace(',','.')};
  accountWriteInProgress=true;++profileRequestEpoch;document.getElementById('account-reload').disabled=true;
  setAccountEnabled(false);document.getElementById('account-message').textContent='Opslaan…';
  try{
   const data=await accountFetch('settings',{method:'PATCH',headers:{'content-type':'application/json','x-tradepilot-csrf':'1'},body:JSON.stringify(payload)});
   accountVersion=data.version;applyAccountSettings(data);
   const message=document.getElementById('account-message');if(message)message.textContent='Opgeslagen in beveiligde database · versie '+data.version;
   setAccountEnabled(true);
  }catch(e){
   const message=document.getElementById('account-message');if(message)message.textContent=e.status===409?'Conflict: laad de nieuwste instellingen en probeer opnieuw.':'Opslaan mislukt: '+e.message;
   if(![409,401,403,499].includes(e.status)&&accountVersion!==null)setAccountEnabled(true);
  }finally{accountWriteInProgress=false;const reload=document.getElementById('account-reload');if(reload)reload.disabled=false;}
 };
 loadAccount();
}
function render(){const id=route();document.title=(id==='settings'?'Instellingen':(pages.find(p=>p[0]===id)||pages[0])[1])+' · TradePilot Pro';
 app.innerHTML='<div class="shell"><header class="header"><a class="brand" href="./dashboard" data-route="dashboard"><img class="brand-mark" src="./assets/tradepilot-mark.svg" alt="" width="38" height="38">TradePilot <span class="brand-pro">Pro</span></a><div class="header-actions">'+iconButton('Zoeken','search','search')+iconButton('Meldingen','bell','notifications')+iconButton('Instellingen','settings','settings')+'</div></header>'+tabs('tabs')+'<main class="content" id="main" tabindex="-1">'+pageContent(id)+'</main></div>'+tabs('bottom');
 if(searchOpen)renderSearch();if(notificationOpen)renderNotifications();if(searchOpen||notificationOpen){app.querySelector('.shell')?.setAttribute('inert','');app.querySelector('.bottom')?.setAttribute('inert','');}
 document.getElementById('search').onclick=()=>openOverlay('search');
 document.getElementById('notifications').onclick=()=>openOverlay('notifications');
 document.getElementById('settings').onclick=()=>navigate('settings');
 document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.route)}));
 updateConnectivity();refreshAccountSummary();bindFeatures();
 if(id==='dashboard')hydrateDashboardCards();refreshNotificationBadge();applyPageContext(id);
 if(id==='settings')bindAccountSettings();
 const back=document.querySelector('[data-back]');if(back)back.onclick=()=>history.length>1?history.back():navigate('dashboard');
}
function navigate(id,{symbol,recordId}={}){
 searchOpen=false;notificationOpen=false;++profileRequestEpoch;
 const destination=new URL('./'+id,location.href);
 if(tickerValid(symbol))destination.searchParams.set('symbol',symbol);
 if(typeof recordId==='string'&&recordId.length<=128)destination.searchParams.set('record',recordId);
 history.pushState({},'',destination.pathname+destination.search);render();document.getElementById('main')?.focus();
}
function applyPageContext(id){
 if(searchOpen||notificationOpen)return;
 const params=new URLSearchParams(location.search),symbol=params.get('symbol'),recordId=params.get('record');
 if(!tickerValid(symbol))return;
 const input=document.querySelector(id==='journal'?'#journal-form [name=symbol]':id==='portfolio'?'#ledger-form [name=symbol]':'#market-form [name=symbol]');
 if(input)input.value=symbol;
 if(id==='analyzer'){void openTicker(symbol).finally(refreshNotificationBadge);return;}
 const notice=document.createElement('p');notice.className='notice';notice.dataset.tickerContext=symbol;notice.textContent=t('tickerContext',{symbol});document.getElementById('main')?.prepend(notice);
 if(id==='portfolio'){const row=[...document.querySelectorAll('tbody tr')].find(item=>item.querySelector('td')?.textContent===symbol);if(row){row.dataset.selectedTicker=symbol;row.tabIndex=-1;}}
 if(id==='journal'&&recordId){const field=[...document.querySelectorAll('[data-journal-status]')].find(item=>item.dataset.journalStatus===recordId);const article=field?.closest('article');if(article){article.dataset.selectedRecord=recordId;article.tabIndex=-1;article.scrollIntoView({block:'center'});}}
}
function hydrateDashboardCards(){
 const values=dashboardValues();if(!values)return;
 const cash=document.querySelector('.dashboard-kpis .card:last-child');if(cash){cash.querySelector('strong').textContent=values.cash;cash.querySelector('p').textContent=t('cashBasis');}
 const sections=[['Mijn posities',values.positions,values.positionEntries,'analyzer'],['Watchlist',values.watchlist,values.watchlistEntries,'analyzer'],['Recente handelsplannen',values.plans,values.planEntries,'journal']];
 for(const [heading,fallback,entries,target] of sections){
  const title=[...document.querySelectorAll('h2')].find(item=>item.textContent===heading),description=title?.parentElement.querySelector('p');if(!description)continue;
  description.textContent=heading==='Mijn posities'&&!entries?.length?t('portfolioEmpty'):fallback;
  if(!entries?.length)continue;
  const list=document.createElement('div');list.className='watchlist';
  for(const entry of entries){const symbol=typeof entry==='string'?entry:entry.symbol;if(!tickerValid(symbol))continue;const link=document.createElement('a');link.className='search-result text-link';link.href='./'+target+'?symbol='+encodeURIComponent(symbol);link.dataset.dashboardTicker=symbol;link.textContent=symbol+(entry.quantity?' · '+t('shares',{quantity:entry.quantity}):entry.status?' · '+t(entry.status):'');link.onclick=event=>{event.preventDefault();navigate(target,{symbol,recordId:entry.id});};list.appendChild(link);}
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
 layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>'+escapeHtml(t('search'))+'</h1><button class="primary" id="close-search">'+escapeHtml(t('close'))+'</button></div><label class="sr-only" for="search-input">Zoek ticker of bedrijf</label><input class="search-input" id="search-input" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false" maxlength="40" placeholder="Zoek ticker of bedrijf" autocomplete="off"><div class="categories">'+['Aandelen','Mijn portefeuille','Handelsplannen','Journal'].map(x=>'<button class="chip" aria-pressed="'+(x===searchCategory)+'" data-category="'+x+'">'+x+'</button>').join('')+'</div><p class="notice" id="search-status" role="status">'+escapeHtml(t('searchMinimum'))+'</p><button class="secondary" id="search-retry" hidden>'+escapeHtml(t('retry'))+'</button><div id="search-results" role="listbox" aria-label="Zoekresultaten"></div></div>';
 app.appendChild(layer);layer.addEventListener('click',event=>{if(event.target===layer)closeOverlay();});let timer,epoch=0,results=[],selected=-1,resultCategory=searchCategory;
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
 layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>'+escapeHtml(t('notifications'))+'</h1><button class="primary" id="close-notifications">'+escapeHtml(t('close'))+'</button></div><div class="categories"><button class="chip" data-notification-filter="all" aria-pressed="'+(notificationFilter==='all')+'">'+escapeHtml(t('all'))+'</button><button class="chip" data-notification-filter="unread" aria-pressed="'+(notificationFilter==='unread')+'">'+escapeHtml(t('unreadFilter'))+'</button></div><div id="notification-entries"></div>'+(all.some(entry=>!entry.read)?'<button class="secondary" id="read-notifications">'+escapeHtml(t('readAll'))+'</button>':'')+'<p><a class="text-link" href="./radar" id="manage-alerts">'+escapeHtml(t('manageAlerts'))+'</a></p><p class="data-label">'+escapeHtml(t('notificationHint'))+'</p><p id="notification-status" role="status"></p></div>';
 app.appendChild(layer);layer.addEventListener('click',event=>{if(event.target===layer)closeOverlay();});const container=layer.querySelector('#notification-entries');
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
 layer.querySelector('#manage-alerts').onclick=event=>{event.preventDefault();navigate('radar');document.getElementById('alert-form')?.scrollIntoView({block:'center'});};
 layer.querySelectorAll('[data-notification-filter]').forEach(button=>button.onclick=()=>{notificationFilter=button.dataset.notificationFilter;refresh();});
}

document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!searchOpen){e.preventDefault();document.getElementById('search')?.focus();document.getElementById('search')?.click();return}if(e.key==='Escape'&&(searchOpen||notificationOpen))closeOverlay();if(e.key==='Tab'&&(searchOpen||notificationOpen)){const layer=document.querySelector('.overlay');const focusables=[...layer.querySelectorAll('button,input,a[href]')].filter(x=>!x.disabled&&!x.closest('[hidden],[inert]')&&x.getClientRects().length>0);if(focusables.length){e.preventDefault();const index=focusables.indexOf(document.activeElement);const next=index<0?(e.shiftKey?focusables.length-1:0):(index+(e.shiftKey?-1:1)+focusables.length)%focusables.length;focusables[next].focus();}}});
window.addEventListener('popstate',()=>{searchOpen=false;notificationOpen=false;render()});
function startApp(){
 const splash=document.createElement('div');splash.className='splash';splash.setAttribute('role','status');splash.setAttribute('aria-live','polite');
 splash.innerHTML='<div class="splash-brand"><svg class="splash-mark" viewBox="0 0 64 64" role="img" aria-label="TradePilot Pro logo"><rect width="64" height="64" rx="16" fill="#09111E"/><rect class="splash-bar bar-1" x="13" y="34" width="9" height="18" rx="4.5" fill="#55C7ED"/><rect class="splash-bar bar-2" x="27" y="23" width="9" height="29" rx="4.5" fill="#398DEB"/><rect class="splash-bar bar-3" x="41" y="12" width="9" height="40" rx="4.5" fill="#3773E7"/></svg><h1>TradePilot <span>Pro</span></h1><p id="splash-status" class="sr-only">App voorbereiden…</p></div>';
 document.body.appendChild(splash);
 const slow=setTimeout(()=>{const status=document.getElementById('splash-status');if(status){status.className='splash-status';status.textContent='App voorbereiden…'}},2000);
 try{render();refreshAccountSummary();void hydrateDashboardProfile();requestAnimationFrame(()=>{const done=()=>{clearTimeout(slow);splash.remove()};if(matchMedia('(prefers-reduced-motion: reduce)').matches)done();else splash.addEventListener('animationend',e=>{if(e.target.classList.contains('bar-3'))done()})})}
 catch(e){clearTimeout(slow);const status=document.getElementById('splash-status');if(status){status.className='splash-status';status.textContent='Starten mislukt. Ververs de pagina om opnieuw te proberen.'}throw e}
}
initFeatures(accountFetch,()=>{refreshNotificationBadge();if(route()!=='settings'&&!searchOpen&&!notificationOpen)render();},navigate);
window.addEventListener('tradepilot:notifications',refreshNotificationBadge);
startApp();
void loadFeatures();
setInterval(()=>{if(!document.hidden)refreshGreeting()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshGreeting()});
window.addEventListener('focus',()=>{refreshGreeting();if(!document.hidden)void hydrateDashboardProfile()});

window.addEventListener('online',updateConnectivity);
window.addEventListener('offline',updateConnectivity);
