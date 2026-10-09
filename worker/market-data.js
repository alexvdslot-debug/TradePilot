// TradePilot market-data proxy — deploy as a Cloudflare Worker.
// Configure secret TWELVE_DATA_API_KEY in Worker settings. Never put the key in GitHub Pages.
// Set ALLOWED_ORIGIN to your exact GitHub Pages origin (e.g. https://alexvdslot-debug.github.io).
const SYMBOL=/^[A-Z][A-Z0-9.\-]{0,11}$/;
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 const allowed=env.ALLOWED_ORIGIN||'https://alexvdslot-debug.github.io';
 const headers={'Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json','Cache-Control':'public, max-age=60'};
 if(origin&&origin!==allowed)return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers});
 if(request.method==='OPTIONS')return new Response(null,{headers});
 if(request.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers});
 if(!env.TWELVE_DATA_API_KEY)return new Response(JSON.stringify({error:'Market data not configured'}),{status:503,headers});
 const u=new URL(request.url),symbols=(u.searchParams.get('symbols')||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
 if(!symbols.length||symbols.length>8||symbols.some(s=>!SYMBOL.test(s)))return new Response(JSON.stringify({error:'Provide 1-8 valid symbols'}),{status:400,headers});
 const out={asOf:new Date().toISOString(),provider:'Twelve Data',quotes:{},errors:{}};
 await Promise.all(symbols.map(async symbol=>{
  try{
   const endpoint=new URL('https://api.twelvedata.com/quote');endpoint.searchParams.set('symbol',symbol);endpoint.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
   const response=await fetch(endpoint.toString(),{cf:{cacheTtl:60,cacheEverything:true}});const data=await response.json();
   if(!response.ok||data.status==='error'||!Number.isFinite(Number(data.close)))throw Error(data.message||'Unavailable');
   out.quotes[symbol]={symbol,price:Number(data.close),previousClose:Number(data.previous_close),changePercent:Number(data.percent_change),volume:Number(data.volume),datetime:data.datetime||null,isMarketOpen:data.is_market_open===true||data.is_market_open==='true',exchange:data.exchange||null,provider:'Twelve Data',delay:'Unknown; verify subscription'};
  }catch(e){out.errors[symbol]=String(e.message||e)}
 }));
 return new Response(JSON.stringify(out),{headers});
}};