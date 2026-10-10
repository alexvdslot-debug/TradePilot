// Local accounting arithmetic; does not fetch quotes, persist data, or place orders.
const SCALE = 10n ** 12n;
export const MAX_LEDGER_EVENTS = 10000;
export const MAX_LEDGER_CSV_CHARACTERS = 16_000_000;
export const LEDGER_CSV_COLUMNS = Object.freeze(['id', 'timestamp', 'type', 'symbol', 'quantity', 'price', 'currency', 'amount', 'fee', 'feeCurrency', 'toCurrency', 'toAmount', 'reference']);
const TYPES = new Set(['OPENING_POSITION', 'BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'FX', 'FEE', 'FINANCING', 'MARGIN_DRAW', 'MARGIN_REPAY']);
const CURRENCIES = new Set(['EUR', 'USD']);

export class LedgerError extends Error {
  constructor(code) { super(code); this.name = 'LedgerError'; this.code = code; }
}
function fail(code) { throw new LedgerError(code); }
function decimal(value, places = 12, positive = false) {
  if (typeof value !== 'string' || !/^\d{1,18}(?:\.\d{1,12})?$/.test(value)) fail('INVALID_DECIMAL');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > places) fail('DECIMAL_PRECISION');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(12, '0'));
  if (positive && units === 0n) fail('AMOUNT_MUST_BE_POSITIVE');
  return units;
}
function format(units) {
  const sign = units < 0n ? '-' : '';
  const absolute = units < 0n ? -units : units;
  const fraction = (absolute % SCALE).toString().padStart(12, '0').replace(/0+$/, '');
  return `${sign}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}
function currency(value) { if (!CURRENCIES.has(value)) fail('INVALID_CURRENCY'); return value; }
function normalizedDecimal(value, places, positive) { return format(decimal(value, places, positive)); }

/** Returns an immutable canonical event, or throws a machine-readable LedgerError. */
export function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) fail('INVALID_EVENT');
  if (Object.keys(event).some(key => !LEDGER_CSV_COLUMNS.includes(key))) fail('UNKNOWN_EVENT_FIELD');
  if (typeof event.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(event.id)) fail('INVALID_EVENT_ID');
  if (typeof event.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(event.timestamp)) fail('INVALID_TIMESTAMP');
  const date = new Date(event.timestamp);
  const expected = event.timestamp.includes('.') ? event.timestamp : event.timestamp.replace('Z', '.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== expected) fail('INVALID_TIMESTAMP');
  if (!TYPES.has(event.type)) fail('INVALID_EVENT_TYPE');
  const normalized = { id: event.id, timestamp: date.toISOString(), type: event.type, currency: currency(event.currency), fee: normalizedDecimal(event.fee === undefined ? '0' : event.fee, 12, false), feeCurrency: currency(event.feeCurrency === undefined ? event.currency : event.feeCurrency) };
  if (['OPENING_POSITION', 'BUY', 'SELL'].includes(event.type)) {
    if (typeof event.symbol !== 'string' || !/^[A-Z][A-Z0-9.-]{0,19}$/.test(event.symbol)) fail('INVALID_SYMBOL');
    normalized.symbol = event.symbol;
    normalized.quantity = normalizedDecimal(event.quantity, 6, true);
    normalized.price = normalizedDecimal(event.price, 6, true);
  } else {
    normalized.amount = normalizedDecimal(event.amount, 12, true);
    if (event.type === 'FX') {
      normalized.toCurrency = currency(event.toCurrency);
      if (normalized.toCurrency === normalized.currency) fail('FX_CURRENCIES_MUST_DIFFER');
      normalized.toAmount = normalizedDecimal(event.toAmount, 12, true);
    }
  }
  if (event.type === 'OPENING_POSITION' && normalized.fee !== '0') fail('OPENING_POSITION_FEE_NOT_ALLOWED');
  const allowed = new Set(Object.keys(normalized).concat('reference'));
  if (Object.keys(event).some(key => !allowed.has(key) && event[key] !== '' && event[key] !== undefined)) fail('UNEXPECTED_EVENT_FIELD');
  if (event.reference !== undefined && event.reference !== '') {
    if (typeof event.reference !== 'string' || event.reference.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(event.reference)) fail('INVALID_REFERENCE');
    normalized.reference = event.reference;
  }
  return Object.freeze(normalized);
}

const balances = () => ({ EUR: 0n, USD: 0n });
const serialize = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, format(value)]));

/** Average cost, rounded down to 12 decimals on partial allocation; remainder stays in inventory. */
export function calculateLedger(events, { allowMargin = false, method = 'average', quotes = {}, includeRealizations = false } = {}) {
  if (!Array.isArray(events) || events.length > MAX_LEDGER_EVENTS) fail('EVENT_LIMIT');
  if (typeof allowMargin !== 'boolean') fail('INVALID_MARGIN_SETTING');
  if (typeof includeRealizations !== 'boolean') fail('INVALID_REALIZATIONS_SETTING');
  if (method !== 'average') fail('UNSUPPORTED_COST_METHOD');
  // Quote valuation is intentionally unavailable until freshness and FX contracts are implemented.
  void quotes;
  const ordered = Array.from(events, (event, index) => ({ event: validateEvent(event), index })).sort((a, b) => a.event.timestamp.localeCompare(b.event.timestamp) || a.index - b.index);
  const ids = new Set();
  const cash = balances(), realized = balances(), deposits = balances(), withdrawals = balances(), fees = balances(), financing = balances(), margin = balances();
  const positions = new Map();
  const tradeRealizations = [];
  for (const { event } of ordered) {
    if (ids.has(event.id)) fail('DUPLICATE_EVENT_ID');
    ids.add(event.id);
    const curr = event.currency, feeCurr = event.feeCurrency;
    const fee = decimal(event.fee);
    const amount = event.amount ? decimal(event.amount) : 0n;
    if (['OPENING_POSITION', 'BUY', 'SELL'].includes(event.type)) {
      let position = positions.get(event.symbol);
      if (event.type === 'OPENING_POSITION' && position) fail('OPENING_POSITION_NOT_FIRST');
      if (position && position.currency !== curr) fail('POSITION_CURRENCY_MISMATCH');
      if (!position) {
        position = { symbol: event.symbol, currency: curr, quantity: 0n, costBasis: 0n, realized: 0n };
        positions.set(event.symbol, position);
      }
      const quantity = decimal(event.quantity), gross = quantity * decimal(event.price) / SCALE;
      if (event.type === 'OPENING_POSITION') {
        position.quantity = quantity;
        position.costBasis = gross;
      } else if (event.type === 'BUY') {
        position.quantity += quantity;
        position.costBasis += gross + (feeCurr === curr ? fee : 0n);
        cash[curr] -= gross;
      } else {
        if (quantity > position.quantity) fail('OVERSELL');
        const allocated = quantity === position.quantity ? position.costBasis : position.costBasis * quantity / position.quantity;
        const result = gross - allocated - (feeCurr === curr ? fee : 0n);
        position.quantity -= quantity;
        position.costBasis -= allocated;
        position.realized += result;
        realized[curr] += result;
        if (includeRealizations) tradeRealizations.push({ eventId: event.id, symbol: event.symbol, currency: curr, realized: format(result) });
        cash[curr] += gross;
      }
    } else if (event.type === 'DEPOSIT') {
      cash[curr] += amount; deposits[curr] += amount;
    } else if (event.type === 'WITHDRAWAL') {
      cash[curr] -= amount; withdrawals[curr] += amount;
    } else if (event.type === 'FX') {
      cash[curr] -= amount; cash[event.toCurrency] += decimal(event.toAmount);
    } else if (event.type === 'FEE') {
      cash[curr] -= amount; fees[curr] += amount;
    } else if (event.type === 'FINANCING') {
      cash[curr] -= amount; financing[curr] += amount;
    } else if (event.type === 'MARGIN_DRAW') {
      if (!allowMargin) fail('MARGIN_NOT_ALLOWED');
      cash[curr] += amount; margin[curr] += amount;
    } else if (event.type === 'MARGIN_REPAY') {
      if (!allowMargin) fail('MARGIN_NOT_ALLOWED');
      if (amount > margin[curr]) fail('MARGIN_OVERPAYMENT');
      cash[curr] -= amount; margin[curr] -= amount;
    }
    cash[feeCurr] -= fee;
    fees[feeCurr] += fee;
    if (!allowMargin && (cash.EUR < 0n || cash.USD < 0n)) fail('INSUFFICIENT_CASH');
  }
  return {
    cash: serialize(cash),
    positions: [...positions.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)).map(position => ({ symbol: position.symbol, currency: position.currency, quantity: format(position.quantity), averageCost: format(position.quantity ? position.costBasis * SCALE / position.quantity : 0n), costBasis: format(position.costBasis), realized: format(position.realized), unrealized: null })),
    realized: serialize(realized), deposits: serialize(deposits), withdrawals: serialize(withdrawals), fees: serialize(fees), financing: serialize(financing), margin: serialize(margin), method, valuationComplete: false,
    ...(includeRealizations ? { tradeRealizations } : {}),
  };
}

// Prefix dangerous spreadsheet cells with an apostrophe. Escape existing apostrophes too, for reversibility.
function dangerousCell(value) { return /^[\s]*[=+@-]/.test(value) || /^[\t\r\n']/.test(value); }
function csvCell(value) {
  const protectedValue = dangerousCell(value) ? `'${value}` : value;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}
export function exportLedgerCSV(events) {
  if (!Array.isArray(events) || events.length > MAX_LEDGER_EVENTS) fail('EVENT_LIMIT');
  const normalized = Array.from(events, validateEvent);
  if (new Set(normalized.map(event => event.id)).size !== normalized.length) fail('DUPLICATE_EVENT_ID');
  return `${LEDGER_CSV_COLUMNS.join(',')}\r\n${normalized.map(event => LEDGER_CSV_COLUMNS.map(key => csvCell(event[key] ?? '')).join(',')).join('\r\n')}${normalized.length ? '\r\n' : ''}`;
}

/** Canonical CSV only: parses a preview; callers decide whether to persist after ledger validation. */
export function parseLedgerCSV(text) {
  if (typeof text !== 'string' || text.length > MAX_LEDGER_CSV_CHARACTERS) fail('CSV_SIZE_LIMIT');
  const rows = [], row = [];
  let cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; };
  const pushRow = () => {
    pushCell();
    if (row.length !== LEDGER_CSV_COLUMNS.length) fail('CSV_COLUMN_COUNT');
    rows.push([...row]); row.length = 0;
    if (rows.length > MAX_LEDGER_EVENTS + 1) fail('EVENT_LIMIT');
  };
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += char;
    } else if (char === '"') {
      if (cell !== '' || closed) fail('CSV_SYNTAX');
      quoted = true;
    } else if (char === ',') pushCell();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      pushRow();
    } else {
      if (closed) fail('CSV_SYNTAX');
      cell += char;
    }
  }
  if (quoted) fail('CSV_SYNTAX');
  if (cell !== '' || closed || row.length) pushRow();
  if (!rows.length || rows[0].join(',') !== LEDGER_CSV_COLUMNS.join(',')) fail('CSV_HEADER');
  const events = rows.slice(1).map(values => {
    const event = {};
    values.forEach((value, index) => {
      const restored = value.startsWith("'") && dangerousCell(value.slice(1)) ? value.slice(1) : value;
      if (restored !== '') event[LEDGER_CSV_COLUMNS[index]] = restored;
    });
    return validateEvent(event);
  });
  if (new Set(events.map(event => event.id)).size !== events.length) fail('DUPLICATE_EVENT_ID');
  return events;
}
