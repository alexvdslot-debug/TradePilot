import { verifiedIdentity } from './b3-settings.mjs';
const cache = new Map();
const admissions = new Map();
const inflight = new Map();
const reply = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
const fail = (code, status, retry = false) => reply({ error: { code, message: code, retryable: retry } }, status, status === 429 ? { 'retry-after': '60' } : {});
const symbolValid = s => typeof s === 'string' && /^[A-Z][A-Z0-9.-]{0,14}$/.test(s);
const equity = row => ['United States', 'US'].includes(row.country) && row.currency === 'USD' && ['Common Stock', 'ETF', 'American Depositary Receipt', 'Depositary Receipt'].includes(row.instrument_type || row.type);
const number = v => typeof v === 'number' ? v : typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : NaN;
export function normalizeCandles(payload, symbol, interval, now = Date.now()) {
 const m = payload.meta;
 if (!m || m.symbol !== symbol || m.interval !== interval || m.currency !== 'USD' || !['NASDAQ','NYSE','NYSE American','NYSE Arca','AMEX','BATS','CBOE'].includes(m.exchange) || !['Common Stock','ETF','American Depositary Receipt','Depositary Receipt'].includes(m.type) || (m.country && !['United States','US'].includes(m.country)) || !Array.isArray(payload.values) || !payload.values.length || payload.values.length > 200) throw Error('INVALID_PROVIDER_DATA');
 const candles = payload.values.map(x => {
  if (typeof x.datetime !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(x.datetime)) throw Error('INVALID_PROVIDER_DATA');
  const time = x.datetime.replace(' ', 'T') + 'Z';
  if (!Number.isFinite(Date.parse(time)) || new Date(time).toISOString().slice(0,19) !== time.slice(0,19) || Date.parse(time) > now + 60000) throw Error('INVALID_PROVIDER_DATA');
  const [o,h,l,c,v] = ['open','high','low','close','volume'].map(k => number(x[k]));
  if (![o,h,l,c,v].every(Number.isFinite) || Math.min(o,h,l,c) <= 0 || v < 0 || h < Math.max(o,l,c) || l > Math.min(o,c)) throw Error('INVALID_PROVIDER_DATA');
  return { time, o,h,l,c,v };
 });
 // Request ascending order; reject duplicate or shuffled bars instead of concealing feed defects.
 if (candles.some((x,i) => i && Date.parse(x.time) <= Date.parse(candles[i-1].time))) throw Error('INVALID_PROVIDER_DATA');
 const asOf = candles.at(-1).time;
 return { symbol, interval, provider:'Twelve Data', timezone:'UTC', exchange:m.exchange, currency:m.currency, marketSession:'unverified', realtime:'unverified', delay:'unverified', retrievedAt:new Date(now).toISOString(), asOf, stale:now-Date.parse(asOf)>2*parseInt(interval,10)*60000, candles };
}
function admit(key, limit, now) {
 let row = admissions.get(key);
 if (!row || now-row.start >= 60000) { row={start:now,count:0}; admissions.set(key,row); }
 if (row.count >= limit) return false;
 row.count++;
 if (admissions.size > 512) admissions.delete(admissions.keys().next().value);
 return true;
}
async function provider(path, params, env) {
 const url = new URL('https://api.twelvedata.com/'+path);
 for (const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
 url.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000);
 try {
  const res=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'}});
  if(res.status===429) return {error:'PROVIDER_QUOTA',status:429};
  if(!res.ok) return {error:'PROVIDER_UNAVAILABLE',status:502};
  const raw=await res.text(); if(raw.length>250000) return {error:'INVALID_PROVIDER_DATA',status:502};
  const data=JSON.parse(raw);
  if(data.status==='error') return {error:data.code===429?'PROVIDER_QUOTA':'PROVIDER_UNAVAILABLE',status:data.code===429?429:502};
  return {data};
 } catch { return {error:controller.signal.aborted?'PROVIDER_TIMEOUT':'PROVIDER_UNAVAILABLE',status:controller.signal.aborted?504:502}; }
 finally {clearTimeout(timer);}
}
export async function marketApi(request,env) {
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/v1/market/'))return null;
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return fail('SERVICE_NOT_CONFIGURED',503);
 if(request.method!=='GET')return fail('METHOD_NOT_ALLOWED',405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return fail('FORBIDDEN_ORIGIN',403);
 const identity=await verifiedIdentity(request,env); if(!identity)return fail('UNAUTHENTICATED',401);
 if(!env.TWELVE_DATA_API_KEY)return fail('MARKET_NOT_CONFIGURED',503);
 const search=url.pathname==='/api/v1/market/search';
 if(!search&&url.pathname!=='/api/v1/market/candles')return fail('NOT_FOUND',404);
 const symbol=(url.searchParams.get('symbol')||'').toUpperCase();
 const interval=url.searchParams.get('interval')||'5min';
 const q=(url.searchParams.get('q')||'').trim();
 if(search ? !/^[a-zA-Z0-9 .-]{1,40}$/.test(q) : !symbolValid(symbol)||!['5min','15min'].includes(interval))return fail('INVALID_INPUT',400);
 const now=Date.now();
 if(!admit('user:'+identity,30,now))return fail('RATE_LIMITED',429,true);
 const key=search?'search:'+q.toUpperCase():symbol+':'+interval;
 const cached=cache.get(key);
 if(cached&&cached.expires>now) {
  const data=search?cached.data:{...cached.data,stale:now-Date.parse(cached.data.asOf)>2*parseInt(interval,10)*60000};
  return reply({data});
 }
 if(inflight.has(key))return inflight.get(key).then(result=>reply(result.body,result.status,result.status===429?{'retry-after':'60'}:{}));
 // Isolate-local protection only; deploy a distributed quota binding before scaling.
 if(!admit('provider',8,now))return fail('RATE_LIMITED',429,true);
 const job=(async()=>{
  const result=await provider(search?'symbol_search':'time_series',search?{symbol:q}:{symbol,interval,timezone:'UTC',country:'United States',outputsize:'200',order:'asc'},env);
  if(result.error)return {body:{error:{code:result.error,message:result.error,retryable:true}},status:result.status};
  let data;
  try {
   if(search) {
    if(!Array.isArray(result.data.data))throw Error('INVALID_PROVIDER_DATA');
    data=result.data.data.filter(x=>equity(x)&&symbolValid(x.symbol)&&typeof x.instrument_name==='string'&&typeof x.exchange==='string').slice(0,20).map(x=>({symbol:x.symbol,name:x.instrument_name.slice(0,160),exchange:x.exchange,currency:x.currency}));
   } else data=normalizeCandles(result.data,symbol,interval);
  } catch {return {body:{error:{code:'INVALID_PROVIDER_DATA',message:'INVALID_PROVIDER_DATA',retryable:true}},status:502};}
  cache.set(key,{data,expires:Date.now()+(search?300000:30000)});
  if(cache.size>128)cache.delete(cache.keys().next().value);
  return {body:{data},status:200};
 })();
 inflight.set(key,job);
 try {const result=await job;return reply(result.body,result.status,result.status===429?{'retry-after':'60'}:{});}finally{inflight.delete(key);}
}
