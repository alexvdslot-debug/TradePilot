const {test,expect}=require('@playwright/test');
test('splash animates bars, exits and navigation works',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash-bar')).toHaveCount(3);
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.getByRole('heading',{name:/Goedemorgen|Goedemiddag|Goedenavond|Goedenacht/})).toBeVisible();
 await page.getByRole('navigation',{name:'Hoofdnavigatie'}).first().getByText('Kansen').click();
 await expect(page.getByRole('heading',{name:'Kansenradar'})).toBeVisible();
 await page.getByRole('button',{name:'Zoeken'}).click();
 await expect(page.getByRole('dialog',{name:'Zoeken'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'Zoeken'})).toHaveCount(0);
 await page.getByRole('button',{name:'Instellingen'}).click();
 await expect(page.getByRole('heading',{name:'Instellingen'})).toBeVisible();
});
test('reduced motion skips splash',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:3000});
});
test('mobile bottom navigation works',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.locator('.bottom').getByText('Journal').click();
 await expect(page.getByRole('heading',{name:'Trade Journal'})).toBeVisible();
});

test('dashboard follows B2 empty-state contract without fabricated market values',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 for(const title of ['Portefeuillewaarde','Dagresultaat','Kapitaal onder risico','Beschikbare cash','Mijn posities','Risico & marktstatus','Kansen voor 1–5 handelsdagen','Watchlist','Recente handelsplannen']){
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 }
 await expect(page.getByText('Nog geen bevestigde kansen')).toBeVisible();
 await expect(page.getByText('Actuele marktgegevens niet beschikbaar',{exact:false})).toBeVisible();
 await expect(page.getByText('Bron: niet verbonden',{exact:false})).toBeVisible();
});
test('dashboard stays within 320px viewport',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 expect(overflow).toBe(false);
});

test('night greeting uses local time and updates when tab resumes',async({page})=>{
 await page.clock.install({time:new Date('2026-10-09T23:30:00')});
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.locator('#dashboard-greeting')).toHaveText('Goedenacht');
 await page.clock.setFixedTime(new Date('2026-10-10T06:00:00'));
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('#dashboard-greeting')).toHaveText('Goedemorgen');
});

