import test from 'node:test';
import assert from 'node:assert/strict';
import {realizedHistory} from '../app/portfolio.mjs';
const event=(id,type,fields={})=>({id,type,timestamp:'2026-10-01T14:00:00Z',currency:'USD',...fields});
const events=[event('cash','DEPOSIT',{amount:'1000',timestamp:'2026-10-01T13:00:00Z'}),event('b','BUY',{symbol:'OPEN',quantity:'3',price:'3',fee:'0.1'}),event('s1','SELL',{symbol:'OPEN',quantity:'1',price:'4',fee:'0.1',timestamp:'2026-10-02T14:00:00Z'}),event('s2','SELL',{symbol:'OPEN',quantity:'2',price:'2',fee:'0.1',timestamp:'2026-10-03T14:00:00Z'})];
test('history retains exact partial allocation and excludes cash flows from realized result',()=>{
 const h=realizedHistory(events,{asOf:'2026-10-03T15:00:00Z'});
 assert.deepEqual(h.series.USD.map(p=>p.value),['0','0.866666666667','-1.3']);
 assert.equal(h.realized.USD,'-1.3');assert.equal(h.totalReturnAvailable,false);
 assert.equal(h.series.EUR[0].value,'0');
});
test('historical cutoff cannot leak later realized sales',()=>{
 const h=realizedHistory([...events].reverse(),{asOf:'2026-10-02T15:00:00Z'});
 assert.equal(h.excludedEventCount,1);assert.equal(h.series.USD.at(-1).eventId,'s1');
 assert.equal(h.realized.USD,'0.866666666667');
});
test('no sale has no fabricated return curve; future duplicate remains invalid',()=>{
 assert.deepEqual(realizedHistory([]).series,{EUR:[],USD:[]});
 assert.equal(realizedHistory(events.slice(0,2)).series.USD.length,1);
 assert.throws(()=>realizedHistory([...events,{...events[0],timestamp:'2027-01-01T00:00:00Z'}]),e=>e.code==='DUPLICATE_EVENT_ID');
});

test('observed candle value history preserves missing-price gaps and never uses future close',async()=>{
 const {historicalValuationHistory}=await import('../app/portfolio.mjs');
 const feed={symbol:'OPEN',currency:'USD',provider:'fixture',verified:true,delay:'unverified',realtime:false,marketSession:'closed',candles:[{time:'2026-10-01T14:00:00Z',completedAt:'2026-10-01T14:15:00Z',complete:true,c:4},{time:'2026-10-01T14:15:00Z',completedAt:'2026-10-01T14:30:00Z',complete:true,c:5}]};
 const h=historicalValuationHistory(events.slice(0,2),[feed],{asOf:'2026-10-01T14:30:00Z'});
 assert.deepEqual(h.series.USD.map(p=>p.value),['1002.9','1005.9']);assert.equal(h.indicative,true);
 const other=event('other','BUY',{symbol:'AAPL',quantity:'1',price:'10'});
 assert.deepEqual(historicalValuationHistory([...events.slice(0,2),other],[feed],{asOf:'2026-10-01T14:30:00Z'}).series.USD.map(p=>p.value),[null,null]);
 assert.deepEqual(historicalValuationHistory(events.slice(0,2),[{...feed,verified:false}]).series.USD,[]);
});

test('USD consolidation converts EUR only through verified exact FX and requires no FX for zero EUR',async()=>{
 const {calculatePortfolio}=await import('../app/portfolio.mjs');const now='2026-10-01T14:00:00Z';
 const cash=[event('eu','DEPOSIT',{currency:'EUR',amount:'100'}),event('us','DEPOSIT',{amount:'50'})];
 assert.equal(calculatePortfolio(cash,{now}).currentUSDValue,null);
 const fx={symbol:'USD/EUR',currency:'EUR',rate:'0.5',source:'fixture',verified:true,asOf:now,delay:0,realtime:true,marketSession:'regular'};
 assert.equal(calculatePortfolio(cash,{now,fx}).currentUSDValue,'250');
 assert.equal(calculatePortfolio([cash[1]],{now}).currentUSDValue,'50');
 assert.equal(calculatePortfolio(cash,{now,fx:{...fx,verified:false}}).currentUSDValue,null);
});
