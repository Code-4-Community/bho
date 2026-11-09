import { Kysely, Transaction, sql } from 'kysely';
import type { ParsedDay } from '@bho/weather-parsing';
import type { Database } from '../../../db/types';

export interface WriteDailyObservationsOptions {
  stationId: number;
  importId: number;
  userId?: number;
  batchSize?: number; // Default: 500, must be a positive integer
}

export interface WriteDailyObservationsResult {
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
}

type ObservationTable =
  | 'daily_observations'
  | 'hourly_observations'
  | 'scheduled_observations';

const DEFAULT_BATCH_SIZE = 500;

// Writes parsed days from a daily upload inside ONE transaction. Staff re-upload
// the month's sheet several times a day and the newest upload wins (see
// docs/database-schema.md), so existing rows are updated, not skipped. A row is
// only updated when a value changed, so the audit log records real edits only.
// Hourly and scheduled rows that are no longer in a day's sheet are deleted.
export async function writeDailyObservations(
  db: Kysely<Database>,
  days: ParsedDay[],
  {
    stationId,
    importId,
    userId,
    batchSize = DEFAULT_BATCH_SIZE,
  }: WriteDailyObservationsOptions,
): Promise<WriteDailyObservationsResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(
      `batchSize must be a positive integer, got ${batchSize}`,
    );
  }
  const result = { inserted: 0, updated: 0, unchanged: 0, deleted: 0 };
  if (days.length === 0) return result;

  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.user_id', ${
      userId === undefined ? '' : String(userId)
    }, true),
                     set_config('app.import_id', ${String(
                       importId,
                     )}, true)`.execute(trx);

    for (const { daily, hourly, scheduled } of days) {
      const hours = hourly.map((h) => h.hour);
      const times = scheduled.map((s) => s.obsTime);
      const staleHours = await trx
        .deleteFrom('hourly_observations')
        .where('stationId', '=', stationId)
        .where('date', '=', daily.date)
        .$if(hours.length > 0, (qb) => qb.where('hour', 'not in', hours))
        .executeTakeFirst();
      const staleTimes = await trx
        .deleteFrom('scheduled_observations')
        .where('stationId', '=', stationId)
        .where('date', '=', daily.date)
        .$if(times.length > 0, (qb) => qb.where('obsTime', 'not in', times))
        .executeTakeFirst();
      result.deleted +=
        Number(staleHours.numDeletedRows) + Number(staleTimes.numDeletedRows);
    }

    // Daily rows first: hourly and scheduled rows reference them.
    const writes: [ObservationTable, string[], Record<string, unknown>[]][] = [
      [
        'daily_observations',
        ['stationId', 'date'],
        days.map((d) => ({ stationId, importId, ...d.daily })),
      ],
      [
        'hourly_observations',
        ['stationId', 'date', 'hour'],
        days.flatMap((d) => d.hourly.map((h) => ({ stationId, ...h }))),
      ],
      [
        'scheduled_observations',
        ['stationId', 'date', 'obsTime'],
        days.flatMap((d) => d.scheduled.map((s) => ({ stationId, ...s }))),
      ],
    ];
    for (const [table, key, rows] of writes) {
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const written = await upsert(trx, table, key, batch);
        const inserted = written.filter((row) => row.inserted).length;
        result.inserted += inserted;
        result.updated += written.length - inserted;
        result.unchanged += batch.length - written.length;
      }
    }
    return result;
  });
}

// Returns one row per inserted or changed row. Unchanged rows are skipped by the
// WHERE and return nothing. xmax is 0 only on a freshly inserted row. importId
// is not compared: a new upload with the same values is not a change.
function upsert(
  trx: Transaction<Database>,
  table: ObservationTable,
  key: string[],
  rows: Record<string, unknown>[],
) {
  const columns = Object.keys(rows[0]).filter((c) => !key.includes(c));
  const compared = columns.filter((c) => c !== 'importId');
  const list = (prefix: string) =>
    sql.join(compared.map((c) => sql.ref(`${prefix}.${c}`)));
  return trx
    .insertInto(table)
    .values(rows as never)
    .onConflict((oc) =>
      oc
        .columns(key as never)
        .doUpdateSet(
          Object.fromEntries(
            columns.map((c) => [c, sql.ref(`excluded.${c}`)]),
          ) as never,
        )
        .where(
          sql<boolean>`(${list(table)}) is distinct from (${list('excluded')})`,
        ),
    )
    .returning(sql<boolean>`xmax = 0`.as('inserted'))
    .execute();
}
