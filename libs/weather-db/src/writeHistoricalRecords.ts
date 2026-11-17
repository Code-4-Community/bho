import { Insertable, Kysely, sql } from 'kysely';
import type { DailyRecordsTable, Database } from '@bho/db-client';

// A HistoricalRecord (from @bho/weather-parsing) plus the stationId and importId
// that come from the upload. A row of the daily_records table.
export type NewHistoricalRecord = Insertable<DailyRecordsTable>;

export interface WriteHistoricalRecordsOptions {
  batchSize?: number; // Default: 500, must be a positive integer
  userId?: number;
}

export interface WriteHistoricalRecordsResult {
  inserted: number;
  skipped: number;
}

const DEFAULT_BATCH_SIZE = 500;

// Writes historical records (daily_records table). Inserts in batches inside ONE
// transaction, so a failed batch rolls back the whole file. A row whose
// (stationId, month, day) already exists is skipped. Rows within one file are assumed
// unique (from parser validation).
// Returns { inserted, skipped }.
export async function writeHistoricalRecords(
  db: Kysely<Database>,
  records: NewHistoricalRecord[],
  {
    batchSize = DEFAULT_BATCH_SIZE,
    userId,
  }: WriteHistoricalRecordsOptions = {},
): Promise<WriteHistoricalRecordsResult> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(
      `batchSize must be a positive integer, got ${batchSize}`,
    );
  }
  if (records.length === 0) return { inserted: 0, skipped: 0 };

  const inserted = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.user_id', ${
      userId === undefined ? '' : String(userId)
    }, true),
                     set_config('app.import_id', ${String(
                       records[0].importId,
                     )}, true)`.execute(trx);

    let count = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const result = await trx
        .insertInto('daily_records')
        .values(records.slice(i, i + batchSize))
        .onConflict((oc) =>
          oc.columns(['stationId', 'month', 'day']).doNothing(),
        )
        .executeTakeFirst();
      count += Number(result.numInsertedOrUpdatedRows ?? 0);
    }
    return count;
  });

  return { inserted, skipped: records.length - inserted };
}
