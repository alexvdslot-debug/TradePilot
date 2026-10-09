const {test,expect}=require('@playwright/test');
test('splash animates bars, exits and navigation works',async({page})=>{
 await page.goto('http://127.0.0.1:8765/app/index.html');
 await expect(page.locator('.splash-bar')).toHaveCount(3);
 await expect(page.locator('.splash')).toBeHidden({timeout:5000});
 await expect(page.getByRole('heading',{name:/Goedemorgen|Goedemiddag|Goedenavond/})).toBeVisible();
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
