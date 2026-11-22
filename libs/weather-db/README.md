# @bho/weather-db

## writeHistoricalRecords(db, records, { batchSize?, userId? })

Writes parsed historical records to `daily_records`. Returns `{ inserted, skipped }`.

- **Transaction:** all batches run in one transaction; any failed batch rolls back the whole file.
- **Batch size:** default 500 rows (17 columns each, so 8,500 bind parameters per INSERT, well under
  Postgres's 65,535 limit). Override with `batchSize` (positive integer).
- **Conflicts:** the natural key is `(stationId, month, day)`. On conflict we `DO NOTHING` rather than
  update, so re-uploading the same file is idempotent and never overwrites existing rows.
  `skipped` is the number of rows not inserted.
- **Audit:** `app.user_id` and `app.import_id` are set for the audit trigger.
- **Dates:** `daily_records` has no date columns (only `month`/`day` integers), so no date or timezone
  conversion happens here. Date strings stay `'YYYY-MM-DD'` in the daily observation tables.
- **Scope:** historical uploads only (issue #31). Daily uploads (`daily_observations`,
  `hourly_observations`, `scheduled_observations`) are a separate writer (issue #39).
- **Tests:** `src/writeHistoricalRecords.test.ts` uses a Kysely with a fake driver and covers batching,
  empty input, conflict skipping, rollback, and the audit settings.
