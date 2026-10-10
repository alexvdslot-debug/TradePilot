import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,execFile} from 'node:child_process';
import {generateKeyPairSync,createSign,webcrypto} from 'node:crypto';
import {consumeProviderQuota,PROVIDER_QUOTA_SQL,BACKGROUND_PROVIDER_QUOTA_SQL} from './src/provider-quota.mjs';
import {providerAdapter} from './src/provider-adapter.mjs';
import {marketApi} from './src/market-api.mjs';
import legacy from './market-data.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const schema=readFileSync(new URL('./migrations/0004_provider_quota.sql',import.meta.url),'utf8')+readFileSync(new URL('./migrations/0006_background_alerts.sql',import.meta.url),'utf8');
const queryPython=`import sys,json,sqlite3
data=json.load(sys.stdin)
connection=sqlite3.connect(sys.argv[1],timeout=15)
connection.row_factory=sqlite3.Row
cursor=connection.execute(data['sql'],data['args'])
rows=cursor.fetchall()
connection.commit()
print(json.dumps(dict(rows[0]) if rows else None))
`;
function database(t){
 const directory=mkdtempSync(join(tmpdir(),'tradepilot-quota-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const path=join(directory,'quota.sqlite');
 const init=spawnSync('python3',['-c',"import sqlite3,sys; c=sqlite3.connect(sys.argv[1]); c.executescript(sys.stdin.read()); c.commit()",path],{input:schema,encoding:'utf8'});
 assert.equal(init.status,0,init.stderr);
 let calls=0;
 const binding={prepare(sql){calls++;let args=[];return {bind(...values){args=values;return this},first(){return new Promise((resolve,reject)=>{
  const child=execFile('python3',['-c',queryPython,path],{encoding:'utf8'},(error,stdout,stderr)=>error?reject(Error(stderr)):resolve(JSON.parse(stdout)));
  child.stdin.end(JSON.stringify({sql,args}));
 })}}}};
 return {binding,path,get calls(){return calls}};
}
function python(code,payload){const result=spawnSync('python3',['-c',code],{input:JSON.stringify(payload),encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout)}
const base=Date.parse('2026-10-10T12:00:00Z');
test('actual SQLite atomic admissions across independent connections permit exactly eight concurrent calls',async t=>{
 const db=database(t);
 const results=await Promise.all(Array.from({length:24},()=>consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base})));
 assert.equal(results.filter(result=>result.allowed).length,8);assert.equal(results.filter(result=>result.status===429).length,16);assert.equal(db.calls,24);
 const next=await consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base+60000});assert.equal(next.allowed,true);assert.equal(next.minuteCount,1);assert.equal(next.dayCount,9);
 const backwards=await consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base});assert.equal(backwards.status,429);
});
test('actual SQLite enforces 800 daily calls across minute windows, UTC day reset, and denied calls do not increment',()=>{
 const result=python(`import sys,json,sqlite3
p=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.executescript(p['schema'])
sql=p['sql'];minute=p['minute'];day=minute//1440
allowed=0
for offset in range(100):
 for call in range(8):
  row=c.execute(sql,('twelve-data',minute+offset,day,8,800)).fetchone()
  assert row is not None
  allowed+=1
 assert c.execute(sql,('twelve-data',minute+offset,day,8,800)).fetchone() is None
assert c.execute(sql,('twelve-data',minute+101,day,8,800)).fetchone() is None
assert c.execute('SELECT day_count FROM provider_quota').fetchone()[0]==800
assert c.execute(sql,('twelve-data',(day+1)*1440,day+1,8,800)).fetchone()==(1,1)
print(json.dumps({'allowed':allowed,'reset':True}))
`,{schema,sql:PROVIDER_QUOTA_SQL,minute:Math.floor(base/60000)});
 assert.deepEqual(result,{allowed:800,reset:true});
});
test('configured database failures and malformed results fail closed without local fallback',async()=>{
 for(const binding of [null,{prepare(){throw Error('private detail')}},{prepare(){return {bind(){return this},async first(){return {minute_count:0,day_count:1}}}}}]){
  const result=await consumeProviderQuota({MARKET_QUOTA_DB:binding},{now:base});assert.deepEqual(result,{allowed:false,code:'PROVIDER_QUOTA_UNAVAILABLE',status:503});
 }
 assert.equal((await consumeProviderQuota({}, {now:NaN})).status,503);
});
test('missing optional binding retains bounded local fixed-window fallback',async()=>{
 const at=Date.parse('2030-10-10T12:00:00Z');
 const results=await Promise.all(Array.from({length:9},()=>consumeProviderQuota({}, {now:at})));
 assert.equal(results.filter(result=>result.allowed).length,8);assert.equal(results[8].status,429);assert.equal(results[0].mode,'local');
 const next=await consumeProviderQuota({}, {now:at+60000});assert.equal(next.minuteCount,1);assert.equal(next.dayCount,9);
});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'quota-key',alg:'RS256'};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(sub='owner'){const head=b64({alg:'RS256',kid:jwk.kid}),payload=b64({iss:'https://quota.cloudflareaccess.com',aud:['quota-app'],sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});const signer=createSign('RSA-SHA256');signer.update(head+'.'+payload);signer.end();return head+'.'+payload+'.'+signer.sign(privateKey).toString('base64url')}
const auth={ACCESS_TEAM_DOMAIN:'quota.cloudflareaccess.com',ACCESS_AUD:'quota-app',TWELVE_DATA_API_KEY:'private-test-secret'};
function mockedProvider(t){const original=globalThis.fetch;let upstream=0;globalThis.fetch=async input=>{
 const url=new URL(input instanceof Request?input.url:input);
 if(url.pathname.endsWith('/certs'))return new Response(JSON.stringify({keys:[jwk]}));
 upstream++;
 if(url.pathname==='/quote')return new Response(JSON.stringify({close:'5',previous_close:'4',percent_change:'25',volume:'1000'}));
 return new Response(JSON.stringify({data:[{symbol:'OPEN',instrument_name:'Opendoor',exchange:'NASDAQ',currency:'USD',country:'United States',instrument_type:'Common Stock'}]}));
 };t.after(()=>{globalThis.fetch=original});return {get upstream(){return upstream}};
}
test('bound adapter consumes once per actual call; main cache hits do not spend provider budget',async t=>{
 const db=database(t),provider=mockedProvider(t);const upstreamEnv={...auth,MARKET_QUOTA_DB:db.binding};
 const request=new Request('https://app.test/api/v1/market/search?q=QuotaOnce',{headers:{'Cf-Access-Jwt-Assertion':token()}});
 const env={...auth,TWELVE_DATA_API_KEY:undefined,MARKET_QUOTA_DB:db.binding,MARKET_PROVIDER:{fetch(request){return providerAdapter(request,upstreamEnv)}}};
 assert.equal((await marketApi(request,env)).status,200);assert.equal((await marketApi(request,env)).status,200);
 assert.equal(provider.upstream,1);assert.equal(db.calls,1);
});
test('direct secret market path consumes once and validates before spending budget',async t=>{
 const db=database(t),provider=mockedProvider(t);const env={...auth,MARKET_QUOTA_DB:db.binding};
 const response=await marketApi(new Request('https://app.test/api/v1/market/search?q=QuotaDirect',{headers:{'Cf-Access-Jwt-Assertion':token('direct-owner')}}),env);
 assert.equal(response.status,200);assert.equal(db.calls,1);assert.equal(provider.upstream,1);
 assert.equal((await marketApi(new Request('https://app.test/api/v1/market/search?q=%3Cinvalid',{headers:{'Cf-Access-Jwt-Assertion':token('direct-owner')}}),env)).status,400);assert.equal(db.calls,1);
});
test('legacy multi-symbol requests share same provider budget and return explicit quota errors',async t=>{
 const db=database(t),provider=mockedProvider(t),env={...auth,MARKET_QUOTA_DB:db.binding};
 const response=await legacy.fetch(new Request('https://legacy.test/?symbols=A,B,C,D,E,F,G,H,I,J'),env);
 assert.equal(response.status,429);const data=await response.json();assert.equal(Object.keys(data.quotes).length,8);assert.equal(Object.keys(data.errors).length,2);assert.equal(provider.upstream,8);assert.equal(db.calls,10);
 assert.ok(Object.values(data.errors).every(value=>value==='PROVIDER_QUOTA'));
 const authenticated=await providerAdapter(new Request('https://provider.test/_tradepilot/symbol_search?symbol=OPEN',{headers:{'Cf-Access-Jwt-Assertion':token('different-owner')}}),env);
 assert.equal(authenticated.status,429);assert.equal(provider.upstream,8);assert.equal(db.calls,11);
});
test('configured unavailable quota prevents adapter, legacy and direct upstream calls',async t=>{
 const provider=mockedProvider(t),env={...auth,MARKET_QUOTA_DB:{prepare(){throw Error('sensitive database failure')}}};
 const request=new Request('https://provider.test/_tradepilot/symbol_search?symbol=OPEN',{headers:{'Cf-Access-Jwt-Assertion':token('quota-error-owner')}});
 const adapter=await providerAdapter(request,env);assert.equal(adapter.status,503);assert.equal((await adapter.json()).error.code,'PROVIDER_QUOTA_UNAVAILABLE');
 const old=await legacy.fetch(new Request('https://legacy.test/?symbols=OPEN'),env);assert.equal(old.status,503);assert.equal((await old.json()).errors.OPEN,'PROVIDER_QUOTA_UNAVAILABLE');
 const direct=await marketApi(new Request('https://app.test/api/v1/market/search?q=QuotaUnavailable',{headers:{'Cf-Access-Jwt-Assertion':token('quota-error-owner')}}),env);assert.equal(direct.status,503);assert.equal((await direct.json()).error.code,'PROVIDER_QUOTA_UNAVAILABLE');
 assert.equal(provider.upstream,0);
});
test('external provider 429 remains explicit even with a non-JSON response body',async t=>{
 const db=database(t);const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('private provider diagnostics',{status:429})};t.after(()=>{globalThis.fetch=original});
 const response=await legacy.fetch(new Request('https://legacy.test/?symbols=OPEN'),{...auth,MARKET_QUOTA_DB:db.binding});
 assert.equal(response.status,429);const text=await response.text();assert.equal(JSON.parse(text).errors.OPEN,'PROVIDER_QUOTA');assert.equal(text.includes('private provider diagnostics'),false);assert.equal(calls,1);assert.equal(db.calls,1);
});
test('background admission atomically reserves four minute slots for interactive requests',async t=>{
 const db=database(t);const results=await Promise.all(Array.from({length:12},()=>consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base,background:true})));
 assert.equal(results.filter(row=>row.allowed).length,4);
 for(let i=0;i<4;i++)assert.equal((await consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base})).allowed,true);
 assert.equal((await consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base})).status,429);
 const next=await consumeProviderQuota({MARKET_QUOTA_DB:db.binding},{now:base+60000,background:true});assert.equal(next.minuteCount,1);assert.equal(next.dayCount,9);
});
test('background never uses local fallback and configured errors fail closed',async()=>{
 assert.equal((await consumeProviderQuota({},{background:true})).status,503);
 assert.equal((await consumeProviderQuota({MARKET_QUOTA_DB:{prepare(){throw Error('private')}}},{background:true})).status,503);
});
test('actual SQLite background daily cap is 300 and shared ceiling leaves 200 interactive requests',()=>{
 const result=python(`import sys,json,sqlite3
p=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.executescript(p['schema']);day=p['day'];minute=day*1440
for i in range(300): assert c.execute(p['background'],('twelve-data',minute+i//4,day)).fetchone() is not None
assert c.execute(p['background'],('twelve-data',minute+100,day)).fetchone() is None
assert c.execute('SELECT background_day_count FROM provider_quota').fetchone()[0]==300
for i in range(500): assert c.execute(p['normal'],('twelve-data',minute+100+i//8,day,8,800)).fetchone() is not None
assert c.execute(p['normal'],('twelve-data',minute+200,day,8,800)).fetchone() is None
# Fresh day: interactive use first600. Background must not consume reserved remainder.
c.execute(p['normal'],('twelve-data',(day+1)*1440,day+1,8,800))
c.execute('UPDATE provider_quota SET day_count=600')
assert c.execute(p['background'],('twelve-data',(day+1)*1440+1,day+1)).fetchone() is None
print(json.dumps({'day':800,'background':300,'reserve':200}))
`,{schema,background:BACKGROUND_PROVIDER_QUOTA_SQL,normal:PROVIDER_QUOTA_SQL,day:Math.floor(base/86400000)});assert.deepEqual(result,{day:800,background:300,reserve:200});
});
