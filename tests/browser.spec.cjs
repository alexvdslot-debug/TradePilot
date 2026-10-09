const {test,expect}=require('@playwright/test');
const path=require('node:path');
const pageUrl='http://127.0.0.1:8765/v5.html';
const portfolio={transactions:[{t:'OPEN',side:'buy',q:100,price:2.50,fee:1,date:'2026-10-08',seq:1}]};
test.beforeEach(async({page})=>{
 await page.addInitScript(data=>localStorage.setItem('tradepilot-v2-data',JSON.stringify(data)),portfolio);
 await page.route('https://tradepilot-market-data.alexvdslot.workers.dev/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({provider:'Twelve Data',asOf:new Date().toISOString(),quotes:{OPEN:{price:2.7,changePercent:2.1,volume:123456,datetime:new Date().toISOString()}}})}));
});
test('portfolio renders and feed reports provenance',async({page})=>{
 await page.goto(pageUrl);
 await expect(page.locator('#portfolio')).toContainText('OPEN');
 await expect(page.locator('#feed')).toContainText('Twelve Data');
 await expect(page.locator('#radar tr')).toHaveCount(6);
 await expect(page.locator('#systemStatus')).toContainText('Vertraging');
});
test('scenario handles fees and rejects invalid stop',async({page})=>{
 await page.goto(pageUrl);
 await page.locator('#entry').fill('10');
 await page.locator('#stop').fill('9');
 await page.locator('#target1').fill('12');
 await page.locator('#target2').fill('14');
 await page.locator('#shares').fill('100');
 await page.locator('#fees').fill('4');
 await page.locator('#calculate').click();
 await expect(page.locator('#scenario')).toContainText('1,88');
 await page.locator('#stop').fill('11');
 await page.locator('#calculate').click();
 await expect(page.locator('#scenario')).toContainText('Controleer de invoer');
});
test('unavailable market data is clearly flagged',async({page})=>{
 await page.unrouteAll();
 await page.route('https://tradepilot-market-data.alexvdslot.workers.dev/**',route=>route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"error":"unavailable"}'}));
 await page.goto(pageUrl);
 await expect(page.locator('#feed')).toContainText('HTTP 503');
 await expect(page.locator('#systemStatus')).toContainText('Geen geverifieerde marktdata');
});
test('mobile viewport has usable controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(pageUrl);
 await expect(page.locator('#calculate')).toBeVisible();
 await expect(page.locator('#refresh')).toBeVisible();
 await expect(page.locator('#portfolio')).toContainText('OPEN');
});

test('stale quote cannot be labelled recent',async({page})=>{
 await page.unrouteAll();
 await page.route('https://tradepilot-market-data.alexvdslot.workers.dev/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({provider:'Twelve Data',asOf:new Date().toISOString(),quotes:{OPEN:{price:2.7,changePercent:2.1,volume:123456,datetime:'2025-01-01T12:00:00Z'}}})}));
 await page.goto(pageUrl);
 await expect(page.locator('#systemStatus')).toContainText('geen tijdstempels betrouwbaar');
 await expect(page.locator('#radar')).toContainText('Ouder dan 20 min');
});
test('no portfolio transaction is sent to market data endpoint',async({page})=>{
 let requestUrl='';
 await page.on('request',r=>{if(r.url().includes('tradepilot-market-data'))requestUrl=r.url()});
 await page.goto(pageUrl);
 await expect(page.locator('#feed')).toContainText('Twelve Data');
 expect(requestUrl).not.toContain('transactions');
 expect(requestUrl).not.toContain('price');
 expect(requestUrl).toContain('symbols=');
});

test('real tabs switch content without long-page scrolling',async({page})=>{
 await page.goto(pageUrl);
 await expect(page.locator('#panel-home')).toBeVisible();
 await expect(page.locator('#panel-radar')).toBeHidden();
 await page.locator('#tab-radar').click();
 await expect(page.locator('#panel-radar')).toBeVisible();
 await expect(page.locator('#panel-home')).toBeHidden();
 await expect(page.locator('#tab-radar')).toHaveAttribute('aria-selected','true');
 await page.locator('#tab-risk').click();
 await expect(page.locator('#panel-risk')).toBeVisible();
 await expect(page.locator('#panel-radar')).toBeHidden();
});
test('mobile bottom tabs switch to risk calculator',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(pageUrl);
 await page.locator('.bottom-nav [data-tab="risk"]').click();
 await expect(page.locator('#panel-risk')).toBeVisible();
 await expect(page.locator('#panel-home')).toBeHidden();
 await expect(page.locator('#calculate')).toBeVisible();
});
