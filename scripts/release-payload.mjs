// Prepare source-only connector payload; never include environment files or secrets.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['ls-files','--modified','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const tree=files.map(path=>({path,mode:'100644',type:'blob',content:fs.readFileSync(path,'utf8')}));
const modules=['worker/src/index.mjs','worker/src/b3-settings.mjs','worker/src/private-state.mjs','worker/src/market-api.mjs','worker/src/site-assets.mjs','app/ledger.mjs'].map(path=>({path,content:fs.readFileSync(path,'utf8')}));
fs.writeFileSync('release-payload.json',JSON.stringify({tree,modules,providerModules:['worker/market-data.js','worker/src/provider-adapter.mjs','worker/src/b3-settings.mjs'].map(path=>({path,content:fs.readFileSync(path,'utf8')}))}));
console.log(files.length+' source files packaged; '+modules.length+' Worker modules');
