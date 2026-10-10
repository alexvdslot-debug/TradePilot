import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLedger, validateEvent, exportLedgerCSV, parseLedgerCSV, MAX_LEDGER_EVENTS, MAX_LEDGER_CSV_CHARACTERS, LEDGER_CSV_COLUMNS } from '../app/ledger.mjs';

let nextId = 0;
const event = (type, fields = {}) => ({ id: `fixture-${++nextId}`, timestamp: '2026-10-09T14:00:00Z', type, currency: 'USD', ...fields });
const deposit = (amount, currency = 'USD') => event('DEPOSIT', { amount, currency });
const buy = (quantity, price, fields = {}) => event('BUY', { symbol: 'OPEN', quantity, price, ...fields });
const sell = (quantity, price, fields = {}) => event('SELL', { symbol: 'OPEN', quantity, price, ...fields });
const error = (run, code) => assert.throws(run, exception => exception.code === code);

test('empty ledger has no invented balances, holdings or valuations', () => {
  const result = calculateLedger([]);
  assert.deepEqual(result.cash, { EUR: '0', USD: '0' });
  assert.deepEqual(result.positions, []);
  assert.equal(result.method, 'average');
  assert.equal(result.valuationComplete, false);
  assert.doesNotThrow(() => JSON.stringify(result));
});

test('golden partial sale fixture preserves USD proceeds without AutoFX', () => {
  const result = calculateLedger([deposit('10000'), buy('100', '3', { fee: '1' }), sell('40', '3.5', { fee: '1' })]);
  assert.deepEqual(result.cash, { EUR: '0', USD: '9838' });
  assert.deepEqual(result.realized, { EUR: '0', USD: '18.6' });
  assert.equal(result.positions[0].costBasis, '180.6');
  assert.equal(result.positions[0].quantity, '60');
  assert.equal(result.positions[0].averageCost, '3.01');
  assert.deepEqual(result.fees, { EUR: '0', USD: '2' });
});

test('multiple tranches explicitly use average cost', () => {
  const result = calculateLedger([deposit('100'), buy('10', '2'), buy('10', '3'), sell('12', '4')]);
  assert.equal(result.realized.USD, '18');
  assert.equal(result.positions[0].costBasis, '20');
  assert.equal(result.positions[0].averageCost, '2.5');
  error(() => calculateLedger([], { method: 'fifo' }), 'UNSUPPORTED_COST_METHOD');
});

test('full exit clears all cost basis before re-entry', () => {
  const result = calculateLedger([deposit('100'), buy('3', '1', { fee: '1' }), sell('1', '2'), sell('2', '2'), buy('1', '5')]);
  assert.equal(result.positions[0].quantity, '1');
  assert.equal(result.positions[0].costBasis, '5');
  assert.equal(result.positions[0].averageCost, '5');
  assert.equal(result.realized.USD, '2');
});

test('allocation rounding conserves residual on full exit', () => {
  const result = calculateLedger([deposit('100'), buy('3', '1', { fee: '1' }), sell('1', '1'), sell('1', '1'), sell('1', '1')]);
  assert.equal(result.positions[0].quantity, '0');
  assert.equal(result.positions[0].costBasis, '0');
  assert.equal(result.positions[0].averageCost, '0');
  assert.equal(result.realized.USD, '-1');
});

test('actual FX conversion uses both supplied executed amounts and separate EUR fee', () => {
  const result = calculateLedger([deposit('1000'), event('FX', { amount: '1000', toCurrency: 'EUR', toAmount: '900', fee: '2', feeCurrency: 'EUR' })]);
  assert.deepEqual(result.cash, { EUR: '898', USD: '0' });
  assert.deepEqual(result.realized, { EUR: '0', USD: '0' });
  assert.deepEqual(result.fees, { EUR: '2', USD: '0' });
});

test('foreign trade fees debit their own currency without invented conversion', () => {
  const result = calculateLedger([deposit('100'), deposit('5', 'EUR'), buy('10', '2', { fee: '1', feeCurrency: 'EUR' }), sell('5', '3', { fee: '2', feeCurrency: 'EUR' })]);
  assert.deepEqual(result.cash, { EUR: '2', USD: '95' });
  assert.deepEqual(result.fees, { EUR: '3', USD: '0' });
  assert.equal(result.positions[0].costBasis, '10');
  assert.equal(result.realized.USD, '5');
});

