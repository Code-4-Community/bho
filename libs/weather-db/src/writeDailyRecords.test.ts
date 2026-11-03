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
import type { Database } from '../../../db/types';
import { NewDailyRecord, writeDailyRecords } from './writeDailyRecords';

interface FakeDb {
  db: Kysely<Database>;
  log: string[];
  inserts: CompiledQuery[];
  others: CompiledQuery[];
}

function createFakeDb(
  rowsInserted: (insertIndex: number, rowsSent: number) => number = (_, sent) =>
    sent,
): FakeDb {
  const log: string[] = [];
  const inserts: CompiledQuery[] = [];
  const others: CompiledQuery[] = [];

  const connection: DatabaseConnection = {
    async executeQuery(query): Promise<QueryResult<any>> {
      if (!query.sql.startsWith('insert into')) {
        log.push('other');
        others.push(query);
        return { rows: [] };
      }
      log.push('insert');
      const index = inserts.length;
      inserts.push(query);
      // 17 bind parameters per daily_records row
      const sent = query.parameters.length / 17;
      return {
        rows: [],
        numAffectedRows: BigInt(rowsInserted(index, sent)),
      };
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
  return { db, log, inserts, others };
}

function makeRecords(count: number): NewDailyRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    stationId: 1,
    month: (i % 12) + 1,
    day: Math.floor(i / 12) + 1,
    highF: 80,
    highYears: [1999],
    lowF: null,
    lowYears: null,
    precipIn: '0.10',
    precipYears: [2005],
    snowIn: null,
    snowYears: null,
    peakGustMph: null,
    peakGustDir: null,
    peakGustIsEstimated: false,
    peakGustYears: null,
    notes: null,
    importId: 7,
  }));
}

describe('writeDailyRecords', () => {
  it('splits records into batches inside a single transaction', async () => {
    const { db, log, inserts } = createFakeDb();

    const result = await writeDailyRecords(db, makeRecords(1200), {
      batchSize: 500,
    });

    expect(inserts.map((q) => q.parameters.length / 17)).toEqual([
      500, 500, 200,
    ]);
    expect(log).toEqual([
      'begin',
      'other',
      'insert',
      'insert',
      'insert',
      'commit',
    ]);
    expect(result).toEqual({ inserted: 1200, skipped: 0 });
  });

  it('uses a single batch when records fit in one', async () => {
    const { db, inserts } = createFakeDb();

    await writeDailyRecords(db, makeRecords(3));

    expect(inserts).toHaveLength(1);
  });

  it('does nothing for empty input, not even opening a transaction', async () => {
    const { db, log } = createFakeDb();

    const result = await writeDailyRecords(db, []);

    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(log).toEqual([]);
  });

  it('skips rows on the natural key instead of failing or updating', async () => {
    const { db, inserts } = createFakeDb();

    await writeDailyRecords(db, makeRecords(2));

    expect(inserts[0].sql).toContain(
      'on conflict ("stationId", "month", "day") do nothing',
    );
  });

  it('reports rows the database skipped as skipped, not inserted', async () => {
    // First batch: 2 of 5 already exist. Second batch: all 3 are new.
    const { db } = createFakeDb((index, sent) =>
      index === 0 ? sent - 2 : sent,
    );

    const result = await writeDailyRecords(db, makeRecords(8), {
      batchSize: 5,
    });

    expect(result).toEqual({ inserted: 6, skipped: 2 });
  });

  it('reports everything as skipped when the file was already uploaded', async () => {
    const { db } = createFakeDb(() => 0);

    const result = await writeDailyRecords(db, makeRecords(4));

    expect(result).toEqual({ inserted: 0, skipped: 4 });
  });

  it('rolls back the whole file and rethrows when a batch fails', async () => {
    const boom = new Error('connection reset');
    const { db, log } = createFakeDb((index, sent) => {
      if (index === 1) throw boom;
      return sent;
    });

    await expect(
      writeDailyRecords(db, makeRecords(15), { batchSize: 5 }),
    ).rejects.toBe(boom);

    // Batch 1 was sent but is never committed; batch 3 is never attempted.
    expect(log).toEqual(['begin', 'other', 'insert', 'insert', 'rollback']);
  });

  it('sets the audit user and import for the trigger inside the transaction', async () => {
    const { db, log, others } = createFakeDb();

    await writeDailyRecords(db, makeRecords(1), { userId: 42 });

    expect(others).toHaveLength(1);
    expect(others[0].sql).toContain('set_config');
    expect(others[0].parameters).toEqual(['42', '7']);
    expect(log.indexOf('other')).toBeGreaterThan(log.indexOf('begin'));
    expect(log.indexOf('other')).toBeLessThan(log.indexOf('insert'));
  });

  it('rejects an invalid batch size', async () => {
    const { db, log } = createFakeDb();

    await expect(
      writeDailyRecords(db, makeRecords(1), { batchSize: 0 }),
    ).rejects.toThrow(RangeError);
    expect(log).toEqual([]);
  });
});
