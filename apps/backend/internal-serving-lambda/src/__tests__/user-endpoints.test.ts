import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Driver,
} from 'kysely';
import { AuthError, createVerifier } from '@bho/lambda-auth';
import type { Database } from '@bho/db-client';
import { resetVerifier } from '../auth';
import { getDb } from '../db';
import { handler } from '../handler';

// Only Cognito and Postgres are faked; the handler, auth.ts and users.ts run
// for real against the mock users table below.
jest.mock('@bho/lambda-auth', () => ({
  ...jest.requireActual('@bho/lambda-auth'),
  createVerifier: jest.fn(),
}));
jest.mock('../db');

const ADMIN = {
  id: 1,
  email: 'admin@example.org',
  firstName: 'Ada',
  lastName: 'Admin',
  status: 'ADMIN',
  cognitoSub: 'sub-admin',
};
const STANDARD = {
  id: 2,
  email: 'standard@example.org',
  firstName: 'Sam',
  lastName: 'Standard',
  status: 'STANDARD',
  cognitoSub: 'sub-standard',
};
type UserRow = typeof ADMIN;

// What the API should return for each row: status renamed to role, no cognitoSub
const summary = ({ id, email, firstName, lastName, status }: UserRow) => ({
  id,
  email,
  firstName,
  lastName,
  role: status,
});

// Like Postgres, return only the columns the query selects.
const selectedColumns = (sql: string, rows: UserRow[]) => {
  const columns = [...sql.split(' from ')[0].matchAll(/"(\w+)"/g)].map(
    (m) => m[1] as keyof UserRow,
  );
  return rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col, row[col]])),
  );
};

// Fake Postgres. The getCurrentUser lookup (where "cognitoSub" = $1) finds the
// caller in `callers`; the GET /users list query returns `listed`.
const buildDb = (callers: UserRow[], listed: UserRow[] = callers) => {
  const queries: CompiledQuery[] = [];
  const connection: DatabaseConnection = {
    executeQuery: async <R>(query: CompiledQuery) => {
      queries.push(query);
      const rows = query.sql.includes('"cognitoSub" =')
        ? callers.filter((u) => u.cognitoSub === query.parameters[0])
        : listed;
      return { rows: selectedColumns(query.sql, rows) as R[] };
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
  jest.mocked(getDb).mockReturnValue(db);
  return queries;
};

// The fake verifier treats the token as the Cognito sub; 'bad-token' is rejected.
const verifyToken = jest.fn(async (token: string) => {
  if (token === 'bad-token') {
    throw new AuthError('INVALID_SIGNATURE', 'Invalid token signature');
  }
  return { sub: token };
});

const call = async (resource: string, token?: string) => {
  const result = await handler({
    httpMethod: 'GET',
    resource,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  } as unknown as APIGatewayProxyEvent);
  return { statusCode: result.statusCode, body: JSON.parse(result.body) };
};

const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    COGNITO_REGION: 'us-east-2',
    COGNITO_USER_POOL_ID: 'us-east-2_TESTPOOL1',
    COGNITO_CLIENT_ID: 'test-client-id',
  };
  resetVerifier();
  jest.mocked(createVerifier).mockReturnValue(verifyToken as never);
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe('GET /me', () => {
  beforeEach(() => {
    buildDb([ADMIN, STANDARD]);
  });

  it('returns an admin caller with the ADMIN role', async () => {
    expect(await call('/me', 'sub-admin')).toEqual({
      statusCode: 200,
      body: { id: 1, email: 'admin@example.org', role: 'ADMIN' },
    });
  });

  it('returns a standard caller with the STANDARD role', async () => {
    expect(await call('/me', 'sub-standard')).toEqual({
      statusCode: 200,
      body: { id: 2, email: 'standard@example.org', role: 'STANDARD' },
    });
  });

  it('returns 401 for a valid token with no matching user', async () => {
    expect(await call('/me', 'sub-unknown')).toEqual({
      statusCode: 401,
      body: { message: 'Unauthorized' },
    });
  });

  it('returns 401 without a token', async () => {
    expect((await call('/me')).statusCode).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    expect((await call('/me', 'bad-token')).statusCode).toBe(401);
  });

  it('never exposes the Cognito sub', async () => {
    const { body } = await call('/me', 'sub-admin');

    expect(body).not.toHaveProperty('cognitoSub');
  });
});

describe('GET /users', () => {
  it('returns every user to an admin caller', async () => {
    buildDb([ADMIN, STANDARD]);

    expect(await call('/users', 'sub-admin')).toEqual({
      statusCode: 200,
      body: { users: [summary(ADMIN), summary(STANDARD)] },
    });
  });

  it('returns every user to a standard caller too', async () => {
    buildDb([ADMIN, STANDARD]);

    expect(await call('/users', 'sub-standard')).toEqual({
      statusCode: 200,
      body: { users: [summary(ADMIN), summary(STANDARD)] },
    });
  });

  it('returns an empty list when the list query finds no users', async () => {
    buildDb([ADMIN], []);

    expect(await call('/users', 'sub-admin')).toEqual({
      statusCode: 200,
      body: { users: [] },
    });
  });

  it('returns 401 for an unknown user without listing users', async () => {
    const queries = buildDb([ADMIN, STANDARD]);

    expect(await call('/users', 'sub-unknown')).toEqual({
      statusCode: 401,
      body: { message: 'Unauthorized' },
    });
    // Only the caller lookup ran, not the list query
    expect(queries).toHaveLength(1);
  });

  it('returns 401 without a token, without touching the database', async () => {
    const queries = buildDb([ADMIN, STANDARD]);

    expect((await call('/users')).statusCode).toBe(401);
    expect(queries).toHaveLength(0);
  });

  it('never exposes Cognito subs', async () => {
    buildDb([ADMIN, STANDARD]);

    const { body } = await call('/users', 'sub-admin');

    for (const user of body.users) {
      expect(user).not.toHaveProperty('cognitoSub');
    }
  });
});
