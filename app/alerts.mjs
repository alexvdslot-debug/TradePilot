const positiveDecimal=value=>typeof value==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value)&&Number(value)>0;
const units=value=>{const [whole,fraction='']=value.split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'))};
const sessionDate=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function trustedClose(feed,now){
 if(!feed||!intervalMilliseconds(feed.interval)||!['regular','unverified'].includes(feed.marketSession)||feed.verified!==true||feed.entitlementVerified!==true||feed.realtime!==true||typeof feed.delay!=='number'||feed.delay!==0||feed.stale!==false||feed.complete===false||feed.currency!=='USD'||feed.timezone!=='UTC'||typeof feed.provider!=='string'||!feed.provider||feed.provider.length>80||/[<>\u0000-\u001f]/.test(feed.provider)||!Array.isArray(feed.candles)||feed.candles.length<1||feed.candles.length>200)return null;
 // Reuse the same evidence expiry and display-rights contract as market normalization.
 const entitlement=entitlementMetadata({provider:feed.provider,scope:'US_EQUITIES',evidence:'owner_account_verified',verifiedAt:feed.entitlementVerifiedAt,expiresAt:feed.entitlementExpiresAt,realtime:feed.realtime,delayMinutes:feed.delay,volumeCoverage:feed.volumeCoverage,displayRights:feed.displayRights},now);
 if(entitlement.entitlementVerified!==true||entitlement.displayRights!=='verified')return null;
 const current=feed.currentMarketStatus,currentTime=Date.parse(current?.asOf);
 if(!current||current.state!=='open'||current.provider!==feed.provider||current.basis!=='provider_market_state'||current.scope!=='current_exchange_status'||current.exchange!==feed.exchange||current.stale!==false||!Number.isFinite(currentTime)||now-currentTime>90000||currentTime>now+60000)return null;
 const interval=intervalMilliseconds(feed.interval);let previous;
 for(const candle of feed.candles){
  if(!candle||typeof candle!=='object'||typeof candle.time!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(candle.time))return null;
  const time=Date.parse(candle.time);
  if(!Number.isFinite(time)||time>now+60000||new Date(time).toISOString()!==candle.time.replace(/Z$/,candle.time.includes('.')?'Z':'.000Z')||![candle.o,candle.h,candle.l,candle.c,candle.v].every(Number.isFinite)||Math.min(candle.o,candle.h,candle.l,candle.c)<=0||candle.v<0||candle.h<Math.max(candle.o,candle.l,candle.c)||candle.l>Math.min(candle.o,candle.c)||previous!==undefined&&(time<=previous||sessionDate(time)===sessionDate(previous)&&time-previous!==interval))return null;
  previous=time;
 }
 if(feed.asOf!==feed.candles.at(-1).time)return null;
 const latest=completedFeed(feed,now).candles.filter(candle=>candle.complete!==false).at(-1);
 if(!latest||now-Date.parse(latest.time)>interval*2)return null;
 if(classifyCandleSession(latest.time,{exchange:feed.exchange,exchangeTimezone:feed.exchangeTimezone}).session!=='regular')return null;
 const price=String(latest.c);if(!positiveDecimal(price))return null;
 return {price,asOf:new Date(latest.time).toISOString(),source:feed.provider};
}

/** Foreground only. Call with server-fetched feeds; no provider or notification requests here. */
export function checkAlerts(alerts,feeds,{now=Date.now()}={}){
 if(!Array.isArray(alerts)||!Number.isFinite(now))throw Error('INVALID_ALERT_INPUT');
 const messages=[];
 const next=alerts.map(alert=>{
  if(!alert.enabled||alert.triggeredAt!==null||!positiveDecimal(alert.price)||!['above','below'].includes(alert.direction))return alert;
  const feed=feeds instanceof Map?feeds.get(alert.symbol):Array.isArray(feeds)?feeds.find(value=>value.symbol===alert.symbol):feeds?.[alert.symbol];
  if(feed?.symbol!==alert.symbol)return alert;
  const close=trustedClose(feed,now);if(!close)return alert;
  const hit=alert.direction==='above'?units(close.price)>=units(alert.price):units(close.price)<=units(alert.price);
  if(!hit)return alert;
  const triggered={...alert,enabled:false,triggeredAt:new Date(now).toISOString(),readAt:null,triggerPrice:close.price,triggerAsOf:close.asOf,triggerSource:close.source};
  messages.push({code:'PRICE_ALERT_TRIGGERED',alertId:alert.id,symbol:alert.symbol,direction:alert.direction,threshold:alert.price,price:close.price,asOf:close.asOf,source:close.source,triggeredAt:triggered.triggeredAt});
  return triggered;
 });
 return {alerts:next,changed:messages.length>0,messages};
}

/** Re-arming is an explicit owner action, permitting a new future one-shot notification. */
export function resetAlert(alert){
 const {triggerPrice,triggerAsOf,triggerSource,...rest}=alert;
 return {...rest,enabled:true,triggeredAt:null,readAt:null};
}
export function markAlertRead(alert,{now=Date.now()}={}){
 if(!Number.isFinite(now))throw Error('INVALID_ALERT_INPUT');
 return alert.triggeredAt?{...alert,readAt:new Date(now).toISOString()}:alert;
}
import {classifyCandleSession,completedFeed,entitlementMetadata,intervalMilliseconds} from './market-quality.mjs';

