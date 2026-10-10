const {test,expect}=require('@playwright/test');
const root='http://127.0.0.1:8765/app/';
const state={version:1,events:[],watchlist:[],journal:[],alerts:[],preferences:{allowMargin:false,costMethod:'average'}};
const profile={display_name:'Layout review',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:1};
async function fixtures(page,locale='nl-NL'){
 await page.route('**/api/v1/**',route=>{const path=new URL(route.request().url()).pathname;
 if(path.endsWith('/session'))return route.fulfill({json:{data:{authenticated:true,settings:{...profile,locale}}}});
 if(path.endsWith('/settings'))return route.fulfill({json:{data:{...profile,locale}}});
 if(path.endsWith('/state'))return route.fulfill({json:{data:state}});
 return route.fulfill({status:503,json:{error:{code:'SOURCE_UNAVAILABLE'}}});});
}
for(const width of [320,375,768,1024,1440])test(`all six screens remain accessible and contained at ${width}px`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:900});await fixtures(page);
 for(const route of ['dashboard','portfolio','radar','analyzer','journal','settings']){
  await page.goto(root+route);await expect(page.locator('.splash')).toBeHidden();await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('tabindex','-1');
  const dimensions=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,actions:[...document.querySelectorAll('.header-actions button')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
  expect(dimensions.scroll,route).toBeLessThanOrEqual(dimensions.client+1);expect(dimensions.actions.every(x=>x.width>=44&&x.height>=44),route).toBe(true);
  if(width<=375)await expect(page.locator('.bottom a')).toHaveCount(5);
  if(info.project.name==='chromium')await page.screenshot({path:info.outputPath(`${route}-${width}.png`),fullPage:true});
 }
 expect(errors).toEqual([]);
});
test('keyboard skip link reaches main and brand restores dashboard',async({page},info)=>{
 await fixtures(page);await page.goto(root+'portfolio');await expect(page.locator('.splash')).toBeHidden();if(info.project.name==='webkit')await page.locator('.skip-link').focus();else await page.keyboard.press('Tab');await expect(page.locator('.skip-link')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#main')).toBeFocused();
 await page.getByRole('link',{name:'TradePilot Pro',exact:true}).click();await expect(page).toHaveURL(/\/app\/dashboard$/);
});

test('saved English locale applies to every screen and preserves user content',async({page},info)=>{
 await fixtures(page,'en-US');
 for(const route of ['dashboard','portfolio','radar','analyzer','journal','settings']){
  await page.goto(root+route);await expect(page.locator('.splash')).toBeHidden();await expect(page.locator('html')).toHaveAttribute('lang','en');
  const text=await page.locator('main').innerText();
  expect(text,route).not.toMatch(/Weergavenaam|Boeking toevoegen|Handelsplan vastleggen|Grafiek analyseren|Persoonlijke watchlist|Nog geen handelsplannen|Opnieuw laden|Instellingen/);
  await expect(page.locator('#search')).toHaveAttribute('aria-label','Search');
  if(info.project.name==='chromium')await page.screenshot({path:info.outputPath(route+'-english.png'),fullPage:true});
 }
});
test('English Journal validation uses translated feedback',async({page})=>{await fixtures(page,'en-US');await page.goto(root+'journal');await expect(page.locator('.splash')).toBeHidden();const form=page.locator('#journal-form');for(const [name,value]of Object.entries({symbol:'OPEN',entry:'1',stop:'2',target1:'3',target2:'4',thesis:'Personal thesis'}))await form.locator('[name='+name+']').fill(value);await form.getByRole('button',{name:'Save plan',exact:true}).click();await expect(page.locator('#feature-message')).toContainText('Not saved: Use stop < entry < target 1 < target 2')});
