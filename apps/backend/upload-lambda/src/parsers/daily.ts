import { readCsv } from './csv';

/** daily_observations, NOT INCLUDING stationId and importId. */
export interface DailyObservation {
  date: string; // ISO, e.g. "2026-07-01"
  maxTempF: number | null;
  minTempF: number | null;
  avgTempF: number | null;
  normalTempF: number | null;
  precipIn: number | null;
  precipTrace: boolean;
  snowfallIn: number | null;
  snowDepthIn: number | null;
  sunshineMin: number | null;
  sunshinePossibleMin: number | null;
  sunshinePct: number | null;
  fastestMileMph: number | null;
  fastestMileDir: string | null;
  fastestMileTime: string | null; // "HH:MM", EST
  peakGustKts: number | null;
  peakGustDir: string | null;
  peakGustTime: string | null;
  avgStationPressureMb: number | null;
  sunrise: string | null;
  sunset: string | null;
  observerInitials: string | null;
  remarks: string | null;
}

/** hourly_observations, NOT INCLUDING stationId. */
export interface HourlyObservation {
  date: string;
  hour: number; // start hour, "00-01" is 0
  tempF: number | null;
  precipIn: number | null;
  precipTrace: boolean;
  windDir: string | null;
  windSpeedMph: number | null;
  sunshineMin: number | null;
  skyCover: number | null; // 0-8
  visibilityMi: number | null; // "1/8" is 0.125
  presentWeather: string | null; // "0" means observed, no weather
  humidityPct: number | null;
  mountainVis: string | null; // e.g. "1@1.5"
  remarks: string | null;
}

/** scheduled_observations, NOT INCLUDING stationId. */
export interface ScheduledObservation {
  date: string;
  obsTime: string; // "HH:MM", EST
  stationPressureIn: number | null;
  attachedThermC: number | null;
  observedBarometerMb: number | null;
  pressureCorrectionMb: number | null;
  dryBulbF: number | null;
  wetBulbF: number | null;
  dewpointF: number | null;
  humidityPct: number | null;
  maxTempF: number | null;
  minTempF: number | null;
  precipIn: number | null;
  precipTrace: boolean;
  snowfallIn: number | null;
  snowDepthIn: number | null;
  vaporPressureMb: number | null;
}

export interface ParsedDay {
  daily: DailyObservation;
  hourly: HourlyObservation[];
  scheduled: ScheduledObservation[];
}

// Cell helpers

function str(cell: string | undefined): string | null {
  return cell ? cell : null;
}

