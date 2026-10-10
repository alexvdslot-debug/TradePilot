import http from 'node:http';
import worker from '../worker/src/index.mjs';
const server=http.createServer(async(req,res)=>{try{const request=new Request('http://127.0.0.1:8765'+req.url,{method:req.method,headers:req.headers});const response=await worker.fetch(request,{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Development server error');}});
server.listen(8765,'127.0.0.1',()=>console.log('TradePilot development server on 8765'));