test('dashboard has no horizontal overflow at 375px and desktop',async({page})=>{
 for(const width of [375,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:8765/app/index.html');
  await expect(page.locator('.splash')).toBeHidden({timeout:5000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
test('search and notification overlays restore keyboard focus',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.getByRole('button',{name:'Zoeken'}).click();
 await expect(page.locator('#search-input')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Zoeken'})).toBeFocused();
 await page.getByRole('button',{name:'Meldingen'}).click();
 await expect(page.getByRole('dialog',{name:'Meldingen'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Meldingen'})).toBeFocused();
});

test('keyboard shortcut opens search and Escape restores focus',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.keyboard.press('Control+k');
 await expect(page.getByRole('dialog',{name:'Zoeken'})).toBeVisible();
 await expect(page.locator('#search-input')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Zoeken'})).toBeFocused();
});

test('dashboard greeting follows actual New York browser timezone',async({browser})=>{
 const context=await browser.newContext({timezoneId:'America/New_York'});
 const page=await context.newPage();
 try{
  await page.clock.install({time:new Date('2026-10-10T02:30:00Z')});
  await page.goto('http://127.0.0.1:8765/app/index.html');
  await expect(page.locator('.splash')).toBeHidden({timeout:5000});
  await expect(page.locator('#dashboard-greeting')).toHaveText('Goedenavond');
  await page.clock.setFixedTime(new Date('2026-10-10T04:30:00Z'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('#dashboard-greeting')).toHaveText('Goedenacht');
 }finally{await context.close()}
});

test('dialog makes the background inert and restores it on Escape',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.getByRole('button',{name:'Zoeken'}).click();
 await expect(page.locator('.shell')).toHaveAttribute('inert','');
 await page.keyboard.press('Escape');
 await expect(page.locator('.shell')).not.toHaveAttribute('inert','');
});

test('offline dashboard shows error and recovers when online',async({page,context})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await context.setOffline(true);
 await expect(page.locator('#connectivity-notice')).toBeVisible();
 await context.setOffline(false);
 await expect(page.locator('#connectivity-notice')).toBeHidden();
});

test('small screen does not overflow',async({page})=>{await page.setViewportSize({width:320,height:850});await page.goto('http://127.0.0.1:8765/app/index.html');await expect(page.locator('.splash')).toBeHidden({timeout:5000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)});

test('B3 account settings load, save and survive reload with verified API contract',async({page})=>{
 const saved={display_name:'',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:1};
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.endsWith('/session'))return route.fulfill({json:{data:{authenticated:true,settings:saved}}});
  if(request.method()==='PATCH'){
   expect(request.headers()['x-tradepilot-csrf']).toBe('1');
   expect(request.postDataJSON().version).toBe(saved.version);
   Object.assign(saved,request.postDataJSON(),{version:saved.version+1});
  }
  return route.fulfill({json:{data:saved}});
 });
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.getByRole('button',{name:'Instellingen'}).click();
 await expect(page.locator('#account-status')).toContainText('Ingelogd');
 await page.locator('#profile-name').fill('Alex');
 await page.locator('#profile-currency').selectOption('USD');
 await page.locator('#profile-risk').fill('250.00');
 await page.locator('#account-save').click();
 await expect(page.locator('#account-message')).toContainText('versie 2');
 await page.locator('#account-reload').click();
 await expect(page.locator('#profile-name')).toHaveValue('Alex');
 await expect(page.locator('#profile-currency')).toHaveValue('USD');
 await expect(page.locator('#profile-risk')).toHaveValue('250.00');
 await expect(page.locator('#account-status')).toContainText('versie 2');
});
test('B3 settings fail closed when session is unavailable',async({page})=>{
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/**',route=>route.fulfill({status:401,json:{error:{code:'UNAUTHENTICATED'}}}));
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await page.getByRole('button',{name:'Instellingen'}).click();
 await expect(page.locator('#account-status')).toContainText('Niet ingelogd');
 await expect(page.locator('#account-save')).toBeDisabled();
 await expect(page.locator('#account-login')).toHaveAttribute('href','https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/session');
});

test('B3 dashboard hydrates persisted display name without visiting settings',async({page})=>{
 let profileReads=0;
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/settings',route=>{
  profileReads++;
  return route.fulfill({json:{data:{display_name:'Alexander',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:2}}});
 });
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.locator('#dashboard-greeting')).toContainText('Alexander');
 expect(profileReads).toBeGreaterThan(0);
});
test('B3 dashboard uses neutral greeting when profile is unavailable',async({page})=>{
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/settings',route=>route.fulfill({status:401,json:{error:{code:'UNAUTHENTICATED'}}}));
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.locator('#dashboard-greeting')).not.toContainText('Alexander');
});

test('B3 cold start hydrates all persisted preferences, not only name',async({page})=>{
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/settings',route=>route.fulfill({json:{data:{display_name:'Alexander',locale:'en-US',timezone:'America/New_York',display_currency:'USD',risk_budget_eur:'250.00',version:3}}}));
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.locator('#dashboard-greeting')).toContainText('Alexander');
 await expect(page.locator('#account-summary')).toContainText('English');
 await expect(page.locator('#account-summary')).toContainText('America/New_York');
 await expect(page.locator('#account-summary')).toContainText('USD');
 await expect(page.locator('#account-summary')).toContainText('250.00');
 await expect(page.locator('#account-summary')).not.toContainText('Accountvoorkeuren niet geladen');
});
test('B3 profile name cannot inject markup in greeting',async({page})=>{
 await page.route('https://tradepilot-pro-api.alexvdslot.workers.dev/api/v1/settings',route=>route.fulfill({json:{data:{display_name:'<img src=x onerror=alert(1)>',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:2}}}));
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('#dashboard-greeting')).toContainText('<img');
 await expect(page.locator('#dashboard-greeting img')).toHaveCount(0);
});
