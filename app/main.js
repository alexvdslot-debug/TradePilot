const pages=[['dashboard','Dashboard','home'],['portfolio','Portfolio','portfolio'],['radar','Kansen','radar'],['analyzer','Analyzer','analyzer'],['journal','Journal','journal']];
const app=document.getElementById('app');
let searchOpen=false,notificationOpen=false,searchCategory='Aandelen',lastFocus=null;
const dashboardPreferences={name:null,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone};
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
function tabs(cls){return '<nav class="'+cls+'" aria-label="Hoofdnavigatie">'+pages.map(([id,label,symbol])=>'<a class="tab" href="./'+id+'" data-route="'+id+'" '+(route()===id?'aria-current="page"':'')+'><span aria-hidden="true">'+symbol+'</span>'+label+'</a>').join('')+'</nav>'}
function greeting(date=new Date(),timeZone=dashboardPreferences.timeZone){let hour;try{hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone}).format(date))}catch{hour=date.getHours()}return hour<5?'Goedenacht':hour<12?'Goedemorgen':hour<18?'Goedemiddag':hour<23?'Goedenavond':'Goedenacht'}
function dashboard(){const name=dashboardPreferences.name;return '<div data-testid="dashboard"><p id="connectivity-notice" class="notice" role="alert" hidden>Geen internetverbinding. Gegevens kunnen niet worden vernieuwd.</p><p class="eyebrow">Jouw tradingoverzicht</p><h1 id="dashboard-greeting">'+greeting()+(name?', '+name:'')+'</h1><p class="muted">Je persoonlijke handelscockpit. Gegevens verschijnen zodra je account en betrouwbare bronnen zijn aangesloten.</p><div class="notice" role="status">Actuele marktgegevens niet beschikbaar · Geen gekoppelde marktfeed of geverifieerde beursfase.</div><div class="dashboard-kpis">'+[['Portefeuillewaarde','Nog niet beschikbaar','Geen gekoppelde portefeuille'],['Dagresultaat','Nog niet beschikbaar','Geen gevalideerde posities of koersen'],['Kapitaal onder risico','Nog niet beschikbaar','Risicobudget nog niet ingesteld'],['Beschikbare cash','Nog niet beschikbaar','Geen gekoppeld cash-ledger']].map(([title,value,desc])=>'<section class="card"><h2>'+title+'</h2><strong>'+value+'</strong><p class="muted">'+desc+'</p></section>').join('')+'</div><div class="dashboard-columns"><section class="card"><h2>Mijn posities</h2><p class="muted">Nog geen portefeuille gekoppeld. Posities en resultaten worden na veilige accountkoppeling getoond.</p><a class="text-link" href="./portfolio" data-route="portfolio">Bekijk Portfolio →</a></section><section class="card"><h2>Risico & marktstatus</h2><p class="muted">Concentratie en koersdekking onbekend. Zonder gevalideerde marktdata worden geen risicoscores berekend.</p><p class="data-label">Bron: niet verbonden · Koerstijd: onbekend · Handelsfase: onbekend · Vertraging: onbekend</p></section></div><section class="card dashboard-section"><h2>Kansen voor 1–5 handelsdagen</h2><strong>Nog geen bevestigde kansen</strong><p class="muted">De scanner is nog niet aangesloten. Wachten is een geldige handelskeuze; er worden geen fictieve signalen getoond.</p><a class="text-link" href="./radar" data-route="radar">Bekijk Kansen →</a></section><div class="dashboard-columns dashboard-section"><section class="card"><h2>Watchlist</h2><p class="muted">Nog geen watchlistgegevens beschikbaar.</p><a class="text-link" href="./radar" data-route="radar">Naar Kansen →</a></section><section class="card"><h2>Recente handelsplannen</h2><p class="muted">Nog geen gekoppelde handelsplannen.</p><a class="text-link" href="./journal" data-route="journal">Open Journal →</a></section></div><p class="dashboard-footer">Analyses zijn scenario’s, geen gegarandeerde uitkomsten. Geen live marktdata of brokerkoppeling.</p></div>'}
function updateConnectivity(){const notice=document.getElementById('connectivity-notice');if(!notice)return;notice.hidden=navigator.onLine}
function refreshGreeting(){const el=document.getElementById('dashboard-greeting');if(el)el.textContent=greeting()+(dashboardPreferences.name?', '+dashboardPreferences.name:'')}
function settingsPage(){return '<button class="back" data-back>← Terug</button><p class="eyebrow">Account en voorkeuren</p><h1>Instellingen</h1><p class="muted">Beveiligde accountinstellingen via Cloudflare Access. Je portefeuille wordt nog niet in de cloud opgeslagen.</p><section class="card settings-card"><p id="account-status" role="status" aria-live="polite">Verbinding controleren…</p><p><a class="text-link" id="account-login" href="https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/session" target="_blank" rel="noopener noreferrer">Beveiligd inloggen ↗</a></p><form id="account-settings"><label for="profile-name">Weergavenaam</label><input id="profile-name" maxlength="80" autocomplete="nickname"><label for="profile-locale">Taal</label><select id="profile-locale"><option value="nl-NL">Nederlands</option><option value="en-US">English</option></select><label for="profile-zone">Tijdzone</label><select id="profile-zone"><option value="Europe/Amsterdam">Amsterdam</option><option value="America/New_York">New York</option><option value="UTC">UTC</option></select><label for="profile-currency">Weergavevaluta</label><select id="profile-currency"><option value="EUR">EUR</option><option value="USD">USD</option></select><label for="profile-risk">Risicobudget per trade (EUR)</label><input id="profile-risk" inputmode="decimal" placeholder="100.00" required><button class="primary" id="account-save" type="submit" disabled>Opslaan</button></form><p id="account-message" role="status" aria-live="polite"></p><button class="primary" id="account-reload" type="button">Opnieuw laden</button><p><a class="text-link" href="https://tradepilot-pro-api.alexvdslot.workers.dev/cdn-cgi/access/logout">Uitloggen bij Cloudflare Access ↗</a></p></section>'}
function pageContent(id){if(id==='dashboard')return dashboard();if(id==='settings')return settingsPage();
 const [title,desc]=pageText[id]||pageText.dashboard;
 return '<p class="eyebrow">TradePilot Pro</p><h1>'+(id==='dashboard'?greeting()+', Alexander':title)+'</h1><p class="muted">'+desc+'</p>'+(id==='dashboard'?'<div class="grid"><section class="card"><h2>Portefeuillewaarde</h2><strong>—</strong><p class="muted">Nog geen gekoppelde portefeuilledata</p></section><section class="card"><h2>Marktstatus</h2><strong>Niet verbonden</strong><p class="muted">Geen geverifieerde actuele koersen</p></section><section class="card"><h2>Kansen</h2><strong>—</strong><p class="muted">Scanner nog niet aangesloten</p></section></div>':'<div class="card" style="margin-top:24px"><h2>Functie in ontwikkeling</h2><p class="muted">De route werkt. De inhoud wordt in een volgende bouwfase aangesloten en getest.</p></div>')+'<div class="notice">Ontwikkelversie · Geen live marktdata, brokerkoppeling of handelsadvies.</div>'}

