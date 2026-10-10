import {entitlementMetadata} from '../../app/market-quality.mjs';
/**
 * B3 identity/settings API. Identity must be verified by Cloudflare Access JWT
 * (RSA SHA-256, pinned audience + issuer, fresh JWK). No trust in client user IDs.
 * API is deliberately unavailable without D1 and Access configuration.
 */
const reply=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const error=(code,status)=>reply({error:{code,message:code,retryable:status>=500}},status);
const allowedCurrencies=new Set(['EUR','USD']);
const tzValid=v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true}catch{return false}};
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const parse=s=>JSON.parse(new TextDecoder().decode(b64(s)));
const certCache=new Map();
async function accessKeys(issuer){
 const cached=certCache.get(issuer);if(cached&&cached.until>Date.now())return cached.keys;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{const res=await fetch(issuer+'/cdn-cgi/access/certs',{signal:controller.signal,headers:{accept:'application/json'}});if(!res.ok)throw Error('CERTS_UNAVAILABLE');const jwks=await res.json();if(!Array.isArray(jwks.keys)||jwks.keys.length>20)throw Error('INVALID_CERTS');if(certCache.size>=8)certCache.delete(certCache.keys().next().value);certCache.set(issuer,{keys:jwks.keys,until:Date.now()+60000});return jwks.keys;}finally{clearTimeout(timer)}
}
async function verifiedIdentity(request,env){
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return null;
 const token=request.headers.get('Cf-Access-Jwt-Assertion')||((request.headers.get('cookie')||'').match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1]);
 if(!token||token.length>16384)return null;
 const parts=token.split('.');if(parts.length!==3)return null;
 let head,payload;try{head=parse(parts[0]);payload=parse(parts[1])}catch{return null}
 const issuer='https://'+env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');
 if(head.alg!=='RS256'||typeof head.kid!=='string'||payload.iss!==issuer||!Array.isArray(payload.aud)||!payload.aud.includes(env.ACCESS_AUD)||typeof payload.sub!=='string'||!payload.sub||!Number.isFinite(payload.exp)||payload.exp<=Date.now()/1000||!Number.isFinite(payload.iat)||payload.iat>Date.now()/1000+60||(payload.nbf!==undefined&&(!Number.isFinite(payload.nbf)||payload.nbf>Date.now()/1000+60)))return null;
 try{
  const keys=await accessKeys(issuer);const jwk=keys.find(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
  if(!jwk)return null;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  return ok?issuer+'|'+payload.sub:null;
 }catch{return null}
}
export const defaultPreferences=Object.freeze({showUSD:true,defaultInterval:'15min',inAppAlerts:true,maxPositionPercent:'25.00',hideAmounts:false,backgroundAlerts:false});
function validPreferences(value){return value&&typeof value==='object'&&!Array.isArray(value)&&[5,6].includes(Object.keys(value).length)&&Object.keys(defaultPreferences).filter(key=>key!=='backgroundAlerts').every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>Object.hasOwn(defaultPreferences,key))&&['showUSD','inAppAlerts','hideAmounts'].every(key=>typeof value[key]==='boolean')&&(!Object.hasOwn(value,'backgroundAlerts')||typeof value.backgroundAlerts==='boolean')&&['5min','15min'].includes(value.defaultInterval)&&typeof value.maxPositionPercent==='string'&&/^(?:0|[1-9]\d?|100)\.\d{2}$/.test(value.maxPositionPercent)&&Number(value.maxPositionPercent)>0&&Number(value.maxPositionPercent)<=100;}
export function backgroundAlertCapability(env,preferences,now=Date.now()){
 const entitlement=entitlementMetadata(env.MARKET_ENTITLEMENT_JSON,now);
 const code=env.BACKGROUND_ALERTS_ENABLED!=='true'?'BACKGROUND_DISABLED':!env.DB||!env.MARKET_QUOTA_DB||typeof env.BACKGROUND_MARKET?.read!=='function'?'SERVICE_NOT_CONFIGURED':entitlement.entitlementVerified!==true||entitlement.realtime!==true||entitlement.delay!==0||entitlement.displayRights!=='verified'?'ENTITLEMENT_UNVERIFIED':preferences.backgroundAlerts!==true?'OPTED_OUT':'READY';
 return {active:code==='READY',code,delivery:'stored_in_app',cadenceMinutes:5};
}

