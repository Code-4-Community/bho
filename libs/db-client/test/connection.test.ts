import { Pool } from 'pg';
import { closeConnection, getDb } from '../src/connection';

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ end: jest.fn() })),
  types: { setTypeParser: jest.fn(), builtins: { DATE: 1082 } },
}));

const VALID_ENV = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'password',
  DB_NAME: 'postgres',
};

describe('getDb', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    await closeConnection();
    jest.mocked(Pool).mockClear();
    process.env = { ...originalEnv, ...VALID_ENV };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns the same instance on repeated calls', () => {
    expect(getDb()).toBe(getDb());
    expect(Pool).toHaveBeenCalledTimes(1);
  });

  it('opens a new connection after closeConnection', async () => {
    const first = getDb();

    await closeConnection();

    expect(getDb()).not.toBe(first);
  });

  it('throws an error naming every missing env var', () => {
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;

    expect(() => getDb()).toThrow(
      'Missing required env vars: DB_HOST, DB_NAME',
    );
  });

  it('caps the pool at one connection', () => {
    getDb();

    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 1 }));
  });

  it('times out connection attempts and keeps the connection open between invocations', () => {
    getDb();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 0,
        keepAlive: true,
      }),
    );
  });
});
