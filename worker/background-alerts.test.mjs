import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile,spawnSync} from 'node:child_process';
import {webcrypto} from 'node:crypto';
import {runBackgroundAlerts,SAVE_ALERT_OWNER_SQL,inBackgroundCheckWindow} from './src/background-alerts.mjs';
import {backgroundProviderRead,providerAdapter} from './src/provider-adapter.mjs';
import {backgroundAlertCapability} from './src/b3-settings.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const now=Date.parse('2026-10-01T14:35:00Z');
const entitlement={provider:'Twelve Data',scope:'US_EQUITIES',evidence:'owner_account_verified',verifiedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-10-15T00:00:00Z',realtime:true,delayMinutes:0,volumeCoverage:'partial',displayRights:'verified'};
const prefs=backgroundAlerts=>({showUSD:true,defaultInterval:'15min',inAppAlerts:true,maxPositionPercent:'25.00',hideAmounts:false,backgroundAlerts});
const alert=(id='a',symbol='OPEN',price='5')=>({id,symbol,price,direction:'above',enabled:true,triggeredAt:null});
const state=(alerts=[alert()])=>({version:1,events:[],watchlist:[],journal:[],alerts,preferences:{allowMargin:false,costMethod:'average'}});
const raw=symbol=>({meta:{symbol,interval:'5min',currency:'USD',exchange:'NASDAQ',exchange_timezone:'America/New_York',type:'Common Stock',country:'United States'},values:['14:25','14:30'].map(time=>({datetime:'2026-10-01 '+time+':00',open:'4',high:'6',low:'3',close:'5',volume:'100'}))});
const sqlPython=`import sys,json,sqlite3
p=json.load(sys.stdin);c=sqlite3.connect(sys.argv[1],timeout=15);c.row_factory=sqlite3.Row
q=c.execute(p['sql'],p['args']);rows=q.fetchall();changes=c.execute('SELECT changes()').fetchone()[0];c.commit()
print(json.dumps({'results':[dict(row) for row in rows],'meta':{'changes':changes}}))`;
function database(t){
 const directory=mkdtempSync(join(tmpdir(),'tradepilot-alerts-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'db.sqlite');
 const schema=['0002_identity_settings.sql','0003_private_state.sql','0004_provider_quota.sql','0005_ui_preferences.sql','0006_background_alerts.sql'].map(file=>readFileSync(new URL('./migrations/'+file,import.meta.url),'utf8')).join('\n');
 const init=spawnSync('python3',['-c',"import sys,sqlite3;c=sqlite3.connect(sys.argv[1]);c.executescript(sys.stdin.read());c.commit()",path],{input:schema,encoding:'utf8'});assert.equal(init.status,0,init.stderr);
 const query=(sql,args=[])=>new Promise((resolve,reject)=>{const child=execFile('python3',['-c',sqlPython,path],{encoding:'utf8'},(error,stdout,stderr)=>error?reject(Error(stderr)):resolve(JSON.parse(stdout)));child.stdin.end(JSON.stringify({sql,args}));});
 const binding={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return (await query(sql,args)).results[0]??null},all(){return query(sql,args)},run(){return query(sql,args)}}}};
 return {binding,query,async seed(id,optIn=true,initial=state()){await query('INSERT INTO users(id,auth_subject) VALUES (?,?)',[id,'issuer|'+id]);await query('INSERT INTO user_settings(user_id,preferences_json) VALUES (?,?)',[id,JSON.stringify(prefs(optIn))]);await query('INSERT INTO user_state(user_id,state_json,version) VALUES (?,?,?)',[id,JSON.stringify(initial),initial.version]);},async read(id){return JSON.parse((await query('SELECT state_json FROM user_state WHERE user_id=?',[id])).results[0].state_json);}};
}
function environment(db,{closed=false,error=null,onRead}={}){let requests=[];return {BACKGROUND_ALERTS_ENABLED:'true',DB:db.binding,MARKET_QUOTA_DB:db.binding,MARKET_ENTITLEMENT_JSON:JSON.stringify(entitlement),BACKGROUND_MARKET:{async read(input){requests.push(input);if(onRead)await onRead(input);if(error)return Response.json({error:{code:error}},{status:error==='PROVIDER_QUOTA'?429:503});return Response.json(input.kind==='candles'?raw(input.symbol):[{name:input.exchange,country:'United States',is_market_open:!closed}]);}},requests};}

