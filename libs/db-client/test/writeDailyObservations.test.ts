import { sql } from 'kysely';
import { closeConnection, recordImport, writeDailyObservations } from '../src';
import { getDb } from '../src/connection';
import type { StoredObservations, WritePlan } from '../src';

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
    const counts = { inserted: 0, updated: 0, unchanged: 0, deleted: 0 };
    const plan =
      (p: Partial<WritePlan>) =>
      (_stored?: StoredObservations): WritePlan => ({
        upserts: { daily: [], hourly: [], scheduled: [] },
        deletes: [],
        counts,
        ...p,
      });
    const write = (p: (s: StoredObservations) => WritePlan) =>
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

    it('hands the plan what is stored for the dates', async () => {
      await write(
        plan({ upserts: { daily: [day()], hourly: [hour(5)], scheduled: [] } }),
      );
      const seen = jest.fn(plan({}));

      await write(seen);

      const [snapshot] = seen.mock.calls[0];
      expect(snapshot.daily).toHaveLength(1);
      expect(snapshot.hourly.map((h) => h.hour)).toEqual([5]);
      expect(snapshot.scheduled).toEqual([]);
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

    it('returns the counts the plan reports', async () => {
      const reported = { inserted: 1, updated: 2, unchanged: 3, deleted: 4 };

      await expect(write(plan({ counts: reported }))).resolves.toEqual(
        reported,
      );
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

    it('does nothing without dates', async () => {
      const seen = jest.fn(plan({}));

      const result = await writeDailyObservations(
        { stationId, importId, userId, dates: [] },
        seen,
      );

      expect(result).toEqual(counts);
      expect(seen).not.toHaveBeenCalled();
    });
  },
);
