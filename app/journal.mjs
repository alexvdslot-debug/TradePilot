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
  trades.push({journalId:row.id,symbol:row.symbol,currency,eventIds:[...row.eventIds],closedAt:linked.at(-1).timestamp,netByCurrency:{EUR:decimal(net.EUR),USD:decimal(net.USD)},outcome});
 }
 const wins=trades.filter(row=>row.outcome==='profit').length,losses=trades.filter(row=>row.outcome==='loss').length,breakeven=trades.filter(row=>row.outcome==='breakeven').length;
 const classified=wins+losses+breakeven;
 return {trades,closedCount:trades.length,excludedCount:journal.length-trades.length,wins,losses,breakeven,mixedCurrencyCount:trades.length-classified,winRate:classified?wins/classified:null,netByCurrency:{EUR:decimal(totals.EUR),USD:decimal(totals.USD)},method};
}
