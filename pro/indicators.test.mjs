import test from 'node:test';import assert from 'node:assert/strict';import {validateCandles,indicators,longPlan,rsi,macd} from './indicators.mjs';
const candles=Array.from({length:40},(_,i)=>({time:new Date(Date.UTC(2026,9,8,13,i)).toISOString(),o:100+i,h:101+i,l:99+i,c:100+i,v:1000}));
test('indicator engine returns finite values',()=>{const x=indicators(candles);assert.ok(x.vwap>100);assert.ok(x.rsi>99);assert.ok(Number.isFinite(x.macd.histogram));assert.equal(x.relativeVolume,1)});
test('invalid candle ordering rejected',()=>{assert.throws(()=>validateCandles([...candles].reverse()))});
test('flat RSI neutral',()=>assert.equal(rsi(Array(30).fill(10)),50));
test('short MACD missing',()=>assert.equal(macd([1,2,3]),null));
test('long plan R multiples',()=>{const x=longPlan({entry:100,stop:95,target1:110,target2:120});assert.equal(x.rr1,2);assert.equal(x.rr2,4)});
test('invalid long plan rejected',()=>assert.throws(()=>longPlan({entry:100,stop:101,target1:110,target2:120})));
