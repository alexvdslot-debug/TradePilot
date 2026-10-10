import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePortfolio, projectLedger, quoteFromCandles } from '../app/portfolio.mjs';
import { previewMappedCSV, listCSVHeaders } from '../app/import-mapping.mjs';
import { parseLedgerCSV, calculateLedger } from '../app/ledger.mjs';

const NOW = '2026-10-09T14:10:00Z';
let id = 0;
const event = (type, fields = {}) => ({ id: `portfolio-${++id}`, timestamp: '2026-10-09T14:00:00Z', type, currency: 'USD', ...fields });
const deposit = (amount, currency = 'USD') => event('DEPOSIT', { amount, currency });
const buy = (symbol, quantity, price, fields = {}) => event('BUY', { symbol, quantity, price, ...fields });
const sell = (symbol, quantity, price, fields = {}) => event('SELL', { symbol, quantity, price, ...fields });
const quote = (symbol, price, fields = {}) => ({ symbol, price, currency: 'USD', source: 'fixture-source', asOf: '2026-10-09T14:09:00Z', delay: 0, realtime: true, verified: true, marketSession: 'regular', ...fields });
const fx = fields => quote('USD/EUR', '0.9', { currency: 'EUR', ...fields });
const failure = (run, code) => assert.throws(run, exception => exception.code === code);

test('empty ledger values zero without invented quote or FX evidence', () => {
  const result = calculatePortfolio([], { now: NOW });
  assert.equal(result.currentEURValue, '0');
  assert.equal(result.fx.status, 'missing');
  assert.equal(result.fx.required, false);
  assert.deepEqual(result.positions, []);
  assert.doesNotThrow(() => JSON.stringify(result));
});

test('partial sale with fees reports exact unrealized and realized separately', () => {
  const result = calculatePortfolio([deposit('10000'), buy('OPEN', '100', '3', { fee: '1' }), sell('OPEN', '40', '3.5', { fee: '1' })], { now: NOW, quotes: { OPEN: quote('OPEN', '4') }, fx: fx() });
  assert.equal(result.cash.USD, '9838');
  assert.equal(result.realized.USD, '18.6');
  assert.equal(result.positions[0].marketValue, '240');
  assert.equal(result.positions[0].unrealized, '59.4');
  assert.equal(result.totals.USD.netAssetValue, '10078');
  assert.equal(result.currentEURValue, '9070.2');
  assert.equal(result.currentValuationComplete, true);
  assert.equal(result.positions[0].coveredWeightPercent, '100');
});

test('concentration excludes cash margin and unpriced positions with explicit coverage', () => {
  const result = calculatePortfolio([deposit('1000'), buy('AAA', '10', '2'), buy('BBB', '10', '3'), buy('CCC', '1', '1'), event('MARGIN_DRAW', { amount: '100' })], { now: NOW, allowMargin: true, quotes: { AAA: quote('AAA', '2'), BBB: quote('BBB', '3') } });
  assert.equal(result.positions[0].coveredWeightPercent, '40');
  assert.equal(result.positions[1].coveredWeightPercent, '60');
  assert.equal(result.positions[2].coveredWeightPercent, null);
  assert.deepEqual(result.concentration.excludedSymbols, ['CCC']);
  assert.equal(result.concentration.coveredPositions, 2);
  assert.equal(result.concentration.openPositions, 3);
  assert.equal(result.concentration.excludesCash, true);
  assert.equal(result.concentration.excludesMargin, true);
  assert.equal(result.totals.USD.coveredEquityValue, '50');
  assert.equal(result.totals.USD.netAssetValue, null);
  assert.equal(result.currentEURValue, null);
});

test('margin principal deducted once while negative cash stays separately represented', () => {
  const result = calculatePortfolio([event('MARGIN_DRAW', { amount: '100' }), buy('OPEN', '10', '12')], { now: NOW, allowMargin: true, quotes: { OPEN: quote('OPEN', '13') } });
  assert.equal(result.cash.USD, '-20');
  assert.equal(result.totals.USD.marginPrincipal, '100');
  assert.equal(result.totals.USD.netAssetValue, '10');
});

test('missing quote stays null and never uses average purchase price', () => {
  const result = calculatePortfolio([deposit('10'), buy('OPEN', '1', '2')], { now: NOW });
  assert.equal(result.positions[0].marketValue, null);
  assert.equal(result.positions[0].unrealized, null);
  assert.equal(result.positions[0].quote.status, 'missing');
  assert.equal(result.currentValuationComplete, false);
});

