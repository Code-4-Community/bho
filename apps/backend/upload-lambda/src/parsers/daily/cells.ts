import type { RowError } from '@bho/weather-parsing';

const MONTHS =
  'january february march april may june july august september october november december'.split(
    ' ',
  );

const COMPASS = new Set(
  'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split(' '),
);

// "*" marks a footnote, e.g. "14*".
const INTEGER = /^(-?\d+)\*?$/;
const DECIMAL = /^(-?\d+(?:\.\d+)?)\*?$/;
// "77%", or a fraction like "0.77".
const PERCENT = /^(\d+(?:\.\d+)?)(%?)\*?$/;
// "1/8" or "1 1/2".
const FRACTION = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/;
// "0245E" or "1205".
const TIME = /^(\d{2})(\d{2})E?$/;
// "20 WSW @ 0854E". Later times ("…, 1651E") are ignored.
const GUST = /^(\d+)\s*([A-Z]{1,3})?\s*@\s*(\d{4}E?)/;
// "Wednesday, July 1, 2026".
const DATE = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/;

type Fail = (column: string, reason: string) => void;

// "0245E" -> "02:45", or null if not a time of day.
export function toTime(value: string): string | null {
  const match = value.match(TIME);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1]}:${match[2]}`;
}

// "Wednesday, July 1, 2026" -> "2026-07-01", or null if not a real date.
export function toIsoDate(label: string): string | null {
  const match = label.match(DATE);
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) + 1 : 0;
  if (!match || month === 0) return null;
  const year = Number(match[3]);
  const day = Number(match[2]);
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Reads one sheet row. Blank cells are null; unreadable cells are null and
// recorded as errors. Index -1 (a missing row) reads as blank. Decimals stay
// strings without the footnote "*"; integers are numbers.
export function rowAt(table: string[][], index: number, errors: RowError[]) {
  const cells = table[index] ?? [];
  const get = (i: number) => cells[i] ?? '';
  const fail: Fail = (column, reason) =>
    errors.push({ row: index + 1, column, reason });

  const read = <T>(
    i: number,
    column: string,
    expected: string,
    parse: (value: string) => T | null,
  ): T | null => {
    const value = get(i);
    if (value === '') return null;
    const result = parse(value);
    if (result === null) fail(column, `Expected ${expected}, got "${value}"`);
    return result;
  };

  // min/max bound fixed-range readings, like sky cover in eighths.
  const int = (i: number, column: string, min?: number, max?: number) => {
    const n = read(i, column, 'a whole number', (v) => {
      const match = v.match(INTEGER);
      return match ? Number(match[1]) : null;
    });
    if (n !== null && ((min ?? n) > n || (max ?? n) < n)) {
      const range = max === undefined ? `at least ${min}` : `${min} to ${max}`;
      fail(column, `Expected ${range}, got ${n}`);
      return null;
    }
    return n;
  };

  const dec = (i: number, column: string) =>
    read(i, column, 'a number', (v) => v.match(DECIMAL)?.[1] ?? null);

  return {
    cells,
    read,
    int,
    dec,
    str: (i: number) => get(i) || null,
    pct: (i: number, column: string) => {
      const n = read(i, column, 'a percentage', (v) => {
        const match = v.match(PERCENT);
        if (!match) return null;
        const n = Number(match[1]);
        return match[2] ? n : Math.round(n * 100);
      });
      if (n !== null && n > 100) {
        fail(column, `Expected 0% to 100%, got ${n}%`);
        return null;
      }
      return n;
    },
    // "1/8" -> "0.125", "1 1/2" -> "1.5", "35" -> "35".
    fraction: (i: number, column: string) =>
      read(i, column, 'a distance like "35" or "1/8"', (v) => {
        const match = v.match(FRACTION);
        if (!match) return v.match(DECIMAL)?.[1] ?? null;
        const n = Number(match[1] ?? 0) + Number(match[2]) / Number(match[3]);
        return Number.isFinite(n) ? String(n) : null;
      }),
    time: (i: number, column: string) =>
      read(i, column, 'a time like "0245E"', toTime),
    dir: (i: number, column: string) =>
      read(i, column, 'a compass direction', (v) =>
        COMPASS.has(v.toUpperCase()) ? v.toUpperCase() : null,
      ),
    // Inches, "T" for a trace, or blank.
    precip: (i: number, column: string) =>
      get(i) === 'T'
        ? { precipIn: null, precipTrace: true }
        : { precipIn: dec(i, column), precipTrace: false },
    peakGust: (i: number, column: string) => {
      const match = read(i, column, 'a gust like "20 WSW @ 0854E"', (v) => {
        const m = v.match(GUST);
        return m && toTime(m[3]) !== null ? m : null;
      });
      const dir = match?.[2] ?? null;
      if (dir !== null && !COMPASS.has(dir)) {
        fail(column, `Not a compass direction: "${dir}"`);
      }
      return {
        peakGustKts: match ? Number(match[1]) : null,
        peakGustDir: dir !== null && COMPASS.has(dir) ? dir : null,
        peakGustTime: match ? toTime(match[3]) : null,
      };
    },
  };
}

export type Row = ReturnType<typeof rowAt>;
