import { calculateLedger, validateEvent, LedgerError, MAX_LEDGER_EVENTS } from './ledger.mjs';
import { classifyCandleSession } from './market-quality.mjs';

// Valuation uses 18 decimals: a 6-decimal position times a 12-decimal quote is exact.
const SCALE = 10n ** 18n;
const CURRENCIES = ['EUR', 'USD'];
const SESSIONS = new Set(['regular', 'premarket', 'afterhours']);
const fail = code => { throw new LedgerError(code); };
function units(value) {
  if (typeof value !== 'string' || !/^-?\d{1,40}(?:\.\d{1,18})?$/.test(value)) fail('INVALID_VALUATION_DECIMAL');
  const negative = value.startsWith('-');
  const [integer, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const result = BigInt(integer) * SCALE + BigInt(fraction.padEnd(18, '0'));
  return negative ? -result : result;
}
function display(value) {
  const absolute = value < 0n ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(18, '0').replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}
function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) fail('INVALID_PORTFOLIO_TIMESTAMP');
  const date = new Date(value);
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== canonical) fail('INVALID_PORTFOLIO_TIMESTAMP');
  return date.toISOString();
}

/** Reproducible ledger at a UTC instant. Quotes never modify historical cash or execution costs. */
export function projectLedger(events, { asOf, allowMargin = false, method = 'average' } = {}) {
  const instant = timestamp(asOf);
  if (!Array.isArray(events) || events.length > MAX_LEDGER_EVENTS) fail('EVENT_LIMIT');
  const canonical = Array.from(events, validateEvent);
  if (new Set(canonical.map(event => event.id)).size !== canonical.length) fail('DUPLICATE_EVENT_ID');
  const included = canonical.filter(event => event.timestamp <= instant);
  return { ...calculateLedger(included, { allowMargin, method }), asOf: instant, eventCount: included.length, excludedEventCount: canonical.length - included.length };
}

/** Execution-derived cumulative realized P&L. Deposits/FX never become returns. */
export function realizedHistory(events, { asOf = new Date().toISOString(), allowMargin = false, method = 'average' } = {}) {
  const point = timestamp(asOf);
  if (!Array.isArray(events) || events.length > MAX_LEDGER_EVENTS) fail('EVENT_LIMIT');
  const normalized = Array.from(events, validateEvent);
  // Validate duplicates across the full import, including rows after the cutoff.
  if (new Set(normalized.map(event => event.id)).size !== normalized.length) fail('DUPLICATE_EVENT_ID');
  const included = normalized.map((event,index)=>({...event,index})).filter(event=>event.timestamp<=point)
    .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.index-b.index);
  const ledger = calculateLedger(included.map(({index,...event})=>event),{allowMargin,method,includeRealizations:true});
  const allocations = new Map(ledger.tradeRealizations.map(row=>[row.eventId,row]));
  const cumulative = {EUR:0n,USD:0n};
  const series = {EUR:[],USD:[]};
  if(included.length) for(const currency of CURRENCIES) series[currency].push({timestamp:included[0].timestamp,value:'0',eventId:null});
  for(const event of included){
    const allocation=allocations.get(event.id);
    if(!allocation)continue;
    cumulative[allocation.currency]+=units(allocation.realized);
    series[allocation.currency].push({timestamp:event.timestamp,value:display(cumulative[allocation.currency]),eventId:event.id});
  }
  return {asOf:point,method,basis:'cumulative-realized-average-cost',series,realized:ledger.realized,
    eventCount:included.length,excludedEventCount:events.length-included.length,totalReturnAvailable:false};
}

