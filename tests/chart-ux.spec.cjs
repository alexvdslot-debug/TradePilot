const {test,expect}=require('@playwright/test');
const root='http://127.0.0.1:8765/app/';
async function fixture(page){
 const state={version:1,events:[],watchlist:[],journal:[],alerts:[],preferences:{allowMargin:false,costMethod:'average'}};
 const profile={display_name:'UX fixture',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:1};
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/session'))return route.fulfill({json:{data:{authenticated:true,settings:profile}}});
  if(path.endsWith('/settings'))return route.fulfill({json:{data:profile}});
  if(path.endsWith('/state'))return route.fulfill({json:{data:state}});
  if(path.endsWith('/market/candles')){
   const interval=new URL(route.request().url()).searchParams.get('interval');
   const candles=Array.from({length:40},(_,i)=>({time:new Date(Date.UTC(2026,9,9,13,30)+i*300000).toISOString(),o:10+i*.01,h:10.2+i*.01,l:9.8+i*.01,c:10.05+i*.01,v:1000+i*10,complete:true}));
   return route.fulfill({json:{data:{symbol:'OPEN',interval,provider:'Twelve Data',timezone:'UTC',currency:'USD',exchange:'NASDAQ',exchangeTimezone:'America/New_York',marketSession:'regular',realtime:'unverified',delay:'unverified',stale:true,asOf:candles.at(-1).time,candles}}});
  }
  return route.fulfill({status:503,json:{error:{code:'TEST_SOURCE_UNAVAILABLE'}}});
 });
 await page.goto(root+'analyzer');await expect(page.locator('#data-status')).toContainText('versie 1');
 await page.locator('#market-form [name=symbol]').fill('OPEN');await page.locator('#market-form button').click();await expect(page.locator('.candle-chart')).toBeVisible();
}
for(const width of [320,375,1440])test(`OHLCV chart and controls remain usable at ${width}px`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:900});await fixture(page);
 await expect(page.locator('.candle')).toHaveCount(40);await expect(page.locator('.chart-summary')).toContainText('ET');await expect(page.locator('.chart-summary')).toContainText('Volume');
 await page.getByText('RSI en MACD bekijken',{exact:true}).click();await expect(page.locator('.indicator-chart')).toBeVisible();
 await page.getByText('Candlegegevens als tabel',{exact:true}).click();await expect(page.locator('.candle-figure tbody tr')).toHaveCount(40);
 const dimensions=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);expect(errors).toEqual([]);
 if(info.project.name==='chromium')await page.screenshot({path:info.outputPath(`chart-${width}.png`),fullPage:true});
});
