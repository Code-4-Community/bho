import { Insertable, Kysely, sql } from 'kysely';
import type { DailyRecordsTable, Database } from '../../../db/types';

// A HistoricalRecord including the stationId and importId
export type NewDailyRecord = Insertable<DailyRecordsTable>;

export interface WriteDailyRecordsOptions {
  batchSize?: number; // Default: 500, must be a positive integer
  userId?: number;
}

export interface WriteDailyRecordsResult {
  inserted: number;
  skipped: number;
}

const DEFAULT_BATCH_SIZE = 500;

// Inserts records in batches inside ONE transaction. A row whose (stationId, month, day)
// already exists is skipped. Rows within one file are assumed unique (from parser validation).
export async function writeDailyRecords(
  db: Kysely<Database>,
  records: NewDailyRecord[],
  { batchSize = DEFAULT_BATCH_SIZE, userId }: WriteDailyRecordsOptions = {},
): Promise<WriteDailyRecordsResult> {
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
