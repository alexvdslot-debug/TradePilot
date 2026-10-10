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
