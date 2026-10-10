import {calculateLedger,validateEvent} from './ledger.mjs';

const SCALE=10n**12n;
const units=value=>{const [whole,fraction='']=value.replace(/^-/,'').split('.');const amount=BigInt(whole)*SCALE+BigInt(fraction.padEnd(12,'0'));return value.startsWith('-')?-amount:amount};
const decimal=value=>{const absolute=value<0n?-value:value;const fraction=(absolute%SCALE).toString().padStart(12,'0').replace(/0+$/,'');return `${value<0n?'-':''}${absolute/SCALE}${fraction?'.'+fraction:''}`};

/** Legacy journal rows without linkage remain valid; no event can belong to two plans. */
export function validateJournalLinks(journal,events){
 if(!Array.isArray(journal)||!Array.isArray(events))throw Error('INVALID_JOURNAL_LINKS');
 const byId=new Map(events.map(event=>[event.id,event]));
 const linked=new Set();
 for(const row of journal){
  if(!row||typeof row!=='object')throw Error('INVALID_JOURNAL_LINKS');
  if(row.eventIds===undefined)continue;
  if(!Array.isArray(row.eventIds)||row.eventIds.length>2000||new Set(row.eventIds).size!==row.eventIds.length)throw Error('INVALID_JOURNAL_LINKS');
  for(const eventId of row.eventIds){
   const event=byId.get(eventId);
   if(typeof eventId!=='string'||!event||!['BUY','SELL'].includes(event.type)||event.symbol!==row.symbol||linked.has(eventId))throw Error('INVALID_JOURNAL_LINKS');
   linked.add(eventId);
  }
 }
 return journal;
}

/** Actual average-cost results only. Currency balances are never combined without FX. */
export function journalStatistics(journal,events,{allowMargin=false,method='average'}={}){
 validateJournalLinks(journal,events);
 const accounting=calculateLedger(events,{allowMargin,method,includeRealizations:true});
 const normalized=events.map(validateEvent);
 const byId=new Map(normalized.map((event,index)=>[event.id,{...event,index}]));
 const realized=new Map(accounting.tradeRealizations.map(row=>[row.eventId,row]));
 const trades=[];const totals={EUR:0n,USD:0n};
 for(const row of journal){
  if(!['executed','reviewed'].includes(row.status)||!row.eventIds?.length)continue;
  const linked=row.eventIds.map(eventId=>byId.get(eventId)).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.index-b.index);
  let quantity=0n,hasBuy=false,hasSell=false,invalidCycle=false;const net={EUR:0n,USD:0n};const currencies=new Set();
  for(const event of linked){
   const amount=units(event.quantity);currencies.add(event.currency);
   if(event.type==='BUY'){quantity+=amount;hasBuy=true}else{
    quantity-=amount;hasSell=true;if(quantity<0n)invalidCycle=true;
    const allocation=realized.get(event.id);if(!allocation)throw Error('MISSING_TRADE_REALIZATION');
    net[event.currency]+=units(allocation.realized);
   }
   // Same-currency buy fees are already allocated to cost basis; sale fees to realized P&L.
   if(event.feeCurrency!==event.currency)net[event.feeCurrency]-=units(event.fee);
  }
  if(!hasBuy||!hasSell||quantity!==0n||invalidCycle||currencies.size!==1)continue;
  const currency=[...currencies][0];const other=currency==='USD'?'EUR':'USD';
  const outcome=net[other]!==0n?'mixed_currency':net[currency]>0n?'profit':net[currency]<0n?'loss':'breakeven';
  totals.EUR+=net.EUR;totals.USD+=net.USD;
  const openedAt=linked.find(event=>event.type==='BUY').timestamp,closedAt=linked.at(-1).timestamp;
  const riskEligible=typeof row.initialRisk==='string'&&positive(row.initialRisk)&&row.riskCurrency===currency&&net[other]===0n&&typeof row.riskRecordedAt==='string'&&Number.isFinite(Date.parse(row.riskRecordedAt))&&Date.parse(row.riskRecordedAt)<=Date.parse(openedAt);
  trades.push({journalId:row.id,symbol:row.symbol,currency,eventIds:[...row.eventIds],openedAt,closedAt,durationHours:(Date.parse(closedAt)-Date.parse(openedAt))/3600000,rMultiple:riskEligible?decimal(net[currency]*SCALE/units(row.initialRisk)):null,netByCurrency:{EUR:decimal(net.EUR),USD:decimal(net.USD)},outcome});
 }
 const wins=trades.filter(row=>row.outcome==='profit').length,losses=trades.filter(row=>row.outcome==='loss').length,breakeven=trades.filter(row=>row.outcome==='breakeven').length;
 const classified=wins+losses+breakeven;
 const metrics=Object.fromEntries(['EUR','USD'].map(currency=>{const rows=trades.filter(t=>t.currency===currency&&t.outcome!=='mixed_currency'),profits=rows.reduce((sum,t)=>units(t.netByCurrency[currency])>0n?sum+units(t.netByCurrency[currency]):sum,0n),loss=rows.reduce((sum,t)=>units(t.netByCurrency[currency])<0n?sum-units(t.netByCurrency[currency]):sum,0n);return [currency,{sampleCount:rows.length,expectancy:rows.length?decimal(rows.reduce((sum,t)=>sum+units(t.netByCurrency[currency]),0n)/BigInt(rows.length)):null,profitFactor:loss>0n?decimal(profits*SCALE/loss):null}]}));
 const rTrades=trades.filter(t=>t.rMultiple!==null),averageR=rTrades.length?decimal(rTrades.reduce((sum,t)=>sum+units(t.rMultiple),0n)/BigInt(rTrades.length)):null;
 return {trades,metrics,rSampleCount:rTrades.length,averageR,averageDurationHours:trades.length?trades.reduce((sum,t)=>sum+t.durationHours,0)/trades.length:null,closedCount:trades.length,excludedCount:journal.length-trades.length,wins,losses,breakeven,mixedCurrencyCount:trades.length-classified,winRate:classified?wins/classified:null,netByCurrency:{EUR:decimal(totals.EUR),USD:decimal(totals.USD)},method};
}

