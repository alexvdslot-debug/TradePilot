import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAlerts,resetAlert,markAlertRead} from '../app/alerts.mjs';
const now=Date.parse('2026-10-01T14:35:00Z');
const alert=(id='a',direction='above',price='5')=>({id,symbol:'OPEN',direction,price,enabled:true,triggeredAt:null});
const feed=()=>({symbol:'OPEN',provider:'Twelve Data',verified:true,exchange:'NASDAQ',exchangeTimezone:'America/New_York',currency:'USD',timezone:'UTC',interval:'5min',marketSession:'regular',realtime:true,delay:0,entitlementVerified:true,entitlementVerifiedAt:'2026-10-01T00:00:00Z',entitlementExpiresAt:'2026-10-15T00:00:00Z',volumeCoverage:'partial',displayRights:'verified',currentMarketStatus:{state:'open',provider:'Twelve Data',exchange:'NASDAQ',basis:'provider_market_state',scope:'current_exchange_status',stale:false,asOf:'2026-10-01T14:35:00Z'},stale:false,asOf:'2026-10-01T14:30:00Z',candles:[{time:'2026-10-01T14:25:00Z',o:4,h:6,l:3,c:4,v:100},{time:'2026-10-01T14:30:00Z',o:4,h:6,l:3,c:5,v:100}]});
test('verified closed regular candle triggers threshold once with persisted provenance',()=>{
 const source=[alert()];const result=checkAlerts(source,new Map([['OPEN',feed()]]),{now});
 assert.equal(result.changed,true);assert.equal(result.messages.length,1);assert.equal(result.alerts[0].enabled,false);assert.equal(result.alerts[0].readAt,null);assert.equal(result.alerts[0].triggerAsOf,'2026-10-01T14:30:00.000Z');assert.equal(result.alerts[0].triggerPrice,'5');
 assert.equal(checkAlerts(result.alerts,{OPEN:feed()},{now:now+1000}).changed,false);assert.equal(source[0].triggeredAt,null);
});
test('unknown, delayed, premarket, stale, incomplete and corrupt feeds never trigger',()=>{
 for(const change of [{realtime:'unverified'},{delay:'0'},{delay:15},{marketSession:'premarket'},{stale:true},{complete:false},{provider:''},{currency:'EUR'},{asOf:'2026-10-01T14:25:00Z'},{candles:[{time:'bad',o:4,h:6,l:3,c:5,v:1}]},{candles:[{time:'2026-10-01T14:30:00Z',o:4,h:6,l:3,c:NaN,v:1}]}])assert.equal(checkAlerts([alert()],{OPEN:{...feed(),...change}},{now}).changed,false);
 assert.equal(checkAlerts([alert()],{OPEN:feed()},{now:now-1}).changed,false);
 assert.equal(checkAlerts([alert()],{OPEN:feed()},{now:now+600001}).changed,false);
 const missing=feed();missing.candles[0].time='2026-10-01T14:20:00Z';assert.equal(checkAlerts([alert()],{OPEN:missing},{now}).changed,false);
 assert.equal(checkAlerts([alert()],{OPEN:{...feed(),candles:[null]}},{now}).changed,false);
});
test('still-forming candle does not replace last confirmed closed threshold observation',()=>{
 const value=feed();value.candles.push({time:'2026-10-01T14:35:00Z',o:5,h:7,l:4,c:6,v:10,complete:false});value.asOf=value.candles.at(-1).time;
 const result=checkAlerts([alert()],{OPEN:value},{now});assert.equal(result.changed,true);assert.equal(result.alerts[0].triggerPrice,'5');
 assert.equal(checkAlerts([alert('a','above','6')],{OPEN:value},{now}).changed,false);
});
test('directions, explicit owner rearm and read acknowledgement preserve one-shot semantics',()=>{
 assert.equal(checkAlerts([alert('b','below','6')],[feed()],{now}).changed,true);
 assert.equal(checkAlerts([alert('b','below','4')],[feed()],{now}).changed,false);
 const triggered=checkAlerts([alert()],{OPEN:feed()},{now}).alerts[0];
 const read=markAlertRead(triggered,{now:now+1});assert.equal(read.readAt,'2026-10-01T14:35:00.001Z');
 const reset=resetAlert(read);assert.equal(reset.enabled,true);assert.equal(reset.triggeredAt,null);assert.equal(reset.readAt,null);assert.equal(Object.hasOwn(reset,'triggerPrice'),false);
 assert.equal(checkAlerts([reset],{OPEN:feed()},{now:now+2}).messages.length,1);
 assert.deepEqual(markAlertRead(alert(),{now}),alert());
});
test('session boundary gaps are allowed but duplicate bars and symbol mismatches fail closed',()=>{
 const value=feed();value.candles[0].time='2026-09-30T19:55:00Z';assert.equal(checkAlerts([alert()],{OPEN:value},{now}).changed,true);
 value.candles[0].time=value.candles[1].time;assert.equal(checkAlerts([alert()],{OPEN:value},{now}).changed,false);
 assert.equal(checkAlerts([alert()],{OPEN:{...feed(),symbol:'AAPL'}},{now}).changed,false);
 assert.equal(checkAlerts([{...alert(),enabled:false}],{OPEN:feed()},{now}).changed,false);
});
test('normalized source without verified current entitlement and display rights cannot activate alerts',()=>{
 for(const change of [{verified:false},{verified:undefined},{entitlementVerified:false},{entitlementVerified:undefined},{displayRights:'unverified'},{displayRights:undefined},{entitlementExpiresAt:undefined},{entitlementExpiresAt:'2026-10-01T14:35:00Z'},{entitlementExpiresAt:'2026-09-30T00:00:00Z'},{entitlementVerifiedAt:undefined},{entitlementVerifiedAt:'2026-10-01T15:00:00Z'},{entitlementExpiresAt:'2026-12-01T00:00:00Z'},{volumeCoverage:'unverified'}]){
  const value={...feed(),...change};const original=[alert()];const result=checkAlerts(original,{OPEN:value},{now});assert.equal(result.changed,false);assert.deepEqual(result.messages,[]);assert.equal(result.alerts[0],original[0]);
 }
});
test('unknown, closed, stale or unauthoritative current market status cannot activate alerts',()=>{
 const valid=feed().currentMarketStatus;
 const cases=[undefined,{state:'unverified',asOf:null},{...valid,state:'closed'},{...valid,basis:'exchange_local_clock'},{...valid,scope:'historical_session'},{...valid,exchange:'NYSE'},{...valid,provider:'Unknown'},{...valid,stale:true},{...valid,stale:undefined},{...valid,asOf:'invalid'},{...valid,asOf:'2026-10-01T14:33:29Z'},{...valid,asOf:'2026-10-01T14:36:01Z'}];
 for(const currentMarketStatus of cases){const result=checkAlerts([alert()],{OPEN:{...feed(),currentMarketStatus}},{now});assert.equal(result.changed,false);assert.deepEqual(result.messages,[])}
 assert.equal(checkAlerts([alert()],{OPEN:{...feed(),currentMarketStatus:{...valid,asOf:'2026-10-01T14:33:30Z'}}},{now}).changed,true);
});
test('verified live status can confirm normalized unknown session only for regular completed bars',()=>{
 assert.equal(checkAlerts([alert()],{OPEN:{...feed(),marketSession:'unverified'}},{now}).changed,true);
 assert.equal(checkAlerts([alert()],{OPEN:{...feed(),marketSession:'unverified',exchange:'Unknown'}},{now}).changed,false);
 const premarket=feed();premarket.asOf='2026-10-01T12:30:00Z';premarket.candles=premarket.candles.map(c=>({...c,time:c.time.replace('14:','12:')}));premarket.currentMarketStatus.asOf='2026-10-01T12:35:00Z';
 assert.equal(checkAlerts([alert()],{OPEN:premarket},{now:Date.parse('2026-10-01T12:35:00Z')}).changed,false);
});
