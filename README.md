# Blue Hill Observatory (BHO) Platform

Automated digital platform for the Blue Hill Observatory to centralize 141 years of weather data, automate live data collection from BHO's Davis Vantage Pro station, and modernize the daily manual-observation workflow currently done by hand in a spreadsheet.

A [Code-4-Community](https://github.com/Code-4-Community) (C4C) project, in partnership with Blue Hill Observatory.

## Setup

**Requires Node 24** an `.nvmrc` is checked in, so if you have [nvm](https://github.com/nvm-sh/nvm), run `nvm use` (or `nvm install` if you don't have 24 yet) before installing dependencies. Without it, `yarn install` fails.

Clone this repo and run `yarn` at the root to install this project's dependencies.

You can optionally install `nx` globally with `npm install -g nx` - if you don't, you'll just need to prefix the commands below with `npx` (e.g. `npx nx serve frontend`).

### Architecture

The backend is **Lambda-only**. Four independent Lambda functions live under `apps/backend/`:

- `internal-serving-lambda` — the authenticated API the frontend calls (staff/admin)
- `upload-lambda` — S3-upload trigger (parsing and import logic now lives in `internal-serving-lambda`)
- `ingestion-lambda` — EventBridge-scheduled, pulls live conditions from the Davis weather station **(No longer needed - to be deleted)**
- `public-lambda` — serve the public dashboard

### Database

The data lives in PostgreSQL. The schema is shared by all the Lambdas and is defined by [Kysely](https://kysely.dev) migrations in `db/`. For local development, `db/` also provides a disposable Postgres container. The Kysely client (`createDb`) and table types (`Database`) live in `libs/db-client`; import them from `@bho/db-client`.

```bash
nx run db:install   # one-time install of db/'s dependencies
nx run db:up        # start the local Postgres container (needs Docker)
nx run db:migrate   # apply migrations
nx run db:make <name>   # create a new migration
nx run db:reset     # wipe the local database and re-apply everything
```

See [db/README.md](db/README.md) for details, writing migrations, and troubleshooting.

## Frontend development

### Run it

To run just the frontend (port 4200):

```bash
nx serve frontend
```

### Project layout

| Path                    | What                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `src/containers/`       | Pages                                                                                |
| `src/components/`       | Shared components                                                                    |
| `src/api/`              | `apiClient`, the axios client. It attaches the Cognito access token when auth is on. |
| `src/hooks/`            | Data hooks used by pages (import as `@hooks/...`)                                    |
| `src/auth/`             | Amplify and Cognito configuration                                                    |
| `src/styles/tokens.css` | Design tokens from Figma                                                             |
| `src/utils/`            | Helpers                                                                              |
| `src/providers.tsx`     | App-wide providers (Chakra)                                                          |

To add a page, add a new file in `/src/containers/` then a route in `src/app.tsx`.

### Tests

The frontend uses [vitest](https://vitest.dev) and [Testing Library](https://testing-library.com/docs/react-testing-library/intro/). Put tests next to the code as `*.spec.tsx`. Tests for Chakra components should render with `renderWithProviders` from `src/test/render.tsx`, which wraps them in `Providers`.

```bash
# run all frontend tests
nx run frontend:test
# To run one file (example app.spec.tsx)
npx vitest run src/app.spec.tsx
```

### Lint and format checking

```bash
# lint on frontend only
nx lint frontend
nx run frontend:typecheck
```

### Frontend styles

Colors, type, spacing and radii from the Figma design system are CSS variables in `apps/frontend/src/styles/tokens.css`, loaded globally through `src/styles.css`. Use the semantic tokens in components, not the raw palette or hex values:

```css
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.tile-value {
  font: var(--text-tile-number);
}
```

Named type styles (`--text-page-title`, `--text-section-title`, `--text-body`, `--text-caption`, `--text-tile-number`) are `font` shorthands. While `nx serve frontend` is running, http://localhost:4200/design shows every token for comparing against Figma.

## Backend

### Tests

```bash
nx test internal-serving-lambda
# or run all four at once:
nx run-many -t test -p internal-serving-lambda upload-lambda public-lambda
```

## Helpful commands

```bash
# check formatting and lint on the whole repo
yarn run prepush
# fix formatting and lint on the whole repo
yarn run prepush:fix
```

Run `git submodule update --remote` to pull the latest changes from the component library

When cloning the repo, make sure to add the `--recurse-modules` flag to also clone the component library submodule (e.g. `git clone --recurse-submodules https://github.com/Code-4-Community/bho.git`)
