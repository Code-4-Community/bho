import { Kysely, PostgresDialect } from 'kysely';
import { Pool, PoolConfig, types } from 'pg';
import type { Database } from './types';

// pg turns a date into a Date at local midnight, so outside UTC (laptops run
// Eastern) 2026-07-01 reads back as June 30 in UTC. Keep dates as 'YYYY-MM-DD'.
types.setTypeParser(types.builtins.DATE, (value) => value);

export function createDb(config: PoolConfig): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new Pool(config) }),
  });
}
