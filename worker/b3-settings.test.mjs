import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,webcrypto} from 'node:crypto';
import {settingsApi} from './src/b3-settings.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});jwk.kid='test-key';jwk.alg='RS256';
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(sub){const h=b64({alg:'RS256',kid:'test-key'}),p=b64({iss:'https://team.cloudflareaccess.com',aud:['app-aud'],sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});const s=createSign('RSA-SHA256');s.update(h+'.'+p);s.end();return h+'.'+p+'.'+s.sign(privateKey).toString('base64url')}
function db(){
 const users=new Map(),settings=new Map();
 return {prepare(sql){let args=[];return {bind(...a){args=a;return this},async first(){
  if(sql.startsWith('SELECT id FROM users'))return users.get(args[0])||null;
  if(sql.startsWith('SELECT display_name'))return settings.get(args[0])||null;
  throw Error('unexpected SELECT '+sql)
 },async run(){
  if(sql.startsWith('INSERT OR IGNORE INTO users')){if(!users.has(args[1]))users.set(args[1],{id:args[0]});return {meta:{changes:1}}}
  if(sql.startsWith('INSERT OR IGNORE INTO user_settings')){if(!settings.has(args[0]))settings.set(args[0],{display_name:'',locale:'nl-NL',timezone:'Europe/Amsterdam',display_currency:'EUR',risk_budget_eur:'100.00',version:1});return {meta:{changes:1}}}
  if(sql.startsWith('UPDATE user_settings')){const row=settings.get(args[5]);if(!row||row.version!==args[6])return {meta:{changes:0}};settings.set(args[5],{display_name:args[0],locale:args[1],timezone:args[2],display_currency:args[3],risk_budget_eur:args[4],version:row.version+1});return {meta:{changes:1}}}
  throw Error('unexpected mutation '+sql)
 }}}}
}
const env={DB:db(),ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'app-aud',ALLOWED_ORIGIN:'https://alexvdslot-debug.github.io'};
const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200})});
test.after(()=>{globalThis.fetch=originalFetch});
function req(path,sub,method='GET',body,extra={}){return new Request('https://api.example.test'+path,{method,headers:{...(sub?{'Cf-Access-Jwt-Assertion':token(sub)}:{}),...(body?{'content-type':'application/json','origin':env.ALLOWED_ORIGIN,'x-tradepilot-csrf':'1'}:{}),...extra},body:body?JSON.stringify(body):undefined})}
test('unauthenticated and unconfigured access fail closed',async()=>{assert.equal((await settingsApi(req('/api/v1/settings'),env)).status,401);assert.equal((await settingsApi(req('/api/v1/settings','A'),{...env,ACCESS_AUD:''})).status,503)});
test('user isolation, defaults and optimistic concurrency',async()=>{
 const a=await settingsApi(req('/api/v1/settings','A'),env),b=await settingsApi(req('/api/v1/settings','B'),env);
 assert.equal(a.status,200);assert.equal(b.status,200);
 const updated=await settingsApi(req('/api/v1/settings','A','PATCH',{version:1,display_name:'Alex',display_currency:'USD'}),env);
 assert.equal(updated.status,200);
 assert.equal((await updated.json()).data.version,2);
 const other=await (await settingsApi(req('/api/v1/settings','B'),env)).json();
 assert.equal(other.data.display_name,'');assert.equal(other.data.display_currency,'EUR');
 assert.equal((await settingsApi(req('/api/v1/settings','A','PATCH',{version:1,display_name:'stale'}),env)).status,409);
});
test('CSRF, origin and invalid settings rejected',async()=>{
 assert.equal((await settingsApi(req('/api/v1/settings','A','PATCH',{version:2},{'x-tradepilot-csrf':'0'}),env)).status,403);
 assert.equal((await settingsApi(req('/api/v1/settings','A','PATCH',{version:2},{origin:'https://evil.example'}),env)).status,403);
 assert.equal((await settingsApi(req('/api/v1/settings','A','PATCH',{version:2,display_currency:'BTC'}),env)).status,400);
 assert.equal((await settingsApi(req('/api/v1/settings','A','PATCH',{version:2,timezone:'Mars/Olympus'}),env)).status,400);
});
test('invalid JWT signature is rejected',async()=>{
 const bad=token('A').split('.');bad[1]=b64({iss:'https://team.cloudflareaccess.com',aud:['app-aud'],sub:'B',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});
 const r=await settingsApi(new Request('https://api.example.test/api/v1/settings',{headers:{'Cf-Access-Jwt-Assertion':bad.join('.')}}),env);assert.equal(r.status,401);
});
