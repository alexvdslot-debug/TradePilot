import test from 'node:test';
import assert from 'node:assert/strict';
import {chartSeries,renderCandleChart} from '../app/chart.mjs';
const candle=(time,c=10,v=100)=>({time,o:c-.1,h:c+.2,l:c-.2,c,v});
test('VWAP resets on New York session date including DST; zero volume never invents a price',()=>{
 const rows=chartSeries([candle('2026-03-06T20:00:00Z',10),candle('2026-03-09T13:30:00Z',20,0),candle('2026-03-09T13:45:00Z',22)]);
 assert.equal(rows[1].timeET,'09:30');assert.equal(rows[1].vwap,null);assert.equal(rows[2].vwap,22);
});
test('single flat candle has finite geometry, OHLCV text and no invented RSI or MACD',()=>{
 const feed={symbol:'A<&',interval:'5min',candles:[{time:'2026-10-09T19:55:00Z',o:10,h:10,l:10,c:10,v:0}]};
 const html=renderCandleChart(feed);assert.doesNotMatch(html,/NaN|Infinity/);assert.match(html,/A&lt;&amp;/);assert.match(html,/15:55 ET/);assert.match(html,/onvoldoende historie/);assert.match(html,/Candlegegevens als tabel/);
});
test('chart rejects invalid or unsorted source candles instead of fabricating a plot',()=>{
 assert.throws(()=>chartSeries([candle('bad')]));assert.throws(()=>chartSeries([candle('2026-10-09T19:55:00Z'),candle('2026-10-09T19:50:00Z')]));assert.throws(()=>chartSeries([{...candle('2026-10-09T19:55:00Z'),h:9}]));
});
test('drawing latest 80 retains indicator history and exact source OHLCV',()=>{
 const candles=Array.from({length:100},(_,i)=>candle(new Date(Date.UTC(2026,9,9,13,30+i*5)).toISOString(),10+i*.01));
 const rows=chartSeries(candles);assert.ok(rows.at(-1).macd);assert.ok(rows.at(-1).rsi);const html=renderCandleChart({symbol:'TEST',interval:'5min',candles});assert.equal((html.match(/class="candle /g)||[]).length,80);assert.match(html,/Laatste 80 afgesloten candles/);
});