test('trusted scheduled checks fan out once and persist isolated one-shot bell notices',async t=>{
 const db=database(t);await db.seed('A');await db.seed('B',false);await db.seed('C',true,state([alert('a','OPEN','99')]));const env=environment(db);
 const result=await runBackgroundAlerts(env,{now});assert.equal(result.status,'ok');assert.equal(result.triggered,1);assert.equal(result.checkedOwners,2);assert.equal(env.requests.length,2);
 const a=await db.read('A');assert.equal(a.version,2);assert.equal(a.alerts[0].enabled,false);assert.equal(a.alerts[0].readAt,null);assert.equal(a.alerts[0].triggerSource,'Twelve Data');assert.equal(a.alerts[0].triggerPrice,'5');assert.deepEqual(await db.read('B'),state());assert.equal((await db.read('C')).version,1);
 assert.equal((await runBackgroundAlerts(env,{now:now+1000})).triggered,0);assert.equal((await db.read('A')).version,2);
});
test('global switch, opt-out and absent/expired entitlement do not spend provider budget',async t=>{
 const db=database(t);await db.seed('A',false);const env=environment(db);assert.equal((await runBackgroundAlerts({...env,BACKGROUND_ALERTS_ENABLED:'false'},{now})).code,'BACKGROUND_DISABLED');
 for(const metadata of [undefined,{}, {...entitlement,expiresAt:'2026-09-30T00:00:00Z'},{...entitlement,displayRights:'unverified'}])assert.equal((await runBackgroundAlerts({...env,MARKET_ENTITLEMENT_JSON:metadata},{now})).code,'ENTITLEMENT_UNVERIFIED');
 assert.equal((await runBackgroundAlerts(env,{now})).triggered,0);assert.deepEqual(env.requests,[]);assert.equal(backgroundAlertCapability({...env,BACKGROUND_ALERTS_ENABLED:'false'},prefs(true),now).active,false);
});
test('D1 lease excludes concurrent runs and recovers after expiry without losing cursor',async t=>{
 const db=database(t);await db.seed('A');let start,unblock;const started=new Promise(resolve=>start=resolve),blocked=new Promise(resolve=>unblock=resolve);let once=true;
 const env=environment(db,{onRead:async()=>{if(once){once=false;start();await blocked;}}});const first=runBackgroundAlerts(env,{now});await started;
 const second=await runBackgroundAlerts(env,{now});assert.equal(second.code,'LEASE_BUSY');unblock();assert.equal((await first).triggered,1);
 await db.query("UPDATE alert_scheduler SET lease_owner='dead',lease_until_ms=?,cursor_key='A'||char(31)||'OPEN'",[now+1]);assert.equal((await runBackgroundAlerts(env,{now:now+2})).status,'ok');
});
test('snapshot conflicts retry from current state and preserve unrelated owner edits',async t=>{
 const db=database(t);await db.seed('A');const env=environment(db);let changed=false;
 env.DB={prepare(sql){const prepared=db.binding.prepare(sql);if(sql===SAVE_ALERT_OWNER_SQL){const run=prepared.run;prepared.run=async()=>{if(!changed){changed=true;const current=await db.read('A');current.version++;current.watchlist=['AAPL'];await db.query('UPDATE user_state SET state_json=?,version=? WHERE user_id=?',[JSON.stringify(current),current.version,'A']);}return run();};}return prepared;}};
 const result=await runBackgroundAlerts(env,{now});assert.equal(result.conflicts,1);assert.equal(result.triggered,1);const stored=await db.read('A');assert.equal(stored.version,3);assert.deepEqual(stored.watchlist,['AAPL']);
});
test('opt-out racing a trigger prevents its conditional write',async t=>{
 const db=database(t);await db.seed('A');const env=environment(db);env.DB={prepare(sql){const prepared=db.binding.prepare(sql);if(sql===SAVE_ALERT_OWNER_SQL){const run=prepared.run;prepared.run=async()=>{await db.query('UPDATE user_settings SET preferences_json=? WHERE user_id=?',[JSON.stringify(prefs(false)),'A']);return run();};}return prepared;}};
 assert.equal((await runBackgroundAlerts(env,{now})).triggered,0);assert.equal((await db.read('A')).version,1);
});
test('durable cursor rotates bounded symbol batches rather than starving later symbols',async t=>{
 const db=database(t);await db.seed('A',true,state(['AAPL','MSFT','OPEN'].map((symbol,index)=>alert('a'+index,symbol,'99'))));const env=environment(db);
 const first=await runBackgroundAlerts(env,{now});assert.equal(first.checkedSymbols,2);const second=await runBackgroundAlerts(env,{now});assert.equal(second.checkedSymbols,1);assert.equal(env.requests.filter(input=>input.kind==='candles').at(-1).symbol,'OPEN');
});
test('closed markets, quota errors and configured DB failures fail closed',async t=>{
 const db=database(t);await db.seed('A');assert.equal((await runBackgroundAlerts(environment(db,{closed:true}),{now})).triggered,0);
 for(const code of ['PROVIDER_QUOTA','PROVIDER_QUOTA_UNAVAILABLE']){const result=await runBackgroundAlerts(environment(db,{error:code}),{now});assert.equal(result.status,'error');assert.equal(result.code,code);assert.equal((await db.read('A')).version,1);}
 const env=environment(db);assert.equal((await runBackgroundAlerts({...env,DB:{prepare(){throw Error('secret')} }},{now})).code,'DATABASE_ERROR');assert.equal((await runBackgroundAlerts({...env,MARKET_QUOTA_DB:undefined},{now})).code,'SERVICE_NOT_CONFIGURED');
});
test('public requests cannot invoke named RPC, while private reads validate before quota',async()=>{
 const env={BACKGROUND_ALERTS_ENABLED:'true',TWELVE_DATA_API_KEY:'secret',ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'aud',MARKET_QUOTA_DB:{prepare(){throw Error('must not reach')}}};
 assert.equal((await providerAdapter(new Request('https://provider.example/_tradepilot/time_series?symbol=OPEN&interval=5min'),env)).status,401);
 assert.equal((await providerAdapter(new Request('https://provider.example/_tradepilot/background/read'),env)).status,404);
 for(const input of [{kind:'candles',symbol:'OPEN',user_id:'A'},{kind:'candles',symbol:'<script>'},{kind:'status',exchange:'fake'}])assert.equal((await backgroundProviderRead(input,env)).status,400);
 assert.equal((await backgroundProviderRead({kind:'candles',symbol:'OPEN'},{...env,BACKGROUND_ALERTS_ENABLED:'false'})).status,503);
 assert.equal((await backgroundProviderRead({kind:'candles',symbol:'OPEN'},env)).status,503);
});
test('lease loss or release failure is reported explicitly without leaking database diagnostics',async t=>{
 for(const lost of [true,false]){const db=database(t);await db.seed('A');const env=environment(db);env.DB={prepare(sql){const prepared=db.binding.prepare(sql);if(sql.startsWith('UPDATE alert_scheduler SET lease_owner'))prepared.run=async()=>{if(lost)return {meta:{changes:0}};throw Error('private diagnostic')};return prepared;}};const result=await runBackgroundAlerts(env,{now});assert.equal(result.status,'error');assert.equal(result.code,lost?'LEASE_LOST':'DATABASE_ERROR');assert.equal(JSON.stringify(result).includes('private'),false);}
});
test('malformed provider candles cannot trigger or modify an owner snapshot',async t=>{
 const db=database(t);await db.seed('A');const env=environment(db);env.BACKGROUND_MARKET.read=async()=>Response.json({...raw('OPEN'),values:[{datetime:'bad',close:'5'}]});
 const result=await runBackgroundAlerts(env,{now});assert.equal(result.code,'CHECKED_WITH_SKIPS');assert.equal(result.failedSymbols,1);assert.equal((await db.read('A')).version,1);
});
test('private RPC counts exactly once per upstream request and preserves safe provider errors',async t=>{
 const db=database(t),original=globalThis.fetch;let calls=0;t.after(()=>globalThis.fetch=original);globalThis.fetch=async url=>{calls++;assert.equal(new URL(url).searchParams.get('symbol'),'OPEN');return Response.json(raw('OPEN'));};
 const env={BACKGROUND_ALERTS_ENABLED:'true',MARKET_QUOTA_DB:db.binding,TWELVE_DATA_API_KEY:'secret'};assert.equal((await backgroundProviderRead({kind:'candles',symbol:'OPEN'},env)).status,200);assert.equal(calls,1);
 const quota=(await db.query('SELECT minute_count,day_count,background_day_count FROM provider_quota')).results[0];assert.deepEqual(quota,{minute_count:1,day_count:1,background_day_count:1});
 globalThis.fetch=async()=>{calls++;return new Response('private provider diagnostic',{status:429})};const response=await backgroundProviderRead({kind:'candles',symbol:'OPEN'},env);assert.equal(response.status,429);assert.equal((await response.json()).error.code,'PROVIDER_QUOTA');assert.equal(calls,2);assert.equal((await db.query('SELECT day_count FROM provider_quota')).results[0].day_count,2);
});