test('deposits withdrawals fees and financing reconcile independently', () => {
  const result = calculateLedger([deposit('20', 'EUR'), event('WITHDRAWAL', { amount: '3', currency: 'EUR' }), event('FEE', { amount: '2', currency: 'EUR', fee: '0.1' }), event('FINANCING', { amount: '0.5', currency: 'EUR' })]);
  assert.equal(result.cash.EUR, '14.4');
  assert.equal(result.deposits.EUR, '20');
  assert.equal(result.withdrawals.EUR, '3');
  assert.equal(result.fees.EUR, '2.1');
  assert.equal(result.financing.EUR, '0.5');
  assert.equal(result.realized.EUR, '0');
});

test('explicit margin draw and repay are separate from deposits', () => {
  const events = [event('MARGIN_DRAW', { amount: '100' }), buy('10', '5'), sell('10', '6'), event('MARGIN_REPAY', { amount: '100' })];
  error(() => calculateLedger(events), 'MARGIN_NOT_ALLOWED');
  const result = calculateLedger(events, { allowMargin: true });
  assert.equal(result.cash.USD, '10');
  assert.equal(result.margin.USD, '0');
  assert.equal(result.deposits.USD, '0');
  error(() => calculateLedger([event('MARGIN_REPAY', { amount: '1' })], { allowMargin: true }), 'MARGIN_OVERPAYMENT');
});

test('negative cash requires explicit margin boolean even in foreign fee currency', () => {
  error(() => calculateLedger([buy('1', '2')]), 'INSUFFICIENT_CASH');
  error(() => calculateLedger([deposit('10'), buy('1', '2', { fee: '1', feeCurrency: 'EUR' })]), 'INSUFFICIENT_CASH');
  assert.equal(calculateLedger([buy('1', '2')], { allowMargin: true }).cash.USD, '-2');
  error(() => calculateLedger([], { allowMargin: 'true' }), 'INVALID_MARGIN_SETTING');
});

test('overselling is rejected even when margin enabled', () => {
  error(() => calculateLedger([deposit('10'), buy('1', '2'), sell('2', '3')], { allowMargin: true }), 'OVERSELL');
});

test('duplicate IDs rejected across different event types', () => {
  const first = deposit('10');
  error(() => calculateLedger([first, sell('1', '2', { id: first.id })]), 'DUPLICATE_EVENT_ID');
});

test('chronological order stable for equal timestamps and sorts unordered input', () => {
  const first = deposit('10', 'USD');
  const second = buy('1', '2', { timestamp: '2026-10-09T14:01:00Z' });
  assert.equal(calculateLedger([second, first]).cash.USD, '8');
  error(() => calculateLedger([buy('1', '2'), deposit('10')]), 'INSUFFICIENT_CASH');
});

test('fractional products and large amounts retain decimal precision', () => {
  const result = calculateLedger([deposit('999999999999999999.123456789012'), buy('0.123456', '0.123456')]);
  assert.equal(result.positions[0].costBasis, '0.015241383936');
  assert.equal(result.cash.USD, '999999999999999999.108215405076');
});

test('event normalization does not mutate input and rejects invalid timestamps and decimals', () => {
  const input = buy('01.000000', '002.500000');
  const normalized = validateEvent(input);
  assert.equal(normalized.quantity, '1');
  assert.equal(normalized.price, '2.5');
  assert.equal(normalized.timestamp, '2026-10-09T14:00:00.000Z');
  assert.equal(input.quantity, '01.000000');
  assert.ok(Object.isFrozen(normalized));
  for (const timestamp of ['2026-02-30T14:00:00Z', '2026-10-09T14:00:00+00:00', 'bad']) error(() => validateEvent({ ...input, timestamp }), 'INVALID_TIMESTAMP');
  for (const quantity of ['-1', 'NaN', '1e2', 1, '1,2']) error(() => validateEvent({ ...input, quantity }), 'INVALID_DECIMAL');
  error(() => validateEvent({ ...input, quantity: '0' }), 'AMOUNT_MUST_BE_POSITIVE');
  error(() => validateEvent({ ...input, price: '1.0000001' }), 'DECIMAL_PRECISION');
  error(() => validateEvent({ ...input, fee: null }), 'INVALID_DECIMAL');
  error(() => validateEvent({ ...input, feeCurrency: null }), 'INVALID_CURRENCY');
});

