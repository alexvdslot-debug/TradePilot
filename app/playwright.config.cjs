const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'../tests',testMatch:['app-shell.spec.cjs','features.spec.cjs'],timeout:30000,
 use:{headless:true},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:{cwd:require('path').resolve(__dirname,'..'),command:'node scripts/dev-server.mjs',url:'http://127.0.0.1:8765/app/index.html',reuseExistingServer:!process.env.CI,timeout:30000}
});
