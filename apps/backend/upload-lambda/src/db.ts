// eslint-disable-next-line @nx/enforce-module-boundaries
import { createDb } from '../../../../db/client';

type Db = ReturnType<typeof createDb>;

const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

let db: Db | undefined;

export const getDb = (): Db => {
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
    max: 1,
  });

  return db;
};
