import { completedFeed, classifyCandleSession, compareHistoricalFeeds } from './market-quality.mjs';
/**
 * TradePilot Pro deterministic indicator engine.
 * Input candles are oldest first, with numeric o,h,l,c,v and ISO time.
 * No market-data request is made by this module.
 */
export function validateCandles(candles) {
  if (!Array.isArray(candles) || candles.length < 26) throw Error('At least 26 candles required');
  let last = -Infinity;
  for (const x of candles) {
    const t = Date.parse(x.time);
    if (!Number.isFinite(t) || t <= last) throw Error('Candles must have increasing valid timestamps');
    if (![x.o,x.h,x.l,x.c,x.v].every(Number.isFinite) || Math.min(x.o,x.h,x.l,x.c) <= 0 || x.v < 0 || x.h < Math.max(x.o,x.c,x.l) || x.l > Math.min(x.o,x.c)) throw Error('Invalid OHLCV candle');
    last = t;
  }
}
export function ema(values, period) {
  if (values.length < period || period < 1) return null;
  const k=2/(period+1);
  let result=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
  for(let i=period;i<values.length;i++) result=values[i]*k+result*(1-k);
  return result;
}
export function rsi(values, period=14) {
  if(values.length<=period) return null;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}
  gain/=period;loss/=period;
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(period-1)+Math.max(d,0))/period;loss=(loss*(period-1)+Math.max(-d,0))/period}
  return loss===0?(gain===0?50:100):100-100/(1+gain/loss);
}
export function macd(values) {
  if(values.length<35)return null;
  const emaSeries=(p)=>{const k=2/(p+1);let x=values.slice(0,p).reduce((a,b)=>a+b,0)/p;const result=Array(p-1).fill(null);result.push(x);for(let i=p;i<values.length;i++){x=values[i]*k+x*(1-k);result.push(x)}return result};
  const a=emaSeries(12),b=emaSeries(26);
  const line=a.map((x,i)=>b[i]===null?null:x-b[i]).filter(x=>x!==null);
  const signal=ema(line,9);
  const m=line.at(-1);
  return {macd:m,signal,histogram:m-signal};
}
export function indicators(candles) {
  validateCandles(candles);
  const closes=candles.map(x=>x.c);
  const volume=candles.reduce((s,x)=>s+x.v,0);
  const vwap=volume>0?candles.reduce((s,x)=>s+((x.h+x.l+x.c)/3)*x.v,0)/volume:null;
  const previous=candles.slice(-21,-1).map(x=>x.v);
  const avg=previous.reduce((a,b)=>a+b,0)/previous.length;
  return {close:closes.at(-1),vwap,rsi:rsi(closes),macd:macd(closes),relativeVolume:avg>0?candles.at(-1).v/avg:null,asOf:candles.at(-1).time};
}
export function longPlan({entry,stop,target1,target2}) {
  if(![entry,stop,target1,target2].every(x=>Number.isFinite(x)&&x>0)||!(stop<entry&&entry<target1&&target1<target2)) throw Error('Expected stop < entry < target1 < target2');
  return {riskPerShare:entry-stop,rr1:(target1-entry)/(entry-stop),rr2:(target2-entry)/(entry-stop)};
}

