import type { Insertable } from 'kysely';
import { tx } from './tx';
import type { ImportsTable } from './types';

export type NewImport = Omit<Insertable<ImportsTable>, 'errors'> & {
  errors?: unknown;
};

// Rows are never updated or deleted: every upload adds one. Returns its id.
export async function recordImport({
  errors,
  ...values
}: NewImport): Promise<number> {
  return tx(async (trx) => {
    const row = await trx
      .insertInto('imports')
      .values({
        ...values,
        errors: errors === undefined ? null : JSON.stringify(errors),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
}