const accountApi=location.hostname==='tradepilot-pro-api.alexvdslot.workers.dev'?location.origin:'https://tradepilot-pro-api.alexvdslot.workers.dev';
let accountVersion=null;
function setAccountEnabled(enabled){const form=document.getElementById('account-settings');if(form)for(const input of form.elements)input.disabled=!enabled}
async function accountFetch(endpoint,options={}){
 const response=await fetch(accountApi+'/api/v1/'+endpoint,{credentials:'include',cache:'no-store',...options});
 let body;try{body=await response.json()}catch{const e=new Error('Geen geldig JSON-antwoord');e.status=response.status;throw e}
 if(!response.ok){const e=new Error(body.error?.code||'SERVER_ERROR');e.status=response.status;throw e}
 return body.data;
}
async function loadAccount(){
 const status=document.getElementById('account-status');if(!status)return;
 accountVersion=null;setAccountEnabled(false);status.textContent='Beveiligde instellingen laden…';
 document.getElementById('account-message').textContent='';
 try{
  const session=await accountFetch('session');
  if(!session.authenticated)throw Error('UNAUTHENTICATED');
  const data=await accountFetch('settings');
  if(!document.getElementById('account-settings'))return;
  accountVersion=data.version;
  document.getElementById('profile-name').value=data.display_name;
  document.getElementById('profile-locale').value=data.locale;
  document.getElementById('profile-zone').value=data.timezone;
  document.getElementById('profile-currency').value=data.display_currency;
  document.getElementById('profile-risk').value=data.risk_budget_eur;
  dashboardPreferences.name=data.display_name||null;
  dashboardPreferences.timeZone=data.timezone;
  status.textContent='Ingelogd · instellingen geladen (versie '+data.version+')';
  setAccountEnabled(true);
 }catch(e){
  status.textContent=e.status===401?'Niet ingelogd: gebruik de beveiligde inloglink.':e.status===403?'Toegang geweigerd.':e.status===503?'Accountservice niet beschikbaar.':'Instellingen niet bereikbaar ('+e.message+'). Mogelijk blokkeert de browser cookies tussen domeinen.';
 }
}
function bindAccountSettings(){
 document.getElementById('account-reload').onclick=loadAccount;
 document.getElementById('account-settings').onsubmit=async event=>{
  event.preventDefault();if(accountVersion===null)return;
  const payload={version:accountVersion,display_name:document.getElementById('profile-name').value.trim(),locale:document.getElementById('profile-locale').value,timezone:document.getElementById('profile-zone').value,display_currency:document.getElementById('profile-currency').value,risk_budget_eur:document.getElementById('profile-risk').value.trim().replace(',','.')};
  setAccountEnabled(false);document.getElementById('account-message').textContent='Opslaan…';
  try{
   const data=await accountFetch('settings',{method:'PATCH',headers:{'content-type':'application/json','x-tradepilot-csrf':'1'},body:JSON.stringify(payload)});
   accountVersion=data.version;dashboardPreferences.name=data.display_name||null;dashboardPreferences.timeZone=data.timezone;
   document.getElementById('account-message').textContent='Opgeslagen in beveiligde database · versie '+data.version;
   setAccountEnabled(true);
  }catch(e){
   document.getElementById('account-message').textContent=e.status===409?'Conflict: laad de nieuwste instellingen en probeer opnieuw.':'Opslaan mislukt: '+e.message;
   if(e.status!==409)setAccountEnabled(true);
  }
 };
 loadAccount();
}
function render(){const id=route();document.title=(id==='settings'?'Instellingen':(pages.find(p=>p[0]===id)||pages[0])[1])+' · TradePilot Pro';
 app.innerHTML='<div class="shell"><header class="header"><a class="brand" href="./dashboard" data-route="dashboard"><img class="brand-mark" src="./assets/tradepilot-mark.svg" alt="" width="38" height="38">TradePilot <span style="color:#2388b9">Pro</span></a><div class="header-actions">'+iconButton('Zoeken','search','search')+iconButton('Meldingen','bell','notifications')+iconButton('Instellingen','settings','settings')+'</div></header>'+tabs('tabs')+'<main class="content" id="main">'+pageContent(id)+'</main></div>'+tabs('bottom');
 if(searchOpen)renderSearch();if(notificationOpen)renderNotifications();if(searchOpen||notificationOpen)app.querySelector('.shell')?.setAttribute('inert','');
 document.getElementById('search').onclick=()=>{lastFocus=document.activeElement;searchOpen=true;notificationOpen=false;render();document.getElementById('search-input').focus()};
 document.getElementById('notifications').onclick=()=>{lastFocus=document.activeElement;notificationOpen=true;searchOpen=false;render();document.getElementById('close-notifications').focus()};
 document.getElementById('settings').onclick=()=>navigate('settings');
 document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.route)}));
 updateConnectivity();
 if(id==='settings')bindAccountSettings();
 const back=document.querySelector('[data-back]');if(back)back.onclick=()=>history.length>1?history.back():navigate('dashboard');
}
function navigate(id){searchOpen=false;notificationOpen=false;history.pushState({},'',new URL('./'+id,location.href).pathname);render()}
function closeOverlay(){searchOpen=false;notificationOpen=false;render();if(lastFocus?.id){document.getElementById(lastFocus.id)?.focus()}}
function renderSearch(){const layer=document.createElement('div');layer.className='overlay';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Zoeken');layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>Zoeken</h1><button class="primary" id="close-search">Sluiten</button></div><label class="sr-only" for="search-input">Zoek ticker of bedrijf</label><input class="search-input" id="search-input" placeholder="Zoek ticker of bedrijf" autocomplete="off"><div class="categories">'+['Aandelen','Mijn portefeuille','Handelsplannen','Journal'].map(x=>'<button class="chip" aria-pressed="'+(x===searchCategory)+'" data-category="'+x+'">'+x+'</button>').join('')+'</div><p class="notice" id="search-status">Zoekgegevens zijn nog niet aangesloten. Er worden geen fictieve resultaten getoond.</p></div>';app.appendChild(layer);layer.querySelector('#close-search').onclick=closeOverlay;layer.querySelectorAll('[data-category]').forEach(el=>el.onclick=()=>{searchCategory=el.dataset.category;layer.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)))});layer.querySelector('#search-input').addEventListener('input',e=>{layer.querySelector('#search-status').textContent=e.target.value.trim()?'Zoekservice nog niet verbonden. Geen resultaten beschikbaar.':'Zoekgegevens zijn nog niet aangesloten. Er worden geen fictieve resultaten getoond.'})}
function renderNotifications(){const layer=document.createElement('div');layer.className='overlay';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Meldingen');layer.innerHTML='<div class="overlay-inner"><div class="overlay-top"><h1>Meldingen</h1><button class="primary" id="close-notifications">Sluiten</button></div><p class="notice">Er is nog geen meldingenservice aangesloten.</p></div>';app.appendChild(layer);layer.querySelector('button').onclick=closeOverlay}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!searchOpen){e.preventDefault();document.getElementById('search')?.focus();document.getElementById('search')?.click();return}if(e.key==='Escape'&&(searchOpen||notificationOpen))closeOverlay();if(e.key==='Tab'&&(searchOpen||notificationOpen)){const layer=document.querySelector('.overlay');const focusables=[...layer.querySelectorAll('button,input')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
window.addEventListener('popstate',()=>{searchOpen=false;notificationOpen=false;render()});
function startApp(){
 const splash=document.createElement('div');splash.className='splash';splash.setAttribute('role','status');splash.setAttribute('aria-live','polite');
 splash.innerHTML='<div class="splash-brand"><svg class="splash-mark" viewBox="0 0 64 64" role="img" aria-label="TradePilot Pro logo"><rect width="64" height="64" rx="16" fill="#09111E"/><rect class="splash-bar bar-1" x="13" y="34" width="9" height="18" rx="4.5" fill="#55C7ED"/><rect class="splash-bar bar-2" x="27" y="23" width="9" height="29" rx="4.5" fill="#398DEB"/><rect class="splash-bar bar-3" x="41" y="12" width="9" height="40" rx="4.5" fill="#3773E7"/></svg><h1>TradePilot <span>Pro</span></h1><p id="splash-status" class="sr-only">App voorbereiden…</p></div>';
 document.body.appendChild(splash);
 const slow=setTimeout(()=>{const status=document.getElementById('splash-status');if(status){status.className='splash-status';status.textContent='App voorbereiden…'}},2000);
 try{render();requestAnimationFrame(()=>{const done=()=>{clearTimeout(slow);splash.remove()};if(matchMedia('(prefers-reduced-motion: reduce)').matches)done();else splash.addEventListener('animationend',e=>{if(e.target.classList.contains('bar-3'))done()})})}
 catch(e){clearTimeout(slow);const status=document.getElementById('splash-status');if(status){status.className='splash-status';status.textContent='Starten mislukt. Ververs de pagina om opnieuw te proberen.'}throw e}
}
startApp();
setInterval(()=>{if(!document.hidden)refreshGreeting()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshGreeting()});
window.addEventListener('focus',refreshGreeting);

window.addEventListener('online',updateConnectivity);
window.addEventListener('offline',updateConnectivity);