test('stale price can be shown indicatively but cannot enter current totals', () => {
  const result = calculatePortfolio([deposit('10'), buy('OPEN', '1', '2')], { now: NOW, quotes: { OPEN: quote('OPEN', '3', { asOf: '2026-10-09T13:00:00Z' }) } });
  assert.equal(result.positions[0].quote.status, 'stale');
  assert.equal(result.positions[0].marketValue, '3');
  assert.equal(result.positions[0].unrealized, '1');
  assert.equal(result.positions[0].coveredWeightPercent, null);
  assert.equal(result.totals.USD.indicativeEquityValue, '3');
  assert.equal(result.totals.USD.equityValue, null);
});

test('unknown source delay verification and closed session cannot claim current', () => {
  for (const fields of [{ verified: false }, { source: '' }, { delay: null }, { delay: 900 }, { realtime: 'unverified' }, { marketSession: 'closed' }]) {
    const result = calculatePortfolio([deposit('10'), buy('OPEN', '1', '2')], { now: NOW, quotes: { OPEN: quote('OPEN', '3', fields) } });
    assert.equal(result.positions[0].quote.status, 'unverified');
    assert.equal(result.currentValuationComplete, false);
  }
});

test('wrong symbol wrong currency malformed and future quotes excluded even indicatively', () => {
  for (const fields of [{ symbol: 'WRONG' }, { currency: 'EUR' }, { price: 'NaN' }, { price: 3 }, { price: '-1' }, { price: '0' }, { asOf: '2026-10-09T14:11:00Z' }, { asOf: '2026-02-30T14:00:00Z' }]) {
    const result = calculatePortfolio([deposit('10'), buy('OPEN', '1', '2')], { now: NOW, quotes: { OPEN: quote('OPEN', '3', fields) } });
    assert.equal(result.positions[0].marketValue, null);
    assert.equal(result.positions[0].quote.status, 'unverified');
  }
});

test('no FX retains currencies and current per-currency valuations without a combined total', () => {
  const result = calculatePortfolio([deposit('10'), deposit('5', 'EUR'), buy('OPEN', '1', '2')], { now: NOW, quotes: { OPEN: quote('OPEN', '3') } });
  assert.equal(result.totals.USD.netAssetValue, '11');
  assert.equal(result.totals.EUR.netAssetValue, '5');
  assert.equal(result.currentEURValue, null);
  assert.equal(result.eurValuationComplete, false);
  assert.equal(result.fx.required, true);
});

test('stale and inverse FX never yield current combined value', () => {
  for (const fields of [{ asOf: '2026-10-09T13:00:00Z' }, { symbol: 'EUR/USD' }, { verified: false }]) {
    assert.equal(calculatePortfolio([deposit('10')], { now: NOW, fx: fx(fields) }).currentEURValue, null);
  }
});

test('cash-only EUR valuation does not require artificial FX input', () => {
  const result = calculatePortfolio([deposit('5', 'EUR')], { now: NOW });
  assert.equal(result.currentEURValue, '5');
  assert.equal(result.fx.required, false);
});

test('foreign fees remain in own currency through valuation', () => {
  const result = calculatePortfolio([deposit('10'), deposit('5', 'EUR'), buy('OPEN', '1', '2', { fee: '1', feeCurrency: 'EUR' })], { now: NOW, quotes: { OPEN: quote('OPEN', '3') }, fx: fx() });
  assert.equal(result.positions[0].unrealized, '1');
  assert.equal(result.cash.EUR, '4');
  assert.equal(result.currentEURValue, '13.9');
});

test('valuation precision preserves six-by-twelve-decimal products', () => {
  const result = calculatePortfolio([deposit('10'), buy('OPEN', '0.123456', '0.1')], { now: NOW, quotes: { OPEN: quote('OPEN', '0.123456789012') } });
  assert.equal(result.positions[0].marketValue, '0.015241481344265472');
  assert.equal(result.positions[0].unrealized, '0.002895881344265472');
});

test('as-of projection excludes future trades and full exit appears only when effective', () => {
  const events = [deposit('10'), buy('OPEN', '1', '2'), sell('OPEN', '1', '3', { timestamp: '2026-10-09T14:20:00Z' })];
  const result = projectLedger(events, { asOf: NOW });
  assert.equal(result.positions[0].quantity, '1');
  assert.equal(result.realized.USD, '0');
  assert.equal(result.eventCount, 2);
  assert.equal(result.excludedEventCount, 1);
  assert.equal(projectLedger(events, { asOf: '2026-10-09T14:20:00Z' }).positions[0].quantity, '0');
});

test('historical valuation uses only quote evidence at or before snapshot and cannot claim current', () => {
  const events = [deposit('10'), buy('OPEN', '1', '2')];
  const options = { now: '2026-10-10T12:00:00Z', asOf: NOW, quotes: { OPEN: quote('OPEN', '3') }, fx: fx() };
  const result = calculatePortfolio(events, options);
  assert.equal(result.mode, 'historical');
  assert.equal(result.positions[0].quote.status, 'historical');
  assert.equal(result.indicativeEURValue, '9.9');
  assert.equal(result.currentEURValue, null);
  assert.equal(result.currentValuationComplete, false);
  assert.deepEqual(result, calculatePortfolio(events, options));
  const invalid = calculatePortfolio(events, { ...options, quotes: { OPEN: quote('OPEN', '4', { asOf: '2026-10-09T14:11:00Z' }) } });
  assert.equal(invalid.positions[0].marketValue, null);
});