function evidence(quote, symbol, currency, point, maxAgeMs, historical) {
  const result = { status: 'missing', reasons: ['MISSING_QUOTE'], price: null, source: null, asOf: null, delay: null, realtime: null, marketSession: null };
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)) return result;
  result.status = 'unverified';
  result.reasons = [];
  result.source = typeof quote.source === 'string' && quote.source.trim() && quote.source.length <= 100 ? quote.source : null;
  result.delay = typeof quote.delay === 'number' && Number.isFinite(quote.delay) && quote.delay >= 0 ? quote.delay : null;
  result.realtime = typeof quote.realtime === 'boolean' ? quote.realtime : null;
  result.marketSession = ['regular', 'premarket', 'afterhours', 'closed'].includes(quote.marketSession) ? quote.marketSession : null;
  if (quote.symbol !== symbol || quote.currency !== currency) result.reasons.push('QUOTE_INSTRUMENT_MISMATCH');
  try { result.asOf = timestamp(quote.asOf); } catch { result.reasons.push('INVALID_QUOTE_TIMESTAMP'); }
  let price;
  if (typeof quote.price === 'string' && /^\d{1,18}(?:\.\d{1,12})?$/.test(quote.price)) price = units(quote.price);
  if (!price || price <= 0n) result.reasons.push('INVALID_QUOTE_PRICE');
  if (result.asOf && result.asOf > point) result.reasons.push('QUOTE_AFTER_SNAPSHOT');
  // Invalid identity, price or future timestamp excludes even indicative valuation.
  const unusable = result.reasons.length > 0;
  if (!unusable) result.price = display(price);
  if (!result.source || quote.verified !== true) result.reasons.push('UNVERIFIED_QUOTE_SOURCE');
  if (result.delay === null) result.reasons.push('UNKNOWN_QUOTE_DELAY');
  if (result.asOf && Date.parse(point) - Date.parse(result.asOf) > maxAgeMs) result.reasons.push('STALE_QUOTE');
  if (!historical && !quote.historical && (result.realtime !== true || result.delay !== 0 || !SESSIONS.has(result.marketSession))) result.reasons.push('NONCURRENT_MARKET_DATA');
  if (unusable) result.status = 'unverified';
  else if (result.reasons.includes('STALE_QUOTE')) result.status = 'stale';
  else if (result.reasons.length) result.status = 'unverified';
  else result.status = historical || quote.historical === true ? 'historical' : 'current';
  return result;
}

/** Build a quote from explicitly completed candle evidence; unknown metadata stays unknown. */
export function quoteFromCandles(feed, { now = Date.now() } = {}) {
  if (!feed || typeof feed !== 'object' || !Array.isArray(feed.candles) || !feed.candles.length) return null;
  const clock = typeof now === 'string' ? Date.parse(timestamp(now)) : now;
  if (!Number.isFinite(clock)) fail('INVALID_PORTFOLIO_TIMESTAMP');
  const eligible = feed.candles.filter(candle => {
    if (!candle || candle.complete !== true) return false;
    try { return timestamp(candle.completedAt) > timestamp(candle.time) && Date.parse(candle.completedAt) <= clock; } catch { return false; }
  });
  const last = eligible.reduce((latest, candle) => !latest || candle.completedAt > latest.completedAt ? candle : latest, null);
  if (!last) return null;
  const price = typeof last.c === 'string' ? last.c : typeof last.c === 'number' && Number.isFinite(last.c) ? String(last.c) : null;
  // Candle opening time is not evidence of a completed closing price.
  const completed = typeof last.completedAt === 'string' && last.complete === true;
  let afterOpening = false;
  if (completed) {
    try { afterOpening = timestamp(last.completedAt) > timestamp(last.time) && Date.parse(last.completedAt) <= clock; } catch { /* Unverified below. */ }
  }
  const clockSession = classifyCandleSession(new Date(clock).toISOString(), { exchange: feed.exchange, exchangeTimezone: feed.exchangeTimezone });
  return {
    symbol: feed.symbol, currency: feed.currency, price,
    source: feed.source ?? feed.provider, asOf: completed ? last.completedAt : last.time,
    delay: feed.delay, realtime: feed.realtime, marketSession: feed.marketSession,
    verified: feed.verified === true && completed && afterOpening,
    historical: feed.historical === true || feed.marketSession === 'closed' || clockSession.session === 'closed',
    kind: 'candle-close',
  };
}

