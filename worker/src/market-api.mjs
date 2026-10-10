import { classifyCandleSession, entitlementMetadata } from '../../app/market-quality.mjs';
import { verifiedIdentity } from './b3-settings.mjs';
import {consumeProviderQuota} from './provider-quota.mjs';
const cache = new Map();
const admissions = new Map();
const inflight = new Map();
const reply = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
const fail = (code, status, retry = false) => reply({ error: { code, message: code, retryable: retry } }, status, status === 429 ? { 'retry-after': '60' } : {});
const symbolValid = s => typeof s === 'string' && /^[A-Z][A-Z0-9.-]{0,14}$/.test(s);
const equity = row => ['United States', 'US'].includes(row.country) && row.currency === 'USD' && ['Common Stock', 'ETF', 'American Depositary Receipt', 'Depositary Receipt'].includes(row.instrument_type || row.type);
const number = v => typeof v === 'number' ? v : typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : NaN;
export function normalizeCandles(payload, symbol, interval, now = Date.now(), entitlement) {
 const m = payload.meta;
 if (!m || m.symbol !== symbol || m.interval !== interval || m.currency !== 'USD' || !['NASDAQ','NYSE','NYSE American','NYSE Arca','AMEX','BATS','CBOE'].includes(m.exchange) || !['Common Stock','ETF','American Depositary Receipt','Depositary Receipt'].includes(m.type) || (m.country && !['United States','US'].includes(m.country)) || !Array.isArray(payload.values) || !payload.values.length || payload.values.length > 200) throw Error('INVALID_PROVIDER_DATA');
 const candles = payload.values.map(x => {
  if (typeof x.datetime !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(x.datetime)) throw Error('INVALID_PROVIDER_DATA');
  const time = x.datetime.replace(' ', 'T') + 'Z';
  if (!Number.isFinite(Date.parse(time)) || new Date(time).toISOString().slice(0,19) !== time.slice(0,19) || Date.parse(time) > now + 60000) throw Error('INVALID_PROVIDER_DATA');
  const [o,h,l,c,v] = ['open','high','low','close','volume'].map(k => number(x[k]));
  if (![o,h,l,c,v].every(Number.isFinite) || Math.min(o,h,l,c) <= 0 || v < 0 || h < Math.max(o,l,c) || l > Math.min(o,c)) throw Error('INVALID_PROVIDER_DATA');
  const completedAt=new Date(Date.parse(time)+parseInt(interval,10)*60000).toISOString();
  return { time, o,h,l,c,v,completedAt,complete:Date.parse(completedAt)<=now };
 });
 // Request ascending order; reject duplicate or shuffled bars instead of concealing feed defects.
 if (candles.some((x,i) => i && Date.parse(x.time) <= Date.parse(candles[i-1].time))) throw Error('INVALID_PROVIDER_DATA');
 const asOf = candles.at(-1).time;
 return { symbol, interval, verified:true, verificationBasis:'provider_schema_validation', provider:'Twelve Data', timezone:'UTC', exchange:m.exchange, currency:m.currency, marketSession:'unverified', lastCandleSession:classifyCandleSession(asOf,{exchange:m.exchange,exchangeTimezone:m.exchange_timezone||'America/New_York'}), exchangeTimezone:m.exchange_timezone||'America/New_York', currentMarketStatus:{state:'unverified',asOf:null}, ...entitlementMetadata(entitlement,now), retrievedAt:new Date(now).toISOString(), asOf, stale:now-Date.parse(asOf)>2*parseInt(interval,10)*60000, candles };
}
export function normalizeForex(payload,now=Date.now()) {
 const meta=payload?.meta;
 const quote=meta?.currency||meta?.currency_quote;
 if(!meta||meta.symbol!=='USD/EUR'||meta.interval!=='15min'||meta.type!=='Physical Currency'||!['EUR','Euro'].includes(quote)||(meta.currency_base&&!['USD','US Dollar'].includes(meta.currency_base))||!Array.isArray(payload.values)||!payload.values.length||payload.values.length>2)throw Error('INVALID_PROVIDER_DATA');
 let previous=-Infinity;
 const values=payload.values.map(row=>{
  if(typeof row.datetime!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.datetime))throw Error('INVALID_PROVIDER_DATA');
  const time=row.datetime.replace(' ','T')+'Z',timestamp=Date.parse(time);
  if(!Number.isFinite(timestamp)||timestamp<=previous||new Date(timestamp).toISOString().slice(0,19)!==time.slice(0,19)||timestamp>now+60000)throw Error('INVALID_PROVIDER_DATA');
  previous=timestamp;
  const [o,h,l,c]=['open','high','low','close'].map(key=>number(row[key]));
  if(![o,h,l,c].every(Number.isFinite)||Math.min(o,h,l,c)<=0||h<Math.max(o,l,c)||l>Math.min(o,c))throw Error('INVALID_PROVIDER_DATA');
  return {time,completedAt:new Date(timestamp+900000).toISOString(),rate:String(row.close)};
 });
 const latest=values.filter(row=>Date.parse(row.completedAt)<=now).at(-1);
 if(!latest)throw Error('NO_COMPLETED_FOREX_BAR');
 return {symbol:'USD/EUR',currency:'EUR',baseCurrency:'USD',rate:latest.rate,price:latest.rate,source:'Twelve Data',provider:'Twelve Data',asOf:latest.completedAt,barOpenedAt:latest.time,retrievedAt:new Date(now).toISOString(),interval:'15min',timezone:'UTC',delay:'unverified',realtime:'unverified',verified:false,schemaVerified:true,indicative:true,stale:now-Date.parse(latest.completedAt)>1800000,marketSession:'unverified'};
}
function admit(key, limit, now) {
 let row = admissions.get(key);
 if (!row || now-row.start >= 60000) { row={start:now,count:0}; admissions.set(key,row); }
 if (row.count >= limit) return false;
 row.count++;
 if (admissions.size > 512) admissions.delete(admissions.keys().next().value);
 return true;
}
async function provider(path, params, env, request) {
 const binding=env.MARKET_PROVIDER&&typeof env.MARKET_PROVIDER.fetch==='function';
 const url = new URL(binding?'https://provider.internal/_tradepilot/'+path:'https://api.twelvedata.com/'+(path==='fx'?'time_series':path));
 for (const [key,value] of Object.entries(params)) if(!binding||(path!=='fx'&&['symbol','interval','exchange'].includes(key)))url.searchParams.set(key,value);
 if(!binding)url.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
 const headers=new Headers({accept:'application/json'});
 if(binding){
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  const cookie=(request.headers.get('cookie')||'').match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
  if(assertion)headers.set('Cf-Access-Jwt-Assertion',assertion);
  else if(cookie)headers.set('cookie','CF_Authorization='+cookie);
 }
 if(!binding){const quota=await consumeProviderQuota(env);if(!quota.allowed)return {error:quota.code,status:quota.status};}
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),7000);
 try {
  const downstream=new Request(url,{signal:controller.signal,headers});
  const res=binding?await env.MARKET_PROVIDER.fetch(downstream):await fetch(downstream);
  if(binding&&res.status===503)return {error:'MARKET_NOT_CONFIGURED',status:503};
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
 if(!env.TWELVE_DATA_API_KEY&&typeof env.MARKET_PROVIDER?.fetch!=='function')return fail('MARKET_NOT_CONFIGURED',503);
 const search=url.pathname==='/api/v1/market/search';
 const status=url.pathname==='/api/v1/market/status';
 const fx=url.pathname==='/api/v1/market/fx';
 const exchange=url.searchParams.get('exchange')||'NASDAQ';
 if(!search&&!status&&!fx&&url.pathname!=='/api/v1/market/candles')return fail('NOT_FOUND',404);
 const symbol=(url.searchParams.get('symbol')||'').toUpperCase();
 const interval=url.searchParams.get('interval')||'5min';
 const q=(url.searchParams.get('q')||'').trim();
 if(fx?url.searchParams.size!==0:status?!['NASDAQ','NYSE','NYSE American','NYSE Arca','AMEX','BATS','CBOE'].includes(exchange):search ? !/^[a-zA-Z0-9 .-]{1,40}$/.test(q) : !symbolValid(symbol)||!['5min','15min'].includes(interval))return fail('INVALID_INPUT',400);
 const now=Date.now();
 if(!admit('user:'+identity,30,now))return fail('RATE_LIMITED',429,true);
 const key=fx?'fx:USD/EUR':status?'status:'+exchange:search?'search:'+q.toUpperCase():symbol+':'+interval;
 const cached=cache.get(key);
 if(cached&&cached.expires>now) {
  const data=fx?{...cached.data,stale:now-Date.parse(cached.data.asOf)>1800000}:search||status?cached.data:{...cached.data,...entitlementMetadata(env.MARKET_ENTITLEMENT_JSON,now),candles:cached.data.candles.map(c=>({...c,complete:Date.parse(c.completedAt)<=now})),stale:now-Date.parse(cached.data.asOf)>2*parseInt(interval,10)*60000};
  return reply({data});
 }
 if(inflight.has(key))return inflight.get(key).then(result=>reply(result.body,result.status,result.status===429?{'retry-after':'60'}:{}));
 // Bound calls are counted by their adapter; direct calls use the same shared quota module.
 if(env.MARKET_QUOTA_DB===undefined&&!admit('provider',8,now))return fail('RATE_LIMITED',429,true);
 const job=(async()=>{
  const result=await provider(fx?'fx':status?'market_state':search?'symbol_search':'time_series',fx?{symbol:'USD/EUR',interval:'15min',timezone:'UTC',outputsize:'2',order:'asc'}:status?{exchange,country:'United States'}:search?{symbol:q}:{symbol,interval,timezone:'UTC',country:'United States',outputsize:'200',order:'asc'},env,request);
  if(result.error)return {body:{error:{code:result.error,message:result.error,retryable:true}},status:result.status};
  let data;
  try {
   if(fx)data=normalizeForex(result.data);
   else if(status){
    const rows=result.data;
    const row=Array.isArray(rows)?rows.find(x=>['United States','US'].includes(x.country)&&x.name===exchange):null;
    if(!row||typeof row.is_market_open!=='boolean')throw Error('INVALID_PROVIDER_DATA');
    data={exchange,provider:'Twelve Data',state:row.is_market_open?'open':'closed',asOf:new Date().toISOString(),basis:'provider_market_state',scope:'current_exchange_status',stale:false};
   }else if(search) {
    if(!Array.isArray(result.data.data))throw Error('INVALID_PROVIDER_DATA');
    data=result.data.data.filter(x=>equity(x)&&symbolValid(x.symbol)&&typeof x.instrument_name==='string'&&typeof x.exchange==='string').slice(0,20).map(x=>({symbol:x.symbol,name:x.instrument_name.slice(0,160),exchange:x.exchange,currency:x.currency}));
   } else data=normalizeCandles(result.data,symbol,interval,Date.now(),env.MARKET_ENTITLEMENT_JSON);
  } catch {return {body:{error:{code:'INVALID_PROVIDER_DATA',message:'INVALID_PROVIDER_DATA',retryable:true}},status:502};}
  cache.set(key,{data,expires:Date.now()+(fx?60000:status?60000:search?300000:30000)});
  if(cache.size>128)cache.delete(cache.keys().next().value);
  return {body:{data},status:200};
 })();
 inflight.set(key,job);
 try {const result=await job;return reply(result.body,result.status,result.status===429?{'retry-after':'60'}:{});}finally{inflight.delete(key);}
}