test('historical flag remains historical even when its timestamp appears fresh', () => {
  const result = calculatePortfolio([deposit('10'), buy('OPEN', '1', '2')], { now: NOW, quotes: { OPEN: quote('OPEN', '3', { historical: true, marketSession: 'closed' }) } });
  assert.equal(result.positions[0].quote.status, 'historical');
  assert.equal(result.currentValuationComplete, false);
});

test('candle adapter requires completedAt evidence and never promotes unknown metadata', () => {
  const feed = { symbol: 'OPEN', currency: 'USD', provider: 'fixture-source', delay: 0, realtime: true, verified: true, stale: false, marketSession: 'regular', candles: [{ time: '2026-10-09T14:00:00Z', c: 3 }] };
  assert.equal(quoteFromCandles(feed), null);
  const complete = { ...feed, candles: [{ ...feed.candles[0], completedAt: '2026-10-09T14:05:00Z', complete: true }] };
  assert.equal(quoteFromCandles(complete).verified, true);
  assert.equal(quoteFromCandles({ ...complete, currency: undefined }).currency, undefined);
  assert.equal(quoteFromCandles({ ...complete, marketSession: 'closed' }).historical, true);
  assert.equal(quoteFromCandles({ ...complete, verified: undefined }).verified, false);
  assert.equal(quoteFromCandles({ candles: [] }), null);
  const forming = { ...complete, candles: [...complete.candles, { time: '2026-10-09T14:10:00Z', completedAt: '2026-10-09T14:15:00Z', complete: false, c: 999 }] };
  assert.equal(quoteFromCandles(forming, { now: NOW }).price, '3');
  assert.equal(quoteFromCandles(forming, { now: NOW }).asOf, '2026-10-09T14:05:00Z');
  assert.equal(quoteFromCandles({ ...complete, exchange: 'NASDAQ', exchangeTimezone: 'America/New_York' }, { now: '2026-10-10T12:00:00Z' }).historical, true);
});

test('portfolio input validates timestamps settings and duplicate IDs before filtering', () => {
  failure(() => calculatePortfolio([], { now: NOW, asOf: '2026-10-10T12:00:00Z' }), 'SNAPSHOT_AFTER_NOW');
  failure(() => calculatePortfolio([], { now: 'invalid' }), 'INVALID_PORTFOLIO_TIMESTAMP');
  failure(() => calculatePortfolio([], { now: NOW, maxAgeMs: -1 }), 'INVALID_QUOTE_MAX_AGE');
  const first = deposit('1');
  failure(() => projectLedger([first, { ...first, timestamp: '2026-10-10T12:00:00Z' }], { asOf: NOW }), 'DUPLICATE_EVENT_ID');
});

const mappedConfig = { columns: { id: 'Order', timestamp: 'Executed UTC', type: 'Action', amount: 'Value' }, constants: { currency: 'USD' }, typeMap: { Fund: 'DEPOSIT' } };
test('explicit header mapping previews canonical events and safe formula export', () => {
  const result = previewMappedCSV('Order,Executed UTC,Action,Value,Note\na,2026-10-09T14:00:00Z,Fund,10,"=SUM(1,2)"', { ...mappedConfig, columns: { ...mappedConfig.columns, reference: 'Note' } });
  assert.equal(result.valid, true);
  assert.equal(result.requiresReview, true);
  assert.equal(result.events[0].amount, '10');
  assert.equal(result.events[0].reference, '=SUM(1,2)');
  assert.ok(result.canonicalCSV.includes('"\'=SUM'));
  assert.deepEqual(parseLedgerCSV(result.canonicalCSV), result.events);
});

test('explicit delimiter decimal and UTC date mapping accepts declared formats only', () => {
  const config = { ...mappedConfig, delimiter: ';', decimalSeparator: ',', timestampFormat: 'day-first-utc' };
  const result = previewMappedCSV('Order;Executed UTC;Action;Value\na;09/10/2026 14:00:00;Fund;10,5', config);
  assert.equal(result.valid, true);
  assert.equal(result.events[0].timestamp, '2026-10-09T14:00:00.000Z');
  assert.equal(result.events[0].amount, '10.5');
  const invalid = previewMappedCSV('Order;Executed UTC;Action;Value\na;09/10/2026 14:00:00;Fund;1.000,5', config);
  assert.equal(invalid.issues[0].code, 'AMBIGUOUS_NUMBER_FORMAT');
});