/** Valuation and concentration with coverage disclosure; no performance or tax claim. */
export function calculatePortfolio(events, {
  quotes = {}, fx = null, now = new Date().toISOString(), asOf = null,
  maxAgeMs = 900000, allowMargin = false, method = 'average',
} = {}) {
  const clock = timestamp(now), historical = asOf !== null;
  const point = historical ? timestamp(asOf) : clock;
  if (point > clock) fail('SNAPSHOT_AFTER_NOW');
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0 || maxAgeMs > 86400000) fail('INVALID_QUOTE_MAX_AGE');
  if (!quotes || typeof quotes !== 'object' || Array.isArray(quotes)) fail('INVALID_QUOTES');
  const ledger = projectLedger(events, { asOf: point, allowMargin, method });
  const qualifyingStatus = historical ? 'historical' : 'current';
  const sums = { EUR: 0n, USD: 0n }, indicative = { EUR: 0n, USD: 0n };
  const counts = { EUR: { open: 0, covered: 0 }, USD: { open: 0, covered: 0 } };
  const positions = ledger.positions.map(position => {
    const quantity = units(position.quantity), open = quantity > 0n;
    const quote = open ? evidence(Object.hasOwn(quotes, position.symbol) ? quotes[position.symbol] : null, position.symbol, position.currency, point, maxAgeMs, historical) : { status: 'closed', reasons: [], price: null, source: null, asOf: null, delay: null, realtime: null, marketSession: null };
    const value = quote.price !== null ? quantity * units(quote.price) / SCALE : null;
    const eligible = open && quote.status === qualifyingStatus;
    if (open) counts[position.currency].open++;
    if (eligible) { counts[position.currency].covered++; sums[position.currency] += value; }
    if (value !== null) indicative[position.currency] += value;
    return {
      ...position, quote, marketValue: value === null ? null : display(value),
      unrealized: value === null ? null : display(value - units(position.costBasis)),
      covered: eligible, coveredWeightPercent: null,
    };
  });
  for (const position of positions) {
    if (position.covered && sums[position.currency] > 0n) position.coveredWeightPercent = display(units(position.marketValue) * 100n * SCALE / sums[position.currency]);
  }
  const totals = Object.fromEntries(CURRENCIES.map(currency => {
    const complete = counts[currency].open === counts[currency].covered;
    const cash = units(ledger.cash[currency]), debt = units(ledger.margin[currency]);
    return [currency, {
      cash: ledger.cash[currency], marginPrincipal: ledger.margin[currency],
      coveredEquityValue: display(sums[currency]), indicativeEquityValue: display(indicative[currency]),
      equityValue: complete ? display(sums[currency]) : null,
      netAssetValue: complete ? display(sums[currency] + cash - debt) : null,
      complete, openPositions: counts[currency].open, coveredPositions: counts[currency].covered,
    }];
  }));
  const complete = CURRENCIES.every(currency => totals[currency].complete);
  const fxEvidence = evidence(fx ? { ...fx, price: fx.rate ?? fx.price } : null, 'USD/EUR', 'EUR', point, maxAgeMs, historical);
  const usd = totals.USD.netAssetValue !== null ? units(totals.USD.netAssetValue) : null;
  const needsFX = usd === null || usd !== 0n;
  const fxComplete = !needsFX || fxEvidence.status === qualifyingStatus;
  const euro = complete && fxComplete ? display(units(totals.EUR.netAssetValue) + (needsFX ? usd * units(fxEvidence.price) / SCALE : 0n)) : null;
  const eurNative=totals.EUR.netAssetValue!==null?units(totals.EUR.netAssetValue):null;
  const needsUSDFX=eurNative===null||eurNative!==0n;
  const dollar=complete&&(!needsUSDFX||fxEvidence.status===qualifyingStatus)?display(units(totals.USD.netAssetValue)+(needsUSDFX?eurNative*SCALE/units(fxEvidence.price):0n)):null;
  // Separate, visibly unverified estimate: all holdings must at least have usable indicative prices.
  const indicativeCoverageComplete = positions.every(position => units(position.quantity) === 0n || position.marketValue !== null);
  const indicativeUSD = indicative.USD + units(ledger.cash.USD) - units(ledger.margin.USD);
  const indicativeEUR = indicative.EUR + units(ledger.cash.EUR) - units(ledger.margin.EUR);
  const indicativeFXComplete = indicativeUSD === 0n || fxEvidence.price !== null;
  const unverifiedEuro = indicativeCoverageComplete && indicativeFXComplete ? display(indicativeEUR + (indicativeUSD !== 0n ? indicativeUSD * units(fxEvidence.price) / SCALE : 0n)) : null;
  return {
    ...ledger, positions, totals, mode: historical ? 'historical' : 'current',
    valuationComplete: complete, currentValuationComplete: !historical && complete,
    asOf: point, evaluatedAt: clock, maxAgeMs,
    indicativeEURValue: euro, currentEURValue: !historical ? euro : null,
    indicativeUSDValue:dollar,currentUSDValue:!historical?dollar:null,
    indicativeUnverifiedEURValue: unverifiedEuro,
    indicativeUnverifiedEURComplete: indicativeCoverageComplete && indicativeFXComplete,
    eurValuationComplete: complete && fxComplete, fx: { ...fxEvidence, required: needsFX },
    concentration: {
      basis: 'covered-equity-market-value-per-currency', excludesCash: true, excludesMargin: true,
      complete, coveredPositions: positions.filter(position => position.covered).length,
      openPositions: positions.filter(position => units(position.quantity) > 0n).length,
      excludedSymbols: positions.filter(position => units(position.quantity) > 0n && !position.covered).map(position => position.symbol),
    },
  };
}

