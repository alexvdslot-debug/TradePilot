import {verifiedIdentity} from './b3-settings.mjs';
import {calculateLedger,validateEvent} from '../../app/ledger.mjs';

const MAX_BYTES=200000;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(code,status)=>reply({error:{code,message:code,retryable:status>=500}},status);
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const text=(value,max)=>typeof value==='string'&&value.length<=max&&!/[<>\u0000-\u0008\u000b-\u001f\u007f]/.test(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
const symbol=value=>typeof value==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(value);
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value.replace(/Z$/,value.includes('.')?'Z':'.000Z');
const price=value=>typeof value==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value)&&/[1-9]/.test(value);
const unique=values=>new Set(values).size===values.length;
const defaults=()=>({version:1,events:[],watchlist:[],journal:[],alerts:[],preferences:{allowMargin:false,costMethod:'average'}});

function validateState(data){
 if(!exact(data,['version','events','watchlist','journal','alerts','preferences']))throw Error('INVALID_STATE');
 if(!Number.isSafeInteger(data.version)||data.version<1||data.version>=Number.MAX_SAFE_INTEGER)throw Error('INVALID_VERSION');
 if(!exact(data.preferences,['allowMargin','costMethod'])||typeof data.preferences.allowMargin!=='boolean'||data.preferences.costMethod!=='average')throw Error('INVALID_PREFERENCES');
 if(!Array.isArray(data.watchlist)||data.watchlist.length>50||!data.watchlist.every(symbol)||!unique(data.watchlist))throw Error('INVALID_WATCHLIST');
 if(!Array.isArray(data.journal)||data.journal.length>500||!unique(data.journal.map(row=>row?.id)))throw Error('INVALID_JOURNAL');
 for(const row of data.journal){
  if(!exact(row,['id','symbol','createdAt','thesis','entry','stop','target1','target2','status','evaluation'])||!id(row.id)||!symbol(row.symbol)||!iso(row.createdAt)||!text(row.thesis,4000)||!text(row.evaluation,4000)||!['planned','executed','reviewed'].includes(row.status)||!['entry','stop','target1','target2'].every(key=>price(row[key])))throw Error('INVALID_JOURNAL');
 }
 if(!Array.isArray(data.alerts)||data.alerts.length>50||!unique(data.alerts.map(row=>row?.id)))throw Error('INVALID_ALERTS');
 for(const row of data.alerts){
  if(!exact(row,['id','symbol','direction','price','enabled','triggeredAt'])||!id(row.id)||!symbol(row.symbol)||!['above','below'].includes(row.direction)||!price(row.price)||typeof row.enabled!=='boolean'||!(row.triggeredAt===null||iso(row.triggeredAt)))throw Error('INVALID_ALERTS');
 }
 if(!Array.isArray(data.events)||data.events.length>2000)throw Error('INVALID_LEDGER');
 try{
  for(const event of data.events){
   if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).some(key=>!['id','timestamp','type','currency','fee','feeCurrency','symbol','quantity','price','amount','toCurrency','toAmount','reference'].includes(key))||(event.reference!==undefined&&!text(event.reference,500)))throw Error('INVALID_LEDGER');
   validateEvent(event);
  }
  calculateLedger(data.events,{allowMargin:data.preferences.allowMargin,method:data.preferences.costMethod});
 }catch{throw Error('INVALID_LEDGER')}
 return data;
}

async function body(request){
 if(Number(request.headers.get('content-length')||0)>MAX_BYTES)throw Error('PAYLOAD_TOO_LARGE');
 const reader=request.body?.getReader();if(!reader)throw Error('INVALID_JSON');
 const chunks=[];let size=0;
 try{
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw Error('PAYLOAD_TOO_LARGE')}chunks.push(chunk.value)}
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw Error('INVALID_JSON')}
}

async function privateStateApi(request,env){
 const url=new URL(request.url);if(url.pathname!=='/api/v1/state')return null;
 if(!env.DB||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return error('SERVICE_NOT_CONFIGURED',503);
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return error('FORBIDDEN_ORIGIN',403);
 if(!['GET','PUT'].includes(request.method))return error('METHOD_NOT_ALLOWED',405);
 if(request.method==='PUT'&&(origin!==url.origin||request.headers.get('x-tradepilot-csrf')!=='1'))return error('CSRF_REJECTED',403);
 if(request.method==='PUT'&&!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return error('INVALID_CONTENT_TYPE',415);
 const subject=await verifiedIdentity(request,env);if(!subject)return error('UNAUTHENTICATED',401);
 let next;
 if(request.method==='PUT'){
  try{next=validateState(await body(request))}catch(cause){return error(cause.message==='PAYLOAD_TOO_LARGE'?'PAYLOAD_TOO_LARGE':cause.message==='INVALID_JSON'?'INVALID_JSON':cause.message.startsWith('INVALID_')?cause.message:'INVALID_STATE',cause.message==='PAYLOAD_TOO_LARGE'?413:400)}
 }
 try{
  let user=await env.DB.prepare('SELECT id FROM users WHERE auth_subject = ?').bind(subject).first();
  if(!user){await env.DB.prepare('INSERT OR IGNORE INTO users (id,auth_subject) VALUES (?,?)').bind(crypto.randomUUID(),subject).run();user=await env.DB.prepare('SELECT id FROM users WHERE auth_subject = ?').bind(subject).first()}
  if(!user)return error('DATABASE_ERROR',503);
  await env.DB.prepare('INSERT OR IGNORE INTO user_state (user_id,state_json) VALUES (?,?)').bind(user.id,JSON.stringify(defaults())).run();
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT state_json,version FROM user_state WHERE user_id=?').bind(user.id).first();
   if(!row)return error('DATABASE_ERROR',503);
   const data=validateState({...JSON.parse(row.state_json),version:row.version});return reply({data});
  }
  const saved={...next,version:next.version+1};
  const result=await env.DB.prepare("UPDATE user_state SET state_json=?,version=version+1,updated_at=datetime('now') WHERE user_id=? AND version=?").bind(JSON.stringify(saved),user.id,next.version).run();
  if(!result.meta?.changes)return error('VERSION_CONFLICT',409);
  return reply({data:saved});
 }catch{return error('DATABASE_ERROR',503)}
}
export {privateStateApi,validateState};