test('negative broker amounts require explicit reviewed absolute-value policy', () => {
  const csv = 'Order,Executed UTC,Action,Value\na,2026-10-09T14:00:00Z,Fund,-10';
  assert.equal(previewMappedCSV(csv, mappedConfig).valid, false);
  const result = previewMappedCSV(csv, { ...mappedConfig, absoluteFields: ['amount'] });
  assert.equal(result.valid, true);
  assert.equal(result.events[0].amount, '10');
  assert.deepEqual(result.appliedPolicy.absoluteFields, ['amount']);
});

test('mapping failures identify row and block whole canonical import', () => {
  const result = previewMappedCSV('Order,Executed UTC,Action,Value\na,2026-10-09T14:00:00Z,Fund,10\na,2026-10-09T14:00:00Z,Fund,5\nb,invalid,Fund,5', mappedConfig);
  assert.equal(result.valid, false);
  assert.equal(result.canonicalCSV, null);
  assert.deepEqual(result.issues, [{ row: 3, code: 'DUPLICATE_EVENT_ID' }, { row: 4, code: 'INVALID_TIMESTAMP' }]);
  assert.equal(result.acceptedRows, 1);
});

test('mapping detects re-import IDs and refuses generated identity or undeclared headers', () => {
  const csv = 'Order,Executed UTC,Action,Value\na,2026-10-09T14:00:00Z,Fund,10';
  const first = previewMappedCSV(csv, mappedConfig);
  assert.equal(previewMappedCSV(csv, { ...mappedConfig, existingEvents: first.events }).issues[0].code, 'DUPLICATE_EVENT_ID');
  failure(() => previewMappedCSV(csv), 'MAPPING_REQUIRED');
  failure(() => previewMappedCSV(csv, { ...mappedConfig, columns: { ...mappedConfig.columns, id: 'Unknown' } }), 'INVALID_MAPPING_COLUMN');
  const { id: ignored, ...columns } = mappedConfig.columns;
  failure(() => previewMappedCSV(csv, { ...mappedConfig, columns, constants: { currency: 'USD', id: 'generated' } }), 'SOURCE_ID_REQUIRED');
});

test('optional per-sale exact realization audit preserves default ledger contract', () => {
  const firstSale = sell('OPEN', '1', '2', { fee: '0.1' });
  const lastSale = sell('OPEN', '2', '2');
  const events = [deposit('10'), buy('OPEN', '3', '1', { fee: '1' }), firstSale, lastSale];
  assert.equal(Object.hasOwn(calculateLedger(events), 'tradeRealizations'), false);
  const result = calculateLedger(events, { includeRealizations: true });
  assert.deepEqual(result.tradeRealizations, [
    { eventId: firstSale.id, symbol: 'OPEN', currency: 'USD', realized: '0.566666666667' },
    { eventId: lastSale.id, symbol: 'OPEN', currency: 'USD', realized: '1.333333333333' },
  ]);
  assert.equal(result.realized.USD, '1.9');
  failure(() => calculateLedger([], { includeRealizations: 'yes' }), 'INVALID_REALIZATIONS_SETTING');
});

test('unverified EUR estimate remains separate from trusted totals and requires full price coverage', () => {
  const events = [deposit('10'), buy('OPEN', '1', '2')];
  const options = { now: NOW, quotes: { OPEN: quote('OPEN', '3', { verified: false, delay: null }) }, fx: fx({ verified: false }) };
  const result = calculatePortfolio(events, options);
  assert.equal(result.indicativeUnverifiedEURValue, '9.9');
  assert.equal(result.indicativeUnverifiedEURComplete, true);
  assert.equal(result.currentEURValue, null);
  assert.equal(result.indicativeEURValue, null);
  assert.equal(result.currentValuationComplete, false);
  assert.equal(calculatePortfolio(events, { ...options, quotes: {} }).indicativeUnverifiedEURValue, null);
  assert.equal(calculatePortfolio(events, { ...options, fx: null }).indicativeUnverifiedEURValue, null);
  assert.equal(calculatePortfolio(events, { ...options, fx: fx({ asOf: '2026-10-09T14:11:00Z' }) }).indicativeUnverifiedEURValue, null);
});

test('mapping header inventory respects quoted commas and explicit separator', () => {
  assert.deepEqual(listCSVHeaders('"Date, UTC",Type,Amount\n2026-10-09,DEPOSIT,10'), ['Date, UTC', 'Type', 'Amount']);
  assert.deepEqual(listCSVHeaders('Date;Type;Amount\n2026-10-09;DEPOSIT;10', { delimiter: ';' }), ['Date', 'Type', 'Amount']);
  failure(() => listCSVHeaders('Date,Date\n1,2'), 'INVALID_MAPPING_HEADERS');
});
