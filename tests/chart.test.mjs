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
import {chartWindow,validChartLevels} from '../app/chart.mjs';
import {setLocale} from '../app/i18n.mjs';
test('chart viewport clamps zoom/pan to existing data and overlay levels remain finite',()=>{assert.deepEqual(chartWindow(100,{count:40,offset:20}),{count:40,offset:20,start:40,end:80});assert.equal(chartWindow(3,{count:80,offset:99}).start,0);assert.deepEqual(validChartLevels({support:9,stop:NaN,target1:-1,resistance:12}),{support:9,resistance:12});const candles=Array.from({length:100},(_,i)=>candle(new Date(Date.UTC(2026,9,9,13,30+i*5)).toISOString(),10+i*.01));const html=renderCandleChart({symbol:'OPEN',interval:'5min',candles},{window:{count:30,offset:15},levels:{support:9,resistance:12,entry:10,stop:9.5,target1:11,target2:12,entryZone:[9.9,10]}});assert.equal((html.match(/class="candle /g)||[]).length,30);assert.match(html,/chart-crosshair/);assert.match(html,/chart-entry-band/);assert.match(html,/chart-level-stop/);assert.doesNotMatch(html,/NaN|Infinity|onclick=|style=/);});
test('chart labels actually switch to English without changing candle values',()=>{setLocale('en-US');const html=renderCandleChart({symbol:'OPEN',interval:'5min',candles:[candle('2026-10-09T19:55:00Z')]});assert.match(html,/Zoom in/);assert.match(html,/Selected candle/);assert.match(html,/Candle data table/);assert.doesNotMatch(html,/Geselecteerde candle|Inzoomen|Hoog/);assert.match(html,/10\.00/);setLocale('nl-NL');});
test('crowded and equal levels preserve exact line prices while names and values live outside the plot',()=>{
 const levels={support:229.1,resistance:231.66,entry:229.32,stop:229.11,target1:231.66,target2:232.52};
 const candles=Array.from({length:80},(_,i)=>candle(new Date(Date.UTC(2026,9,9,13,30+i*5)).toISOString(),229.32));
 const html=renderCandleChart({symbol:'NVDA',interval:'5min',candles},{levels});
 const plot=html.match(/<svg class="price-chart candle-chart"[\s\S]*?<\/svg>/)[0];
 const legend=html.match(/<div class="chart-level-legend">[\s\S]*?<\/div><\/div>/)[0];
 for(const [key,value] of Object.entries(levels)){
  const group=plot.match(new RegExp('<g class="chart-level chart-level-'+key+'">(.*?)</g>'))[1];
  assert.doesNotMatch(group,/<text/);assert.match(group,new RegExp('<title>.*'+value.toFixed(2)));
  assert.match(legend,new RegExp('chart-level-'+key));assert.match(legend,new RegExp('<strong>'+value.toFixed(2)+'</strong>'));
 }
 const resistance=plot.match(/chart-level-resistance"><line[^>]*y1="([^"]+)"/)[1];
 const target=plot.match(/chart-level-target1"><line[^>]*y1="([^"]+)"/)[1];assert.equal(resistance,target);
 assert.equal((legend.match(/role="listitem"/g)||[]).length,6);
 assert.doesNotMatch(html,/NaN|Infinity|style=/);
});
test('time endpoints point inward and remain separate from the ET suffix for short and eighty-bar windows',()=>{
 for(const count of [1,2,3,80]){
  const candles=Array.from({length:count},(_,i)=>candle(new Date(Date.UTC(2026,9,9,13,30+i*5)).toISOString()));
  const html=renderCandleChart({symbol:'TEST',interval:'5min',candles});
  const ticks=[...html.matchAll(/<text class="chart-time-tick" x="([^"]+)" y="378" text-anchor="([^"]+)">([^<]+)<\/text>/g)];
  assert.equal(ticks[0][1],'58');assert.equal(ticks[0][2],'start');
  if(count>1){assert.equal(ticks.at(-1)[1],'830');assert.equal(ticks.at(-1)[2],'end');}
  assert.equal(new Set(ticks.map(tick=>tick[3])).size,ticks.length);
  assert.match(html,/<text x="838" y="378">ET<\/text>/);
 }
});
