import { sql, type Kysely } from 'kysely';
import type { Database } from '@bho/db-client';
import type { Page } from './imports';

// The tables with an audit trigger (see db/migrations), so the only values
// tableName can have
export const AUDITED_TABLES = [
  'daily_observations',
  'hourly_observations',
  'scheduled_observations',
  'daily_records',
] as const;
export type AuditedTable = (typeof AUDITED_TABLES)[number];

export interface AuditLogFilters {
  changedFrom?: Date;
  changedTo?: Date;
  tableName?: AuditedTable;
  importId?: number;
  rowKey?: Record<string, unknown>;
}

// Newest changedAt first; id breaks ties, since every row changed in one
// transaction gets the same changedAt
export const listAuditLog = async (
  db: Kysely<Database>,
  { changedFrom, changedTo, tableName, importId, rowKey }: AuditLogFilters,
  { limit, offset }: Page,
) => {
  let query = db.selectFrom('audit_log');
  if (changedFrom) query = query.where('changedAt', '>=', changedFrom);
  if (changedTo) query = query.where('changedAt', '<=', changedTo);
  if (tableName) query = query.where('tableName', '=', tableName);
  if (importId !== undefined) query = query.where('importId', '=', importId);
  // jsonb equality ignores key order, but a value's type must match the
  // column's ("1" doesn't match a stationId of 1)
  if (rowKey) {
    query = query.where('rowKey', '=', sql`${JSON.stringify(rowKey)}::jsonb`);
  }

  const [items, { total }] = await Promise.all([
    query
      .selectAll()
      .orderBy('changedAt', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
    query
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .executeTakeFirstOrThrow(),
  ]);

  return { items, total: Number(total) };
};

// undefined if no audit log entry has this id
export const getAuditLogEntry = (db: Kysely<Database>, id: number) =>
  db
    .selectFrom('audit_log')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
