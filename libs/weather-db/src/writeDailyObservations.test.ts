import {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  QueryResult,
} from 'kysely';
import type { ParsedDay } from '@bho/weather-parsing';
import type { Database } from '../../../db/types';
import { writeDailyObservations } from './writeDailyObservations';

// Answers each query with `respond`; by default every upserted row is new.
function createFakeDb(
  respond: (query: CompiledQuery, index: number) => QueryResult<any> = () => ({
    rows: [],
  }),
) {
  const log: string[] = [];
  const queries: CompiledQuery[] = [];

  const connection: DatabaseConnection = {
    async executeQuery(query): Promise<QueryResult<any>> {
      const table = query.sql.match(/"(\w+_observations)"/)?.[1];
      const verb = query.sql.split(' ')[0];
      log.push(table ? `${verb} ${table}` : verb);
      queries.push(query);
      return respond(query, queries.length - 1);
    },
    async *streamQuery() {
      throw new Error('not used');
    },
  };

  const driver: Driver = {
    async init() {},
    async acquireConnection() {
      return connection;
    },
    async beginTransaction() {
      log.push('begin');
    },
    async commitTransaction() {
      log.push('commit');
    },
    async rollbackTransaction() {
      log.push('rollback');
    },
    async releaseConnection() {},
    async destroy() {},
  };

  const db = new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => driver,
      createIntrospector: (k) => new PostgresIntrospector(k),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
  return { db, log, queries };
}

// Rows the database returns for an upsert: one per inserted or changed row.
const returned = (inserted: number, updated = 0) => ({
  rows: [
    ...Array(inserted).fill({ inserted: true }),
    ...Array(updated).fill({ inserted: false }),
  ],
});

function makeDay(date: string, hours = [0, 1], times = ['07:00']): ParsedDay {
  return {
    daily: {
      date,
      maxTempF: 80,
      minTempF: 60,
      avgTempF: '70',
      normalTempF: 72,
      precipIn: '0.10',
      precipTrace: false,
      snowfallIn: null,
      snowDepthIn: null,
      sunshineMin: 600,
      sunshinePossibleMin: 900,
      sunshinePct: 67,
      fastestMileMph: null,
      fastestMileDir: null,
      fastestMileTime: null,
      peakGustKts: 20,
      peakGustDir: 'SW',
      peakGustTime: '13:05',
      avgStationPressureMb: '1001.2',
      sunrise: '05:10',
      sunset: '19:20',
      observerInitials: 'MFD',
      remarks: null,
    },
    hourly: hours.map((hour) => ({
      date,
      hour,
      tempF: 70,
      precipIn: null,
      precipTrace: false,
      windDir: 'SW',
      windSpeedMph: 8,
      sunshineMin: 60,
      skyCover: null,
      visibilityMi: null,
      presentWeather: null,
      humidityPct: 70,
      mountainVis: null,
      remarks: null,
    })),
    scheduled: times.map((obsTime) => ({
      date,
      obsTime,
      stationPressureIn: '29.90',
      attachedThermC: null,
      observedBarometerMb: null,
      pressureCorrectionMb: null,
      dryBulbF: '70.0',
      wetBulbF: '65.0',
      dewpointF: 62,
      humidityPct: 75,
      maxTempF: null,
      minTempF: null,
      precipIn: null,
      precipTrace: false,
      snowfallIn: null,
      snowDepthIn: null,
      vaporPressureMb: null,
    })),
  };
}

const OPTIONS = { stationId: 1, importId: 7, userId: 42 };
const inserts = (queries: CompiledQuery[]) =>
  queries.filter((q) => q.sql.startsWith('insert into'));

