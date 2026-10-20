import type {
  DailyObservation,
  HourlyObservation,
  ParsedDay,
  ParseResult,
  RowError,
  ScheduledObservation,
} from '@bho/weather-parsing';
import { readCsv } from './csv';

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
// Hourly rows, "00-01" to "23-24".
const HOUR = /^(\d{2})-(\d{2})$/;

type Fail = (column: string, reason: string) => void;

// "0245E" -> "02:45", or null if not a time of day.
function toTime(value: string): string | null {
  const match = value.match(TIME);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1]}:${match[2]}`;
}

// "Wednesday, July 1, 2026" -> "2026-07-01", or null if not a real date.
function toIsoDate(label: string): string | null {
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
function rowAt(table: string[][], index: number, errors: RowError[]) {
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

type Row = ReturnType<typeof rowAt>;

// One day's rows, from its "DATE:" row to the next day's.
class Day {
  constructor(
    private table: string[][],
    private errors: RowError[],
    readonly start: number,
    private end: number,
  ) {}

  fail(index: number, column: string, reason: string) {
    this.errors.push({ row: index + 1, column, reason });
  }

  row(index: number): Row {
    return rowAt(this.table, index, this.errors);
  }

  // First matching row in this day, or -1.
  find(test: (cells: string[]) => boolean): number {
    for (let i = this.start; i < this.end; i++) {
      if (test(this.table[i])) return i;
    }
    return -1;
  }

  // Like find, but a missing row is an error on the "DATE:" row.
  require(label: string, test: (cells: string[]) => boolean): number {
    const index = this.find(test);
    if (index === -1) {
      this.errors.push({ row: this.start + 1, reason: `No "${label}" row` });
    }
    return index;
  }

  labelled(label: string): Row {
    return this.row(this.require(label, (cells) => cells[0] === label));
  }

  rows(test: (cells: string[]) => boolean): number[] {
    const indexes: number[] = [];
    for (let i = this.start; i < this.end; i++) {
      if (test(this.table[i])) indexes.push(i);
    }
    return indexes;
  }

  // Reports repeated keys (e.g. two "05-06" rows), keeping the first of each.
  unique(indexes: number[], column: string, keyOf: (index: number) => string) {
    const seen = new Map<string, number>();
    return indexes.filter((index) => {
      const key = keyOf(index);
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, index);
        return true;
      }
      this.fail(index, column, `${key} is also on row ${first + 1}`);
      return false;
    });
  }
}

function parseHourly(date: string, hour: number, row: Row): HourlyObservation {
  return {
    date,
    hour,
    tempF: row.int(1, 'Temp (°F)'),
    ...row.precip(2, 'Precip (inches)'),
    windDir: row.dir(3, 'Wind Dir.'),
    windSpeedMph: row.int(4, 'Wind Spd (mph)', 0),
    sunshineMin: row.int(5, 'Sunshine (min)', 0, 60),
    skyCover: row.int(6, 'Sky Cover (0-8)', 0, 8),
    visibilityMi: row.fraction(7, 'Lwst VSBL (mls)'),
    presentWeather: row.str(8),
    humidityPct: row.int(9, 'Rel. Hum.', 0, 100),
    mountainVis: row.str(10),
    remarks: row.str(11),
  };
}

function parseHours(day: Day, date: string): HourlyObservation[] {
  const indexes = day.rows((cells) => HOUR.test(cells[0]));
  const hourOf = (index: number) => Number(day.row(index).cells[0].slice(0, 2));

  const valid = indexes.filter((index) => {
    const [, from, to] = day.row(index).cells[0].match(HOUR)!;
    if (Number(from) <= 23 && Number(to) === Number(from) + 1) return true;
    day.fail(
      index,
      'Time (EST)',
      `Expected an hour like "05-06", got "${from}-${to}"`,
    );
    return false;
  });

  return day
    .unique(valid, 'Time (EST)', (index) => day.row(index).cells[0])
    .map((index) => parseHourly(date, hourOf(index), day.row(index)));
}

// The "Station Pressure Computations" block: a header row of times ("0700",
// "1900", "AVG", sometimes "1200E") over rows of values. Returns each time's
// column plus the value rows.
function parsePressureBlock(day: Day) {
  const start = day.require(
    'Station Pressure Computations',
    (cells) => cells[0] === 'Station Pressure Computations',
  );
  const header = start >= 0 ? day.row(start + 1).cells : [];

  const columns = new Map<string, number>();
  header.forEach((cell, i) => {
    const t = i >= 2 ? toTime(cell) : null;
    if (t) columns.set(t, i);
  });

  return {
    columns,
    attachedTherm: day.labelled('Attached Therm.'),
    observedBarometer: day.labelled('Observed Barometer'),
    totalCorrection: day.labelled('Total Correction'),
  };
}

function parseScheduled(day: Day, date: string): ScheduledObservation[] {
  const pressure = parsePressureBlock(day);

  const fromPressureBlock = (obsTime: string) => {
    const col = pressure.columns.get(obsTime);
    if (col === undefined) {
      return {
        attachedThermC: null,
        observedBarometerMb: null,
        pressureCorrectionMb: null,
      };
    }
    return {
      attachedThermC: pressure.attachedTherm.dec(col, 'Attached Therm.'),
      observedBarometerMb: pressure.observedBarometer.dec(
        col,
        'Observed Barometer',
      ),
      pressureCorrectionMb: pressure.totalCorrection.dec(
        col,
        'Total Correction',
      ),
    };
  };

  // Scheduled rows start with an "HHMM" time.
  const valid = day
    .rows((cells) => /^\d{4}$/.test(cells[0]))
    .filter((index) => {
      const cell = day.row(index).cells[0];
      if (toTime(cell) !== null) return true;
      day.fail(index, 'Time (EST)', `Not a time of day: "${cell}"`);
      return false;
    });

  const rows: ScheduledObservation[] = day
    .unique(valid, 'Time (EST)', (index) => day.row(index).cells[0])
    .map((index) => {
      const row = day.row(index);
      const obsTime = toTime(row.cells[0])!;
      // The "Average ->" row has that label under snowfall, and the 0700/1900
      // average, not a reading, under vapor pressure.
      const isAverageRow = row.cells.includes('Average ->');
      return {
        date,
        obsTime,
        stationPressureIn: row.dec(1, 'Station Pressure'),
        ...fromPressureBlock(obsTime),
        dryBulbF: row.dec(2, 'Dry Bulb'),
        wetBulbF: row.dec(3, 'Wet Bulb'),
        dewpointF: row.int(4, 'Dewpoint'),
        humidityPct: row.pct(5, 'Relative Humidity'),
        maxTempF: row.int(6, 'Max'),
        minTempF: row.int(7, 'Min'),
        ...row.precip(8, 'Precip'),
        snowfallIn: isAverageRow ? null : row.dec(9, 'Snow Fall'),
        snowDepthIn: row.dec(10, 'Snow Depth'),
        vaporPressureMb: isAverageRow ? null : row.dec(11, 'Vapor Pressure'),
      };
    });

  // Extra readings (e.g. 1200) appear only in the pressure block.
  for (const obsTime of pressure.columns.keys()) {
    if (rows.some((r) => r.obsTime === obsTime)) continue;
    rows.push({
      date,
      obsTime,
      stationPressureIn: null,
      ...fromPressureBlock(obsTime),
      dryBulbF: null,
      wetBulbF: null,
      dewpointF: null,
      humidityPct: null,
      maxTempF: null,
      minTempF: null,
      precipIn: null,
      precipTrace: false,
      snowfallIn: null,
      snowDepthIn: null,
      vaporPressureMb: null,
    });
  }

  return rows.sort((a, b) => a.obsTime.localeCompare(b.obsTime));
}

function parseSummary(day: Day, date: string): DailyObservation {
  // Summary values are on the row after the "24HR Max" header.
  const summaryHeader = day.require('24HR Max', (c) => c[0] === '24HR Max');
  const s = day.row(summaryHeader === -1 ? -1 : summaryHeader + 1);

  // Possible sunshine, sunrise and sunset are under the hourly table.
  const aver = day.labelled('Aver.');
  const misc = day.labelled('Misc.');

  // Footnotes are in column G, between "Additional Notes:" and "INITIALS:".
  const initialsIndex = day.require('INITIALS:', (c) =>
    c.includes('INITIALS:'),
  );
  const notesStart = day.find((c) => c[6] === 'Additional Notes:');
  const notes: string[] = [];
  if (notesStart !== -1) {
    for (let i = notesStart + 1; i < initialsIndex; i++) {
      const note = day.row(i).str(6);
      if (note) notes.push(note);
    }
  }
  const initials = day.row(initialsIndex);

  return {
    date,
    maxTempF: s.int(0, '24HR Max'),
    minTempF: s.int(1, '24HR Min'),
    avgTempF: day.labelled('Average Temperature').dec(3, 'Average Temperature'),
    normalTempF: day
      .labelled('Normal Temperature')
      .int(3, 'Normal Temperature'),
    ...s.precip(2, 'Water Equiv.'),
    snowfallIn: s.dec(4, 'Snowfall'),
    snowDepthIn: s.dec(5, 'Dpth 0700'),
    sunshineMin: s.int(6, 'Total Min.', 0),
    // "Poss 914" -> 914.
    sunshinePossibleMin: aver.read(
      5,
      'Poss',
      'a value like "Poss 914"',
      (v) => {
        const match = v.match(/^Poss\s*(\d+)$/i);
        return match ? Number(match[1]) : null;
      },
    ),
    sunshinePct: s.pct(7, '% poss.'),
    fastestMileMph: s.int(8, 'Fast. Mile', 0),
    fastestMileDir: s.dir(9, 'Fast. Mile Dir'),
    fastestMileTime: s.time(10, 'Time'),
    ...s.peakGust(11, 'Peak Gust (KTS)'),
    avgStationPressureMb: day.labelled('Station Pressure').dec(4, 'AVG'),
    sunrise: aver.time(10, 'SUNRISE'),
    sunset: misc.time(10, 'SUNSET'),
    observerInitials: initials.str(initials.cells.indexOf('INITIALS:') + 1),
    remarks: notes.length > 0 ? notes.join('\n') : null,
  };
}

function parseDay(day: Day): ParsedDay {
  const dateRow = day.row(day.start);
  const dateColumn = dateRow.cells.indexOf('DATE:') + 1;
  // Keep reading past a bad or missing date so the day's other errors show too.
  const expected = 'a date like "Wednesday, July 1, 2026"';
  const date = dateRow.read(dateColumn, 'DATE:', expected, toIsoDate) ?? '';
  if ((dateRow.cells[dateColumn] ?? '') === '') {
    day.fail(day.start, 'DATE:', `Expected ${expected}, got nothing`);
  }

  return {
    daily: parseSummary(day, date),
    hourly: parseHours(day, date),
    scheduled: parseScheduled(day, date),
  };
}

// Reports every problem, not just the first, so staff can fix the file in one
// upload. Cells are trimmed: the sheet pads labels ("DATE: ") and blanks.
export function parseDaily(csv: string): ParseResult<ParsedDay> {
  const table = readCsv(csv).map((cells) => cells.map((c) => c.trim()));
  const starts = table.flatMap((cells, i) =>
    cells.includes('DATE:') ? [i] : [],
  );
  if (starts.length === 0) {
    return { ok: false, errors: [{ reason: 'No "DATE:" row' }] };
  }

  const errors: RowError[] = [];
  const rows = starts.map((start, n) =>
    parseDay(new Day(table, errors, start, starts[n + 1] ?? table.length)),
  );

  // A repeated date would collide on the (stationId, date) keys.
  const seen = new Map<string, number>();
  rows.forEach(({ daily: { date } }, n) => {
    if (date === '') return;
    const first = seen.get(date);
    if (first === undefined) seen.set(date, starts[n]);
    else {
      errors.push({
        row: starts[n] + 1,
        column: 'DATE:',
        reason: `${date} is also on row ${first + 1}`,
      });
    }
  });

  // Days are read section by section, so restore sheet order.
  errors.sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows };
}
