/** Pure market-data quality helpers; no entitlement is inferred from timestamps. */
const exchanges=new Set(['NASDAQ','NYSE','NYSE American','NYSE Arca','AMEX','BATS','CBOE']);
export const intervalMilliseconds=interval=>interval==='5min'?300000:interval==='15min'?900000:null;
export function classifyCandleSession(time,{exchange,exchangeTimezone='America/New_York'}={}) {
 const unknown={session:'unverified',basis:'unverified',calendarVerified:false,timezone:exchangeTimezone};
 if(!exchanges.has(exchange)||exchangeTimezone!=='America/New_York'||!Number.isFinite(Date.parse(time)))return unknown;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:exchangeTimezone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time)).map(x=>[x.type,x.value]));
 const minutes=Number(parts.hour)*60+Number(parts.minute);
 const weekend=['Sat','Sun'].includes(parts.weekday);
 const session=weekend?'closed':minutes>=570&&minutes<960?'regular':minutes>=240&&minutes<570?'premarket':minutes>=960&&minutes<1200?'after-hours':'closed';
 return {session,basis:'exchange_local_clock',calendarVerified:false,timezone:exchangeTimezone,localTime:`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`};
}
export function completedFeed(feed,now=Date.now()) {
 const duration=intervalMilliseconds(feed?.interval);
 if(!duration||!Array.isArray(feed?.candles))return {...feed,candles:[],droppedFormingBars:0};
 const candles=feed.candles.filter(c=>Number.isFinite(Date.parse(c.time))&&Date.parse(c.time)+duration<=now);
 const asOf=candles.at(-1)?.time||null;
 return {...feed,candles,sourceAsOf:feed.asOf,asOf,droppedFormingBars:feed.candles.length-candles.length,stale:feed.stale===true||!asOf||now-Date.parse(asOf)>2*duration,lastCandleSession:asOf?classifyCandleSession(asOf,{exchange:feed.exchange,exchangeTimezone:feed.exchangeTimezone}):null};
}
function validBar(c){return c&&Number.isFinite(Date.parse(c.time))&&[c.o,c.h,c.l,c.c,c.v].every(Number.isFinite)&&Math.min(c.o,c.h,c.l,c.c)>0&&c.v>=0&&c.h>=Math.max(c.o,c.l,c.c)&&c.l<=Math.min(c.o,c.c);}
export function compareHistoricalFeeds(feed,benchmark,{now=Date.now(),bars=6}={}) {
 const invalid=reason=>({comparable:false,reason,relativeStrength:null,asOf:null,basis:'aligned_completed_historical_bars',actionable:false});
 if(!Number.isInteger(bars)||bars<2||bars>200||!intervalMilliseconds(feed?.interval)||feed.interval!==benchmark?.interval||feed.currency!==benchmark.currency||feed.timezone!=='UTC'||benchmark.timezone!=='UTC')return invalid('BENCHMARK_NOT_COMPARABLE');
 const a=completedFeed(feed,now),b=completedFeed(benchmark,now);
 for(const f of [a,b])if(f.candles.some((c,i)=>!validBar(c)||(i&&Date.parse(c.time)<=Date.parse(f.candles[i-1].time))))return invalid('INVALID_OR_INCOMPLETE_CANDLES');
 const lookup=new Map(b.candles.map(c=>[Date.parse(c.time),c]));
 const matching=a.candles.filter(c=>lookup.has(Date.parse(c.time))).slice(-bars);
 if(matching.length!==bars)return invalid('BENCHMARK_NOT_COMPARABLE');
 const duration=intervalMilliseconds(feed.interval);
 // Require an uninterrupted shared intraday window; do not compare mismatched trading periods.
 if(matching.some((c,i)=>i&&Date.parse(c.time)-Date.parse(matching[i-1].time)!==duration))return invalid('BENCHMARK_NOT_COMPARABLE');
 const first=matching[0],last=matching.at(-1),firstBenchmark=lookup.get(Date.parse(first.time)),lastBenchmark=lookup.get(Date.parse(last.time));
 const momentum=last.c/first.c-1,benchmarkMomentum=lastBenchmark.c/firstBenchmark.c-1;
 return {comparable:true,relativeStrength:momentum-benchmarkMomentum,momentum,benchmarkMomentum,asOf:last.time,windowStart:first.time,bars,basis:'aligned_completed_historical_bars',actionable:false,stale:a.stale||b.stale,sourceAsOf:[feed.asOf,benchmark.asOf]};
}
export function entitlementMetadata(raw,now=Date.now()) {
 const unknown={realtime:'unverified',delay:'unverified',volumeCoverage:'unverified',entitlementVerified:false,displayRights:'unverified',documentedDefaultFeed:{availability:'realtime_us_equities',volumeCoverage:'partial',approximateMarketVolumeShare:0.05,basis:'provider_general_documentation',source:'https://support.twelvedata.com/en/articles/9935903-us-equities-market-data'}};
 let data;try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch{return unknown;}
 if(!data||data.provider!=='Twelve Data'||data.scope!=='US_EQUITIES'||data.evidence!=='owner_account_verified'||!['verified','unverified'].includes(data.displayRights)||typeof data.realtime!=='boolean'||!Number.isFinite(data.delayMinutes)||data.delayMinutes<0||data.delayMinutes>1440||!['partial','consolidated'].includes(data.volumeCoverage)||!Number.isFinite(Date.parse(data.verifiedAt))||Date.parse(data.verifiedAt)>now||!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=now||Date.parse(data.expiresAt)-Date.parse(data.verifiedAt)>30*86400000||(data.realtime&&data.delayMinutes!==0))return unknown;
 return {realtime:data.realtime,delay:data.delayMinutes,volumeCoverage:data.volumeCoverage,displayRights:data.displayRights,entitlementVerified:true,entitlementVerifiedAt:data.verifiedAt,entitlementExpiresAt:data.expiresAt};
}
