// Prepare source-only connector payload; never include environment files or secrets.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const files=execFileSync('git',['ls-files','--modified','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const tree=files.map(path=>({path,mode:'100644',type:'blob',content:fs.readFileSync(path,'utf8')}));
const paths=[...fs.readdirSync('worker/src').filter(p=>p.endsWith('.mjs')).map(p=>'worker/src/'+p),...fs.readdirSync('app').filter(p=>p.endsWith('.mjs')).map(p=>'app/'+p)];
const modules=paths.map(path=>({path,content:fs.readFileSync(path,'utf8')}));
const providerPaths=['app/market-quality.mjs','worker/background-provider.mjs','worker/market-data.js','worker/src/provider-adapter.mjs','worker/src/b3-settings.mjs','worker/src/provider-quota.mjs'];
fs.writeFileSync('release-payload.json',JSON.stringify({tree,modules,providerModules:providerPaths.map(path=>({path,content:fs.readFileSync(path,'utf8')}))}));
console.log(files.length+' source files packaged; '+modules.length+' Worker modules');
