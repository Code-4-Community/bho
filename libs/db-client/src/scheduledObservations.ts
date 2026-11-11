import type { Insertable, Selectable, Transaction } from 'kysely';
import type { Database, ScheduledObservationsTable } from './types';
import { chunk, setFromExcluded, updatableColumns } from './upsert';

export type ScheduledObservation = Selectable<ScheduledObservationsTable>;
export type NewScheduledObservation = Insertable<ScheduledObservationsTable>;

const KEY = ['stationId', 'date', 'obsTime'] as const;

export function findScheduledObservations(
  trx: Transaction<Database>,
  stationId: number,
  dates: string[],
): Promise<ScheduledObservation[]> {
  return trx
    .selectFrom('scheduled_observations')
    .selectAll()
    .where('stationId', '=', stationId)
    .where('date', 'in', dates)
    .orderBy('date')
    .orderBy('obsTime')
    .forUpdate()
    .execute();
}

// The parent daily_observations row must already exist.
export async function upsertScheduledObservations(
  trx: Transaction<Database>,
  rows: NewScheduledObservation[],
): Promise<void> {
  if (rows.length === 0) return;
  const columns = updatableColumns(rows[0], KEY);
  for (const batch of chunk(rows)) {
    await trx
      .insertInto('scheduled_observations')
      .values(batch)
      .onConflict((oc) =>
        oc.columns([...KEY]).doUpdateSet(setFromExcluded(columns)),
      )
      .execute();
  }
}

// obsTimes as "HH:MM" or "HH:MM:SS".
export async function deleteScheduledObservations(
  trx: Transaction<Database>,
  stationId: number,
  date: string,
  obsTimes: string[],
): Promise<void> {
  if (obsTimes.length === 0) return;
  await trx
    .deleteFrom('scheduled_observations')
    .where('stationId', '=', stationId)
    .where('date', '=', date)
    .where('obsTime', 'in', obsTimes)
    .execute();
}
