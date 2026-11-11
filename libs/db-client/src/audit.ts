import { sql, type Transaction } from 'kysely';
import type { Database } from './types';

// The audit trigger copies these settings into audit_log.changedBy and
// importId. `true` scopes them to the current transaction, so call this first
// in the transaction whose writes it should cover.
export async function setAuditContext(
  trx: Transaction<Database>,
  context: { userId: number; importId?: number },
): Promise<void> {
  await sql`
    SELECT set_config('app.user_id', ${String(context.userId)}, true),
           set_config('app.import_id', ${String(context.importId ?? '')}, true)
  `.execute(trx);
}
