import {checkAlerts} from '../../app/alerts.mjs';
import {entitlementMetadata} from '../../app/market-quality.mjs';
import {normalizeCandles} from './market-api.mjs';
import {validateState} from './private-state.mjs';

const LEASE_MS=120000,MAX_TASKS=20,MAX_SYMBOLS=2;
export const ACQUIRE_ALERT_LEASE_SQL=`INSERT INTO alert_scheduler(name,lease_owner,lease_until_ms)
VALUES ('price-alerts',?1,?2)
ON CONFLICT(name) DO UPDATE SET lease_owner=excluded.lease_owner,lease_until_ms=excluded.lease_until_ms
WHERE alert_scheduler.lease_until_ms<=?3
RETURNING cursor_key`;
export const ALERT_TASKS_SQL=`SELECT DISTINCT s.user_id||char(31)||json_extract(a.value,'$.symbol') AS task_key,
s.user_id,json_extract(a.value,'$.symbol') AS symbol
FROM user_state s JOIN user_settings p ON p.user_id=s.user_id, json_each(s.state_json,'$.alerts') a
WHERE json_extract(p.preferences_json,'$.backgroundAlerts')=1
AND json_extract(a.value,'$.enabled')=1 AND json_extract(a.value,'$.triggeredAt') IS NULL
AND s.user_id||char(31)||json_extract(a.value,'$.symbol')>?1
ORDER BY task_key LIMIT 20`;
export const READ_ALERT_OWNER_SQL=`SELECT s.state_json,s.version FROM user_state s JOIN user_settings p ON p.user_id=s.user_id
WHERE s.user_id=?1 AND json_extract(p.preferences_json,'$.backgroundAlerts')=1`;
export const SAVE_ALERT_OWNER_SQL=`UPDATE user_state SET state_json=?1,version=version+1,updated_at=datetime('now')
WHERE user_id=?2 AND version=?3
AND EXISTS(SELECT 1 FROM user_settings WHERE user_id=?2 AND json_extract(preferences_json,'$.backgroundAlerts')=1)
AND EXISTS(SELECT 1 FROM alert_scheduler WHERE name='price-alerts' AND lease_owner=?4 AND lease_until_ms>?5)`;
const releaseSQL=`UPDATE alert_scheduler SET lease_owner='',lease_until_ms=0,cursor_key=?1,last_run_ms=?2,last_outcome=?3
WHERE name='price-alerts' AND lease_owner=?4`;
const entitlementReady=(env,now)=>{const metadata=entitlementMetadata(env.MARKET_ENTITLEMENT_JSON,now);return metadata.entitlementVerified===true&&metadata.realtime===true&&metadata.delay===0&&metadata.displayRights==='verified';};
const validSymbol=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(s);
const knownError=code=>['PROVIDER_QUOTA','PROVIDER_QUOTA_UNAVAILABLE','SERVICE_NOT_CONFIGURED','BACKGROUND_DISABLED','PROVIDER_UNAVAILABLE','PROVIDER_TIMEOUT','INVALID_PROVIDER_DATA'].includes(code)?code:'BACKGROUND_SERVICE_UNAVAILABLE';
async function rpcJson(binding,input){
 const response=await binding.read(input);
 if(!(response instanceof Response))throw Error('INVALID_PROVIDER_DATA');
 const reader=response.body?.getReader();if(!reader)throw Error('INVALID_PROVIDER_DATA');let size=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>250000)throw Error('INVALID_PROVIDER_DATA');parts.push(value);}}catch(cause){await reader.cancel().catch(()=>{});throw cause;}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('INVALID_PROVIDER_DATA');}
 if(!response.ok)throw Error(knownError(data.error?.code));return data;
}
/** Trusted scheduled entry, no public route and no owner impersonation. */
export async function runBackgroundAlerts(env,{now=Date.now()}={}){
 if(env.BACKGROUND_ALERTS_ENABLED!=='true')return {status:'disabled',code:'BACKGROUND_DISABLED',triggered:0};
 if(!Number.isSafeInteger(now)||now<0||!env.DB||!env.MARKET_QUOTA_DB||typeof env.BACKGROUND_MARKET?.read!=='function')return {status:'error',code:'SERVICE_NOT_CONFIGURED',triggered:0};
 if(!entitlementReady(env,now))return {status:'blocked',code:'ENTITLEMENT_UNVERIFIED',triggered:0};
 const started=Date.now(),clock=()=>now+(Date.now()-started),leaseOwner=crypto.randomUUID();
 let acquired=false,cursor='',outcome='DATABASE_ERROR';const result={status:'ok',code:'CHECKED',triggered:0,checkedOwners:0,checkedSymbols:0,failedSymbols:0,conflicts:0};
 try{
  const lease=await env.DB.prepare(ACQUIRE_ALERT_LEASE_SQL).bind(leaseOwner,now+LEASE_MS,now).first();
  if(!lease)return {status:'skipped',code:'LEASE_BUSY',triggered:0};
  acquired=true;cursor=lease.cursor_key;
  if(typeof cursor!=='string'||cursor.length>256)throw Error('DATABASE_ERROR');
  let tasks=(await env.DB.prepare(ALERT_TASKS_SQL).bind(cursor).all()).results;
  if(!Array.isArray(tasks)||tasks.length>MAX_TASKS)throw Error('DATABASE_ERROR');
  if(!tasks.length&&cursor){cursor='';tasks=(await env.DB.prepare(ALERT_TASKS_SQL).bind('').all()).results;if(!Array.isArray(tasks)||tasks.length>MAX_TASKS)throw Error('DATABASE_ERROR');}
  const feeds=new Map(),statuses=new Map();
  for(const task of tasks){
   if(clock()>=now+LEASE_MS-30000){result.code='RUN_BOUND_REACHED';break;}
   if(typeof task.user_id!=='string'||typeof task.task_key!=='string'||!validSymbol(task.symbol))throw Error('INVALID_STATE');
   if(!feeds.has(task.symbol)){
    if(feeds.size>=MAX_SYMBOLS)break;
    try{
    const raw=await rpcJson(env.BACKGROUND_MARKET,{kind:'candles',symbol:task.symbol});
    const feed=normalizeCandles(raw,task.symbol,'5min',clock(),env.MARKET_ENTITLEMENT_JSON);
    if(!statuses.has(feed.exchange)){
     const rows=await rpcJson(env.BACKGROUND_MARKET,{kind:'status',exchange:feed.exchange});
     const row=Array.isArray(rows)?rows.find(item=>item.name===feed.exchange&&['United States','US'].includes(item.country)):null;
     if(!row||typeof row.is_market_open!=='boolean')throw Error('INVALID_PROVIDER_DATA');
     statuses.set(feed.exchange,{provider:feed.provider,exchange:feed.exchange,state:row.is_market_open?'open':'closed',asOf:new Date(clock()).toISOString(),basis:'provider_market_state',scope:'current_exchange_status',stale:false});
    }
    feed.currentMarketStatus=statuses.get(feed.exchange);feeds.set(task.symbol,feed);result.checkedSymbols++;
    }catch(cause){if(!['PROVIDER_UNAVAILABLE','INVALID_PROVIDER_DATA'].includes(cause.message))throw cause;feeds.set(task.symbol,null);result.checkedSymbols++;result.failedSymbols++;result.code='CHECKED_WITH_SKIPS';}
   }
   if(feeds.get(task.symbol)===null){cursor=task.task_key;continue;}
   // Reread each owner before evaluation. A CAS conflict always starts from their
   // newest snapshot, never from the stale task-selection snapshot.
   for(let attempt=0;attempt<3;attempt++){
    const row=await env.DB.prepare(READ_ALERT_OWNER_SQL).bind(task.user_id).first();if(!row)break;
    if(typeof row.state_json!=='string'||new TextEncoder().encode(row.state_json).byteLength>200000)throw Error('INVALID_STATE');
    const state=validateState(JSON.parse(row.state_json));if(state.version!==row.version)throw Error('INVALID_STATE');
    const evaluated=checkAlerts(state.alerts,{[task.symbol]:feeds.get(task.symbol)},{now:clock()});
    if(!evaluated.changed)break;
    const next={...state,alerts:evaluated.alerts,version:state.version+1};validateState(next);
    const update=await env.DB.prepare(SAVE_ALERT_OWNER_SQL).bind(JSON.stringify(next),task.user_id,state.version,leaseOwner,clock()).run();
    if(update.meta?.changes===1){result.triggered+=evaluated.messages.length;break;}
    if(update.meta?.changes!==0)throw Error('DATABASE_ERROR');result.conflicts++;
   }
   result.checkedOwners++;cursor=task.task_key;
  }
  outcome=result.code;return result;
 }catch(cause){outcome=knownError(cause.message);if(!['PROVIDER_QUOTA','PROVIDER_TIMEOUT','PROVIDER_UNAVAILABLE','INVALID_PROVIDER_DATA','PROVIDER_QUOTA_UNAVAILABLE','SERVICE_NOT_CONFIGURED','BACKGROUND_DISABLED'].includes(cause.message))outcome='DATABASE_ERROR';result.status='error';result.code=outcome;return result;}
 finally{if(acquired){try{const released=await env.DB.prepare(releaseSQL).bind(cursor,clock(),outcome,leaseOwner).run();if(released.meta?.changes!==1){result.status='error';result.code='LEASE_LOST';}}catch{result.status='error';result.code='DATABASE_ERROR';}}}
}