describe('writeDailyObservations', () => {
  it('writes days before their hours and readings, in one transaction', async () => {
    const { db, log } = createFakeDb();

    await writeDailyObservations(db, [makeDay('2026-07-01')], OPTIONS);

    expect(log).toEqual([
      'begin',
      'select',
      'delete hourly_observations',
      'delete scheduled_observations',
      'insert daily_observations',
      'insert hourly_observations',
      'insert scheduled_observations',
      'commit',
    ]);
  });

  it('splits each table into batches', async () => {
    const { db, queries } = createFakeDb();
    const days = ['2026-07-01', '2026-07-02', '2026-07-03'].map((d) =>
      makeDay(d),
    );

    await writeDailyObservations(db, days, { ...OPTIONS, batchSize: 2 });

    // 3 days, 6 hours (14 bind parameters per row), 3 readings.
    expect(
      inserts(queries).map(
        (q) => q.sql.split('"')[1] + ' ' + q.parameters.length,
      ),
    ).toEqual([
      'daily_observations 50',
      'daily_observations 25',
      'hourly_observations 30',
      'hourly_observations 30',
      'hourly_observations 30',
      'scheduled_observations 36',
      'scheduled_observations 18',
    ]);
  });

  it('adds stationId and importId to the rows', async () => {
    const { db, queries } = createFakeDb();

    await writeDailyObservations(db, [makeDay('2026-07-01')], OPTIONS);

    const [daily, hourly] = inserts(queries);
    expect(daily.sql).toMatch(
      /^insert into "daily_observations" \("stationId", "importId", "date"/,
    );
    expect(daily.parameters.slice(0, 3)).toEqual([1, 7, '2026-07-01']);
    expect(hourly.sql).not.toContain('importId');
  });

  it('updates a row only when a value other than importId changed', async () => {
    const { db, queries } = createFakeDb();

    await writeDailyObservations(db, [makeDay('2026-07-01')], OPTIONS);

    const [daily, hourly] = inserts(queries).map((q) => q.sql);
    expect(daily).toContain('on conflict ("stationId", "date") do update set');
    expect(daily).toContain('"importId" = "excluded"."importId"');
    expect(daily).toMatch(
      /where \("daily_observations"\."maxTempF", .*\) is distinct from \("excluded"\."maxTempF", .*\)/,
    );
    expect(daily.split('is distinct from')[1]).not.toContain('importId');
    expect(hourly).toContain(
      'on conflict ("stationId", "date", "hour") do update',
    );
  });

  it('counts inserted, updated and unchanged rows', async () => {
    // Daily: 1 new. Hourly: 1 changed, 1 unchanged. Scheduled: unchanged.
    const { db } = createFakeDb((query) => {
      if (query.sql.startsWith('insert into "daily')) return returned(1);
      if (query.sql.startsWith('insert into "hourly')) return returned(0, 1);
      return { rows: [] };
    });

    const result = await writeDailyObservations(
      db,
      [makeDay('2026-07-01')],
      OPTIONS,
    );

    expect(result).toEqual({
      inserted: 1,
      updated: 1,
      unchanged: 2,
      deleted: 0,
    });
  });

  it('deletes hours and readings that are no longer in the sheet', async () => {
    const { db, queries } = createFakeDb((query) =>
      query.sql.startsWith('delete')
        ? { rows: [], numAffectedRows: BigInt(2) }
        : { rows: [] },
    );

    const result = await writeDailyObservations(
      db,
      [makeDay('2026-07-01', [0, 5], [])],
      OPTIONS,
    );

    const [hours, readings] = queries.filter((q) => q.sql.startsWith('delete'));
    expect(hours.sql).toContain('"hour" not in ($3, $4)');
    expect(hours.parameters).toEqual([1, '2026-07-01', 0, 5]);
    // No readings left in the sheet: every reading for that day goes.
    expect(readings.sql).not.toContain('not in');
    expect(readings.parameters).toEqual([1, '2026-07-01']);
    expect(result.deleted).toBe(4);
  });

  it('sets the audit user and import inside the transaction', async () => {
    const { db, queries } = createFakeDb();

    await writeDailyObservations(db, [makeDay('2026-07-01')], OPTIONS);

    expect(queries[0].sql).toContain('set_config');
    expect(queries[0].parameters).toEqual(['42', '7']);
  });

  it('does nothing for empty input, not even opening a transaction', async () => {
    const { db, log } = createFakeDb();

    const result = await writeDailyObservations(db, [], OPTIONS);

    expect(result).toEqual({
      inserted: 0,
      updated: 0,
      unchanged: 0,
      deleted: 0,
    });
    expect(log).toEqual([]);
  });

  it('rolls back the whole file and rethrows when a write fails', async () => {
    const boom = new Error('connection reset');
    const { db, log } = createFakeDb((query) => {
      if (query.sql.startsWith('insert into "hourly')) throw boom;
      return { rows: [] };
    });

    await expect(
      writeDailyObservations(db, [makeDay('2026-07-01')], OPTIONS),
    ).rejects.toBe(boom);

    expect(log.slice(-2)).toEqual(['insert hourly_observations', 'rollback']);
    expect(log).not.toContain('commit');
  });

  it('rejects an invalid batch size', async () => {
    const { db, log } = createFakeDb();

    await expect(
      writeDailyObservations(db, [makeDay('2026-07-01')], {
        ...OPTIONS,
        batchSize: 0,
      }),
    ).rejects.toThrow(RangeError);
    expect(log).toEqual([]);
  });
});
