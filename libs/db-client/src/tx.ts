import type { Transaction } from 'kysely';
import { getDb } from './connection';
import type { Database } from './types';

// Postgres serialization_failure and deadlock_detected.
const RETRYABLE = new Set(['40001', '40P01']);

function isRetryable(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && RETRYABLE.has(code);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs fn on the shared connection in one transaction: it commits when fn returns and rolls back when fn
// throws. A retryable failure reruns fn from the start, so fn must be safe to
// repeat.
export async function tx<T>(
  fn: (trx: Transaction<Database>) => Promise<T>,
  attempts = 3,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDb().transaction().execute(fn);
    } catch (err) {
      if (attempt >= attempts - 1 || !isRetryable(err)) throw err;
      await sleep(2 ** attempt * 25 + Math.random() * 25);
    }
  }
}
