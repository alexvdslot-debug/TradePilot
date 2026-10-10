const {test,expect}=require('@playwright/test');
const root='http://127.0.0.1:8765/app/';
const initial=()=>({version:1,events:[],watchlist:[],journal:[],alerts:[],preferences:{allowMargin:false,costMethod:'average'}});
const profile={display_name:'UX fixture',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100',version:1};
function feed(symbol,interval){
 const candles=Array.from({length:40},(_,index)=>({time:new Date(Date.UTC(2026,9,8,14)+index*900000).toISOString(),completedAt:new Date(Date.UTC(2026,9,8,14)+(index+1)*900000).toISOString(),complete:true,o:10+index*.01,h:10.2+index*.01,l:9.8+index*.01,c:10+index*.01,v:100000}));
 return {symbol,interval,provider:'Twelve Data',verified:true,timezone:'UTC',exchange:'NASDAQ',exchangeTimezone:'America/New_York',currency:'USD',marketSession:'unverified',realtime:'unverified',delay:'unverified',stale:true,asOf:candles.at(-1).time,retrievedAt:'2026-10-10T12:00:00Z',candles};
}
async function setup(page,state=initial()){
 let stored=state;
 await page.route('**/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(path.endsWith('/session'))return route.fulfill({json:{data:{authenticated:true,settings:profile}}});
  if(path.endsWith('/settings'))return route.fulfill({json:{data:profile}});
  if(path.endsWith('/state')){if(request.method()==='PUT'){expect(request.postDataJSON().version).toBe(stored.version);stored={...request.postDataJSON(),version:stored.version+1};}return route.fulfill({json:{data:stored}});}
  if(path.endsWith('/market/candles'))return route.fulfill({json:{data:feed(url.searchParams.get('symbol'),url.searchParams.get('interval'))}});
  return route.fulfill({status:503,json:{error:{code:'MARKET_NOT_CONFIGURED'}}});
 });
 return {get:()=>stored};
}
async function ready(page,route){await page.goto(root+route);await expect(page.locator('.splash')).toBeHidden();await expect(page.locator('#data-status')).toContainText('versie 1');}