/** Historical value from observed completed source candles; missing holdings produce gaps. */
export function historicalValuationHistory(events, feeds, {asOf=new Date().toISOString(),maxPoints=60,allowMargin=false,method='average'}={}) {
 const point=timestamp(asOf);
 if(!Array.isArray(feeds)||!Number.isSafeInteger(maxPoints)||maxPoints<2||maxPoints>120)fail('INVALID_HISTORY_INPUT');
 projectLedger(events,{asOf:point,allowMargin,method});
 const times=[...new Set(feeds.flatMap(feed=>feed?.verified===true&&Array.isArray(feed.candles)?feed.candles.filter(c=>c.complete===true&&typeof c.completedAt==='string'&&Number.isFinite(Date.parse(c.completedAt))&&Date.parse(c.completedAt)<=Date.parse(point)).map(c=>timestamp(c.completedAt)):[]))].sort();
 const sampled=times.length<=maxPoints?times:Array.from({length:maxPoints},(_,i)=>times[Math.round(i*(times.length-1)/(maxPoints-1))]);
 const series={EUR:[],USD:[]};
 for(const time of sampled){
  const quotes=Object.fromEntries(feeds.filter(feed=>feed?.verified===true).map(feed=>[feed.symbol,quoteFromCandles(feed,{now:time})]));
  const p=calculatePortfolio(events,{asOf:time,now:point,quotes,allowMargin,method});
  for(const currency of CURRENCIES){
   const holdings=p.positions.filter(p=>p.currency===currency&&units(p.quantity)>0n);
   const complete=holdings.every(p=>p.marketValue!==null&&p.quote.source&&p.quote.asOf&&Date.parse(time)-Date.parse(p.quote.asOf)<=900000);
   const value=complete?display(holdings.reduce((sum,p)=>sum+units(p.marketValue),units(p.cash[currency])-units(p.margin[currency]))):null;
   series[currency].push({timestamp:time,value,coveredPositions:holdings.filter(p=>p.marketValue!==null).length,openPositions:holdings.length});
  }
 }
 return {asOf:point,series,basis:'observed-completed-candle-value-including-cash-minus-margin',indicative:true,totalReturnAvailable:false,sourceCount:feeds.filter(f=>f?.verified===true).length,sampledPoints:sampled.length};
}
