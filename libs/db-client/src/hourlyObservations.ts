import type { Insertable, Selectable, Transaction } from 'kysely';
import type { Database, HourlyObservationsTable } from './types';
import { chunk, setFromExcluded, updatableColumns } from './upsert';

export type HourlyObservation = Selectable<HourlyObservationsTable>;
export type NewHourlyObservation = Insertable<HourlyObservationsTable>;

const KEY = ['stationId', 'date', 'hour'] as const;

export function findHourlyObservations(
  trx: Transaction<Database>,
  stationId: number,
  dates: string[],
): Promise<HourlyObservation[]> {
  return trx
    .selectFrom('hourly_observations')
    .selectAll()
    .where('stationId', '=', stationId)
    .where('date', 'in', dates)
    .orderBy('date')
    .orderBy('hour')
    .forUpdate()
    .execute();
}

// The parent daily_observations row must already exist.
export async function upsertHourlyObservations(
  trx: Transaction<Database>,
  rows: NewHourlyObservation[],
): Promise<void> {
  if (rows.length === 0) return;
  const columns = updatableColumns(rows[0], KEY);
  for (const batch of chunk(rows)) {
    await trx
      .insertInto('hourly_observations')
      .values(batch)
      .onConflict((oc) =>
        oc.columns([...KEY]).doUpdateSet(setFromExcluded(columns)),
      )
      .execute();
  }
}

export async function deleteHourlyObservations(
  trx: Transaction<Database>,
  stationId: number,
  date: string,
  hours: number[],
): Promise<void> {
  if (hours.length === 0) return;
  await trx
    .deleteFrom('hourly_observations')
    .where('stationId', '=', stationId)
    .where('date', '=', date)
    .where('hour', 'in', hours)
    .execute();
}