/** Ignores "%" and footnote "*" markers. Blank -> null. */
function num(cell: string | undefined): number | null {
  if (!cell) return null;
  const n = Number(cell.replace(/[%*]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** "77%" -> 77. "0.77" -> 77. */
function pct(cell: string | undefined): number | null {
  const n = num(cell);
  if (n === null || cell!.includes('%')) return n;
  return Math.round(n * 100);
}

/** "1/8" -> 0.125, "1 1/2" -> 1.5, "35" -> 35. */
function fraction(cell: string | undefined): number | null {
  const match = cell?.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (!match) return num(cell);
  return Number(match[1] ?? 0) + Number(match[2]) / Number(match[3]);
}

/** Precip cells hold inches, "T" for a trace, or nothing. */
function precip(cell: string | undefined): {
  precipIn: number | null;
  precipTrace: boolean;
} {
  if (cell === 'T') return { precipIn: null, precipTrace: true };
  return { precipIn: num(cell), precipTrace: false };
}

/** "0245E" -> "02:45", "1205" -> "12:05". */
function time(cell: string | undefined): string | null {
  const match = cell?.match(/^(\d{2})(\d{2})E?$/);
  return match ? `${match[1]}:${match[2]}` : null;
}

/**
 * "20 WSW @ 0854E" -> speed, direction and time.
 * When several times are listed ("28 WNW @ 1631E, 1651E"), the first one is used.
 */
function peakGust(cell: string | undefined) {
  const match = cell?.match(/^(\d+)\s*([A-Z]{1,3})?\s*@\s*(\d{4}E?)/);
  return {
    peakGustKts: match ? Number(match[1]) : null,
    peakGustDir: match?.[2] ?? null,
    peakGustTime: match ? time(match[3]) : null,
  };
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** "Wednesday, July 1, 2026" -> "2026-07-01" */
function toIsoDate(label: string): string {
  const match = label.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) + 1 : 0;
  if (!match || month === 0)
    throw new Error(`Unrecognized date label: "${label}"`);
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[2].padStart(
    2,
    '0',
  )}`;
}

// Block parsing

/** Splits the sheet into one array of rows per day, keyed off the "DATE:" row. */
function splitIntoDays(rows: string[][]): string[][][] {
  const days: string[][][] = [];
  let current: string[][] | null = null;

  for (const row of rows) {
    if (row.includes('DATE:')) {
      current = [];
      days.push(current);
    }
    current?.push(row);
  }
  return days;
}

function findRow(block: string[][], firstCell: string): string[] {
  return block.find((r) => r[0] === firstCell) ?? [];
}

function parseHourly(date: string, row: string[]): HourlyObservation {
  return {
    date,
    hour: Number(row[0].slice(0, 2)),
    tempF: num(row[1]),
    ...precip(row[2]),
    windDir: str(row[3]),
    windSpeedMph: num(row[4]),
    sunshineMin: num(row[5]),
    skyCover: num(row[6]),
    visibilityMi: fraction(row[7]),
    presentWeather: str(row[8]),
    humidityPct: num(row[9]),
    mountainVis: str(row[10]),
    remarks: str(row[11]),
  };
}

/**
 * Reads the "Station Pressure Computations" block: a header row of times
 * ("0700", "1900", "AVG", sometimes "1200E") and rows of values under them.
 * Returns the column index for each time, plus the value rows.
 */
function parsePressureBlock(block: string[][]) {
  const start = block.findIndex(
    (r) => r[0] === 'Station Pressure Computations',
  );
  const header = start >= 0 ? block[start + 1] ?? [] : [];

  const columns = new Map<string, number>();
  header.forEach((cell, i) => {
    const t = i >= 2 ? time(cell) : null;
    if (t) columns.set(t, i);
  });

  return {
    columns,
    attachedTherm: findRow(block, 'Attached Therm.'),
    observedBarometer: findRow(block, 'Observed Barometer'),
    totalCorrection: findRow(block, 'Total Correction'),
  };
}

function parseScheduled(
  block: string[][],
  date: string,
): ScheduledObservation[] {
  const pressure = parsePressureBlock(block);

  const fromPressureBlock = (obsTime: string) => {
    const col = pressure.columns.get(obsTime);
    return {
      attachedThermC:
        col === undefined ? null : num(pressure.attachedTherm[col]),
      observedBarometerMb:
        col === undefined ? null : num(pressure.observedBarometer[col]),
      pressureCorrectionMb:
        col === undefined ? null : num(pressure.totalCorrection[col]),
    };
  };

  // Rows in the "Scheduled Observations" table start with a time in the format "HHMM"
  const rows: ScheduledObservation[] = block
    .filter((r) => /^\d{4}$/.test(r[0]))
    .map((row) => {
      const obsTime = time(row[0])!;
      return {
        date,
        obsTime,
        stationPressureIn: num(row[1]),
        ...fromPressureBlock(obsTime),
        dryBulbF: num(row[2]),
        wetBulbF: num(row[3]),
        dewpointF: num(row[4]),
        humidityPct: pct(row[5]),
        maxTempF: num(row[6]),
        minTempF: num(row[7]),
        ...precip(row[8]),
        snowfallIn: num(row[9]),
        snowDepthIn: num(row[10]),
        // On the row marked "Average ->", this column holds the 0700/1900 average, not a reading
        vaporPressureMb: row.includes('Average ->') ? null : num(row[11]),
      };
    });

  // Some days have an extra reading (e.g. 1200) that only appears in the pressure computations block
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

function parseDaily(block: string[][], date: string): DailyObservation {
  // The summary values sit on the row right after the "24HR Max" header
  const summaryHeaderIdx = block.findIndex((r) => r[0] === '24HR Max');
  const s = summaryHeaderIdx >= 0 ? block[summaryHeaderIdx + 1] ?? [] : [];

  // Possible sunshine, sunrise and sunset sit on the rows under the hourly table
  const aver = findRow(block, 'Aver.');
  const misc = findRow(block, 'Misc.');

  // Footnotes live in column G between "Additional Notes:" and "INITIALS:"
  const notesStart = block.findIndex((r) => r[6] === 'Additional Notes:');
  const initialsIdx = block.findIndex((r) => r.includes('INITIALS:'));
  const notes =
    notesStart >= 0
      ? block
          .slice(notesStart + 1, initialsIdx >= 0 ? initialsIdx : undefined)
          .map((r) => r[6])
          .filter(Boolean)
      : [];

  const initialsRow = initialsIdx >= 0 ? block[initialsIdx] : [];

  return {
    date,
    maxTempF: num(s[0]),
    minTempF: num(s[1]),
    avgTempF: num(findRow(block, 'Average Temperature')[3]),
    normalTempF: num(findRow(block, 'Normal Temperature')[3]),
    ...precip(s[2]),
    snowfallIn: num(s[4]),
    snowDepthIn: num(s[5]),
    sunshineMin: num(s[6]),
    sunshinePossibleMin: num(aver[5]?.replace(/^Poss\s*/i, '')),
    sunshinePct: pct(s[7]),
    fastestMileMph: num(s[8]),
    fastestMileDir: str(s[9]),
    fastestMileTime: time(s[10]),
    ...peakGust(s[11]),
    avgStationPressureMb: num(findRow(block, 'Station Pressure')[4]),
    sunrise: time(aver[10]),
    sunset: time(misc[10]),
    observerInitials: str(initialsRow[initialsRow.indexOf('INITIALS:') + 1]),
    remarks: notes.length > 0 ? notes.join('\n') : null,
  };
}

function parseDay(block: string[][]): ParsedDay {
  const dateRow = block[0];
  const date = toIsoDate(dateRow[dateRow.indexOf('DATE:') + 1] ?? '');

  return {
    daily: parseDaily(block, date),
    // Hourly rows "00-01"
    hourly: block
      .filter((r) => /^\d{2}-\d{2}$/.test(r[0]))
      .map((r) => parseHourly(date, r)),
    scheduled: parseScheduled(block, date),
  };
}

/**
 * Parses a monthly DAILY sheet export into one ParsedDay per day.
 * Cells are trimmed first: the sheet has padded labels ("DATE: ") and whitespace-only cells.
 */
export function parseDailySheet(csv: string): ParsedDay[] {
  const rows = readCsv(csv).map((row) => row.map((cell) => cell.trim()));
  return splitIntoDays(rows).map(parseDay);
}
