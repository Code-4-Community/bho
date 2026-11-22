import type { DbDay } from '@bho/db-client';
import type { ParsedDay } from '@bho/weather-parsing';

// Adds the columns the upload supplies. Every other column maps one to one,
// and decimals stay strings, which pg accepts for numeric.
export function toDbRows(
  day: ParsedDay,
  stationId: number,
  importId: number,
): DbDay {
  return {
    daily: { ...day.daily, stationId, importId },
    hourly: day.hourly.map((row) => ({ ...row, stationId })),
    scheduled: day.scheduled.map((row) => ({ ...row, stationId })),
  };
}
