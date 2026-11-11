import type { Insertable, Selectable, Transaction } from 'kysely';
import { setAuditContext } from './audit';
import {
  deleteHourlyObservations,
  findHourlyObservations,
  upsertHourlyObservations,
  type NewHourlyObservation,
} from './hourlyObservations';
import {
  deleteScheduledObservations,
  findScheduledObservations,
  upsertScheduledObservations,
  type NewScheduledObservation,
} from './scheduledObservations';
import { tx } from './tx';
import type { DailyObservationsTable, Database, DbDay } from './types';
import { chunk, setFromExcluded, updatableColumns } from './upsert';

export type DailyObservation = Selectable<DailyObservationsTable>;
export type NewDailyObservation = Insertable<DailyObservationsTable>;

const KEY = ['stationId', 'date'] as const;

export interface WriteDailyObservationsInput {
  stationId: number;
  importId: number;
  userId: number;
  // The days the upload covers. Only these are read, written or pruned.
  dates: string[];
}

// What to write, decided by the caller from the days already stored. `result`
// is handed back to the caller of writeDailyObservations untouched.
export interface WritePlan<T> {
  upserts: {
    daily: NewDailyObservation[];
    hourly: NewHourlyObservation[];
    scheduled: NewScheduledObservation[];
  };
  // Hourly and scheduled rows of a day that are no longer in its sheet.
  deletes: { date: string; hours: number[]; obsTimes: string[] }[];
  result: T;
}

// Saves a daily upload in ONE transaction: the upload is all or nothing. The
// caller's `plan` is a pure function of the stored days, so this function owns
// every query and the caller owns the decision. Queries run one after another:
// a transaction is a single connection, and a day's daily row must exist before
// the hourly and scheduled rows that reference it.
export async function writeDailyObservations<T>(
  { stationId, importId, userId, dates }: WriteDailyObservationsInput,
  plan: (stored: DbDay[]) => WritePlan<T>,
): Promise<T> {
  // Nothing to read or write, so no transaction; `plan` is pure.
  if (dates.length === 0) return plan([]).result;
  return tx(async (trx) => {
    await setAuditContext(trx, { userId, importId });
    const { upserts, deletes, result } = plan(
      await findDays(trx, stationId, dates),
    );

    await upsertDailyObservations(trx, upserts.daily);
    await upsertHourlyObservations(trx, upserts.hourly);
    await upsertScheduledObservations(trx, upserts.scheduled);
    for (const { date, hours, obsTimes } of deletes) {
      await deleteHourlyObservations(trx, stationId, date, hours);
      await deleteScheduledObservations(trx, stationId, date, obsTimes);
    }
    return result;
  });
}

// pg returns a time as "04:11:00"; the parser emits "04:11".
const hhmm = (time: string | null) => (time === null ? null : time.slice(0, 5));

// The stored days among `dates`, in the same shape as an upload.
export async function findDays(
  trx: Transaction<Database>,
  stationId: number,
  dates: string[],
): Promise<DbDay[]> {
  const hourly = await findHourlyObservations(trx, stationId, dates);
  const scheduled = await findScheduledObservations(trx, stationId, dates);
  return (await findDailyObservations(trx, stationId, dates)).map((daily) => ({
    daily: {
      ...daily,
      sunrise: hhmm(daily.sunrise),
      sunset: hhmm(daily.sunset),
      fastestMileTime: hhmm(daily.fastestMileTime),
      peakGustTime: hhmm(daily.peakGustTime),
    },
    hourly: hourly.filter((row) => row.date === daily.date),
    scheduled: scheduled
      .filter((row) => row.date === daily.date)
      .map((row) => ({ ...row, obsTime: row.obsTime.slice(0, 5) })),
  }));
}

export function findDailyObservations(
  trx: Transaction<Database>,
  stationId: number,
  dates: string[],
): Promise<DailyObservation[]> {
  return trx
    .selectFrom('daily_observations')
    .selectAll()
    .where('stationId', '=', stationId)
    .where('date', 'in', dates)
    .orderBy('date')
    .forUpdate()
    .execute();
}

// Inserts new (stationId, date) rows and overwrites existing ones.
export async function upsertDailyObservations(
  trx: Transaction<Database>,
  rows: NewDailyObservation[],
): Promise<void> {
  if (rows.length === 0) return;
  const columns = updatableColumns(rows[0], KEY);
  for (const batch of chunk(rows)) {
    await trx
      .insertInto('daily_observations')
      .values(batch)
      .onConflict((oc) =>
        oc.columns([...KEY]).doUpdateSet(setFromExcluded(columns)),
      )
      .execute();
  }
}