test('invalid schema currencies symbols and irrelevant values rejected', () => {
  error(() => validateEvent(buy('1', '2', { symbol: '<script>' })), 'INVALID_SYMBOL');
  error(() => validateEvent(deposit('1', 'GBP')), 'INVALID_CURRENCY');
  error(() => validateEvent(buy('1', '2', { amount: '99' })), 'UNEXPECTED_EVENT_FIELD');
  error(() => validateEvent(buy('1', '2', { secret: 'x' })), 'UNKNOWN_EVENT_FIELD');
  error(() => validateEvent(event('FX', { amount: '1', toCurrency: 'USD', toAmount: '1' })), 'FX_CURRENCIES_MUST_DIFFER');
  error(() => calculateLedger([deposit('10'), deposit('10', 'EUR'), buy('1', '2'), buy('1', '2', { currency: 'EUR' })]), 'POSITION_CURRENCY_MISMATCH');
});

test('quotes cannot silently turn incomplete valuation into current valuation', () => {
  const result = calculateLedger([deposit('10'), buy('1', '2')], { quotes: { OPEN: 3, USDEUR: 0.9 } });
  assert.equal(result.positions[0].unrealized, null);
  assert.equal(result.valuationComplete, false);
});

test('canonical CSV template and events roundtrip with quotes newlines and formulas', () => {
  assert.deepEqual(parseLedgerCSV(exportLedgerCSV([])), []);
  const references = ['=HYPERLINK("https://example.invalid")', '+SUM(1,2)', '-2+3', '@SUM(1)', '\t=1+2', '   =1+2', "'=literal", 'normal,"quote"\nsecond line'];
  const events = references.map(reference => deposit('1', 'USD')).map((value, index) => ({ ...value, reference: references[index] }));
  const csv = exportLedgerCSV(events);
  assert.ok(csv.startsWith(LEDGER_CSV_COLUMNS.join(',') + '\r\n'));
  assert.ok(csv.includes('"\'=HYPERLINK'));
  assert.deepEqual(parseLedgerCSV(csv), events.map(validateEvent));
  assert.deepEqual(calculateLedger(parseLedgerCSV(csv)), calculateLedger(events));
});

test('CSV rejects broker layouts malformed quoting and duplicate IDs', () => {
  error(() => parseLedgerCSV('Date,Product,Amount\n2026-10-09,OPEN,1'), 'CSV_COLUMN_COUNT');
  const csv = exportLedgerCSV([deposit('10')]);
  error(() => parseLedgerCSV(csv.replace('"fixture-', '"broken"fixture-')), 'CSV_SYNTAX');
  error(() => parseLedgerCSV(csv.slice(0, -3)), 'CSV_SYNTAX');
  const item = deposit('1');
  error(() => exportLedgerCSV([item, item]), 'DUPLICATE_EVENT_ID');
  error(() => parseLedgerCSV(exportLedgerCSV([item]) + exportLedgerCSV([item]).split('\r\n')[1] + '\r\n'), 'DUPLICATE_EVENT_ID');
});

test('event and CSV size limits enforced', () => {
  error(() => calculateLedger(new Array(MAX_LEDGER_EVENTS + 1)), 'EVENT_LIMIT');
  error(() => exportLedgerCSV(new Array(MAX_LEDGER_EVENTS + 1)), 'EVENT_LIMIT');
  error(() => parseLedgerCSV('x'.repeat(MAX_LEDGER_CSV_CHARACTERS + 1)), 'CSV_SIZE_LIMIT');
  error(() => calculateLedger(new Array(1)), 'INVALID_EVENT');
});

test('valid maximum-size reference and identifiers remain roundtrippable', () => {
  const original = deposit('999999999999999999.123456789012');
  original.id = 'a'.repeat(128);
  original.reference = '"'.repeat(500);
  assert.deepEqual(parseLedgerCSV(exportLedgerCSV([original])), [validateEvent(original)]);
});
