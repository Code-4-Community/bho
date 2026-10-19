const mockCreateDb = jest.fn(() => ({}));

jest.mock('../../../../db/client', () => ({
  createDb: mockCreateDb,
}));

const VALID_ENV = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'password',
  DB_NAME: 'postgres',
};

const loadGetDb = async () => {
  jest.resetModules();
  return (await import('./db')).getDb;
};

describe('getDb', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockCreateDb.mockClear();
    process.env = { ...originalEnv, ...VALID_ENV };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns the same instance on repeated calls', async () => {
    const getDb = await loadGetDb();

    expect(getDb()).toBe(getDb());
    expect(mockCreateDb).toHaveBeenCalledTimes(1);
  });

  it('throws an error naming every missing env var', async () => {
    delete process.env.DB_HOST;
    delete process.env.DB_NAME;
    const getDb = await loadGetDb();

    expect(() => getDb()).toThrow(
      'Missing required env vars: DB_HOST, DB_NAME',
    );
  });

  it('caps the pool at one connection', async () => {
    const getDb = await loadGetDb();

    getDb();

    expect(mockCreateDb).toHaveBeenCalledWith(
      expect.objectContaining({ max: 1 }),
    );
  });
});