test('portfolio value precedes administration and a holding opens its Analyzer',async({page})=>{
 const state=initial();state.events=[{id:'deposit',timestamp:'2026-10-01T10:00:00Z',type:'DEPOSIT',currency:'USD',amount:'1000'},{id:'buy',timestamp:'2026-10-02T10:00:00Z',type:'BUY',currency:'USD',symbol:'OPEN',quantity:'100',price:'3'}];
 await setup(page,state);await page.setViewportSize({width:375,height:812});await ready(page,'portfolio');
 const order=await page.evaluate(()=>{const headings=[...document.querySelectorAll('main h2')].map(element=>element.textContent);return {value:headings.indexOf('Waarde en concentratie'),book:headings.indexOf('Boeking toevoegen')};});
 expect(order.value).toBeGreaterThanOrEqual(0);expect(order.value).toBeLessThan(order.book);
 await page.getByRole('button',{name:'Transactie toevoegen',exact:true}).click();await expect(page.locator('#ledger-form select[name=type]')).toBeFocused();
 await page.locator('[data-open-analyzer=OPEN]').first().click();await expect(page).toHaveURL(/\/app\/analyzer(?:\?|$)/);await expect(page.locator('#market-form input[name=symbol]')).toHaveValue('OPEN');await expect(page.locator('.price-chart')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('radar comparison fills workspace and supports descriptive filter sort reset and ticker drilldown',async({page})=>{
 await setup(page);await page.setViewportSize({width:1440,height:1000});await ready(page,'radar');
 await expect(page.locator('#scan-watchlist')).toBeDisabled();await page.locator('#scan-discover').click();await expect(page.locator('#scan-table tbody tr')).toHaveCount(7);await expect(page.locator('#scan-watchlist')).toBeDisabled();await expect(page.locator('#scan-discover')).toBeEnabled();
 const widths=await page.evaluate(()=>({results:document.getElementById('scan-results').getBoundingClientRect().width,watch:document.getElementById('watch-form').closest('section').getBoundingClientRect().width}));expect(widths.results).toBeGreaterThan(widths.watch*1.5);
 await page.locator('#scan-sort').selectOption('ticker');await expect(page.locator('#scan-table tbody tr').first()).toContainText('AAPL');
 await page.locator('#scan-filter').fill('NVDA');await expect(page.locator('#scan-table tbody tr')).toHaveCount(1);await expect(page.locator('#scan-results')).toContainText('geen bevestigde actuele ranking');
 await page.locator('#scan-filter').fill('NO-SUCH-TICKER');await expect(page.locator('#scan-empty')).toBeVisible();await page.locator('#scan-reset').click();await expect(page.locator('#scan-table tbody tr')).toHaveCount(7);await expect(page.locator('#scan-sort')).toHaveValue('quality');await expect(page.locator('#scan-filter')).toBeFocused();
 await page.locator('#scan-table [data-select-candidate=NVDA]').click();await page.locator('#scan-details [data-open-analyzer=NVDA]').click();await expect(page.locator('#market-form input[name=symbol]')).toHaveValue('NVDA');await expect(page).toHaveURL(/\/app\/analyzer(?:\?|$)/);
});

test('validated manual scenario prefills Journal but persists only after explicit plan save',async({page})=>{
 const store=await setup(page);await ready(page,'analyzer');await page.locator('#market-form input[name=symbol]').fill('OPEN');
 for(const [name,value]of Object.entries({entry:'10',stop:'9',target1:'12',target2:'14',quantity:'100',fees:'2',slippage:'0.01'}))await page.locator('#scenario-form [name='+name+']').fill(value);
 await page.locator('#scenario-form button').click();await expect(page.locator('#scenario-result')).toContainText('104.00');await page.locator('#scenario-journal').click();await expect(page).toHaveURL(/\/app\/journal(?:\?|$)/);
 for(const [name,value]of Object.entries({symbol:'OPEN',entry:'10',stop:'9',target1:'12',target2:'14'}))await expect(page.locator('#journal-form [name='+name+']')).toHaveValue(value);
 expect(store.get().journal).toHaveLength(0);await page.locator('#journal-form [name=thesis]').fill('Eigen gecontroleerde onderbouwing');await page.locator('#journal-form button').click();await expect(page.locator('#feature-message')).toContainText('Plan opgeslagen');expect(store.get().journal[0].status).toBe('planned');expect(store.get().events).toHaveLength(0);await expect(page.locator('.journal-list')).toContainText('Gepland');
});

test('journal Dutch status labels preserve values and ticker opens Analyzer',async({page})=>{
 const state=initial();state.journal=[{id:'j1',symbol:'OPEN',createdAt:'2026-10-01T09:00:00Z',thesis:'Fixture onderbouwing',entry:'3',stop:'2.8',target1:'3.5',target2:'4',status:'reviewed',evaluation:''}];
 await setup(page,state);await ready(page,'journal');await expect(page.locator('[data-journal-status=j1]')).toHaveValue('reviewed');await expect(page.locator('[data-journal-status=j1] option:checked')).toHaveText('Geëvalueerd');await expect(page.locator('.journal-list .badge')).toHaveText('Gepland');await page.locator('[data-open-analyzer=OPEN]').click();await expect(page.locator('#market-form input[name=symbol]')).toHaveValue('OPEN');
});

test('alert edit pause rearm and delete save explicit owner state',async({page})=>{
 const state=initial();state.alerts=[{id:'a1',symbol:'OPEN',direction:'above',price:'3',enabled:true,triggeredAt:null}];const store=await setup(page,state);await ready(page,'radar');
 await expect(page.locator('.alert-item')).toContainText('Koers boven');await page.locator('.alert-item summary').click();await page.locator('[data-alert-edit=a1] [name=direction]').selectOption('below');await page.locator('[data-alert-edit=a1] [name=price]').fill('2.5');await page.locator('[data-alert-edit=a1] button').click();await expect(page.locator('#feature-message')).toContainText('bijgewerkt');expect(store.get().alerts[0].price).toBe('2.5');expect(store.get().alerts[0].direction).toBe('below');
 await page.locator('[data-toggle-alert=a1]').click();await expect(page.locator('[data-toggle-alert=a1]')).toHaveText('Opnieuw aanzetten');expect(store.get().alerts[0].enabled).toBe(false);await page.locator('[data-toggle-alert=a1]').click();await expect(page.locator('[data-toggle-alert=a1]')).toHaveText('Pauzeren');expect(store.get().alerts[0].enabled).toBe(true);
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-delete-alert=a1]').click();await expect(page.locator('.alert-item')).toHaveCount(0);expect(store.get().alerts).toHaveLength(0);
});

test('editing a paused below-alert preserves direction and paused state',async({page})=>{
 const state=initial();state.alerts=[{id:'paused',symbol:'OPEN',direction:'below',price:'3',enabled:false,triggeredAt:null}];const store=await setup(page,state);await ready(page,'radar');
 await page.locator('.alert-item summary').click();await expect(page.locator('[data-alert-edit=paused] [name=direction]')).toHaveValue('below');await page.locator('[data-alert-edit=paused] [name=price]').fill('2');await page.locator('[data-alert-edit=paused] button').click();await expect(page.locator('#feature-message')).toContainText('bijgewerkt');expect(store.get().alerts[0].enabled).toBe(false);expect(store.get().alerts[0].direction).toBe('below');expect(store.get().alerts[0].price).toBe('2');
});

test('interval selection refreshes chosen ticker and stays idle without a ticker',async({page})=>{
 await setup(page);const requested=[];page.on('request',request=>{if(request.url().includes('/market/candles'))requested.push(new URL(request.url()).searchParams.get('interval'));});await ready(page,'analyzer');
 await page.locator('#market-form [name=interval]').selectOption('15min');expect(requested).toEqual([]);await page.locator('#market-form [name=symbol]').fill('OPEN');await page.locator('#market-form button').click();await expect(page.locator('.price-chart')).toBeVisible();expect(requested).toEqual(['15min']);await page.locator('#market-form [name=interval]').selectOption('5min');await expect.poll(()=>requested).toEqual(['15min','5min']);await expect(page.locator('#market-result .badge')).toHaveText('5min');
});

async function quotaScan(page,{retrievedAt='2026-10-10T12:00:00Z'}={}){
 await page.clock.setFixedTime(new Date('2026-10-10T12:00:00Z'));await setup(page);const requests=[];
 await page.route('**/api/v1/market/candles?**',route=>{
  const url=new URL(route.request().url()),symbol=url.searchParams.get('symbol'),interval=url.searchParams.get('interval');requests.push({symbol,interval});
  if(requests.length>8)return route.fulfill({status:429,json:{error:{code:'PROVIDER_QUOTA'}}});
  return route.fulfill({json:{data:{...feed(symbol,interval),retrievedAt}}});
 });
 await ready(page,'radar');await page.locator('#scan-discover').click();await expect(page.locator('#scan-table tbody tr')).toHaveCount(7);expect(requests).toHaveLength(8);return requests;
}

test('full eight-call scan opens matching 15-minute Analyzer without a ninth provider request',async({page})=>{
 const requests=await quotaScan(page);await page.locator('#scan-table [data-select-candidate=NVDA]').click();await page.locator('#scan-details [data-open-analyzer=NVDA]').click();await expect(page.locator('#market-form [name=interval]')).toHaveValue('15min');await expect(page.locator('.price-chart')).toBeVisible();await expect(page.locator('#market-result .badge')).toHaveText('15min');await expect(page.locator('#market-result')).toContainText('Wachten');expect(requests).toHaveLength(8);
 await page.locator('#market-form [name=interval]').selectOption('5min');await expect(page.locator('#market-result')).toContainText('Aanvraaglimiet van de databron bereikt');expect(requests).toHaveLength(9);expect(requests[8]).toEqual({symbol:'NVDA',interval:'5min'});await expect(page.locator('#market-retry')).toBeVisible();await expect(page.locator('#market-result')).toContainText('minutenlimiet of daglimiet');await page.locator('#market-retry').click();await expect.poll(()=>requests.length).toBe(10);
});

test('scan cache older than sixty seconds cannot bypass a provider fetch',async({page})=>{
 const requests=await quotaScan(page);await page.clock.setFixedTime(new Date('2026-10-10T12:01:01Z'));await page.locator('#scan-table [data-select-candidate=NVDA]').click();await page.locator('#scan-details [data-open-analyzer=NVDA]').click();await expect(page.locator('#market-result')).toContainText('Aanvraaglimiet van de databron bereikt');expect(requests).toHaveLength(9);await expect(page.locator('.price-chart')).toHaveCount(0);
});

test('scan cache with an invalid retrieval timestamp is never reused',async({page})=>{
 const requests=await quotaScan(page,{retrievedAt:'2026-02-30T12:00:00Z'});await page.locator('#scan-table [data-select-candidate=NVDA]').click();await page.locator('#scan-details [data-open-analyzer=NVDA]').click();await expect(page.locator('#market-result')).toContainText('Aanvraaglimiet van de databron bereikt');expect(requests).toHaveLength(9);await expect(page.locator('.price-chart')).toHaveCount(0);
});

 test('add shares opens purchase fields and explains missing cash before allowing a real booking',async({page})=>{
 const store=await setup(page);await ready(page,'portfolio');
 await page.getByRole('button',{name:'Aandelen toevoegen',exact:true}).click();
 await expect(page.locator('#ledger-form [name=type]')).toHaveValue('BUY');
 await expect(page.locator('#ledger-form [name=symbol]')).toBeFocused();
 await expect(page.locator('#ledger-live-preview')).toContainText('Vul ticker, aantal en aankoopprijs');
 for(const [name,value]of Object.entries({symbol:'OPEN',quantity:'10',price:'3'}))await page.locator('#ledger-form [name='+name+']').fill(value);
 await expect(page.locator('#ledger-live-preview')).toContainText('Registreer eerst je werkelijke storting');
 await expect(page.locator('#ledger-form button.primary')).toBeDisabled();expect(store.get().events).toHaveLength(0);
 await page.locator('#ledger-form [name=type]').selectOption('DEPOSIT');
 await page.locator('#ledger-form [name=timestamp]').fill('2026-10-01T10:00:00Z');
 await page.locator('#ledger-form [name=amount]').fill('100');
 await expect(page.locator('#ledger-form button.primary')).toBeEnabled();await page.locator('#ledger-form button.primary').click();
 await expect(page.locator('#feature-message')).toContainText('Boeking opgeslagen');
 await page.getByRole('button',{name:'Aandelen toevoegen',exact:true}).click();
 for(const [name,value]of Object.entries({symbol:'OPEN',quantity:'10',price:'3'}))await page.locator('#ledger-form [name='+name+']').fill(value);
 await expect(page.locator('#ledger-form button.primary')).toBeEnabled();await page.locator('#ledger-form button.primary').click();
 await expect(page.locator('[data-position-row=OPEN]')).toContainText('10');
 expect(store.get().events.map(e=>e.type)).toEqual(['DEPOSIT','BUY']);
 });
