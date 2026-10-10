import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,webcrypto} from 'node:crypto';
import {privateStateApi} from './src/private-state.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'state-test',alg:'RS256'};
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(sub){const head=encoded({alg:'RS256',kid:jwk.kid}),payload=encoded({iss:'https://team.cloudflareaccess.com',aud:['state-aud'],sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});const signer=createSign('RSA-SHA256');signer.update(head+'.'+payload);signer.end();return head+'.'+payload+'.'+signer.sign(privateKey).toString('base64url')}
const initial=()=>({version:1,events:[],watchlist:[],journal:[],alerts:[],preferences:{allowMargin:false,costMethod:'average'}});
function db(){
 const users=new Map(),states=new Map();
 return {users,states,prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){
  if(sql.startsWith('SELECT id FROM users'))return users.get(args[0])||null;
  if(sql.startsWith('SELECT state_json'))return states.get(args[0])||null;
  throw Error('unexpected query');
 },async run(){
  if(sql.startsWith('INSERT OR IGNORE INTO users')){if(!users.has(args[1]))users.set(args[1],{id:args[0]});return {meta:{changes:1}}}
  if(sql.startsWith('INSERT OR IGNORE INTO user_state')){if(!states.has(args[0]))states.set(args[0],{state_json:args[1],version:1});return {meta:{changes:1}}}
  if(sql.startsWith('UPDATE user_state')){const row=states.get(args[1]);if(!row||row.version!==args[2])return {meta:{changes:0}};states.set(args[1],{state_json:args[0],version:row.version+1});return {meta:{changes:1}}}
  throw Error('unexpected mutation');
 }}}};
}
const environment=()=>({DB:db(),ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'state-aud'});
function request(sub='A',data,headers={},method=data?'PUT':'GET'){
 return new Request('https://api.test/api/v1/state',{method,headers:{...(sub?{'Cf-Access-Jwt-Assertion':token(sub)}:{}),...(data?{origin:'https://api.test','content-type':'application/json','x-tradepilot-csrf':'1'}:{}),...headers},body:data===undefined?undefined:typeof data==='string'?data:JSON.stringify(data)});
}
const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}))});
test.after(()=>{globalThis.fetch=originalFetch});
test('defaults persist and updates survive reload without affecting another identity',async()=>{
 const env=environment();assert.deepEqual((await (await privateStateApi(request(),env)).json()).data,initial());
 const next={...initial(),watchlist:['OPEN','AAPL'],events:[{id:'deposit-1',type:'DEPOSIT',timestamp:'2026-10-01T12:00:00Z',currency:'USD',amount:'1000'}],journal:[{id:'plan-1',symbol:'OPEN',createdAt:'2026-10-01T12:00:00Z',thesis:'Review volume',entry:'4',stop:'3',target1:'5',target2:'6',status:'planned',evaluation:''}],alerts:[{id:'alert-1',symbol:'OPEN',direction:'above',price:'5',enabled:true,triggeredAt:null}]};
 const saved=await privateStateApi(request('A',next),env);assert.equal(saved.status,200);assert.equal((await saved.json()).data.version,2);
 assert.deepEqual((await (await privateStateApi(request(),env)).json()).data,{...next,version:2});
 assert.deepEqual((await (await privateStateApi(request('B'),env)).json()).data,initial());
});
test('atomic optimistic concurrency rejects stale or competing snapshots',async()=>{
 const env=environment();await privateStateApi(request(),env);
 const responses=await Promise.all([privateStateApi(request('A',{...initial(),watchlist:['OPEN']}),env),privateStateApi(request('A',{...initial(),watchlist:['AAPL']}),env)]);
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
 assert.equal((await privateStateApi(request('A',initial()),env)).status,409);
});
test('authentication, configuration, origin and CSRF fail closed',async()=>{
 const env=environment();assert.equal((await privateStateApi(request(null),env)).status,401);
 assert.equal((await privateStateApi(request(),{...env,ACCESS_AUD:''})).status,503);
 assert.equal((await privateStateApi(request('A',initial(),{origin:'https://evil.test'}),env)).status,403);
 assert.equal((await privateStateApi(request('A',initial(),{'x-tradepilot-csrf':'0'}),env)).status,403);
 assert.equal((await privateStateApi(request('A',initial(),{origin:''}),env)).status,403);
 const jwt=token('A').split('.');jwt[1]=encoded({sub:'B'});
 assert.equal((await privateStateApi(request('A',undefined,{'Cf-Access-Jwt-Assertion':jwt.join('.')}),env)).status,401);
 assert.equal(env.DB.states.size,0);
});
test('exact schemas reject client ownership, XSS, invalid prices and duplicate identifiers',async()=>{
 const env=environment();const cases=[{...initial(),user_id:'B'},{...initial(),watchlist:['OPEN','OPEN']},{...initial(),preferences:{allowMargin:false,costMethod:'FIFO'}},{...initial(),alerts:[{id:'a',symbol:'OPEN',direction:'above',price:'1e3',enabled:true,triggeredAt:null}]},{...initial(),journal:[{id:'j',symbol:'OPEN',createdAt:'2026-10-01T12:00:00Z',thesis:'<script>',entry:'1',stop:'1',target1:'2',target2:'3',status:'planned',evaluation:''}]}];
 for(const data of cases)assert.equal((await privateStateApi(request('A',data),env)).status,400);
 assert.equal(env.DB.states.size,0);
});
test('invalid ledger, duplicate events, overselling and unapproved margin are rejected',async()=>{
 const env=environment();const deposit={id:'d',type:'DEPOSIT',timestamp:'2026-10-01T12:00:00Z',currency:'USD',amount:'100'};
 const buy={id:'b',type:'BUY',timestamp:'2026-10-01T12:01:00Z',currency:'USD',symbol:'OPEN',quantity:'1',price:'200'};
 for(const events of [[{...deposit,amount:'NaN'}],[deposit,deposit],[buy],[{...buy,type:'SELL'}],[{...deposit,extra:'untrusted'}]])assert.equal((await privateStateApi(request('A',{...initial(),events}),env)).status,400);
 assert.equal((await privateStateApi(request('A',{...initial(),preferences:{allowMargin:true,costMethod:'average'},events:[buy]}),env)).status,200);
});
test('byte limit, malformed JSON and unsupported media/method are rejected',async()=>{
 const env=environment();assert.equal((await privateStateApi(request('A','{'),env)).status,400);
 assert.equal((await privateStateApi(request('A',' '.repeat(200001)),env)).status,413);
 assert.equal((await privateStateApi(request('A',initial(),{'content-length':'200001'}),env)).status,413);
 assert.equal((await privateStateApi(request('A',initial(),{'content-type':'text/plain'}),env)).status,415);
 assert.equal((await privateStateApi(request('A',undefined,{},'DELETE'),env)).status,405);
 assert.equal(await privateStateApi(new Request('https://api.test/api/v1/other'),env),null);
});
test('database errors and corrupted stored state return structured service errors',async()=>{
 const env=environment();await privateStateApi(request(),env);
 const user=[...env.DB.users.values()][0];env.DB.states.set(user.id,{version:1,state_json:'{"private":"corrupt"}'});
 const corrupt=await privateStateApi(request(),env);assert.equal(corrupt.status,503);assert.equal((await corrupt.json()).error.code,'DATABASE_ERROR');
 const failure=await privateStateApi(request(),{...env,DB:{prepare(){throw Error('secret database detail')}}});assert.equal(failure.status,503);assert.equal((await failure.json()).error.message,'DATABASE_ERROR');
});
