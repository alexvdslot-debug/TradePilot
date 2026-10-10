import { verifiedIdentity } from './b3-settings.mjs';
import {consumeProviderQuota} from './provider-quota.mjs';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(status===429?{'retry-after':'60'}:{})}});
const fail=(code,status)=>reply({error:{code,message:code,retryable:status>=500||status===429}},status);
const allowedPaths=new Set(['/_tradepilot/symbol_search','/_tradepilot/time_series','/_tradepilot/market_state','/_tradepilot/fx']);
const limits=new Map();
function admit(identity){const now=Date.now();let row=limits.get(identity);if(!row||now-row.start>=60000){row={start:now,count:0};limits.set(identity,row);}if(row.count>=8)return false;row.count++;if(limits.size>128)limits.delete(limits.keys().next().value);return true;}
// Count bytes while streaming instead of allocating an unbounded response first.
async function boundedJson(response){
 const reader=response.body?.getReader();if(!reader)throw Error('INVALID_PROVIDER_DATA');
 const chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>250000)throw Error('INVALID_PROVIDER_DATA');chunks.push(value);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));
export async function providerAdapter(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/_tradepilot/'))return null;
 if(!allowedPaths.has(url.pathname))return fail('NOT_FOUND',404);
 if(request.method!=='GET')return fail('METHOD_NOT_ALLOWED',405);
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return fail('SERVICE_NOT_CONFIGURED',503);
 const identity=await verifiedIdentity(request,env);if(!identity)return fail('UNAUTHENTICATED',401);
 if(!env.TWELVE_DATA_API_KEY)return fail('MARKET_NOT_CONFIGURED',503);
 const search=url.pathname.endsWith('/symbol_search');
 const status=url.pathname.endsWith('/market_state');
 const fx=url.pathname.endsWith('/fx');
 const allowed=fx?[]:status?['exchange']:search?['symbol']:['symbol','interval'];
 if([...url.searchParams.keys()].some(key=>!allowed.includes(key)||url.searchParams.getAll(key).length!==1))return fail('INVALID_INPUT',400);
 const exchange=url.searchParams.get('exchange');
 const symbol=url.searchParams.get('symbol');const interval=url.searchParams.get('interval');
 if(!fx&&(status?!['NASDAQ','NYSE','NYSE American','NYSE Arca','AMEX','BATS','CBOE'].includes(exchange):search?!/^[a-zA-Z0-9 .-]{1,40}$/.test(symbol||''):!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol||'')||!['5min','15min'].includes(interval)))return fail('INVALID_INPUT',400);
 if(!admit(identity))return fail('RATE_LIMITED',429);
 const upstream=new URL('https://api.twelvedata.com/'+(fx?'time_series':status?'market_state':search?'symbol_search':'time_series'));
 if(fx){for(const [key,value] of Object.entries({symbol:'USD/EUR',interval:'15min',timezone:'UTC',outputsize:'2',order:'asc'}))upstream.searchParams.set(key,value);}
 else if(status){upstream.searchParams.set('exchange',exchange);upstream.searchParams.set('country','United States');}else upstream.searchParams.set('symbol',symbol);
 if(!search&&!status&&!fx)for(const [key,value] of Object.entries({interval,timezone:'UTC',country:'United States',outputsize:'200',order:'asc'}))upstream.searchParams.set(key,value);
 upstream.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
 const quota=await consumeProviderQuota(env);if(!quota.allowed)return fail(quota.code,quota.status);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(upstream,{signal:controller.signal,headers:{accept:'application/json'}});
  if(response.status===429)return fail('PROVIDER_QUOTA',429);
  if(!response.ok)return fail('PROVIDER_UNAVAILABLE',502);
  const data=await boundedJson(response);
  if(data.status==='error')return fail(data.code===429?'PROVIDER_QUOTA':'PROVIDER_UNAVAILABLE',data.code===429?429:502);
  // Never relay provider messages, diagnostics or extra fields containing secrets.
  if(status){
   if(!Array.isArray(data))return fail('INVALID_PROVIDER_DATA',502);
   return reply(data.slice(0,50).filter(x=>x&&typeof x==='object').map(x=>pick(x,['name','code','country','is_market_open','time_after_open','time_to_open','time_to_close'])));
  }
  if(search){
   if(!Array.isArray(data.data))return fail('INVALID_PROVIDER_DATA',502);
   return reply({data:data.data.slice(0,100).filter(x=>x&&typeof x==='object').map(x=>pick(x,['symbol','instrument_name','exchange','currency','instrument_type','country']))});
  }
  if(!data.meta||!Array.isArray(data.values)||data.values.length>200)return fail('INVALID_PROVIDER_DATA',502);
  return reply({meta:pick(data.meta,['symbol','interval','currency','exchange_timezone','exchange','mic_code','type','country','currency_base','currency_quote']),values:data.values.map(x=>pick(x,['datetime','open','high','low','close','volume']))});
 }catch{return fail(controller.signal.aborted?'PROVIDER_TIMEOUT':'INVALID_PROVIDER_DATA',controller.signal.aborted?504:502);}
 finally{clearTimeout(timer);}
}