const sessionDate = time => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
export function sessionVwap(candles) {
 const date=sessionDate(candles.at(-1).time);
 const current=candles.filter(c=>sessionDate(c.time)===date);
 const volume=current.reduce((sum,c)=>sum+c.v,0);
 return volume?current.reduce((sum,c)=>sum+(c.h+c.l+c.c)/3*c.v,0)/volume:null;
}
export function riskReward({entry,stop,target1,target2}, {fees=0,slippage=0}={}) {
 const base=longPlan({entry,stop,target1,target2});
 if(![fees,slippage].every(x=>Number.isFinite(x)&&x>=0))throw Error('INVALID_COSTS');
 // Caller supplies round-trip costs per share in the instrument currency.
 const costs=fees+slippage;
 return {...base,costs,riskPerShare:base.riskPerShare+costs,rr1:(target1-entry-costs)/(base.riskPerShare+costs),rr2:(target2-entry-costs)/(base.riskPerShare+costs)};
}
export function analyzeCandles(sourceFeed,{benchmark,fees=0,slippage=0,now=Date.now()}={}) {
 const reasons=[];
 if(![fees,slippage].every(x=>Number.isFinite(x)&&x>=0))throw Error('INVALID_COSTS');
 try{validateCandles(sourceFeed?.candles);}catch{return {status:'wait',reasons:['INVALID_OR_INCOMPLETE_CANDLES'],scenario:null,hypotheticalScenario:null,score:null,indicators:null};}
 const feed=completedFeed(sourceFeed,now),candles=feed.candles;
 try{validateCandles(candles);}catch{return {status:'wait',reasons:['INSUFFICIENT_COMPLETED_CANDLES'],scenario:null,hypotheticalScenario:null,score:null,indicators:null,droppedFormingBars:feed.droppedFormingBars};}
 const latest=candles.at(-1),minutes=['5min','15min'].includes(feed.interval)?parseInt(feed.interval,10):null;
 if(!minutes)reasons.push('UNSUPPORTED_INTERVAL');
 if(feed.stale!==false||!Number.isFinite(Date.parse(sourceFeed.asOf))||Date.parse(sourceFeed.asOf)!==Date.parse(sourceFeed.candles.at(-1).time)||sourceFeed.candles.some(c=>Date.parse(c.time)>now+60000))reasons.push('STALE_OR_INVALID_TIMESTAMP');
 if(!feed.provider||feed.currency!=='USD'||feed.timezone!=='UTC')reasons.push('UNVERIFIED_SOURCE');
 const session=classifyCandleSession(latest.time,{exchange:feed.exchange,exchangeTimezone:feed.exchangeTimezone});
 if((feed.marketSession!=='regular'&&session.session!=='regular')||feed.delay!==0||feed.realtime!==true)reasons.push('UNVERIFIED_SESSION_OR_DELAY');
 if(feed.entitlementVerified===true&&(!Number.isFinite(Date.parse(feed.entitlementExpiresAt))||Date.parse(feed.entitlementExpiresAt)<=now))reasons.push('ENTITLEMENT_EXPIRED');
 if(feed.displayRights!=='verified')reasons.push('DISPLAY_RIGHTS_UNVERIFIED');
 const current=feed.currentMarketStatus;
 if(!current||current.state!=='open'||current.basis!=='provider_market_state'||current.exchange!==feed.exchange||!Number.isFinite(Date.parse(current.asOf))||now-Date.parse(current.asOf)>90000||Date.parse(current.asOf)>now+60000)reasons.push('CURRENT_MARKET_STATUS_UNVERIFIED');
 if(candles.length<35)reasons.push('INSUFFICIENT_MACD_HISTORY');
 const gaps=candles.some((c,i)=>i&&sessionDate(c.time)===sessionDate(candles[i-1].time)&&Date.parse(c.time)-Date.parse(candles[i-1].time)!==(minutes||5)*60000);
 if(gaps)reasons.push('INCOMPLETE_INTERVALS');
 const values=indicators(candles);values.vwap=sessionVwap(candles);values.relativeVolumeKind='intrabar_average_20';
 const prior=candles.slice(-21,-1),support=Math.min(...prior.map(c=>c.l)),resistance=Math.max(...prior.map(c=>c.h));
 const ranges=candles.slice(1).map((c,i)=>Math.max(c.h-c.l,Math.abs(c.h-candles[i].c),Math.abs(c.l-candles[i].c)));
 const atr=ranges.slice(-14).reduce((sum,x)=>sum+x,0)/14;
 const returns=candles.slice(-15).slice(1).map((c,i)=>Math.log(c.c/candles.slice(-15)[i].c));
 const volatility={atr,atrMethod:'simple_mean_true_range_14',atrPercent:atr/latest.c,barReturnRootMeanSquare:Math.sqrt(returns.reduce((sum,x)=>sum+x*x,0)/returns.length)};
 const trend=ema(candles.map(c=>c.c),9)>ema(candles.map(c=>c.c),21)?'up':'down';
 const momentum=latest.c/candles.at(-6).c-1;
 const liquidity={averageBarDollarVolume:prior.reduce((sum,c)=>sum+c.c*c.v,0)/prior.length,coverage:feed.volumeCoverage||'unverified',basis:'provider_feed_only'};
 if(values.vwap===null||values.relativeVolume===null||liquidity.averageBarDollarVolume<100000)reasons.push('INSUFFICIENT_LIQUIDITY');
 const comparison=benchmark?compareHistoricalFeeds(feed,benchmark,{now}):null;
 const relativeStrength=comparison?.comparable?comparison.relativeStrength:null;
 if(benchmark&&!comparison.comparable)reasons.push('BENCHMARK_NOT_COMPARABLE');
 if(benchmark&&comparison.comparable&&(comparison.stale||benchmark.realtime!==true||benchmark.delay!==0||benchmark.displayRights!=='verified'))reasons.push('BENCHMARK_UNVERIFIED');
 const entry=latest.c,stop=Math.max(support,entry-2*atr);
 const target1=resistance>entry?resistance:entry+2*atr,target2=Math.max(resistance+2*atr,target1+atr);
 const indicativeLevels={support,resistance,volatility:atr,entry,stop,target1,target2};
 const signals={breakout:latest.c>resistance,reversal:latest.c>candles.at(-2).h&&candles.at(-2).c<candles.at(-3).c};
 const setup=trend==='up'&&values.macd?.histogram>0&&values.rsi<75&&entry>values.vwap&&values.relativeVolume>=1&&stop<entry&&entry<target1;
 if(!setup)reasons.push('NO_CONFIRMED_LONG_SETUP');
 let scenario=null,score=null,hypotheticalScenario=null;
 if(candles.length>=35&&!gaps&&atr>0&&stop<entry&&entry<target1&&target1<target2){
  const rr=riskReward({entry,stop,target1,target2},{fees,slippage});
  hypotheticalScenario={kind:signals.breakout?'volatility_extension':'support_resistance',actionable:false,entryZone:[Math.max(stop,entry-atr*.1),entry],stop,target1,target2,...rr,assumptions:['VERIFY_CURRENT_DATA','CONFIRM_VWAP_AND_MOMENTUM','CONFIRM_VOLUME'],invalidations:['CLOSE_BELOW_STOP','LOSS_OF_SESSION_VWAP'],asOf:feed.asOf,sources:[feed.provider],horizonTradingDays:[1,5]};
  if(rr.rr1<1.5)reasons.push('INSUFFICIENT_REWARD_AFTER_COSTS');
  if(!reasons.length){scenario={...hypotheticalScenario,actionable:true,invalidations:[...hypotheticalScenario.invalidations,'STALE_DATA']};score=rr.rr1;}
 }
 return {status:scenario?'scenario':'wait',reasons,scenario,hypotheticalScenario,score,indicators:values,trend,momentum,relativeStrength,comparison,liquidity,volatility,indicativeLevels,signals,asOf:feed.asOf,sourceAsOf:sourceFeed.asOf,droppedFormingBars:feed.droppedFormingBars,lastCandleSession:session,currentMarketStatus:current||{state:'unverified',asOf:null},descriptive:true};
}
export function rankOpportunities(feeds,options={}) {
 return feeds.map(feed=>({symbol:feed.symbol,...analyzeCandles(feed,options)})).filter(x=>x.status==='scenario'&&Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
}
export function compareHistoricalOpportunities(feeds,{benchmark,now=Date.now(),...options}={}) {
 return feeds.map(feed=>({symbol:feed.symbol,...analyzeCandles(feed,{benchmark,now,...options})})).filter(row=>row.indicators&&(!benchmark||row.comparison?.comparable)).map(row=>({...row,comparisonBasis:'historical_descriptive',actionable:false}));
}
