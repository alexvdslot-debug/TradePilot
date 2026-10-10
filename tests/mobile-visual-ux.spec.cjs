const {test,expect}=require('@playwright/test');

test('mobile navigation renders actual inline icons without horizontal overflow',async({page})=>{
 await page.route('**/api/v1/**',route=>route.fulfill({status:503,json:{error:{code:'SERVICE_NOT_CONFIGURED'}}}));
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  await page.goto('http://127.0.0.1:8765/app/index.html');
  await expect(page.locator('.splash')).toBeHidden({timeout:5000});
  const bottom=page.locator('.bottom');
  await expect(bottom).toBeVisible();
  await page.screenshot({path:test.info().outputPath('tradepilot-mobile-'+width+'.png'),fullPage:true});
  await expect(bottom.locator('a.tab')).toHaveCount(5);
  for(const tab of await bottom.locator('a.tab').all()){
   const icon=tab.locator('svg.ui-icon');
   await expect(icon).toBeVisible();
   expect(await icon.locator('path,rect,circle').count()).toBeGreaterThan(0);
   const box=await icon.boundingBox();
   expect(box.width).toBeGreaterThanOrEqual(18);
   expect(box.height).toBeGreaterThanOrEqual(18);
   expect(await tab.evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('nowrap');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'viewport '+width+'px overflow').toBe(true);
 }
});

test('narrow financial cards remain readable and bottom navigation switches pages',async({page})=>{
 await page.route('**/api/v1/**',route=>route.fulfill({status:503,json:{error:{code:'SERVICE_NOT_CONFIGURED'}}}));
 await page.setViewportSize({width:320,height:740});
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 expect(await page.locator('.dashboard-kpis').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
 await page.locator('.bottom [data-route="journal"]').click();
 await expect(page.getByRole('heading',{name:'Trade Journal'})).toBeVisible();
 await expect(page.locator('.bottom [data-route="journal"]')).toHaveAttribute('aria-current','page');
});
