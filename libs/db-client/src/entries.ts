import { sql, type Kysely } from 'kysely';
import type { Database } from './types';

// Read side of the daily observations: an entry is one day. The data has a
// single station, so dates alone identify an entry.

export interface EntryFilters {
  from: string;
  to: string;
  // Only days whose current import was uploaded by this user
  uploadedBy?: number;
}

// The import that last wrote a day, with the user who uploaded it
const IMPORT_COLUMNS = [
  'imports.id as importId',
  'imports.fileName',
  'imports.status as importStatus',
  'imports.uploadedAt',
  'users.id as uploadedById',
  'users.firstName as uploadedByFirstName',
  'users.lastName as uploadedByLastName',
] as const;

// One row per day that has data, oldest-to-newest order is left to the caller
export const listEntries = (
  db: Kysely<Database>,
  { from, to, uploadedBy }: EntryFilters,
) => {
  let query = db
    .selectFrom('daily_observations')
    .innerJoin('imports', 'imports.id', 'daily_observations.importId')
    .innerJoin('users', 'users.id', 'imports.uploadedBy')
    .select(['daily_observations.date', ...IMPORT_COLUMNS])
    .where('daily_observations.date', '>=', from)
    .where('daily_observations.date', '<=', to);
  if (uploadedBy !== undefined)
    query = query.where('users.id', '=', uploadedBy);
  return query.orderBy('daily_observations.date', 'desc').execute();
};

// The day's summary, hourly and scheduled rows and current import.
// undefined if the day has no daily_observations row.
export const getEntry = async (db: Kysely<Database>, date: string) => {
  const summary = await db
    .selectFrom('daily_observations')
    .selectAll()
    .where('date', '=', date)
    .executeTakeFirst();
  if (!summary) return undefined;

  const [hourly, scheduled, currentImport] = await Promise.all([
    db
      .selectFrom('hourly_observations')
      .selectAll()
      .where('date', '=', date)
      .orderBy('hour')
      .execute(),
    db
      .selectFrom('scheduled_observations')
      .selectAll()
      .where('date', '=', date)
      .orderBy('obsTime')
      .execute(),
    db
      .selectFrom('imports')
      .innerJoin('users', 'users.id', 'imports.uploadedBy')
      .select(IMPORT_COLUMNS)
      .where('imports.id', '=', summary.importId)
      .executeTakeFirstOrThrow(),
  ]);

  return { summary, hourly, scheduled, currentImport };
};

// Every import that wrote the day, newest first, per audit_log. Re-uploads that
// changed nothing write no audit rows, so they are not listed. currentImportId
// is null if the day has no daily_observations row.
export const listEntryVersions = async (db: Kysely<Database>, date: string) => {
  const [current, versions] = await Promise.all([
    db
      .selectFrom('daily_observations')
      .select('importId')
      .where('date', '=', date)
      .executeTakeFirst(),
    db
      .selectFrom('imports')
      .innerJoin('users', 'users.id', 'imports.uploadedBy')
      .select(IMPORT_COLUMNS)
      .where('imports.id', 'in', (eb) =>
        eb
          .selectFrom('audit_log')
          .select('audit_log.importId')
          .where('audit_log.tableName', '=', 'daily_observations')
          .where(sql<boolean>`"audit_log"."rowKey" ->> 'date' = ${date}`)
          .where('audit_log.importId', 'is not', null),
      )
      .orderBy('imports.uploadedAt', 'desc')
      .orderBy('imports.id', 'desc')
      .execute(),
  ]);

  return { currentImportId: current?.importId ?? null, versions };
};
