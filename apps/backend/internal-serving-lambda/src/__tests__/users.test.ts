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
import { listUsers } from '../users';

// Records each query instead of running it and answers with `rows`.
const buildDb = (rows: unknown[]) => {
  const queries: CompiledQuery[] = [];
  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      queries.push(query);
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
  return { db, queries };
};

describe('listUsers', () => {
  it('returns each user with status as role', async () => {
    const { db } = buildDb([
      {
        id: 1,
        email: 'a@x.org',
        firstName: 'A',
        lastName: 'Admin',
        status: 'ADMIN',
      },
      {
        id: 2,
        email: 'b@x.org',
        firstName: 'B',
        lastName: 'User',
        status: 'STANDARD',
      },
    ]);

    expect(await listUsers(db)).toEqual([
      {
        id: 1,
        email: 'a@x.org',
        firstName: 'A',
        lastName: 'Admin',
        role: 'ADMIN',
      },
      {
        id: 2,
        email: 'b@x.org',
        firstName: 'B',
        lastName: 'User',
        role: 'STANDARD',
      },
    ]);
  });

  it('selects only the public columns, ordered by id', async () => {
    const { db, queries } = buildDb([]);

    await listUsers(db);

    expect(queries[0].sql).toBe(
      'select "id", "email", "firstName", "lastName", "status" from "users" order by "id"',
    );
  });
});
