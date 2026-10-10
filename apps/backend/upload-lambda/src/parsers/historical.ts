import type {
  HistoricalRecord,
  ParseResult,
  RowError,
} from '@bho/weather-parsing';
import { readCsv } from './csv';

// Sheet headers, from the "All Daily Records" tab. "Month" and "Source text"
// are not stored: Month # carries the month, and Source text is a free-text
// rendering of the other columns.
const COLUMNS = {
  monthNum: 'Month #',
  day: 'Day',
  highF: 'High °F',
  highYears: 'High Year(s)',
  lowF: 'Low °F',
  lowYears: 'Low Year(s)',
  precipIn: 'Precip in',
  precipYears: 'Precip Year(s)',
  snowIn: 'Snow in',
  snowYears: 'Snow Year(s)',
  peakGustMph: 'Peak Gust mph',
  peakGustDir: 'Wind Dir',
  peakGustIsEstimated: 'Estimated?',
  peakGustYears: 'Gust Year(s)',
  notes: 'Notes',
};
const MONTH_NAME = 'Month';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Records cover every calendar day, so February has 29.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const COMPASS = new Set(
  'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split(' '),
);

const INTEGER = /^-?\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const YEAR = /^\d{4}$/;

// Returns every problem in the file rather than stopping at the first, so one
// upload attempt shows staff everything to fix.
export function parseHistorical(csv: string): ParseResult<HistoricalRecord> {
  const table = readCsv(csv);
  const headerIndex = table.findIndex(
    (cells) =>
      cells.some((c) => c.trim() === COLUMNS.monthNum) &&
      cells.some((c) => c.trim() === COLUMNS.day),
  );
  if (headerIndex === -1) {
    return {
      ok: false,
      errors: [
        {
          reason: `No header row with "${COLUMNS.monthNum}" and "${COLUMNS.day}"`,
        },
      ],
    };
  }

  const header = table[headerIndex].map((c) => c.trim());
  const missing = Object.values(COLUMNS).filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      ok: false,
      errors: missing.map((column) => ({
        row: headerIndex + 1,
        column,
        reason: 'Missing column',
      })),
    };
  }

  const errors: RowError[] = [];
  const rows: HistoricalRecord[] = [];
  const seen = new Map<string, number>();

  for (let i = headerIndex + 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((c) => c.trim() === '')) continue;

    const row = i + 1;
    const get = (column: string) =>
      (cells[header.indexOf(column)] ?? '').trim();
    const fail = (column: string, reason: string) =>
      errors.push({ row, column, reason });

    const integer = (column: string): number | null => {
      const value = get(column);
      if (INTEGER.test(value)) return Number(value);
      fail(column, `Expected a whole number, got "${value}"`);
      return null;
    };

    // A record value and its years go together. Blank or "None" means no
    // record, and then the years must be blank too.
    const element = <T>(
      column: string,
      yearsColumn: string,
      parse: (column: string) => T | null,
    ): [T | null, number[] | null] => {
      const value = get(column);
      const years = get(yearsColumn);
      if (value === '' || value.toLowerCase() === 'none') {
        if (years !== '') fail(yearsColumn, `Years given but no ${column}`);
        return [null, null];
      }
      if (years === '') {
        fail(yearsColumn, `Missing years for ${column} ${value}`);
        return [parse(column), null];
      }
      const list = years.split(',').map((y) => y.trim());
      const bad = list.filter((y) => !YEAR.test(y));
      if (bad.length > 0)
        fail(yearsColumn, `Not a year: "${bad.join('", "')}"`);
      return [parse(column), list.map(Number)];
    };
    const decimal = (column: string): string | null => {
      const value = get(column);
      if (DECIMAL.test(value)) return value;
      fail(column, `Expected a number, got "${value}"`);
      return null;
    };

    const month = integer(COLUMNS.monthNum);
    const day = integer(COLUMNS.day);
    if (month !== null && (month < 1 || month > 12)) {
      fail(COLUMNS.monthNum, `No month ${month}`);
    } else if (month !== null && day !== null) {
      if (day < 1 || day > DAYS_IN_MONTH[month - 1]) {
        fail(COLUMNS.day, `${MONTHS[month - 1]} has no day ${day}`);
      }
      const name = get(MONTH_NAME);
      if (
        name !== '' &&
        name.toLowerCase() !== MONTHS[month - 1].toLowerCase()
      ) {
        fail(
          MONTH_NAME,
          `"${name}" does not match ${COLUMNS.monthNum} ${month}`,
        );
      }
      const key = `${month}-${day}`;
      const first = seen.get(key);
      if (first !== undefined) {
        fail(
          COLUMNS.day,
          `${MONTHS[month - 1]} ${day} is also on row ${first}`,
        );
      } else {
        seen.set(key, row);
      }
    }

    const [highF, highYears] = element(
      COLUMNS.highF,
      COLUMNS.highYears,
      integer,
    );
    const [lowF, lowYears] = element(COLUMNS.lowF, COLUMNS.lowYears, integer);
    const [precipIn, precipYears] = element(
      COLUMNS.precipIn,
      COLUMNS.precipYears,
      decimal,
    );
    const [snowIn, snowYears] = element(
      COLUMNS.snowIn,
      COLUMNS.snowYears,
      decimal,
    );
    const [peakGustMph, peakGustYears] = element(
      COLUMNS.peakGustMph,
      COLUMNS.peakGustYears,
      integer,
    );

    const dir = get(COLUMNS.peakGustDir).toUpperCase();
    if (dir !== '' && !COMPASS.has(dir)) {
      fail(COLUMNS.peakGustDir, `Not a compass direction: "${dir}"`);
    }

    const estimated = get(COLUMNS.peakGustIsEstimated).toUpperCase();
    if (estimated !== '' && estimated !== 'TRUE' && estimated !== 'FALSE') {
      fail(
        COLUMNS.peakGustIsEstimated,
        `Expected TRUE or FALSE, got "${estimated}"`,
      );
    }

    if (month === null || day === null) continue;
    rows.push({
      month,
      day,
      highF,
      highYears,
      lowF,
      lowYears,
      precipIn,
      precipYears,
      snowIn,
      snowYears,
      peakGustMph,
      peakGustDir: dir || null,
      peakGustIsEstimated: estimated === 'TRUE',
      peakGustYears,
      notes: get(COLUMNS.notes) || null,
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) {
    return { ok: false, errors: [{ reason: 'No data rows' }] };
  }
  return { ok: true, rows };
}
