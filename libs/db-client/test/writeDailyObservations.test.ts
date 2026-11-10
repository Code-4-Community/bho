import { sql } from 'kysely';
import { closeConnection, recordImport, writeDailyObservations } from '../src';
import { getDb } from '../src/connection';
import type { DbDay, WritePlan } from '../src';

// Runs against a real, migrated and seeded Postgres, and only when DB_TEST_DB
// names a database ending in "_test": it empties the observation tables. From
// db/:
//   DB_NAME=bho_db_test yarn db:migrate && yarn db:seed
// then DB_TEST_DB=bho_db_test (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD default to
// the docker-compose values; it sets DB_NAME for the shared connection).
const database = process.env.DB_TEST_DB ?? '';
const enabled = database.endsWith('_test');
if (enabled) {
  process.env.DB_HOST ??= '127.0.0.1';
  process.env.DB_PORT ??= '5432';
  process.env.DB_USER ??= 'postgres';
  process.env.DB_PASSWORD ??= 'password';
  process.env.DB_NAME = database;
}

(enabled ? describe : describe.skip)(
  'writeDailyObservations (Postgres)',
  () => {
    const db = getDb();
    const date = '2026-07-01';
    let stationId: number;
    let userId: number;
    let importId: number;

    const day = (maxTempF = 95) => ({
      stationId,
      date,
      importId,
      maxTempF,
      precipTrace: false,
    });
    const hour = (h: number, tempF = 70) => ({
      stationId,
      date,
      hour: h,
      tempF,
      precipTrace: false,
    });
    const reading = (obsTime: string) => ({
      stationId,
      date,
      obsTime,
      precipTrace: false,
    });
    const done = 'done';
    const plan =
      (p: Partial<WritePlan<string>>) =>
      (_stored?: DbDay[]): WritePlan<string> => ({
        upserts: { daily: [], hourly: [], scheduled: [] },
        deletes: [],
        result: done,
        ...p,
      });
    const write = (p: (s: DbDay[]) => WritePlan<string>) =>
      writeDailyObservations({ stationId, importId, userId, dates: [date] }, p);
    const stored = () =>
      Promise.all([
        db.selectFrom('daily_observations').selectAll().execute(),
        db
          .selectFrom('hourly_observations')
          .select('hour')
          .orderBy('hour')
          .execute(),
      ]);

    beforeAll(async () => {
      stationId = (
        await db.selectFrom('stations').select('id').executeTakeFirstOrThrow()
      ).id;
      userId = (
        await db.selectFrom('users').select('id').executeTakeFirstOrThrow()
      ).id;
    });

    beforeEach(async () => {
      await sql`
      TRUNCATE hourly_observations, scheduled_observations,
        daily_observations, audit_log, imports CASCADE
    `.execute(db);
      importId = await recordImport({
        kind: 'daily',
        fileName: 'daily.csv',
        s3Key: 'uploads/daily.csv',
        fileHash: 'test',
        uploadedBy: userId,
        status: 'succeeded',
      });
    });

    afterAll(closeConnection);

    it('writes daily rows before the rows that reference them', async () => {
      await write(
        plan({
          upserts: {
            daily: [day()],
            hourly: [hour(5), hour(6)],
            scheduled: [reading('07:00')],
          },
        }),
      );

      const [daily, hours] = await stored();
      expect(daily).toHaveLength(1);
      expect(hours.map((h) => h.hour)).toEqual([5, 6]);
    });

    it('hands the plan the stored days, times as the parser writes them', async () => {
      await write(
        plan({
          upserts: {
            daily: [{ ...day(), sunrise: '04:11' }],
            hourly: [hour(5)],
            scheduled: [reading('07:00')],
          },
        }),
      );
      const seen = jest.fn(plan({}));

      await write(seen);

      const [stored] = seen.mock.calls[0];
      expect(stored).toHaveLength(1);
      expect(stored[0].daily).toMatchObject({ date, sunrise: '04:11' });
      expect(stored[0].hourly.map((h) => h.hour)).toEqual([5]);
      expect(stored[0].scheduled.map((r) => r.obsTime)).toEqual(['07:00']);
    });

    it('overwrites existing rows and deletes the ones the plan drops', async () => {
      await write(
        plan({
          upserts: {
            daily: [day()],
            hourly: [hour(5), hour(6), hour(7)],
            scheduled: [reading('07:00'), reading('19:00')],
          },
        }),
      );

      await write(
        plan({
          upserts: { daily: [day(50)], hourly: [hour(6, 1)], scheduled: [] },
          deletes: [{ date, hours: [5], obsTimes: ['19:00'] }],
        }),
      );

      const [daily, hours] = await stored();
      expect(daily[0].maxTempF).toBe(50);
      expect(hours.map((h) => h.hour)).toEqual([6, 7]);
      const readings = await db
        .selectFrom('scheduled_observations')
        .select('obsTime')
        .execute();
      expect(readings.map((r) => r.obsTime)).toEqual(['07:00:00']);
    });

    it('attributes audit rows to the user and import', async () => {
      await write(
        plan({ upserts: { daily: [day()], hourly: [hour(5)], scheduled: [] } }),
      );

      const log = await db.selectFrom('audit_log').selectAll().execute();
      expect(log).toHaveLength(2);
      expect(
        log.every((r) => r.changedBy === userId && r.importId === importId),
      ).toBe(true);
    });

    it('returns the plan result untouched', async () => {
      await expect(write(plan({ result: 'mine' }))).resolves.toBe('mine');
    });

    it('rolls back the whole upload when the plan throws', async () => {
      await expect(
        write(() => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      await expect(
        write(
          plan({
            upserts: {
              daily: [day()],
              hourly: [{ ...hour(5), windDir: 'TOO-LONG' }],
              scheduled: [],
            },
          }),
        ),
      ).rejects.toThrow();

      const [daily] = await stored();
      expect(daily).toEqual([]);
      expect(await db.selectFrom('audit_log').selectAll().execute()).toEqual(
        [],
      );
    });

    it('writes nothing without dates, asking the plan only for its result', async () => {
      const seen = jest.fn(plan({}));

      const result = await writeDailyObservations(
        { stationId, importId, userId, dates: [] },
        seen,
      );

      expect(result).toBe(done);
      expect(seen).toHaveBeenCalledWith([]);
      expect(await db.selectFrom('audit_log').selectAll().execute()).toEqual(
        [],
      );
    });
  },
);
