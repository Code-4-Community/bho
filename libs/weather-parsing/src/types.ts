// `row` is the 1-based spreadsheet row, so staff can find it in the sheet. It
// is absent when the problem is with the whole file.
export interface RowError {
  row?: number;
  column?: string;
  reason: string;
}

// Narrow with `ok === false`, not `!ok`: without strictNullChecks, which the
// lambdas don't enable, `!ok` doesn't narrow to the errors branch.
export type ParseResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; errors: RowError[] };

// One row of the historical sheet: a daily_records row without stationId and
// importId, which come from the upload. Decimals stay strings, matching how
// pg reads numeric, so no precision is lost.
export interface HistoricalRecord {
  month: number;
  day: number;
  highF: number | null;
  highYears: number[] | null;
  lowF: number | null;
  lowYears: number[] | null;
  precipIn: string | null;
  precipYears: number[] | null;
  snowIn: string | null;
  snowYears: number[] | null;
  peakGustMph: number | null;
  peakGustDir: string | null;
  peakGustIsEstimated: boolean;
  peakGustYears: number[] | null;
  notes: string | null;
}

// Each part is a row of its table without stationId (or importId, for 
// daily_observations), which come from the upload. Decimals (numeric 
// columns) stay strings, and integers (smallint columns) are numbers.
export interface ParsedDay {
  daily: DailyObservation;
  hourly: HourlyObservation[];
  scheduled: ScheduledObservation[];
}

export interface DailyObservation {
  date: string; // ISO, e.g. "2026-07-01"
  maxTempF: number | null;
  minTempF: number | null;
  avgTempF: string | null;
  normalTempF: number | null;
  precipIn: string | null;
  precipTrace: boolean;
  snowfallIn: string | null;
  snowDepthIn: string | null;
  sunshineMin: number | null;
  sunshinePossibleMin: number | null;
  sunshinePct: number | null;
  fastestMileMph: number | null;
  fastestMileDir: string | null;
  fastestMileTime: string | null; // "HH:MM", EST
  peakGustKts: number | null;
  peakGustDir: string | null;
  peakGustTime: string | null;
  avgStationPressureMb: string | null;
  sunrise: string | null;
  sunset: string | null;
  observerInitials: string | null;
  remarks: string | null;
}

export interface HourlyObservation {
  date: string;
  hour: number; // start hour, "00-01" is 0
  tempF: number | null;
  precipIn: string | null;
  precipTrace: boolean;
  windDir: string | null;
  windSpeedMph: number | null;
  sunshineMin: number | null;
  skyCover: number | null; // 0-8
  visibilityMi: string | null; // "1/8" is "0.125"
  presentWeather: string | null; // "0" means observed, no weather
  humidityPct: number | null;
  mountainVis: string | null; // e.g. "1@1.5"
  remarks: string | null;
}

export interface ScheduledObservation {
  date: string;
  obsTime: string; // "HH:MM", EST
  stationPressureIn: string | null;
  attachedThermC: string | null;
  observedBarometerMb: string | null;
  pressureCorrectionMb: string | null;
  dryBulbF: string | null;
  wetBulbF: string | null;
  dewpointF: number | null;
  humidityPct: number | null;
  maxTempF: number | null;
  minTempF: number | null;
  precipIn: string | null;
  precipTrace: boolean;
  snowfallIn: string | null;
  snowDepthIn: string | null;
  vaporPressureMb: string | null;
}