const optionalPlanFields=['initialQuantity','initialRisk','riskRecordedAt','riskCurrency','setup','catalyst','horizonDays','checklist','attachments','history'];
const safeText=(value,max)=>typeof value==='string'&&value.length<=max&&!/[<>\u0000-\u0008\u000b-\u001f\u007f]/.test(value);
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const positive=value=>typeof value==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(value)&&/[1-9]/.test(value);
export const JOURNAL_OPTIONAL_FIELDS=Object.freeze(['eventIds',...optionalPlanFields]);
export function validateJournalDetails(row){
 if(!['draft','planned','executed','reviewed','cancelled'].includes(row.status))throw Error('INVALID_JOURNAL');
 for(const key of ['initialQuantity','initialRisk'])if(row[key]!==undefined&&!positive(row[key]))throw Error('INVALID_JOURNAL');
 if(row.riskRecordedAt!==undefined&&(typeof row.riskRecordedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(row.riskRecordedAt)||!Number.isFinite(Date.parse(row.riskRecordedAt))))throw Error('INVALID_JOURNAL');
 if(row.initialRisk!==undefined&&!['USD','EUR'].includes(row.riskCurrency))throw Error('INVALID_JOURNAL');
 if(row.riskCurrency!==undefined&&!['USD','EUR'].includes(row.riskCurrency))throw Error('INVALID_JOURNAL');
 for(const key of ['setup','catalyst'])if(row[key]!==undefined&&!safeText(row[key],1000))throw Error('INVALID_JOURNAL');
 if(row.horizonDays!==undefined&&(!Number.isInteger(row.horizonDays)||row.horizonDays<1||row.horizonDays>5))throw Error('INVALID_JOURNAL');
 if(row.checklist!==undefined&&(!exactKeys(row.checklist,['dataChecked','riskChecked','costsChecked','invalidationChecked'])||Object.values(row.checklist).some(value=>typeof value!=='boolean')))throw Error('INVALID_JOURNAL');
 if(row.attachments!==undefined){
  if(!Array.isArray(row.attachments)||row.attachments.length>4||new Set(row.attachments.map(a=>a?.id)).size!==row.attachments.length)throw Error('INVALID_JOURNAL_ATTACHMENT');
  let images=0;
  for(const attachment of row.attachments){
   if(!attachment||!safeText(attachment.id,100)||!attachment.id||!safeText(attachment.name,100)||!attachment.name)throw Error('INVALID_JOURNAL_ATTACHMENT');
   if(attachment.kind==='link'){
    if(!exactKeys(attachment,['id','name','kind','url'])||!safeText(attachment.url,2048))throw Error('INVALID_JOURNAL_ATTACHMENT');
    let url;try{url=new URL(attachment.url)}catch{throw Error('INVALID_JOURNAL_ATTACHMENT')}
    if(url.protocol!=='https:'||url.username||url.password)throw Error('INVALID_JOURNAL_ATTACHMENT');
   }else if(attachment.kind==='image'){
    if(++images>2||!exactKeys(attachment,['id','name','kind','dataUrl'])||typeof attachment.dataUrl!=='string'||attachment.dataUrl.length>54000)throw Error('INVALID_JOURNAL_ATTACHMENT');
    const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(attachment.dataUrl);
    if(!match||match[2].length%4!==0)throw Error('INVALID_JOURNAL_ATTACHMENT');
    let bytes;try{bytes=atob(match[2])}catch{throw Error('INVALID_JOURNAL_ATTACHMENT')}
    if(bytes.length>40000||bytes.length<12)throw Error('INVALID_JOURNAL_ATTACHMENT');
    const codes=[...bytes.slice(0,8)].map(char=>char.charCodeAt(0));
    if(match[1]==='png'&&!codes.every((value,index)=>value===[137,80,78,71,13,10,26,10][index]))throw Error('INVALID_JOURNAL_ATTACHMENT');
    if(match[1]==='jpeg'&&(codes[0]!==255||codes[1]!==216||codes[2]!==255||bytes.charCodeAt(bytes.length-2)!==255||bytes.charCodeAt(bytes.length-1)!==217))throw Error('INVALID_JOURNAL_ATTACHMENT');
   }else throw Error('INVALID_JOURNAL_ATTACHMENT');
  }
 }
 if(row.history!==undefined&&(!Array.isArray(row.history)||row.history.length>100||row.history.some(item=>!exactKeys(item,['at','action'])||!safeText(item.action,100)||typeof item.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(item.at)||!Number.isFinite(Date.parse(item.at)))))throw Error('INVALID_JOURNAL');
 return row;
}

