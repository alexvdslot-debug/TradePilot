import {realizedHistory,historicalValuationHistory,calculatePortfolio,quoteFromCandles} from './portfolio.mjs';
import {jt} from './journal-panels.mjs';
import {pt,bookingLabel} from './portfolio-copy.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(heads,rows)=>`<div class="table-scroll" tabindex="0"><table><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${heads.length}">${esc(pt('noMatches'))}</td></tr>`}</tbody></table></div>`;
export function performancePanel(state,asOf=new Date().toISOString()){
 if(!state)return '';
 const h=realizedHistory(state.events,{asOf,allowMargin:state.preferences.allowMargin,method:state.preferences.costMethod});
 return `<section class="card dashboard-section performance-history"><h2>${pt('history')}</h2><p class="data-label">${pt('historyNote')}</p>${['USD','EUR'].map(currency=>{
  const points=h.series[currency];if(points.length<2)return `<p>${currency} · ${pt('noSales')}</p>`;
  const values=points.map(p=>Number(p.value)),low=Math.min(0,...values),high=Math.max(0,...values),range=high-low||1;
  const first=Date.parse(points[0].timestamp),span=Date.parse(points.at(-1).timestamp)-first||1;
  const xy=points.map(p=>[40+560*(Date.parse(p.timestamp)-first)/span,180-140*(Number(p.value)-low)/range]);
  const step=xy.map(([x,y],i)=>i?`${x},${xy[i-1][1]} ${x},${y}`:`${x},${y}`).join(' ');
  return `<h3>${currency} · ${esc(h.realized[currency])}</h3><svg class="performance-chart" viewBox="0 0 640 220" role="img" aria-label="${esc(pt('curve'))} ${currency}"><title>${esc(pt('curve'))} ${currency}</title><path d="M40 30V180H600" fill="none" stroke="currentColor" opacity=".3"/><polyline points="${step}" fill="none" stroke="currentColor" stroke-width="3"/><text x="40" y="205" fill="currentColor">${esc(points[0].timestamp.slice(0,10))}</text><text x="480" y="205" fill="currentColor">${esc(points.at(-1).timestamp.slice(0,10))}</text></svg>${table([pt('date'),pt('curve')+' '+currency],points.map(p=>`<tr><td data-user-content>${esc(p.timestamp)}</td><td data-user-content>${esc(p.value)}</td></tr>`))}`;
 }).join('')}</section>`;
}
export function allocationPanel(state,feeds,fx,preferences={}){
 if(!state)return '';
 const quotes=Object.fromEntries([...feeds].map(([symbol,feed])=>[symbol,quoteFromCandles(feed)]));
 const p=calculatePortfolio(state.events,{quotes,fx,allowMargin:state.preferences.allowMargin,method:state.preferences.costMethod});
 const limit=Number(preferences.maxPositionPercent??25);
 return `<section class="card dashboard-section allocation-panel"><h2>${pt('allocation')}</h2><p class="data-label">${pt('allocationNote')}</p><p>${pt('threshold')}: ${Number.isFinite(limit)?esc(limit):'—'}%</p>${p.positions.filter(x=>x.covered).sort((a,b)=>Number(b.coveredWeightPercent)-Number(a.coveredWeightPercent)).map(x=>`<p><button type="button" class="ticker-link" data-position-detail="${esc(x.symbol)}">${esc(x.symbol)}</button> · ${esc(x.currency)} · ${esc(x.coveredWeightPercent)}%<meter min="0" max="100" value="${esc(x.coveredWeightPercent)}" aria-label="${esc(x.symbol)} ${esc(pt('allocation'))}"></meter><span class="data-label">${Number(x.coveredWeightPercent)>limit?pt('overLimit'):pt('withinLimit')}</span></p>`).join('')}<p class="data-label">${p.concentration.coveredPositions}/${p.concentration.openPositions}</p><p>${pt('riskBudget')}: EUR ${esc(preferences.riskBudget??'—')}</p><p class="data-label">${pt('budgetNote')}</p></section>`;
}
export function positionDetailPanel(state){
 if(!state)return '';
 return `<section class="card dashboard-section"><h2>${pt('position')}</h2><label>${pt('choosePosition')}<select id="portfolio-position"><option value="">${pt('choosePosition')}</option>${[...new Set(state.events.filter(e=>e.symbol).map(e=>e.symbol))].sort().map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><div id="portfolio-position-detail"></div></section>`;
}
export function renderPositionDetail(state,symbol){
 const p=calculatePortfolio(state.events,{allowMargin:state.preferences.allowMargin,method:state.preferences.costMethod}).positions.find(p=>p.symbol===symbol);
 if(!p)return '';
 return `<p>${esc(symbol)} · ${pt('quantity')}: ${esc(p.quantity)} · ${pt('average')}: ${esc(p.averageCost)} ${esc(p.currency)} · ${pt('basis')}: ${esc(p.costBasis)} ${esc(p.currency)}</p><p class="data-label">${pt('noChart')}</p>${table([pt('date'),pt('type'),pt('quantity'),pt('price'),pt('fees')],state.events.filter(e=>e.symbol===symbol).map(e=>`<tr><td data-user-content>${esc(e.timestamp)}</td><td data-user-content>${esc(bookingLabel(e.type))}</td><td data-user-content>${esc(e.quantity)}</td><td data-user-content>${esc(e.price)} ${esc(e.currency)}</td><td data-user-content>${esc(e.fee??'0')} ${esc(e.feeCurrency??e.currency)}</td></tr>`))}`;
}
export function transactionPanel(state){
 return `<section class="card dashboard-section"><h2>${pt('transactions')}</h2><div class="toolbar"><label>${pt('search')}<input id="ledger-search" type="search"></label><label>${pt('type')}<select id="ledger-type"><option value="">${pt('all')}</option>${['DEPOSIT','WITHDRAWAL','BUY','SELL','FX','FEE','FINANCING','MARGIN_DRAW','MARGIN_REPAY'].map(type=>`<option value="${type}">${esc(bookingLabel(type))}</option>`).join('')}</select></label><label>${pt('from')}<input id="ledger-from" type="date"></label><label>${pt('until')}<input id="ledger-until" type="date"></label><label>${pt('sort')}<select id="ledger-sort"><option value="newest">${pt('newest')}</option><option value="oldest">${pt('oldest')}</option></select></label><button type="button" class="secondary" id="ledger-filter-reset">${pt('reset')}</button></div><div id="ledger-filter-results"></div><div class="toolbar"><button class="secondary" id="ledger-previous">${pt('previous')}</button><span id="ledger-page" role="status"></span><button class="secondary" id="ledger-next">${pt('next')}</button></div></section>`;
}
export function renderTransactions(events){return table([pt('date'),pt('type'),'Ticker',pt('amount'),pt('price'),'USD / EUR',pt('fees'),pt('reference')],events.map(e=>`<tr><td data-user-content>${esc(e.timestamp)}</td><td data-user-content>${esc(bookingLabel(e.type))}</td><td data-user-content>${esc(e.symbol)}</td><td data-user-content>${esc(e.quantity??e.amount)}</td><td data-user-content>${esc(e.price??e.toAmount??'—')}</td><td data-user-content>${esc(e.currency)}${e.toCurrency?' → '+esc(e.toCurrency):''}</td><td data-user-content>${esc(e.fee??'0')} ${esc(e.feeCurrency??e.currency)}</td><td data-user-content>${esc(e.reference)}</td></tr>`));}
export function journalFilterPanel(){return `<div class="toolbar"><label>${pt('journalSearch')}<input id="journal-search" type="search"></label><label>${pt('status')}<select id="journal-filter-status"><option value="">${pt('all')}</option>${['draft','planned','active','closed','reviewed','cancelled'].map(s=>`<option value="${s}">${jt(s)}</option>`).join('')}</select></label><label>${pt('from')}<input id="journal-from" type="date"></label><label>${pt('until')}<input id="journal-until" type="date"></label><label>${pt('sort')}<select id="journal-sort"><option value="newest">${pt('newest')}</option><option value="oldest">${pt('oldest')}</option></select></label><button class="secondary" id="journal-filter-reset" type="button">${pt('reset')}</button></div><p id="journal-filter-status-text" role="status"></p>`;}
export function linkedFillPanel(state,row){const events=(row.eventIds||[]).map(id=>state.events.find(e=>e.id===id)).filter(Boolean).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));return `<h3>${pt('fills')}</h3>${events.length?renderTransactions(events):`<p class="data-label">${pt('noFills')}</p>`}`;}

