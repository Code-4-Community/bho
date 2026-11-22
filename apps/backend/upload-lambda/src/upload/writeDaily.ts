import { writeDailyObservations } from '@bho/db-client';
import type { ParsedDay } from '@bho/weather-parsing';
import { DailyWriteResult, planDailyWrite } from './planDailyWrite';

export interface WriteDailyOptions {
  stationId: number;
  importId: number;
  userId: number;
}

// Saves the parsed days of a daily upload. The connection, the transaction and
// the audit context are all inside @bho/db-client; this only supplies the plan.
export function writeDaily(
  days: ParsedDay[],
  { stationId, importId, userId }: WriteDailyOptions,
): Promise<DailyWriteResult> {
  return writeDailyObservations(
    { stationId, importId, userId, dates: days.map((d) => d.daily.date) },
    planDailyWrite(days, { stationId, importId }),
  );
}
