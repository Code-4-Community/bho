# Local database

A disposable Postgres 16 container plus [kysely-ctl](https://github.com/kysely-org/kysely-ctl), the Kysely migration CLI. The schema here is shared by all the backend Lambdas.

## Prerequisites

- Node 24 (`nvm use` at the repo root). `kysely-ctl` needs Node 22 or later, and `yarn` fails on older versions.
- A running Docker engine (Docker Desktop, Colima, or OrbStack) with Compose v2.1 or later (`docker compose version`)

## Quick start

Run everything from this `db/` folder, not the repo root.

```bash
cd db
yarn
yarn db:up
yarn db:migrate
```

With no migrations yet, `yarn db:migrate` prints `Migration skipped: no new migrations found` and exits 0. The `Ignoring .gitkeep` warning is harmless.

## Commands

| Command | What it does |
| --- | --- |
| `yarn db:up` | Start Postgres and wait until it is healthy |
| `yarn db:down` | Stop the container, keep the data |
| `yarn db:migrate` | Apply all pending migrations |
| `yarn db:make <name>` | Create a new timestamped migration file |
| `yarn db:reset` | Delete the container and data, start fresh, re-run migrations |
| `yarn kysely migrate:list` | Show which migrations have been applied |

## Connection settings

Defaults work out of the box. Override with environment variables:

| Variable | Default |
| --- | --- |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `5432` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | `password` |
| `DB_NAME` | `bho` |

Connect with psql: `docker compose exec postgres psql -U postgres -d bho`

## Adding a migration

Run `yarn db:make create_stations`. It creates `migrations/<timestamp>_create_stations.ts` with empty `up` and `down` functions. The timestamp prefix keeps migrations from different branches from colliding, and files run in filename order. Fill in the functions, for example:

```ts
import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('stations')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('stations').execute();
}
```

Then run `yarn db:migrate`. Applied migrations are recorded in the `kysely_migration` table, so a second run does nothing.

## How this differs from RDS

- Disposable: no backups, no Multi-AZ, no failover.
- No TLS and no IAM auth. The default password is weak, so the port is bound to `127.0.0.1` only.
- `yarn db:reset` destroys all data. Local use only.
- Keep the Postgres major version in `docker-compose.yml` (16) in line with the RDS instance.

## Troubleshooting

- **`Cannot connect to the Docker daemon`**: start Docker Desktop, then retry.
- **`address already in use` / port 5432 busy**: another Postgres is running on your machine. Find it with `sudo lsof -nP -iTCP:5432 -sTCP:LISTEN`, or use another port: `DB_PORT=5433 yarn db:up` and `DB_PORT=5433 yarn db:migrate`.
- **`yarn db:migrate` fails with `ECONNREFUSED`**: the container is not running. Run `yarn db:up`.
- **`password authentication failed`**: you are connected to a different Postgres than the container, usually because of the port conflict above.
- **`corrupted migrations: previously executed migration … is missing`**: you deleted or renamed a migration file that was already applied to your local database (for example after switching branches). Run `yarn db:reset`.
- **`engine "node" is incompatible`**: run `nvm use` to switch to Node 24.

## Note on workspaces

This folder has its own `package.json` and `yarn.lock` because the repo root does not use Yarn workspaces. If workspaces are adopted, add `db/` to them and drop this lockfile.