/** The original plan freezes when execution is recorded; evaluation stays editable. */
export function validateJournalChanges(next,previous,events){
 const byId=new Map(previous.map(row=>[row.id,row]));
 for(const old of previous){if(!next.some(row=>row.id===old.id)&&(['executed','reviewed'].includes(old.status)||(old.eventIds||[]).some(id=>events.some(event=>event.id===id&&event.type==='BUY'))))throw Error('JOURNAL_PLAN_IMMUTABLE');}
 for(const row of next){
  validateJournalDetails(row);const old=byId.get(row.id);if(!old)continue;
  const executed=['executed','reviewed'].includes(old.status)||(old.eventIds||[]).some(id=>events.some(event=>event.id===id&&event.type==='BUY'));
  if(executed){
   for(const key of ['symbol','createdAt','thesis','entry','stop','target1','target2','initialQuantity','initialRisk','riskRecordedAt','riskCurrency','setup','catalyst','horizonDays','checklist'])if(JSON.stringify(row[key])!==JSON.stringify(old[key]))throw Error('JOURNAL_PLAN_IMMUTABLE');
   if(['draft','planned','cancelled'].includes(row.status))throw Error('JOURNAL_PLAN_IMMUTABLE');
  }
  if(old.history?.some((item,index)=>JSON.stringify(row.history?.[index])!==JSON.stringify(item)))throw Error('JOURNAL_HISTORY_IMMUTABLE');
 }
 return next;
}

/** Lifecycle follows actual linked fills, not a scenario's price levels. */
export function journalLifecycle(row,events){
 const byId=new Map(events.map(event=>[event.id,event]));
 const linked=(row.eventIds||[]).map(id=>byId.get(id)).filter(Boolean).map(validateEvent).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 let quantity=0n,buys=false,sells=false,invalid=false;
 for(const event of linked){if(event.symbol!==row.symbol||!['BUY','SELL'].includes(event.type)){invalid=true;continue;}quantity+=event.type==='BUY'?units(event.quantity):-units(event.quantity);buys ||= event.type==='BUY';sells ||= event.type==='SELL';if(quantity<0n)invalid=true;}
 const closed=buys&&sells&&quantity===0n&&!invalid;
 const status=buys&&!invalid?(closed?(row.status==='reviewed'?'reviewed':'closed'):'active'):['draft','cancelled'].includes(row.status)?row.status:'planned';
 return {status,quantity:decimal(quantity),hasExecutions:buys,closed,editable:!buys&&!['executed','reviewed'].includes(row.status),invalid,openedAt:linked.find(e=>e.type==='BUY')?.timestamp??null,closedAt:closed?linked.at(-1).timestamp:null};
}

/** Spreadsheet-safe summary export; private images remain in the explicit JSON export. */
export function exportJournalCSV(journal,events=[]){
 const headers=['schema_version','id','symbol','created_at','lifecycle','entry','stop','target_1','target_2','initial_risk','risk_currency','risk_recorded_at','thesis','evaluation','event_ids'];
 const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]|^[\t\r]/.test(text))text="'"+text;return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;};
 return [headers,...journal.map(row=>['1',row.id,row.symbol,row.createdAt,journalLifecycle(row,events).status,row.entry,row.stop,row.target1,row.target2,row.initialRisk,row.riskCurrency,row.riskRecordedAt,row.thesis,row.evaluation,(row.eventIds||[]).join('|')])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
