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
import { listImports } from '../imports';

const ROWS = [
  { id: 2, kind: 'daily', status: 'failed' },
  { id: 1, kind: 'historical', status: 'succeeded' },
];

// Records each query instead of running it. The count query gets a total;
// every other query gets ROWS.
const buildDb = () => {
  const queries: CompiledQuery[] = [];
  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      queries.push(query);
      const rows = query.sql.includes('count(*)') ? [{ total: '42' }] : ROWS;
      return { rows: rows as R[] };
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

describe('listImports', () => {
  it('returns the rows and the total as a number', async () => {
    const { db } = buildDb();

    expect(await listImports(db, {}, PAGE)).toEqual({
      imports: ROWS,
      total: 42,
    });
  });

  it('selects every column except errors', async () => {
    const { db, select } = buildDb();

    await listImports(db, {}, PAGE);

    expect(select()?.sql).toMatch(
      /^select "id", "kind", "fileName", "s3Key", "fileHash", "uploadedBy", "uploadedAt", "status" from "imports"/,
    );
    expect(select()?.sql).not.toContain('errors');
  });

  it('orders newest uploadedAt first, then by id', async () => {
    const { db, select } = buildDb();

    await listImports(db, {}, PAGE);

    expect(select()?.sql).toContain('order by "uploadedAt" desc, "id" desc');
  });

  it('applies the limit and offset to the page but not the count', async () => {
    const { db, select, count } = buildDb();

    await listImports(db, {}, { limit: 10, offset: 20 });

    expect(select()?.sql).toMatch(/limit \$1 offset \$2$/);
    expect(select()?.parameters).toEqual([10, 20]);
    expect(count()?.sql).not.toMatch(/limit|offset/);
  });

  it('has no where clause without filters', async () => {
    const { db, select, count } = buildDb();

    await listImports(db, {}, PAGE);

    expect(select()?.sql).not.toContain('where');
    expect(count()?.sql).not.toContain('where');
  });

  it.each([
    ['kind', { kind: 'daily' as const }, '"kind" = $1', 'daily'],
    ['status', { status: 'failed' as const }, '"status" = $1', 'failed'],
    [
      'uploadedFrom',
      { uploadedFrom: new Date('2026-10-01T00:00:00Z') },
      '"uploadedAt" >= $1',
      new Date('2026-10-01T00:00:00Z'),
    ],
    [
      'uploadedTo',
      { uploadedTo: new Date('2026-10-31T23:59:59Z') },
      '"uploadedAt" <= $1',
      new Date('2026-10-31T23:59:59Z'),
    ],
  ])(
    'filters by %s in both queries',
    async (_name, filters, condition, value) => {
      const { db, select, count } = buildDb();

      await listImports(db, filters, PAGE);

      for (const query of [select(), count()]) {
        expect(query?.sql).toContain(`where ${condition}`);
        expect(query?.parameters[0]).toEqual(value);
      }
    },
  );

  it('combines every filter', async () => {
    const { db, count } = buildDb();

    await listImports(
      db,
      {
        kind: 'daily',
        status: 'failed',
        uploadedFrom: new Date('2026-10-01T00:00:00Z'),
        uploadedTo: new Date('2026-10-31T23:59:59Z'),
      },
      PAGE,
    );

    expect(count()?.sql).toBe(
      'select count(*) as "total" from "imports" where "kind" = $1 and "status" = $2 and "uploadedAt" >= $3 and "uploadedAt" <= $4',
    );
  });
});
