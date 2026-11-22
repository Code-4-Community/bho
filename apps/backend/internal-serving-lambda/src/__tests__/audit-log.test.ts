import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Driver,
} from 'kysely';
import type { Database } from '@bho/db-client';
import { getAuditLogEntry, listAuditLog } from '../audit-log';

const ROWS = [
  { id: 2, tableName: 'daily_observations', action: 'update' },
  { id: 1, tableName: 'daily_records', action: 'insert' },
];

// Records each query instead of running it. The count query gets a total;
// every other query gets `rows`.
const buildDb = (rows: unknown[] = ROWS) => {
  const queries: CompiledQuery[] = [];
  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      queries.push(query);
      const result = query.sql.includes('count(*)') ? [{ total: '42' }] : rows;
      return { rows: result as R[] };
    },
    streamQuery: () => {
      throw new Error('not implemented');
    },
  };
  const driver: Driver = {
    init: async () => undefined,
    acquireConnection: async () => connection,
    beginTransaction: async () => undefined,
    commitTransaction: async () => undefined,
    rollbackTransaction: async () => undefined,
    releaseConnection: async () => undefined,
    destroy: async () => undefined,
  };
  const db = new Kysely<Database>({
    dialect: {
      createAdapter: () => new PostgresAdapter(),
      createDriver: () => driver,
      createIntrospector: (db) => new PostgresIntrospector(db),
      createQueryCompiler: () => new PostgresQueryCompiler(),
    },
  });
  const [select, count] = [
    () => queries.find((q) => !q.sql.includes('count(*)')),
    () => queries.find((q) => q.sql.includes('count(*)')),
  ];
  return { db, select, count };
};

const PAGE = { limit: 25, offset: 0 };

describe('listAuditLog', () => {
  it('returns the rows and the total as a number', async () => {
    const { db } = buildDb();

    expect(await listAuditLog(db, {}, PAGE)).toEqual({
      items: ROWS,
      total: 42,
    });
  });

  it('selects every column', async () => {
    const { db, select } = buildDb();

    await listAuditLog(db, {}, PAGE);

    expect(select()?.sql).toMatch(/^select \* from "audit_log"/);
  });

  it('orders newest changedAt first, then by id', async () => {
    const { db, select } = buildDb();

    await listAuditLog(db, {}, PAGE);

    expect(select()?.sql).toContain('order by "changedAt" desc, "id" desc');
  });

  it('applies the limit and offset to the page but not the count', async () => {
    const { db, select, count } = buildDb();

    await listAuditLog(db, {}, { limit: 10, offset: 20 });

    expect(select()?.sql).toMatch(/limit \$1 offset \$2$/);
    expect(select()?.parameters).toEqual([10, 20]);
    expect(count()?.sql).not.toMatch(/limit|offset/);
  });

  it('has no where clause without filters', async () => {
    const { db, select, count } = buildDb();

    await listAuditLog(db, {}, PAGE);

    expect(select()?.sql).not.toContain('where');
    expect(count()?.sql).not.toContain('where');
  });

  it.each([
    [
      'changedFrom',
      { changedFrom: new Date('2026-10-01T00:00:00Z') },
      '"changedAt" >= $1',
      new Date('2026-10-01T00:00:00Z'),
    ],
    [
      'changedTo',
      { changedTo: new Date('2026-10-31T23:59:59Z') },
      '"changedAt" <= $1',
      new Date('2026-10-31T23:59:59Z'),
    ],
    [
      'tableName',
      { tableName: 'hourly_observations' as const },
      '"tableName" = $1',
      'hourly_observations',
    ],
    ['importId', { importId: 7 }, '"importId" = $1', 7],
    [
      'rowKey',
      { rowKey: { stationId: 1, date: '2026-10-26' } },
      '"rowKey" = $1::jsonb',
      '{"stationId":1,"date":"2026-10-26"}',
    ],
  ])(
    'filters by %s in both queries',
    async (_name, filters, condition, value) => {
      const { db, select, count } = buildDb();

      await listAuditLog(db, filters, PAGE);

      for (const query of [select(), count()]) {
        expect(query?.sql).toContain(`where ${condition}`);
        expect(query?.parameters[0]).toEqual(value);
      }
    },
  );

  it('combines every filter', async () => {
    const { db, count } = buildDb();

    await listAuditLog(
      db,
      {
        changedFrom: new Date('2026-10-01T00:00:00Z'),
        changedTo: new Date('2026-10-31T23:59:59Z'),
        tableName: 'daily_observations',
        importId: 7,
        rowKey: { stationId: 1, date: '2026-10-26' },
      },
      PAGE,
    );

    expect(count()?.sql).toBe(
      'select count(*) as "total" from "audit_log" where "changedAt" >= $1 and "changedAt" <= $2 and "tableName" = $3 and "importId" = $4 and "rowKey" = $5::jsonb',
    );
  });
});

describe('getAuditLogEntry', () => {
  it('selects every column for one id', async () => {
    const { db, select } = buildDb();

    await getAuditLogEntry(db, 7);

    expect(select()?.sql).toBe('select * from "audit_log" where "id" = $1');
    expect(select()?.parameters).toEqual([7]);
  });

  it('returns the first matching row', async () => {
    const { db } = buildDb();

    expect(await getAuditLogEntry(db, 2)).toEqual(ROWS[0]);
  });

  it('returns undefined when no entry has the id', async () => {
    const { db } = buildDb([]);

    expect(await getAuditLogEntry(db, 999)).toBeUndefined();
  });
});
