import type { Kysely } from 'kysely';
import { createDb, type Database } from '@bho/db-client';

let db: Kysely<Database> | undefined;

// Created on first use and reused across warm invocations. The env var names
// match db/kysely.config.ts.
export const getDb = (): Kysely<Database> => {
  db ??= createDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  return db;
};
