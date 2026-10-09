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
- `upload-lambda` — S3-upload-triggered, parses and imports spreadsheet/CSV data
- `ingestion-lambda` — EventBridge-scheduled, pulls live conditions from the Davis weather station
- `public-lambda` — serve the public dashboard

For a local Postgres and database migrations, see [db/README.md](db/README.md).

## Running tasks

To run just the frontend (port 4200):

```bash
nx serve frontend
```

```bash
nx test internal-serving-lambda
# or run all four at once:
nx run-many -t test -p internal-serving-lambda upload-lambda ingestion-lambda public-lambda
```

## Other commands

Run `git submodule update --remote` to pull the latest changes from the component library

When cloning the repo, make sure to add the `--recurse-modules` flag to also clone the component library submodule (e.g. `git clone --recurse-submodules https://github.com/Code-4-Community/bho.git`)
