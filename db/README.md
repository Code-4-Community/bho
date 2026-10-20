# Local database

A disposable Postgres 16 container and [kysely-ctl](https://github.com/kysely-org/kysely-ctl) for migrations. The schema is shared by all the backend Lambdas.

## Setup

Requires Node 24 (`nvm use` at the repo root) and a running Docker engine with Compose v2.

```bash
cd db
yarn install      # install this folder's dependencies
yarn db:up        # start Postgres on 127.0.0.1:5432
yarn db:migrate   # apply migrations
```

Connection: user `postgres`, password `password`, `127.0.0.1:5432`, database `postgres`.

## Commands

| Command                    | What it does                                    |
| -------------------------- | ----------------------------------------------- |
| `yarn db:up`               | Start Postgres                                  |
| `yarn db:down`             | Stop it, keep the data                          |
| `yarn db:migrate`          | Apply pending migrations                        |
| `yarn db:make <name>`      | Create `migrations/<timestamp>_<name>.ts`       |
| `yarn db:seed`             | Load the dev sample data (safe to re-run)       |
| `yarn db:seed:make <name>` | Create `seeds/<timestamp>_<name>.ts`            |
| `yarn db:reset`            | Delete the data, start fresh, re-run migrations |

The same commands run from the repo root through Nx: `nx run db:install`, `nx run db:up`, `nx run db:migrate`, `nx run db:make <name>`, `nx run db:seed`, `nx run db:seed-make <name>`, `nx run db:reset` (prefix with `npx` if `nx` isn't installed globally).

## Adding a migration

The database schema is defined by migrations: the schema is whatever all the migration files produce when run in order (oldest first). To change it, add a new migration file.

Each migration exports an **`up`** function that applies the change: create a table, add a column, add an index. `yarn db:migrate` runs `up` for every migration that hasn't been applied yet. Kysely records the applied ones in a `kysely_migration` table, so each runs once.

We are forward-only: don't write a `down` function (the one that would undo `up`). Leave the generated `down` stub empty (we don't need to support rollback in dev). For local dev we can just drop the database. To undo or fix a change that has been merged, add a new migration.

Run `yarn db:make create_stations`, then fill in `up` in the generated file:

```ts
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('stations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .execute();
}
```

Never edit a migration that has been merged; add a new one. For example, to add a column to `stations` later, create a new migration whose `up` is `alterTable('stations').addColumn(...)`.

## Seed data

`yarn db:seed` runs every file in `db/seeds/` through kysely-ctl. `1791858320014_dev_data.ts` loads a small sample: one user, two imports, July 1-3 2026 of observations (July 1 has hourly and scheduled readings, taken from the daily sheet), and three daily records. It uses `onConflict(...).doNothing()`, so running it twice changes nothing. For a fresh seeded database: `yarn db:reset && yarn db:seed`. Dev only; never run it against RDS.

## Differs from RDS

Disposable: no backups - `yarn db:reset` deletes everything. This is bound to `127.0.0.1` only.

## Troubleshooting

- **Cannot connect to the Docker daemon:** start Docker Desktop.
- **Port 5432 already in use:** another Postgres is running. Find it with `sudo lsof -nP -iTCP:5432 -sTCP:LISTEN` and stop it.
- **`ECONNREFUSED` right after `db:up`:** Postgres is still starting. Wait a few seconds and rerun.
- **`corrupted migrations … is missing`:** a migration file that was already applied is gone (for example after switching branches). Run `yarn db:reset`.
- **`engine "node" is incompatible`:** run `nvm use`.
