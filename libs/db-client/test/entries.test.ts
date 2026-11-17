import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Driver,
} from 'kysely';
import { getEntry, listEntries, listEntryVersions } from '../src/entries';
import type { Database } from '../src/types';

// Records each query instead of running it; `answer` picks the rows to return
const buildDb = (answer: (sql: string) => unknown[] = () => []) => {
  const queries: CompiledQuery[] = [];
  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      queries.push(query);
      return { rows: answer(query.sql) as R[] };
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
  return { db, queries };
};

describe('listEntries', () => {
  it('filters to the date range, newest first', async () => {
    const { db, queries } = buildDb();

    await listEntries(db, { from: '2026-07-01', to: '2026-07-10' });

    const [query] = queries;
    expect(query.sql).toContain('"daily_observations"."date" >= $1');
    expect(query.sql).toContain('"daily_observations"."date" <= $2');
    expect(query.sql).toContain('order by "daily_observations"."date" desc');
    expect(query.sql).not.toContain('"users"."id" = $');
    expect(query.parameters).toEqual(['2026-07-01', '2026-07-10']);
  });

  it('filters by the uploader of the current import', async () => {
    const { db, queries } = buildDb();

    await listEntries(db, {
      from: '2026-07-01',
      to: '2026-07-10',
      uploadedBy: 3,
    });

    expect(queries[0].sql).toContain('"users"."id" = $3');
    expect(queries[0].parameters).toEqual(['2026-07-01', '2026-07-10', 3]);
  });
});

describe('getEntry', () => {
  it('returns undefined, without further queries, if the day has no row', async () => {
    const { db, queries } = buildDb();

    expect(await getEntry(db, '2026-07-09')).toBeUndefined();
    expect(queries).toHaveLength(1);
  });

  it('returns the day with its hourly, scheduled and current import', async () => {
    const summary = { date: '2026-07-09', importId: 5 };
    const { db, queries } = buildDb((sql) =>
      sql.includes('from "daily_observations"')
        ? [summary]
        : sql.includes('from "imports"')
        ? [{ importId: 5 }]
        : [{ row: sql }],
    );

    const entry = await getEntry(db, '2026-07-09');

    expect(entry?.summary).toEqual(summary);
    expect(entry?.currentImport).toEqual({ importId: 5 });
    expect(entry?.hourly).toHaveLength(1);
    expect(entry?.scheduled).toHaveLength(1);
    const hourly = queries.find((q) => q.sql.includes('"hourly_observations"'));
    expect(hourly?.sql).toContain('order by "hour"');
    expect(hourly?.sql).not.toContain('for update');
    const scheduled = queries.find((q) =>
      q.sql.includes('"scheduled_observations"'),
    );
    expect(scheduled?.sql).toContain('order by "obsTime"');
  });
});

describe('listEntryVersions', () => {
  it('lists imports found in the audit log for the date, newest first', async () => {
    const { db, queries } = buildDb((sql) =>
      sql.includes('from "daily_observations"')
        ? [{ importId: 7 }]
        : [{ importId: 7 }, { importId: 3 }],
    );

    const result = await listEntryVersions(db, '2026-07-09');

    expect(result.currentImportId).toBe(7);
    expect(result.versions).toHaveLength(2);
    const versions = queries.find((q) => q.sql.includes('"audit_log"'));
    expect(versions?.sql).toContain(`"audit_log"."tableName" = $1`);
    expect(versions?.sql).toContain(`"audit_log"."rowKey" ->> 'date' = $2`);
    expect(versions?.sql).toContain('"audit_log"."importId" is not null');
    expect(versions?.sql).toContain(
      'order by "imports"."uploadedAt" desc, "imports"."id" desc',
    );
    expect(versions?.parameters).toEqual(['daily_observations', '2026-07-09']);
  });

  it('has a null currentImportId if the day has no row', async () => {
    const { db } = buildDb();

    expect(await listEntryVersions(db, '2026-07-09')).toEqual({
      currentImportId: null,
      versions: [],
    });
  });
});