test('one owner poison symbol cannot starve a later owner, and repeated runs remain bounded',async t=>{
 const db=database(t);await db.seed('A',true,state([alert('bad','BAD')]));await db.seed('B');const env=environment(db);let requests=0;
 env.BACKGROUND_MARKET.read=async input=>{requests++;if(input.symbol==='BAD')return Response.json({error:{code:'PROVIDER_UNAVAILABLE'}},{status:502});return Response.json(input.kind==='candles'?raw(input.symbol):[{name:input.exchange,country:'United States',is_market_open:true}]);};
 const first=await runBackgroundAlerts(env,{now});assert.equal(first.status,'ok');assert.equal(first.code,'CHECKED_WITH_SKIPS');assert.equal(first.triggered,1);assert.equal(first.failedSymbols,1);assert.equal(requests,3);assert.equal((await db.read('A')).version,1);assert.equal((await db.read('B')).version,2);
 const second=await runBackgroundAlerts(env,{now:now+1000});assert.equal(second.triggered,0);assert.equal(second.failedSymbols,1);assert.equal(requests,4);
});

test('weekends and NY overnight/premarket/afterhours skip before any database or RPC work',async()=>{
 let calls=0;const env={BACKGROUND_ALERTS_ENABLED:'true',get DB(){calls++;throw Error('unexpected DB access')},get MARKET_QUOTA_DB(){calls++;throw Error('unexpected quota access')},get BACKGROUND_MARKET(){calls++;throw Error('unexpected RPC access')}};
 for(const timestamp of ['2026-10-03T14:35:00Z','2026-10-04T14:35:00Z','2026-10-01T04:00:00Z','2026-10-01T13:30:00Z','2026-10-01T13:34:59Z','2026-10-01T20:00:00Z','2026-10-01T22:00:00Z']){
  const result=await runBackgroundAlerts(env,{now:Date.parse(timestamp)});assert.equal(result.code,'OUTSIDE_REGULAR_CHECK_WINDOW',timestamp);assert.equal(result.triggered,0);
 }
 assert.equal(calls,0);
});
test('NY window follows both DST transitions and does not assert holiday opening',async()=>{
 for(const timestamp of ['2026-03-06T14:35:00Z','2026-03-09T13:35:00Z','2026-10-30T13:35:00Z','2026-11-02T14:35:00Z','2026-12-25T14:35:00Z'])assert.equal(inBackgroundCheckWindow(Date.parse(timestamp)),true,timestamp);
 for(const timestamp of ['2026-03-06T14:34:59Z','2026-03-09T13:34:59Z','2026-11-02T13:35:00Z','2026-03-09T20:00:00Z','2026-11-02T21:00:00Z'])assert.equal(inBackgroundCheckWindow(Date.parse(timestamp)),false,timestamp);
 let calls=0;const env={BACKGROUND_ALERTS_ENABLED:'true',DB:{prepare(){calls++;throw Error('unexpected DB work')}},MARKET_QUOTA_DB:{},BACKGROUND_MARKET:{read(){calls++;throw Error('unexpected RPC work')}}};
 // A holiday clock match still needs entitlement and authoritative provider status.
 assert.equal((await runBackgroundAlerts(env,{now:Date.parse('2026-12-25T14:35:00Z')})).code,'ENTITLEMENT_UNVERIFIED');assert.equal(calls,0);
});
