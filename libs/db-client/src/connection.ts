import { Kysely, PostgresDialect } from 'kysely';
import { Pool, PoolConfig, types } from 'pg';
import type { Database } from './types';

// pg turns a date into a Date at local midnight, so 2026-07-01 is 04:00Z on a
// laptop in Eastern time and 00:00Z in Lambda. Keep dates as 'YYYY-MM-DD'.
types.setTypeParser(types.builtins.DATE, (value) => value);

const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

export function createDb(config: PoolConfig): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new Pool(config) }),
  });
}

let db: Kysely<Database> | undefined;

// The one connection every function in this package uses, created on first use
// from the DB_* env vars, so importing the package needs none of them. Callers
// outside the package only call its functions and never hold the database.
export function getDb(): Kysely<Database> {
  if (db) {
    return db;
  }

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  db = createDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
    // A lambda container serves one request at a time, so one connection is
    // enough; a blackholed SYN otherwise hangs until the lambda times out; and
    // the idle timer fires late in a frozen container, so never retire.
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 0,
    keepAlive: true,
  });

  return db;
}

// Closes the connection; the next getDb() opens a new one.
export async function closeConnection(): Promise<void> {
  const open = db;
  db = undefined;
  await open?.destroy();
}
