import {runBackgroundAlerts} from './background-alerts.mjs';
import {privateStateApi} from './private-state.mjs';
import {marketApi} from './market-api.mjs';
import {settingsApi} from './b3-settings.mjs';
import {siteAssets,assetRevision} from './site-assets.mjs';
/**
 * TradePilot Pro market-data edge. Deploy as Cloudflare Worker.
 * Set TWELVE_DATA_API_KEY as a Worker secret and ALLOWED_ORIGIN as a variable.
 * Do not expose this endpoint publicly without authentication and rate limiting.
 */
const SYMBOL=/^[A-Z][A-Z0-9.]{0,9}$/;
const INTERVALS=new Set(['5min','15min']);
function response(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}})}
export default {async scheduled(controller,env){const result=await runBackgroundAlerts(env);if(result.status==='error')throw Error(result.code);},async fetch(request,env){
  const apiPath=new URL(request.url).pathname;
  if(apiPath==='/app'||/^\/app\/(dashboard|portfolio|radar|analyzer|journal|settings|alerts)\/$/.test(apiPath)){const target=apiPath==='/app'?'/app/':apiPath.slice(0,-1);return Response.redirect(new URL(target,request.url),302);}
  if(apiPath==='/'&&request.method==='GET')return Response.redirect(new URL('/app/',request.url),302);
  if(apiPath==='/app'||apiPath==='/app/'||apiPath.startsWith('/app/')){
    if(request.method!=='GET'&&request.method!=='HEAD')return response({error:'Method not allowed'},405);
    const routed=['dashboard','portfolio','radar','analyzer','journal','settings','alerts'].includes(apiPath.slice(5));
    const assetPath=routed?'/app/index.html':apiPath==='/app'||apiPath==='/app/'?'/app/index.html':apiPath;
    if(!Object.prototype.hasOwnProperty.call(siteAssets,assetPath))return response({error:'Not found'},404);
    const mime=assetPath.endsWith('.html')?'text/html; charset=utf-8':(/\.m?js$/.test(assetPath))?'text/javascript; charset=utf-8':assetPath.endsWith('.css')?'text/css; charset=utf-8':'image/svg+xml';
    return new Response(request.method==='HEAD'?null:siteAssets[assetPath],{status:200,headers:{'x-tradepilot-revision':assetRevision,'content-type':mime,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"}});
  }
  if(apiPath.startsWith('/api/v1/')){
    const origin=request.headers.get('origin');
    const trusted=Boolean(origin&&env.ALLOWED_ORIGIN&&origin===env.ALLOWED_ORIGIN);
    if(request.method==='OPTIONS'){
      if(!trusted)return new Response(null,{status:403});
      return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-methods':'GET, PATCH, OPTIONS','access-control-allow-headers':'Content-Type, X-TradePilot-CSRF','access-control-max-age':'600','vary':'Origin'}});
    }
    let accountResponse;try{accountResponse=await privateStateApi(request,env)||await marketApi(request,env)||await settingsApi(request,env);}catch{return response({error:{code:'SERVICE_UNAVAILABLE',message:'Service unavailable',retryable:true}},503);}
    if(accountResponse){
      if(trusted){accountResponse.headers.set('access-control-allow-origin',origin);accountResponse.headers.set('access-control-allow-credentials','true');accountResponse.headers.set('vary','Origin')}
      return accountResponse;
    }
  }
  const url=new URL(request.url);
  const origin=request.headers.get('origin');
  const allowed=env.ALLOWED_ORIGIN;
  const cors=origin&&allowed&&origin===allowed?{'access-control-allow-origin':allowed,'vary':'Origin'}:{};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Authorization'}});
  if(request.method!=='GET')return response({error:'Method not allowed'},405,cors);
  if(url.pathname==='/health')return response({status:'ok',marketData:'requires authenticated request'},200,cors);
  if(url.pathname!=='/api/candles')return response({error:'Not found'},404,cors);
  // Fail closed until the deployment configures a dedicated client token.
  if(!env.CLIENT_ACCESS_TOKEN || request.headers.get('authorization')!==`Bearer ${env.CLIENT_ACCESS_TOKEN}`)return response({error:'Unauthorized'},401,cors);
  if(!env.TWELVE_DATA_API_KEY)return response({error:'Market provider not configured'},503,cors);
  const symbol=(url.searchParams.get('symbol')||'').toUpperCase();
  const interval=url.searchParams.get('interval')||'5min';
  if(!SYMBOL.test(symbol)||!INTERVALS.has(interval))return response({error:'Invalid symbol or interval'},400,cors);
  const upstream=new URL('https://api.twelvedata.com/time_series');
  upstream.searchParams.set('symbol',symbol);
  upstream.searchParams.set('interval',interval);
  upstream.searchParams.set('outputsize','100');
  upstream.searchParams.set('timezone','America/New_York');
  upstream.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
    let res;
    try{res=await fetch(upstream,{signal:controller.signal,headers:{accept:'application/json'}})}finally{clearTimeout(timer)}
    if(!res.ok)return response({error:'Market provider unavailable',providerStatus:res.status},502,cors);
    const data=await res.json();
    if(data.status==='error'||!Array.isArray(data.values))return response({error:'Market provider returned no usable candles'},502,cors);
    const values=data.values.map(x=>({time:x.datetime,o:Number(x.open),h:Number(x.high),l:Number(x.low),c:Number(x.close),v:Number(x.volume)}));
    if(values.some(x=>![x.o,x.h,x.l,x.c,x.v].every(Number.isFinite)))return response({error:'Malformed provider candles'},502,cors);
    return response({symbol,interval,provider:'Twelve Data',timezone:data.meta?.timezone||'America/New_York',exchange:data.meta?.exchange||null,marketSession:'unverified',realtime:'unverified',retrievedAt:new Date().toISOString(),candles:values},200,cors);
  }catch{return response({error:'Market data request failed'},502,cors)}
}};
