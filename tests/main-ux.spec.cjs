const {test,expect}=require('@playwright/test');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const base='http://127.0.0.1:8765';
const settings={display_name:'Alex',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:1};
function snapshot(){return {version:1,preferences:{allowMargin:false,costMethod:'average'},watchlist:['OPEN','AAPL'],events:[{id:'deposit',type:'DEPOSIT',currency:'USD',amount:'1000',timestamp:'2026-10-01T12:00:00Z'},{id:'buy',type:'BUY',symbol:'OPEN',currency:'USD',quantity:'2',price:'4',timestamp:'2026-10-01T12:01:00Z'}],journal:[{id:'plan-1',symbol:'OPEN',createdAt:'2026-10-01T12:00:00Z',thesis:'OPEN uitbraak volgen',entry:'4',stop:'3',target1:'5',target2:'6',status:'planned',evaluation:''}],alerts:[{id:'unread-1',symbol:'OPEN',direction:'above',price:'5',enabled:false,triggeredAt:'2026-10-01T14:35:00Z',readAt:null,triggerPrice:'5.1',triggerAsOf:'2026-10-01T14:30:00Z',triggerSource:'Twelve Data'},{id:'read-1',symbol:'AAPL',direction:'below',price:'200',enabled:false,triggeredAt:'2026-10-01T14:35:00Z',readAt:'2026-10-01T14:36:00Z',triggerPrice:'199',triggerAsOf:'2026-10-01T14:30:00Z',triggerSource:'Twelve Data'}]};}
async function fixture(page,{failSave=false,unreadCount=1}={}){
 let state=snapshot(),writes=0;
 if(unreadCount>1)state.alerts=Array.from({length:unreadCount},(_,index)=>({...state.alerts[0],id:'unread-'+index}));
 // Exercise current shell sources while the parent owns generation of Worker assets.
 await page.route(/^http:\/\/127\.0\.0\.1:8765\/app\/[A-Za-z0-9.-]+\.m?js$/,route=>route.fulfill({contentType:'text/javascript',body:readFileSync(path.join(__dirname,'../app',new URL(route.request().url()).pathname.split('/').pop()),'utf8')}));
 await page.route(base+'/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.endsWith('/session'))return route.fulfill({json:{data:{authenticated:true,settings}}});
  if(url.pathname.endsWith('/settings'))return route.fulfill({json:{data:settings}});
  if(url.pathname.endsWith('/state')){
   if(request.method()==='PUT'){writes++;if(failSave)return route.fulfill({status:503,json:{error:{code:'DATABASE_ERROR'}}});state={...request.postDataJSON(),version:state.version+1};}
   return route.fulfill({json:{data:state}});
  }
  if(url.pathname.endsWith('/market/search'))return route.fulfill({json:{data:[{symbol:'OPEN',name:'Opendoor',exchange:'NASDAQ'},{symbol:'MSFT',name:'Microsoft',exchange:'NASDAQ'}]}});
  return route.fulfill({status:503,json:{error:{code:'MARKET_NOT_CONFIGURED'}}});
 });
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/app/index.html');
 await expect(page.locator('.splash')).toBeHidden();await expect(page.locator('#dashboard-greeting')).toContainText('Alex');
 await expect(page.locator('[data-dashboard-ticker="OPEN"]').first()).toBeVisible();
 return {get writes(){return writes},get state(){return state}};
}
async function search(page,category){await page.getByRole('button',{name:'Zoeken',exact:true}).click();await page.getByRole('button',{name:category,exact:true}).click();await page.locator('#search-input').fill('OPEN');await expect(page.locator('#search-results [role=option]').first()).toBeVisible();}
for(const width of [1280,390])test(`tab navigation keeps the page at the top without shifting the shell at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:720});await fixture(page);
 const navigation=page.locator(width===390?'.bottom':'.tabs');
 const headerTop=await page.locator('.header').evaluate(el=>el.getBoundingClientRect().top);
 for(const target of ['portfolio','radar','journal','dashboard']){
  await navigation.locator(`[data-route="${target}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/app/${target}$`));
  await expect(page.locator('#main')).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  expect(await page.locator('.header').evaluate(el=>el.getBoundingClientRect().top)).toBe(headerTop);
 }
});
test('private search opens holdings and journal in their own context',async({page})=>{
 await fixture(page);await search(page,'Mijn portefeuille');await page.locator('#search-results [role=option]').first().click();
 await expect(page).toHaveURL(/\/app\/portfolio\?symbol=OPEN$/);await expect(page.locator('[data-ticker-context]')).toContainText('OPEN');
 await search(page,'Journal');await page.locator('#search-results [role=option]').first().click();
 await expect(page).toHaveURL(/\/app\/journal\?symbol=OPEN&record=plan-1$/);await expect(page.locator('[data-selected-record="plan-1"]')).toBeVisible();
 await search(page,'Handelsplannen');await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/app\/journal\?symbol=OPEN&record=plan-1$/);
});
test('search keyboard selection opens correct ticker and Escape restores focus',async({page})=>{
 await fixture(page);await page.keyboard.press('Control+k');await expect(page.locator('#search-input')).toBeFocused();await page.locator('#search-input').fill('OPEN');await expect(page.getByRole('option')).toHaveCount(2);
 await page.keyboard.press('ArrowDown');await expect(page.locator('#search-input')).toHaveAttribute('aria-activedescendant','search-result-1');await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/app\/analyzer\?symbol=MSFT$/);await expect(page.locator('#market-form [name=symbol]')).toHaveValue('MSFT');
 await page.getByRole('button',{name:'Zoeken',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Zoeken',exact:true})).toBeFocused();
});
test('empty search traps focus without including hidden retry controls',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:'Zoeken',exact:true}).click();
 await page.keyboard.press('Shift+Tab');await expect(page.locator('#close-search')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.locator('[data-category="Journal"]')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('#close-search')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Zoeken',exact:true})).toBeFocused();
});
test('bell badge, individual acknowledgement and notification links reflect confirmed saves',async({page})=>{
 const data=await fixture(page);await expect(page.locator('[data-unread-badge]')).toHaveText('1');await page.getByRole('button',{name:'Meldingen',exact:true}).click();
 await expect(page.locator('[data-notification-id="unread-1"]')).toContainText('Nieuw');await expect(page.locator('[data-notification-id="unread-1"]')).toContainText('Historische melding');
 await page.locator('[data-notification-id="unread-1"]').getByRole('link',{name:'Analyseer OPEN'}).click();await expect(page).toHaveURL(/\/app\/analyzer\?symbol=OPEN$/);await expect(page.locator('[data-unread-badge]')).toHaveCount(0);expect(data.writes).toBe(1);expect(data.state.alerts[0].readAt).toBeTruthy();
});
test('failed notification save keeps unread count and context visible',async({page})=>{
 const data=await fixture(page,{failSave:true});await page.getByRole('button',{name:'Meldingen',exact:true}).click();await page.locator('[data-read-notification="unread-1"]').click();
 await expect(page.locator('#notification-status')).toContainText('Niet opgeslagen');await expect(page.locator('[data-unread-badge]')).toHaveText('1');await expect(page).toHaveURL(/index\.html$/);expect(data.state.alerts[0].readAt).toBe(null);
});
test('notification badge caps at 9+ and bulk acknowledgement clears only after success',async({page})=>{
 const data=await fixture(page,{unreadCount:12});await expect(page.locator('[data-unread-badge]')).toHaveText('9+');await expect(page.locator('#notifications')).toHaveAttribute('aria-label','Meldingen');await expect(page.locator('#notifications')).toHaveAttribute('aria-description','12 ongelezen meldingen');
 await page.getByRole('button',{name:'Meldingen',exact:true}).click();await page.locator('[data-notification-filter="unread"]').click();await expect(page.locator('[data-notification-id]')).toHaveCount(12);
 await page.locator('#read-notifications').click();await expect(page.getByText('Je hebt geen ongelezen meldingen.',{exact:true})).toBeVisible();await expect(page.locator('[data-unread-badge]')).toHaveCount(0);expect(data.state.alerts.every(alert=>alert.readAt)).toBe(true);expect(data.writes).toBe(1);
});
test('overlay open and close preserves typed settings with no profile reload',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:'Instellingen',exact:true}).click();await expect(page.locator('#account-status')).toContainText('Ingelogd');await page.locator('#profile-name').fill('Nog niet opgeslagen');
 await page.getByRole('button',{name:'Meldingen',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('#profile-name')).toHaveValue('Nog niet opgeslagen');
 await page.getByRole('button',{name:'Zoeken',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('#profile-name')).toHaveValue('Nog niet opgeslagen');
});
test('confirmed authorization failure clears private unread badge on settings screen',async({page})=>{
 await fixture(page);await page.getByRole('button',{name:'Instellingen',exact:true}).click();await expect(page.locator('#account-status')).toContainText('Ingelogd');
 await page.route(base+'/api/v1/settings',route=>route.fulfill({status:401,json:{error:{code:'UNAUTHENTICATED'}}}));await page.locator('#account-reload').click();
 await expect(page.locator('#account-status')).toContainText('Niet ingelogd');await expect(page.locator('[data-unread-badge]')).toHaveCount(0);
});
test('dashboard exposes loaded records as real contextual links without contradictory empty copy',async({page})=>{
 await page.setViewportSize({width:375,height:812});await fixture(page);
 await expect(page.getByText('Nog geen portefeuille gekoppeld.',{exact:false})).toHaveCount(0);await expect(page.getByText('De scanner is nog niet aangesloten.',{exact:false})).toHaveCount(0);await expect(page.getByText('Geen gekoppeld cash-ledger',{exact:true})).toHaveCount(0);
 const watch=page.locator('[data-dashboard-ticker="AAPL"]');await watch.click();await expect(page).toHaveURL(/\/app\/analyzer\?symbol=AAPL$/);await expect(page.locator('#market-form [name=symbol]')).toHaveValue('AAPL');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
