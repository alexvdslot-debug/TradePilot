import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './src/index.mjs';
const req=(path,headers={})=>new Request('https://api.example.test'+path,{headers});
const env={CLIENT_ACCESS_TOKEN:'test-token',TWELVE_DATA_API_KEY:'dummy',ALLOWED_ORIGIN:'https://alexvdslot-debug.github.io'};
test('health has no secret values',async()=>{const r=await worker.fetch(req('/health'),env);assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/dummy|test-token/)});
test('candles require token',async()=>{const r=await worker.fetch(req('/api/candles?symbol=OPEN'),env);assert.equal(r.status,401)});
test('bad symbol rejected before provider call',async()=>{const r=await worker.fetch(req('/api/candles?symbol=BAD%20VALUE',{authorization:'Bearer test-token'}),env);assert.equal(r.status,400)});
test('bad interval rejected before provider call',async()=>{const r=await worker.fetch(req('/api/candles?symbol=OPEN&interval=1min',{authorization:'Bearer test-token'}),env);assert.equal(r.status,400)});
test('missing provider key fails closed',async()=>{const r=await worker.fetch(req('/api/candles?symbol=OPEN',{authorization:'Bearer test-token'}),{...env,TWELVE_DATA_API_KEY:''});assert.equal(r.status,503)});
test('untrusted origin receives no allow-origin header',async()=>{const r=await worker.fetch(req('/health',{origin:'https://evil.example'}),env);assert.equal(r.headers.get('access-control-allow-origin'),null)});
test('trusted origin receives exact allow-origin header',async()=>{const r=await worker.fetch(req('/health',{origin:env.ALLOWED_ORIGIN}),env);assert.equal(r.headers.get('access-control-allow-origin'),env.ALLOWED_ORIGIN)});

test('B3 preflight only permits configured origin',async()=>{
 const ok=await worker.fetch(new Request('https://api.example.test/api/v1/settings',{method:'OPTIONS',headers:{origin:env.ALLOWED_ORIGIN}}),env);
 assert.equal(ok.status,204);assert.equal(ok.headers.get('access-control-allow-origin'),env.ALLOWED_ORIGIN);
 assert.equal(ok.headers.get('access-control-allow-credentials'),'true');
 const blocked=await worker.fetch(new Request('https://api.example.test/api/v1/settings',{method:'OPTIONS',headers:{origin:'https://evil.example'}}),env);
 assert.equal(blocked.status,403);
});
test('B3 missing Access/D1 fails closed without data',async()=>{
 const r=await worker.fetch(req('/api/v1/settings',{origin:env.ALLOWED_ORIGIN}),env);
 assert.equal(r.status,503);
 assert.equal(r.headers.get('access-control-allow-origin'),env.ALLOWED_ORIGIN);
});

test('B3 same-origin app assets are served with secure CSP and no-store',async()=>{
 const root=await worker.fetch(req('/'),env);
 assert.equal(root.status,302);
 assert.equal(new URL(root.headers.get('location')).pathname,'/app/');
 for(const path of ['/app/','/app/main.js','/app/styles.css','/app/assets/icons.svg']){
  const r=await worker.fetch(req(path),env);
  assert.equal(r.status,200,path);
  assert.equal(r.headers.get('cache-control'),'no-store');
  assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);
 }
 const missing=await worker.fetch(req('/app/nope'),env);
 assert.equal(missing.status,404);
 const blocked=await worker.fetch(new Request('https://example.com/app/',{method:'POST'}),env);
 assert.equal(blocked.status,405);
});
test('direct app routes and ES modules preserve browser loading contract',async()=>{
 for(const path of ['/app/features.mjs','/app/ledger.mjs','/app/analysis.mjs']){
  const r=await worker.fetch(req(path),env);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);
 }
 for(const path of ['/app/portfolio','/app/radar','/app/analyzer','/app/journal','/app/settings']){const r=await worker.fetch(req(path),env);assert.equal(r.status,200);assert.match(await r.text(),/main.js/);}
 for(const path of ['/app','/app/portfolio/']){const r=await worker.fetch(req(path),env);assert.equal(r.status,302);assert.equal(new URL(r.headers.get('location')).pathname,path==='/app'?'/app/':'/app/portfolio');}
});
