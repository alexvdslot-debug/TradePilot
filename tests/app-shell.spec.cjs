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
