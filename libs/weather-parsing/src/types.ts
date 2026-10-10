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
