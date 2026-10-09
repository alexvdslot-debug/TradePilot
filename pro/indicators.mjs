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
    if (![x.o,x.h,x.l,x.c,x.v].every(Number.isFinite) || x.l < 0 || x.v < 0 || x.h < Math.max(x.o,x.c,x.l) || x.l > Math.min(x.o,x.c)) throw Error('Invalid OHLCV candle');
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
