import { validateEvent, exportLedgerCSV, LedgerError, LEDGER_CSV_COLUMNS, MAX_LEDGER_EVENTS, MAX_LEDGER_CSV_CHARACTERS } from './ledger.mjs';

const DECIMALS = new Set(['quantity', 'price', 'amount', 'fee', 'toAmount']);
const fail = code => { throw new LedgerError(code); };

/** Explicit delimiter; standard quoted fields; no broker-header or number-format guessing. */
function rowsFromCSV(text, delimiter) {
  if (typeof text !== 'string' || text.length > MAX_LEDGER_CSV_CHARACTERS) fail('CSV_SIZE_LIMIT');
  if (![',', ';', '\t'].includes(delimiter)) fail('INVALID_MAPPING_DELIMITER');
  const rows = [], row = [];
  let cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; };
  const pushRow = () => {
    pushCell(); rows.push([...row]); row.length = 0;
    if (rows.length > MAX_LEDGER_EVENTS + 1) fail('EVENT_LIMIT');
  };
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') { cell += '"'; index++; }
        else { quoted = false; closed = true; }
      } else cell += char;
    } else if (char === '"') {
      if (cell || closed) fail('CSV_SYNTAX');
      quoted = true;
    } else if (char === delimiter) pushCell();
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      pushRow();
    } else {
      if (closed) fail('CSV_SYNTAX');
      cell += char;
    }
  }
  if (quoted) fail('CSV_SYNTAX');
  if (cell || closed || row.length) pushRow();
  if (!rows.length || rows[0].some(header => !header || header.length > 200) || new Set(rows[0]).size !== rows[0].length) fail('INVALID_MAPPING_HEADERS');
  return rows;
}

function mappedTimestamp(value, format) {
  if (format === 'iso-utc') return value;
  if (format !== 'day-first-utc') fail('INVALID_MAPPING_DATE_FORMAT');
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) fail('INVALID_TIMESTAMP');
  return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}Z`;
}

/** Exact headers for a mapping UI; no column meaning is inferred. */
export function listCSVHeaders(text, { delimiter = ',' } = {}) {
  return [...rowsFromCSV(text, delimiter)[0]];
}

/** User-configured mapping preview. No default DEGIRO mapping, implicit FX or persistence. */
export function previewMappedCSV(text, {
  columns, constants = {}, typeMap = {}, delimiter = ',', decimalSeparator = '.',
  timestampFormat = 'iso-utc', absoluteFields = [], existingEvents = [],
} = {}) {
  if (!columns || typeof columns !== 'object' || Array.isArray(columns)) fail('MAPPING_REQUIRED');
  if (!constants || typeof constants !== 'object' || Array.isArray(constants) || !typeMap || typeof typeMap !== 'object' || Array.isArray(typeMap)) fail('INVALID_MAPPING');
  if (!['.', ','].includes(decimalSeparator)) fail('INVALID_MAPPING_DECIMAL_SEPARATOR');
  if (!['iso-utc', 'day-first-utc'].includes(timestampFormat)) fail('INVALID_MAPPING_DATE_FORMAT');
  if (!Array.isArray(absoluteFields) || absoluteFields.some(field => !DECIMALS.has(field))) fail('INVALID_MAPPING_ABSOLUTE_FIELDS');
  if (!Array.isArray(existingEvents) || existingEvents.length > MAX_LEDGER_EVENTS) fail('EVENT_LIMIT');
  const rows = rowsFromCSV(text, delimiter), headers = rows[0];
  for (const [field, header] of Object.entries(columns)) {
    if (!LEDGER_CSV_COLUMNS.includes(field) || typeof header !== 'string' || !headers.includes(header)) fail('INVALID_MAPPING_COLUMN');
  }
  for (const [field, value] of Object.entries(constants)) {
    if (!LEDGER_CSV_COLUMNS.includes(field) || Object.hasOwn(columns, field) || typeof value !== 'string') fail('INVALID_MAPPING_CONSTANT');
  }
  // IDs must be a source column; generated IDs prevent reliable re-import duplicate detection.
  for (const required of ['id', 'timestamp', 'type', 'currency']) {
    if (!Object.hasOwn(columns, required) && !Object.hasOwn(constants, required)) fail('INCOMPLETE_MAPPING');
  }
  if (!Object.hasOwn(columns, 'id')) fail('SOURCE_ID_REQUIRED');
  const events = [], issues = [], identities = new Set(Array.from(existingEvents, validateEvent).map(event => event.id));
  for (let index = 1; index < rows.length; index++) {
    const values = rows[index], event = { ...constants };
    try {
      if (values.length !== headers.length) fail('CSV_COLUMN_COUNT');
      for (const [field, header] of Object.entries(columns)) {
        const value = values[headers.indexOf(header)];
        if (value !== '') event[field] = value;
      }
      if (Object.hasOwn(typeMap, event.type)) event.type = typeMap[event.type];
      event.timestamp = mappedTimestamp(event.timestamp, timestampFormat);
      for (const field of DECIMALS) {
        if (event[field] === undefined) continue;
        if (typeof event[field] !== 'string') fail('INVALID_DECIMAL');
        if (decimalSeparator === ',') {
          if (!/^-?\d+(?:,\d+)?$/.test(event[field])) fail('AMBIGUOUS_NUMBER_FORMAT');
          event[field] = event[field].replace(',', '.');
        }
        if (absoluteFields.includes(field) && event[field].startsWith('-')) event[field] = event[field].slice(1);
      }
      const normalized = validateEvent(event);
      if (identities.has(normalized.id)) fail('DUPLICATE_EVENT_ID');
      identities.add(normalized.id);
      events.push(normalized);
    } catch (exception) {
      if (!(exception instanceof LedgerError)) throw exception;
      issues.push({ row: index + 1, code: exception.code });
    }
  }
  if (existingEvents.length + events.length > MAX_LEDGER_EVENTS) issues.push({ row: null, code: 'EVENT_LIMIT' });
  return {
    events, issues, valid: issues.length === 0, requiresReview: true,
    sourceRows: rows.length - 1, acceptedRows: events.length,
    appliedPolicy: { delimiter, decimalSeparator, timestampFormat, absoluteFields: [...absoluteFields] },
    canonicalCSV: issues.length === 0 ? exportLedgerCSV(events) : null,
  };
}
