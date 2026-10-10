import {rsi,macd} from './analysis.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormat=new Intl.DateTimeFormat('nl-NL',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const day=c=>dateFormat.format(new Date(c.time));
const time=c=>timeFormat.format(new Date(c.time));
const n=x=>Number(x).toFixed(2);
/** Chart values use the complete input history; only the latest 80 bars are drawn. */
export function chartSeries(candles){
 if(!Array.isArray(candles)||!candles.length)throw Error('Geen candles beschikbaar');
 let previous=-Infinity,date='',volume=0,weighted=0;const closes=[];
 return candles.map(c=>{
  const stamp=Date.parse(c.time);
  if(!Number.isFinite(stamp)||stamp<=previous||![c.o,c.h,c.l,c.c,c.v].every(Number.isFinite)||Math.min(c.o,c.h,c.l,c.c)<=0||c.v<0||c.h<Math.max(c.o,c.c,c.l)||c.l>Math.min(c.o,c.c))throw Error('Onbruikbare candlegegevens');
  previous=stamp;const nextDay=day(c);if(nextDay!==date){date=nextDay;volume=0;weighted=0;}
  volume+=c.v;weighted+=(c.h+c.l+c.c)/3*c.v;closes.push(c.c);
  return {...c,date,timeET:time(c),vwap:volume?weighted/volume:null,rsi:rsi(closes),macd:macd(closes)};
 });
}
function lineSegments(rows,value,x,y){
 let segments=[],points=[];
 for(let i=0;i<rows.length;i++){
  const v=value(rows[i]);
  if(v===null||!Number.isFinite(v)||(i&&rows[i].date!==rows[i-1].date)){if(points.length)segments.push(points.join(' '));points=[];}
  if(v!==null&&Number.isFinite(v))points.push(`${x(i)},${y(v)}`);
 }
 if(points.length)segments.push(points.join(' '));
 return segments.map(points=>`<polyline points="${points}"/>`).join('');
}
export function renderCandleChart(feed){
 const rows=chartSeries(feed.candles).slice(-80),width=900,left=58,right=830,top=28,bottom=280,step=(right-left)/rows.length;
 const xs=i=>left+(i+.5)*step,bodyWidth=Math.min(9,step*.65);
 const prices=rows.flatMap(c=>[c.h,c.l,c.vwap]).filter(Number.isFinite),lo=Math.min(...prices),hi=Math.max(...prices),padding=Math.max((hi-lo)*.08,hi*.002),min=lo-padding,max=hi+padding;
 const py=v=>bottom-(v-min)/(max-min)*(bottom-top),maxVolume=Math.max(1,...rows.map(c=>c.v));
 const grid=Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4,y=py(v);return `<line class="chart-grid" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text x="${right+9}" y="${y+4}">${n(v)}</text>`;}).join('');
 const bars=rows.map((c,i)=>`<g class="candle ${c.c>=c.o?'rising':'falling'}"><title>${esc(c.date)} ${esc(c.timeET)} ET · Open ${n(c.o)} · Hoog ${n(c.h)} · Laag ${n(c.l)} · Slot ${n(c.c)} USD · Volume ${c.v}</title><line x1="${xs(i)}" x2="${xs(i)}" y1="${py(c.h)}" y2="${py(c.l)}"/><rect x="${xs(i)-bodyWidth/2}" y="${Math.min(py(c.o),py(c.c))}" width="${bodyWidth}" height="${Math.max(1,Math.abs(py(c.o)-py(c.c)))}"/><rect class="volume-bar" x="${xs(i)-bodyWidth/2}" y="${355-c.v/maxVolume*52}" width="${bodyWidth}" height="${c.v/maxVolume*52}"/></g>`).join('');
 const ticks=[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].map(i=>`<text x="${xs(i)}" y="378" text-anchor="middle">${rows[i].date.slice(5)} ${rows[i].timeET}</text>`).join('');
 const last=rows.at(-1),closeLine=rows.map((c,i)=>`${xs(i)},${py(c.c)}`).join(' ');
 const rsiLine=lineSegments(rows,c=>c.rsi,xs,v=>455-v/100*60);
 const macdValues=rows.flatMap(c=>c.macd?[c.macd.macd,c.macd.signal,c.macd.histogram]:[]),macdLimit=Math.max(.0001,...macdValues.map(Math.abs)),my=v=>535-v/macdLimit*26;
 const macdBars=rows.map((c,i)=>c.macd?`<rect class="macd-bar ${c.macd.histogram>=0?'rising':'falling'}" x="${xs(i)-bodyWidth/2}" y="${Math.min(my(c.macd.histogram),535)}" width="${bodyWidth}" height="${Math.max(.5,Math.abs(my(c.macd.histogram)-535))}"/>`:'').join('');
 return `<figure class="candle-figure"><div class="chart-legend"><span>Candles · USD</span><span class="legend-vwap">VWAP van beschikbare dagbars</span><span>Volume</span></div><div class="chart-scroll" tabindex="0" aria-label="Candlegrafiek, horizontaal verschuifbaar"><svg class="price-chart candle-chart" viewBox="0 0 ${width} 390" role="img" aria-label="${esc(feed.symbol)} candlestickgrafiek met volume en VWAP"><title>${esc(feed.symbol)} · ${esc(feed.interval)} · OHLCV en VWAP</title><desc>Laatste ${rows.length} afgesloten candles. Tijdas New York, prijsas USD. Opwaartse candles gevuld; neerwaartse candles met donkere rand. Dag-VWAP gebruikt uitsluitend het beschikbare volume.</desc>${grid}<text x="${left}" y="18">USD</text><text x="${left}" y="299">Volume · max ${maxVolume.toLocaleString('nl-NL')}</text>${bars}<g class="vwap-line">${lineSegments(rows,c=>c.vwap,xs,py)}</g><polyline class="close-overlay" points="${closeLine}"/>${ticks}<text x="${right+8}" y="378">ET</text></svg></div><p class="chart-touch-hint data-label">Verschuif de grafiek voor meer ruimte. Alle waarden staan ook in de candletabel.</p><p class="chart-summary">Laatste afgesloten candle: ${esc(last.date)} ${esc(last.timeET)} ET · Open ${n(last.o)} · Hoog ${n(last.h)} · Laag ${n(last.l)} · Slot ${n(last.c)} USD · Volume ${last.v.toLocaleString('nl-NL')}.</p><details class="chart-indicators"><summary>RSI en MACD bekijken</summary><svg class="indicator-chart" viewBox="0 390 900 180" role="img" aria-label="RSI 14 en MACD 12 26 9"><title>RSI en MACD uit de beschikbare candlehistorie</title><text x="${left}" y="405">RSI (14)</text>${[30,70].map(v=>`<line class="chart-grid" x1="${left}" x2="${right}" y1="${455-v/100*60}" y2="${455-v/100*60}"/><text x="${right+9}" y="${459-v/100*60}">${v}</text>`).join('')}<g class="rsi-line">${rsiLine}</g><text x="${left}" y="492">MACD (12,26,9) · blauw: lijn, oranje: signaal</text><line class="chart-grid" x1="${left}" x2="${right}" y1="535" y2="535"/>${macdBars}<g class="macd-line">${lineSegments(rows,c=>c.macd?.macd??null,xs,my)}</g><g class="signal-line">${lineSegments(rows,c=>c.macd?.signal??null,xs,my)}</g></svg><p class="data-label">RSI ${last.rsi===null?'onvoldoende historie':n(last.rsi)} · MACD ${last.macd?n(last.macd.macd):'onvoldoende historie'} · Signaal ${last.macd?n(last.macd.signal):'—'}. Candles staan even ver uit elkaar; ontbrekende handelstijd is niet opgevuld.</p></details><details><summary>Candlegegevens als tabel</summary><div class="table-scroll" tabindex="0" aria-label="Candlegegevens, horizontaal verschuifbaar"><table><thead><tr>${['Datum ET','Tijd ET','Open','Hoog','Laag','Slot USD','Volume'].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.timeET)}</td><td>${n(c.o)}</td><td>${n(c.h)}</td><td>${n(c.l)}</td><td>${n(c.c)}</td><td>${c.v.toLocaleString('nl-NL')}</td></tr>`).join('')}</tbody></table></div></details></figure>`;
}
