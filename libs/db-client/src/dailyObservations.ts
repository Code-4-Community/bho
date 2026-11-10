import type { Insertable, Selectable, Transaction } from 'kysely';
import { setAuditContext } from './audit';
import {
  deleteHourlyObservations,
  findHourlyObservations,
  upsertHourlyObservations,
  type HourlyObservation,
  type NewHourlyObservation,
} from './hourlyObservations';
import {
  deleteScheduledObservations,
  findScheduledObservations,
  upsertScheduledObservations,
  type NewScheduledObservation,
  type ScheduledObservation,
} from './scheduledObservations';
import { tx } from './tx';
import type { DailyObservationsTable, Database } from './types';
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

// What the database holds for those dates.
export interface StoredObservations {
  daily: DailyObservation[];
  hourly: HourlyObservation[];
  scheduled: ScheduledObservation[];
}

export interface WriteCounts {
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
}

// What to write, decided by the caller from what is stored.
export interface WritePlan {
  upserts: {
    daily: NewDailyObservation[];
    hourly: NewHourlyObservation[];
    scheduled: NewScheduledObservation[];
  };
  // Hourly and scheduled rows of a day that are no longer in its sheet.
  deletes: { date: string; hours: number[]; obsTimes: string[] }[];
  counts: WriteCounts;
}

// Saves a daily upload in ONE transaction: the upload is all or nothing. The
// caller's `plan` is a pure function of the stored rows, so this function owns
// every query and the caller owns the decision. Queries run one after another:
// a transaction is a single connection, and a day's daily row must exist before
// the hourly and scheduled rows that reference it.
export async function writeDailyObservations(
  { stationId, importId, userId, dates }: WriteDailyObservationsInput,
  plan: (stored: StoredObservations) => WritePlan,
): Promise<WriteCounts> {
  if (dates.length === 0) {
    return { inserted: 0, updated: 0, unchanged: 0, deleted: 0 };
  }
  return tx(async (trx) => {
    await setAuditContext(trx, { userId, importId });
    const stored = {
      daily: await findDailyObservations(trx, stationId, dates),
      hourly: await findHourlyObservations(trx, stationId, dates),
      scheduled: await findScheduledObservations(trx, stationId, dates),
    };
    const { upserts, deletes, counts } = plan(stored);

    await upsertDailyObservations(trx, upserts.daily);
    await upsertHourlyObservations(trx, upserts.hourly);
    await upsertScheduledObservations(trx, upserts.scheduled);
    for (const { date, hours, obsTimes } of deletes) {
      await deleteHourlyObservations(trx, stationId, date, hours);
      await deleteScheduledObservations(trx, stationId, date, obsTimes);
    }
    return counts;
  });
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