export function historicalValuePanel(state,feeds,asOf=new Date().toISOString()){
 if(!state)return '';
 const h=historicalValuationHistory(state.events,[...feeds.values()],{asOf,allowMargin:state.preferences.allowMargin,method:state.preferences.costMethod});
 return `<section class="card dashboard-section"><h2>${pt('valueHistory')}</h2><p class="data-label">${pt('valueHistoryNote')}</p>${!h.sampledPoints?`<p>${pt('noHistoryPrices')}</p>`:['USD','EUR'].map(currency=>{
  const points=h.series[currency],numbers=points.filter(p=>p.value!==null).map(p=>Number(p.value));
  const low=Math.min(...numbers),range=Math.max(...numbers)-low||1,first=Date.parse(points[0].timestamp),span=Date.parse(points.at(-1).timestamp)-first||1;
  const segments=[];let segment=[];for(const p of points){if(p.value===null){if(segment.length)segments.push(segment);segment=[];}else segment.push(`${40+560*(Date.parse(p.timestamp)-first)/span},${180-140*(Number(p.value)-low)/range}`);}if(segment.length)segments.push(segment);
  return `<h3>${currency}</h3>${numbers.length?`<svg class="performance-chart" viewBox="0 0 640 220" role="img" aria-label="${esc(pt('valueHistory'))} ${currency}"><title>${esc(pt('valueHistory'))} ${currency}</title><path d="M40 30V180H600" fill="none" stroke="currentColor" opacity=".3"/>${segments.map(segment=>segment.length>1?`<polyline points="${segment.join(' ')}" fill="none" stroke="currentColor" stroke-width="3"/>`:`<circle cx="${segment[0].split(',')[0]}" cy="${segment[0].split(',')[1]}" r="3" fill="currentColor"/>`).join('')}<text x="40" y="205" fill="currentColor">${esc(points[0].timestamp.slice(0,10))}</text><text x="480" y="205" fill="currentColor">${esc(points.at(-1).timestamp.slice(0,10))}</text></svg>`:''}${table([pt('date'),currency,pt('allocation')],points.map(p=>`<tr><td data-user-content>${esc(p.timestamp)}</td><td data-user-content>${esc(p.value??'—')}</td><td data-user-content>${p.coveredPositions}/${p.openPositions}</td></tr>`))}`;
 }).join('')}</section>`;
}