function publicSettings(row,env){if(!row)throw Error('MISSING_SETTINGS');const preferences=row.preferences??(row.preferences_json?JSON.parse(row.preferences_json):{...defaultPreferences});if(!validPreferences(preferences))throw Error('CORRUPT_SETTINGS');return {display_name:row.display_name,locale:row.locale,timezone:row.timezone,display_currency:row.display_currency,risk_budget_eur:row.risk_budget_eur,version:row.version,preferences:{...defaultPreferences,...preferences},...(env?{backgroundAlertsStatus:backgroundAlertCapability(env,{...defaultPreferences,...preferences})}:{})}}
async function settingsApi(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/v1/'))return null;
 if(!['/api/v1/session','/api/v1/settings'].includes(url.pathname))return error('NOT_FOUND',404);
 if(!env.DB||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return error('SERVICE_NOT_CONFIGURED',503);
 const origin=request.headers.get('origin');
 const expected=new URL(request.url).origin;
 if(origin&&origin!==expected)return error('FORBIDDEN_ORIGIN',403);
 if(request.method==='OPTIONS')return error('METHOD_NOT_ALLOWED',405);
 if(!['GET','PATCH'].includes(request.method)||(request.method==='PATCH'&&url.pathname!=='/api/v1/settings'))return error('METHOD_NOT_ALLOWED',405);
 if(request.method==='PATCH'&&(!origin||origin!==expected||request.headers.get('x-tradepilot-csrf')!=='1'))return error('CSRF_REJECTED',403);
 const subject=await verifiedIdentity(request,env);
 if(!subject)return error('UNAUTHENTICATED',401);
 try{
 // Never accept user_id from request; key every query by server-verified subject.
 let user=await env.DB.prepare('SELECT id FROM users WHERE auth_subject = ?').bind(subject).first();
 if(!user){
  const id=crypto.randomUUID();
  await env.DB.prepare('INSERT OR IGNORE INTO users (id,auth_subject) VALUES (?,?)').bind(id,subject).run();
  user=await env.DB.prepare('SELECT id FROM users WHERE auth_subject = ?').bind(subject).first();
 }
 if(!user)return error('DATABASE_ERROR',503);
 await env.DB.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').bind(user.id).run();
 const read=()=>env.DB.prepare('SELECT display_name,locale,timezone,display_currency,risk_budget_eur,version,preferences_json FROM user_settings WHERE user_id=?').bind(user.id).first();
 if(request.method==='GET'){
  const settings=publicSettings(await read(),env);
  return reply({data:url.pathname.endsWith('/session')?{authenticated:true,settings}:settings});
 }
 let data;
 try{if(Number(request.headers.get('content-length')||0)>4096)return error('PAYLOAD_TOO_LARGE',413);const raw=await request.text();if(raw.length>4096)return error('PAYLOAD_TOO_LARGE',413);data=JSON.parse(raw)}catch{return error('INVALID_JSON',400)}
 if(!data||typeof data!=='object'||Array.isArray(data))return error('INVALID_INPUT',400);
 const keys=Object.keys(data);
 if(keys.some(k=>!['display_name','locale','timezone','display_currency','risk_budget_eur','version','preferences'].includes(k)))return error('INVALID_INPUT',400);
 if(!Number.isSafeInteger(data.version)||data.version<1)return error('INVALID_VERSION',400);
 if('display_name'in data&&(typeof data.display_name!=='string'||data.display_name.length>80||/[<>\u0000-\u001f]/.test(data.display_name)))return error('INVALID_NAME',400);
 if('locale'in data&&data.locale!=='nl-NL'&&data.locale!=='en-US')return error('INVALID_LOCALE',400);
 if('timezone'in data&&(typeof data.timezone!=='string'||data.timezone.length>64||!tzValid(data.timezone)))return error('INVALID_TIMEZONE',400);
 if('display_currency'in data&&!allowedCurrencies.has(data.display_currency))return error('INVALID_CURRENCY',400);
 if('risk_budget_eur'in data&&(typeof data.risk_budget_eur!=='string'||! /^(?:0|[1-9]\d{0,7})\.\d{2}$/.test(data.risk_budget_eur)))return error('INVALID_RISK_BUDGET',400);
 if('preferences'in data&&!validPreferences(data.preferences))return error('INVALID_PREFERENCES',400);
 const current=await read();if(!current)return error('DATABASE_ERROR',503);
 const baseline=publicSettings(current);const next={...baseline,...data,preferences:{...baseline.preferences,...data.preferences}};
 const result=await env.DB.prepare('UPDATE user_settings SET display_name=?1,locale=?2,timezone=?3,display_currency=?4,risk_budget_eur=?5,preferences_json=?8,version=version+1,updated_at=datetime(\'now\') WHERE user_id=?6 AND version=?7').bind(next.display_name,next.locale,next.timezone,next.display_currency,next.risk_budget_eur,user.id,data.version,JSON.stringify(next.preferences)).run();
 if(!result.meta?.changes)return error('VERSION_CONFLICT',409);
 return reply({data:publicSettings({...next,version:data.version+1},env)});
 }catch{return error('DATABASE_ERROR',503)}
}
export {settingsApi,verifiedIdentity};
