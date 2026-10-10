import {registerTranslations,t as appT,getLocale} from './i18n.mjs';
import {rsi,macd} from './analysis.mjs';
const texts={zoomIn:'Inzoomen',zoomOut:'Uitzoomen',earlier:'Eerdere candles',later:'Latere candles',reset:'Grafiek herstellen',controls:'Grafiekbediening',selection:'Geselecteerde candle',keyboard:'Pijltjestoetsen selecteren candles; +/− zoomt; Page Up/Down verschuift. Sleep binnen de grafiek of gebruik de knoppen.',vwap:'VWAP',rsi:'RSI',macd:'MACD',signal:'Signaal',histogram:'Histogram',unavailable:'onvoldoende historie',support:'Steun',resistance:'Weerstand',entry:'Indicatieve instap',stop:'Indicatieve stop',target1:'Indicatief doel 1',target2:'Indicatief doel 2',open:'Open',high:'Hoog',low:'Laag',close:'Slot',volume:'Volume',noCandles:'Geen candles beschikbaar',invalidCandles:'Onbruikbare candlegegevens'};
const english={zoomIn:'Zoom in',zoomOut:'Zoom out',earlier:'Earlier candles',later:'Later candles',reset:'Reset chart',controls:'Chart controls',selection:'Selected candle',keyboard:'Arrow keys select candles; +/− zooms; Page Up/Down pans. Drag within the chart or use the buttons.',vwap:'VWAP',rsi:'RSI',macd:'MACD',signal:'Signal',histogram:'Histogram',unavailable:'insufficient history',support:'Support',resistance:'Resistance',entry:'Indicative entry',stop:'Indicative stop',target1:'Indicative target 1',target2:'Indicative target 2',open:'Open',high:'High',low:'Low',close:'Close',volume:'Volume',noCandles:'No candles available',invalidCandles:'Invalid candle data'};
Object.assign(texts,{candles:'Candles · USD',vwapLegend:'VWAP van beschikbare dagbars',scroll:'Candlegrafiek, horizontaal verschuifbaar',chart:'candlestickgrafiek met volume en VWAP',last:'Laatste',closedCandles:'afgesloten candles',chartDescription:'Tijdas New York, prijsas USD. Opwaartse candles gevuld; neerwaartse candles met donkere rand. Dag-VWAP gebruikt uitsluitend het beschikbare volume.',latest:'Laatste afgesloten candle',viewIndicators:'RSI en MACD bekijken',indicatorTitle:'RSI en MACD uit de beschikbare candlehistorie',macdLegend:'MACD (12,26,9) · blauw: lijn, oranje: signaal',noFilling:'Candles staan even ver uit elkaar; ontbrekende handelstijd is niet opgevuld.',table:'Candlegegevens als tabel',tableScroll:'Candlegegevens, horizontaal verschuifbaar',date:'Datum ET',time:'Tijd ET',closeUsd:'Slot USD'});
Object.assign(english,{candles:'Candles · USD',vwapLegend:'VWAP from available daily bars',scroll:'Candlestick chart, horizontally scrollable',chart:'candlestick chart with volume and VWAP',last:'Last',closedCandles:'completed candles',chartDescription:'New York time axis; USD price axis. Rising candles are filled; falling candles have a dark border. Daily VWAP uses available volume only.',latest:'Latest completed candle',viewIndicators:'View RSI and MACD',indicatorTitle:'RSI and MACD from available candle history',macdLegend:'MACD (12,26,9) · blue: line, orange: signal',noFilling:'Candles have equal spacing; missing trading time is not filled.',table:'Candle data table',tableScroll:'Candle data, horizontally scrollable',date:'Date ET',time:'Time ET',closeUsd:'Close USD'});
registerTranslations('chart',texts,english);
const t=key=>appT('chart.'+key);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormat=new Intl.DateTimeFormat('nl-NL',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const day=c=>dateFormat.format(new Date(c.time));
const time=c=>timeFormat.format(new Date(c.time));
const n=x=>Number(x).toFixed(2);
/** Chart values use the complete input history; only the latest 80 bars are drawn. */
export function chartSeries(candles){
 if(!Array.isArray(candles)||!candles.length)throw Error(t('noCandles'));
 let previous=-Infinity,date='',volume=0,weighted=0;const closes=[];
 return candles.map(c=>{
  const stamp=Date.parse(c.time);
  if(!Number.isFinite(stamp)||stamp<=previous||![c.o,c.h,c.l,c.c,c.v].every(Number.isFinite)||Math.min(c.o,c.h,c.l,c.c)<=0||c.v<0||c.h<Math.max(c.o,c.c,c.l)||c.l>Math.min(c.o,c.c))throw Error(t('invalidCandles'));
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
export function chartWindow(total,{count=80,offset=0}={}) {
 if(!Number.isInteger(total)||total<1)throw Error(t('noCandles'));
 count=Math.max(1,Math.min(total,Number.isFinite(count)?Math.round(count):80));
 offset=Math.max(0,Math.min(total-count,Number.isFinite(offset)?Math.round(offset):0));
 return {count,offset,start:total-offset-count,end:total-offset};
}
export function validChartLevels(levels={}) {
 return Object.fromEntries(['support','resistance','entry','stop','target1','target2'].filter(key=>Number.isFinite(levels[key])&&levels[key]>0).map(key=>[key,levels[key]]));
}
export function chartCandleSummary(row){
 return `${row.date} ${row.timeET} ET · ${t('open')} ${n(row.o)} · ${t('high')} ${n(row.h)} · ${t('low')} ${n(row.l)} · ${t('close')} ${n(row.c)} USD · ${t('volume')} ${row.v.toLocaleString(getLocale())} · ${t('vwap')} ${row.vwap===null?'—':n(row.vwap)} · ${t('rsi')} ${row.rsi===null?t('unavailable'):n(row.rsi)} · ${t('macd')} ${row.macd?n(row.macd.macd):t('unavailable')} · ${t('signal')} ${row.macd?n(row.macd.signal):'—'} · ${t('histogram')} ${row.macd?n(row.macd.histogram):'—'}`;
}
export function renderCandleChart(feed,{window:requestedWindow,levels={}}={}){
 const all=chartSeries(feed.candles),window=chartWindow(all.length,requestedWindow),rows=all.slice(window.start,window.end),width=900,left=58,right=830,top=28,bottom=280,step=(right-left)/rows.length;
 const xs=i=>left+(i+.5)*step,bodyWidth=Math.min(9,step*.65);
 const validLevels=validChartLevels(levels),prices=[...rows.flatMap(c=>[c.h,c.l,c.vwap]).filter(Number.isFinite),...Object.values(validLevels)],lo=Math.min(...prices),hi=Math.max(...prices),padding=Math.max((hi-lo)*.08,hi*.002),min=lo-padding,max=hi+padding;
 const py=v=>bottom-(v-min)/(max-min)*(bottom-top),maxVolume=Math.max(1,...rows.map(c=>c.v));
 const grid=Array.from({length:5},(_,i)=>{const v=min+(max-min)*i/4,y=py(v);return `<line class="chart-grid" x1="${left}" x2="${right}" y1="${y}" y2="${y}"/><text x="${right+9}" y="${y+4}">${n(v)}</text>`;}).join('');
 const bars=rows.map((c,i)=>`<g class="candle ${c.c>=c.o?'rising':'falling'}"><title>${esc(chartCandleSummary(c))}</title><line x1="${xs(i)}" x2="${xs(i)}" y1="${py(c.h)}" y2="${py(c.l)}"/><rect x="${xs(i)-bodyWidth/2}" y="${Math.min(py(c.o),py(c.c))}" width="${bodyWidth}" height="${Math.max(1,Math.abs(py(c.o)-py(c.c)))}"/><rect class="volume-bar" x="${xs(i)-bodyWidth/2}" y="${355-c.v/maxVolume*52}" width="${bodyWidth}" height="${c.v/maxVolume*52}"/></g>`).join('');
 const ticks=[...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].map(i=>`<text x="${xs(i)}" y="378" text-anchor="middle">${rows[i].date.slice(5)} ${rows[i].timeET}</text>`).join('');
 const last=rows.at(-1),closeLine=rows.map((c,i)=>`${xs(i)},${py(c.c)}`).join(' ');
 const rsiLine=lineSegments(rows,c=>c.rsi,xs,v=>455-v/100*60);
 const macdValues=rows.flatMap(c=>c.macd?[c.macd.macd,c.macd.signal,c.macd.histogram]:[]),macdLimit=Math.max(.0001,...macdValues.map(Math.abs)),my=v=>535-v/macdLimit*26;
 const macdBars=rows.map((c,i)=>c.macd?`<rect class="macd-bar ${c.macd.histogram>=0?'rising':'falling'}" x="${xs(i)-bodyWidth/2}" y="${Math.min(my(c.macd.histogram),535)}" width="${bodyWidth}" height="${Math.max(.5,Math.abs(my(c.macd.histogram)-535))}"/>`:'').join('');
 const overlays=Object.entries(validLevels).map(([key,value])=>`<g class="chart-level chart-level-${key}"><line x1="${left}" x2="${right}" y1="${py(value)}" y2="${py(value)}"/><text x="${left+6}" y="${py(value)-4}">${t(key)} ${n(value)}</text></g>`).join('');
 const band=Array.isArray(levels.entryZone)&&levels.entryZone.length===2&&levels.entryZone.every(Number.isFinite)&&levels.entryZone[1]>=levels.entryZone[0]?`<rect class="chart-entry-band" x="${left}" y="${py(levels.entryZone[1])}" width="${right-left}" height="${Math.max(1,py(levels.entryZone[0])-py(levels.entryZone[1]))}"/>`:'';
 return `<figure class="candle-figure" data-chart-start="${window.start}" data-chart-count="${rows.length}"><div class="chart-controls toolbar" aria-label="${t('controls')}">${[['zoom-in','zoomIn'],['zoom-out','zoomOut'],['earlier','earlier'],['later','later'],['reset','reset']].map(([action,label])=>`<button class="secondary" type="button" data-chart-action="${action}" ${action==='earlier'&&window.start===0||action==='later'&&window.end===all.length?'disabled':''}>${t(label)}</button>`).join('')}</div><div class="chart-legend"><span>${t('candles')}</span><span class="legend-vwap">${t('vwapLegend')}</span><span>${t('volume')}</span></div><div class="chart-scroll" tabindex="0" aria-label="${t('scroll')}"><svg class="price-chart candle-chart" viewBox="0 0 ${width} 390" role="img" aria-label="${esc(feed.symbol)} ${t('chart')}"><title>${esc(feed.symbol)} · ${esc(feed.interval)} · OHLCV · VWAP</title><desc>${t('last')} ${rows.length} ${t('closedCandles')}. ${t('chartDescription')}</desc>${grid}${band}${overlays}<text x="${left}" y="18">USD</text><text x="${left}" y="299">${t('volume')} · max ${maxVolume.toLocaleString(getLocale())}</text>${bars}<g class="vwap-line">${lineSegments(rows,c=>c.vwap,xs,py)}</g><polyline class="close-overlay" points="${closeLine}"/>${ticks}<g class="chart-crosshair" visibility="hidden" pointer-events="none"><line class="chart-crosshair-x" x1="0" x2="0" y1="${top}" y2="355"/><line class="chart-crosshair-y" x1="${left}" x2="${right}" y1="0" y2="0"/><circle r="3"/></g><text x="${right+8}" y="378">ET</text></svg></div><p class="chart-touch-hint data-label">${t('keyboard')}</p><output class="chart-selected" aria-live="polite">${t('selection')}: ${esc(chartCandleSummary(last))}</output><p class="chart-summary">${t('latest')}: ${esc(chartCandleSummary(last))}.</p><details class="chart-indicators"><summary>${t('viewIndicators')}</summary><svg class="indicator-chart" viewBox="0 390 900 180" role="img" aria-label="RSI 14 · MACD 12 26 9"><title>${t('indicatorTitle')}</title><text x="${left}" y="405">RSI (14)</text>${[30,70].map(v=>`<line class="chart-grid" x1="${left}" x2="${right}" y1="${455-v/100*60}" y2="${455-v/100*60}"/><text x="${right+9}" y="${459-v/100*60}">${v}</text>`).join('')}<g class="rsi-line">${rsiLine}</g><text x="${left}" y="492">${t('macdLegend')}</text><line class="chart-grid" x1="${left}" x2="${right}" y1="535" y2="535"/>${macdBars}<g class="macd-line">${lineSegments(rows,c=>c.macd?.macd??null,xs,my)}</g><g class="signal-line">${lineSegments(rows,c=>c.macd?.signal??null,xs,my)}</g></svg><p class="data-label">RSI ${last.rsi===null?t('unavailable'):n(last.rsi)} · MACD ${last.macd?n(last.macd.macd):t('unavailable')} · ${t('signal')} ${last.macd?n(last.macd.signal):'—'}. ${t('noFilling')}</p></details><details><summary>${t('table')}</summary><div class="table-scroll" tabindex="0" aria-label="${t('tableScroll')}"><table><thead><tr>${['date','time','open','high','low','closeUsd','volume'].map(t).map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.date)}</td><td>${esc(c.timeET)}</td><td>${n(c.o)}</td><td>${n(c.h)}</td><td>${n(c.l)}</td><td>${n(c.c)}</td><td>${c.v.toLocaleString(getLocale())}</td></tr>`).join('')}</tbody></table></div></details></figure>`;
}

const controllers=new WeakMap();
export function mountCandleChart(host,feed,{levels={}}={}) {
 if(!host)return ()=>{};
 controllers.get(host)?.();
 const all=chartSeries(feed.candles);let viewport=chartWindow(all.length),selected=all.length-1,drag=null;
 const draw=()=>{host.innerHTML=renderCandleChart(feed,{window:viewport,levels});};
 const selection=index=>{
  selected=Math.max(viewport.start,Math.min(viewport.end-1,index));const row=all[selected];
  const output=host.querySelector('.chart-selected');if(output)output.textContent=t('selection')+': '+chartCandleSummary(row);
  const svg=host.querySelector('.candle-chart'),cross=svg?.querySelector('.chart-crosshair');if(!cross)return;
  const x=58+(selected-viewport.start+.5)*(830-58)/viewport.count;
  const close=svg.querySelector('.close-overlay')?.getAttribute('points')?.split(' ')[selected-viewport.start]?.split(',');
  const y=Number(close?.[1]);if(!Number.isFinite(y))return;
  cross.setAttribute('visibility','visible');for(const attr of ['x1','x2'])cross.querySelector('.chart-crosshair-x').setAttribute(attr,x);for(const attr of ['y1','y2'])cross.querySelector('.chart-crosshair-y').setAttribute(attr,y);const dot=cross.querySelector('circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);
 };
 const move=(offset,count=viewport.count)=>{viewport=chartWindow(all.length,{offset,count});draw();selection(selected);};
 const action=name=>{if(name==='zoom-in')move(viewport.offset,Math.max(Math.min(10,all.length),Math.floor(viewport.count*.75)));if(name==='zoom-out')move(viewport.offset,Math.ceil(viewport.count/0.75));if(name==='earlier')move(viewport.offset+Math.max(1,Math.floor(viewport.count/4)));if(name==='later')move(viewport.offset-Math.max(1,Math.floor(viewport.count/4)));if(name==='reset'){viewport=chartWindow(all.length);selected=all.length-1;draw();selection(selected);}};
 const click=e=>{const button=e.target.closest('[data-chart-action]');if(!button||!host.contains(button))return;action(button.dataset.chartAction);host.querySelector(`[data-chart-action="${button.dataset.chartAction}"]`)?.focus();};
 const key=e=>{if(!e.target.closest('.chart-scroll'))return;let handled=true;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const next=selected+(e.key==='ArrowLeft'?-1:1);if(next<viewport.start)move(viewport.offset+1);if(next>=viewport.end)move(viewport.offset-1);selection(next);}else if(['+','='].includes(e.key))action('zoom-in');else if(['-','−'].includes(e.key))action('zoom-out');else if(e.key==='PageUp')action('earlier');else if(e.key==='PageDown')action('later');else if(e.key==='Home')move(all.length-viewport.count);else if(e.key==='End')move(0);else handled=false;if(handled){e.preventDefault();host.querySelector('.chart-scroll')?.focus();}};
 const point=e=>{const svg=host.querySelector('.candle-chart');const box=svg?.getBoundingClientRect();return box?.width?{x:(e.clientX-box.left)/box.width*900,width:box.width}:null;};
 const pointer=e=>{if(!e.target.closest('.candle-chart')&&!drag)return;const p=point(e);if(!p)return;if(drag){const shift=Math.round((e.clientX-drag.x)/p.width*900/(772/viewport.count));if(drag.offset+shift!==viewport.offset)move(drag.offset+shift);e.preventDefault();}selection(viewport.start+Math.floor((p.x-58)/772*viewport.count));};
 const down=e=>{if(!e.target.closest('.candle-chart')||e.button>0)return;drag={x:e.clientX,offset:viewport.offset};host.setPointerCapture?.(e.pointerId);pointer(e);};
 const up=()=>{drag=null;};
 draw();selection(selected);
 for(const [event,handler]of [['click',click],['keydown',key],['pointermove',pointer],['pointerdown',down],['pointerup',up],['pointercancel',up]])host.addEventListener(event,handler);
 const cleanup=()=>{for(const [event,handler]of [['click',click],['keydown',key],['pointermove',pointer],['pointerdown',down],['pointerup',up],['pointercancel',up]])host.removeEventListener(event,handler);controllers.delete(host);};controllers.set(host,cleanup);return cleanup;
}
